// Advanced Autofill Utilities
// Handles edge cases and provides helper functions

class AutofillUtils {
  /**
   * Detect if a form uses a specific framework
   */
  static detectFramework() {
    const frameworks = {
      react: !!(window.React || document.querySelector('[data-reactroot], [data-reactid]')),
      vue: !!(window.Vue || document.querySelector('[data-v-]')),
      angular: !!(window.angular || window.ng || document.querySelector('[ng-app], [data-ng-app]')),
      svelte: !!document.querySelector('[class*="svelte-"]'),
      jquery: !!window.jQuery
    };

    const detected = Object.keys(frameworks).filter(key => frameworks[key]);
    console.log('[Autofill Utils] 🔍 Detected frameworks:', detected.length ? detected.join(', ') : 'None');

    return frameworks;
  }

  /**
   * Wait for element to appear in DOM
   */
  static waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Simulate human-like typing
   */
  static async typeText(element, text, delayMs = 50) {
    element.focus();

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Simulate keydown
      element.dispatchEvent(new KeyboardEvent('keydown', {
        key: char,
        code: `Key${char.toUpperCase()}`,
        bubbles: true
      }));

      // Update value
      element.value += char;

      // Simulate input event
      element.dispatchEvent(new InputEvent('input', {
        data: char,
        bubbles: true,
        cancelable: true
      }));

      // Simulate keyup
      element.dispatchEvent(new KeyboardEvent('keyup', {
        key: char,
        code: `Key${char.toUpperCase()}`,
        bubbles: true
      }));

      // Small delay between characters
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // Trigger final events
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  /**
   * Scroll element into view smoothly
   */
  static scrollIntoView(element) {
    if (!element) return;

    try {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    } catch (error) {
      // Fallback for older browsers
      element.scrollIntoView();
    }
  }

  /**
   * Check if element is in an iframe
   */
  static isInIframe(element) {
    try {
      return element.ownerDocument !== window.document;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get all iframes in the document
   */
  static getAllIframes() {
    const iframes = [];
    const iframeElements = document.querySelectorAll('iframe');

    iframeElements.forEach(iframe => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframes.push({
            element: iframe,
            document: iframeDoc,
            accessible: true
          });
        } else {
          iframes.push({
            element: iframe,
            document: null,
            accessible: false
          });
        }
      } catch (e) {
        iframes.push({
          element: iframe,
          document: null,
          accessible: false,
          error: e.message
        });
      }
    });

    return iframes;
  }

  /**
   * Detect if field uses autocomplete/typeahead
   */
  static isAutocompleteField(element) {
    const autocompleteIndicators = [
      element.getAttribute('role') === 'combobox',
      element.getAttribute('aria-autocomplete'),
      element.getAttribute('autocomplete') === 'on',
      element.classList.contains('autocomplete'),
      element.classList.contains('typeahead'),
      element.hasAttribute('data-autocomplete')
    ];

    return autocompleteIndicators.some(Boolean);
  }

  /**
   * Click element safely (handles various scenarios)
   */
  static clickElement(element) {
    if (!element) return false;

    try {
      // Try multiple click methods
      const methods = [
        () => element.click(),
        () => element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })),
        () => {
          const event = document.createEvent('MouseEvents');
          event.initEvent('click', true, true);
          element.dispatchEvent(event);
        }
      ];

      for (const method of methods) {
        try {
          method();
          return true;
        } catch (e) {
          continue;
        }
      }

      return false;
    } catch (error) {
      console.error('[Autofill Utils] ❌ Error clicking element:', error);
      return false;
    }
  }

  /**
   * Find option in select by fuzzy matching
   */
  static findSelectOption(selectElement, searchValue) {
    if (!selectElement || !searchValue) return null;

    const options = Array.from(selectElement.options);
    const search = searchValue.toLowerCase().trim();

    // Strategy 1: Exact match (value)
    let option = options.find(opt => opt.value.toLowerCase() === search);
    if (option) return option;

    // Strategy 2: Exact match (text)
    option = options.find(opt => opt.text.toLowerCase() === search);
    if (option) return option;

    // Strategy 3: Starts with (value)
    option = options.find(opt => opt.value.toLowerCase().startsWith(search));
    if (option) return option;

    // Strategy 4: Starts with (text)
    option = options.find(opt => opt.text.toLowerCase().startsWith(search));
    if (option) return option;

    // Strategy 5: Contains (value)
    option = options.find(opt => opt.value.toLowerCase().includes(search));
    if (option) return option;

    // Strategy 6: Contains (text)
    option = options.find(opt => opt.text.toLowerCase().includes(search));
    if (option) return option;

    // Strategy 7: Reverse contains (search contains option)
    option = options.find(opt => {
      const optText = opt.text.toLowerCase();
      return optText && search.includes(optText);
    });
    if (option) return option;

    return null;
  }

  /**
   * Detect if page is a single-page application
   */
  static isSPA() {
    const indicators = [
      document.querySelector('[data-reactroot], [data-reactid]'),
      document.querySelector('[data-v-]'),
      document.querySelector('[ng-app], [data-ng-app]'),
      window.history.pushState !== undefined,
      document.querySelector('script[src*="react"]'),
      document.querySelector('script[src*="vue"]'),
      document.querySelector('script[src*="angular"]')
    ];

    return indicators.filter(Boolean).length >= 2;
  }

  /**
   * Get element's computed z-index hierarchy
   */
  static getZIndexHierarchy(element) {
    const hierarchy = [];
    let current = element;

    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const zIndex = style.zIndex;

      if (zIndex !== 'auto') {
        hierarchy.push({
          element: current,
          zIndex: parseInt(zIndex),
          position: style.position
        });
      }

      current = current.parentElement;
    }

    return hierarchy;
  }

  /**
   * Check if element is blocked by overlay
   */
  static isBlockedByOverlay(element) {
    try {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const topElement = document.elementFromPoint(centerX, centerY);

      // Check if the top element is the element itself or a descendant
      return topElement !== element && !element.contains(topElement);
    } catch (e) {
      return false;
    }
  }

  /**
   * Get all form elements including those in shadow DOM
   */
  static getAllFormElements(root = document) {
    const elements = new Set();

    // Add direct children
    const directElements = root.querySelectorAll('input, select, textarea, [contenteditable="true"]');
    directElements.forEach(el => elements.add(el));

    // Recursively check shadow roots
    const allElements = root.querySelectorAll('*');
    allElements.forEach(el => {
      if (el.shadowRoot) {
        const shadowElements = this.getAllFormElements(el.shadowRoot);
        shadowElements.forEach(shadowEl => elements.add(shadowEl));
      }
    });

    return Array.from(elements);
  }

  /**
   * Debounce function
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function
   */
  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Deep clone object
   */
  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Safe querySelector with error handling
   */
  static safeQuerySelector(selector, root = document) {
    try {
      return root.querySelector(selector);
    } catch (e) {
      console.warn(`[Autofill Utils] Invalid selector: ${selector}`, e);
      return null;
    }
  }

  /**
   * Get element path (for debugging)
   */
  static getElementPath(element) {
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className) {
        selector += `.${current.className.split(' ').join('.')}`;
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.AutofillUtils = AutofillUtils;
}
