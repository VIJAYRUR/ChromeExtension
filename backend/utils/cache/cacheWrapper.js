const Logger = require('../logger');

class CacheWrapper {
  constructor(redisClient) {
    this.client = redisClient;
    this.isCircuitOpen = false;
    this.failureCount = 0;
    this.successCount = 0;
    this.threshold = 5; // Open circuit after 5 failures
    this.resetTimeout = 60000; // Try again after 1 minute
    this.logger = new Logger('CacheWrapper');
  }

  async executeWithFallback(cacheOperation, fallbackOperation, context) {
    // If circuit is open, go directly to fallback
    if (this.isCircuitOpen) {
      this.logger.warn(`Circuit open, using fallback for ${context}`);
      return await fallbackOperation();
    }

    try {
      // Check Redis availability
      if (!this.client) {
        throw new Error('Redis client not initialized');
      }

      // Execute cache operation
      const result = await cacheOperation();

      // Reset failure count on success
      this.failureCount = 0;
      this.successCount++;

      return result;
    } catch (error) {
      this.failureCount++;
      this.logger.error(`Error in ${context}: ${error.message}`);

      // Open circuit if threshold exceeded
      if (this.failureCount >= this.threshold) {
        this.openCircuit();
      }

      // Always fallback to database
      this.logger.warn(`Falling back to database for ${context}`);
      return await fallbackOperation();
    }
  }

  openCircuit() {
    this.isCircuitOpen = true;
    this.logger.error(`Circuit breaker OPENED after ${this.failureCount} failures`);

    // Auto-reset after timeout
    setTimeout(() => {
      this.closeCircuit();
    }, this.resetTimeout);
  }

  closeCircuit() {
    this.isCircuitOpen = false;
    this.failureCount = 0;
    this.logger.info('Circuit breaker CLOSED, retrying cache operations');
  }

  getStats() {
    return {
      isCircuitOpen: this.isCircuitOpen,
      failureCount: this.failureCount,
      successCount: this.successCount
    };
  }
}

module.exports = CacheWrapper;
