// ATS Platform Intelligence
// Detects and applies platform-specific autofill strategies

class ATSPlatformIntelligence {
  constructor() {
    this.platforms = this.initializePlatforms();
    this.currentPlatform = null;
  }

  /**
   * Initialize platform-specific configurations
   */
  initializePlatforms() {
    return {
      workday: {
        name: 'Workday',
        detection: {
          hostnames: ['myworkdayjobs.com'],
          urlPatterns: [/workday/i],
          domSignatures: [
            '[data-automation-id]',
            '.css-workday',
            '[class*="workday"]'
          ]
        },
        characteristics: {
          dynamicForms: true,
          multiStep: true,
          requiresDelays: true,
          delayMs: 150,
          usesDataAttributes: true,
          dataAttrPrefix: 'data-automation-id'
        },
        fieldPatterns: {
          // Workday uses specific data-automation-id patterns
          firstName: ['input-firstName', 'legalNameSection.legalName.firstName'],
          lastName: ['input-lastName', 'legalNameSection.legalName.lastName'],
          email: ['input-email', 'email'],
          phone: ['input-phone', 'phone'],
          resume: ['input-file-upload', 'resume']
        },
        specialHandling: {
          // Workday often has legal/compliance questions
          legalQuestions: true,
          governmentQuestions: true,
          i9Questions: true
        }
      },

      greenhouse: {
        name: 'Greenhouse',
        detection: {
          hostnames: ['greenhouse.io', 'boards.greenhouse.io'],
          urlPatterns: [/greenhouse/i],
          domSignatures: [
            '[data-source="greenhouse"]',
            '.application-form',
            '#application_form'
          ]
        },
        characteristics: {
          dynamicForms: false,
          multiStep: false,
          requiresDelays: false,
          delayMs: 50,
          usesStandardNames: true
        },
        fieldPatterns: {
          firstName: ['first_name', 'firstname'],
          lastName: ['last_name', 'lastname'],
          email: ['email'],
          phone: ['phone'],
          resume: ['resume']
        },
        specialHandling: {
          eeoQuestions: true,
          customQuestions: true
        }
      },

      lever: {
        name: 'Lever',
        detection: {
          hostnames: ['lever.co', 'jobs.lever.co'],
          urlPatterns: [/lever/i],
          domSignatures: [
            '.application-form',
            '[data-qa]',
            '.lever-form'
          ]
        },
        characteristics: {
          dynamicForms: false,
          multiStep: false,
          requiresDelays: false,
          delayMs: 50,
          usesDataQa: true
        },
        fieldPatterns: {
          firstName: ['name', 'full-name'],
          email: ['email'],
          phone: ['phone'],
          resume: ['resume']
        }
      },

      ashby: {
        name: 'Ashby',
        detection: {
          hostnames: ['ashbyhq.com', 'jobs.ashbyhq.com'],
          urlPatterns: [/ashby/i],
          domSignatures: [
            '[data-testid]',
            '.ashby-application',
            '[class*="ashby"]'
          ]
        },
        characteristics: {
          dynamicForms: true,
          multiStep: true,
          requiresDelays: true,
          delayMs: 100,
          usesTestIds: true,
          modern: true
        },
        fieldPatterns: {
          firstName: ['firstName', 'first-name'],
          lastName: ['lastName', 'last-name'],
          email: ['email'],
          phone: ['phone'],
          resume: ['resume', 'file-upload']
        },
        specialHandling: {
          customQuestions: true,
          richTextFields: true
        }
      },

      taleo: {
        name: 'Oracle Taleo',
        detection: {
          hostnames: ['taleo.net'],
          urlPatterns: [/taleo/i],
          domSignatures: [
            '#requisitionDescriptionInterface',
            '.taleo-form',
            '[id*="taleo"]'
          ]
        },
        characteristics: {
          dynamicForms: true,
          multiStep: true,
          requiresDelays: true,
          delayMs: 200,
          legacy: true
        },
        fieldPatterns: {
          // Taleo uses complex IDs
          firstName: ['firstName', 'first_name'],
          lastName: ['lastName', 'last_name'],
          email: ['email'],
          phone: ['phone']
        }
      },

      icims: {
        name: 'iCIMS',
        detection: {
          hostnames: ['icims.com'],
          urlPatterns: [/icims/i],
          domSignatures: [
            '.iCIMS_JobsTable',
            '[class*="icims"]'
          ]
        },
        characteristics: {
          dynamicForms: true,
          multiStep: true,
          requiresDelays: true,
          delayMs: 150
        }
      },

      smartrecruiters: {
        name: 'SmartRecruiters',
        detection: {
          hostnames: ['smartrecruiters.com'],
          urlPatterns: [/smartrecruiters/i],
          domSignatures: [
            '[data-test]',
            '.application-form'
          ]
        },
        characteristics: {
          dynamicForms: false,
          multiStep: false,
          requiresDelays: false,
          delayMs: 50
        }
      }
    };
  }

  /**
   * Detect current ATS platform
   * @returns {Object} Platform configuration or generic config
   */
  detectPlatform() {
    const url = window.location.href.toLowerCase();
    const hostname = window.location.hostname.toLowerCase();

    // Check each platform
    for (const [platformId, platform] of Object.entries(this.platforms)) {
      // Check hostname
      if (platform.detection.hostnames.some(h => hostname.includes(h))) {
        console.log(`[ATS Intelligence] ✅ Detected platform: ${platform.name} (hostname match)`);
        this.currentPlatform = { id: platformId, ...platform };
        return this.currentPlatform;
      }

      // Check URL patterns
      if (platform.detection.urlPatterns.some(p => p.test(url))) {
        console.log(`[ATS Intelligence] ✅ Detected platform: ${platform.name} (URL pattern match)`);
        this.currentPlatform = { id: platformId, ...platform };
        return this.currentPlatform;
      }

      // Check DOM signatures
      if (platform.detection.domSignatures.some(selector => document.querySelector(selector))) {
        console.log(`[ATS Intelligence] ✅ Detected platform: ${platform.name} (DOM signature match)`);
        this.currentPlatform = { id: platformId, ...platform };
        return this.currentPlatform;
      }
    }

    // Generic platform
    console.log('[ATS Intelligence] ℹ️ Using generic platform configuration');
    this.currentPlatform = {
      id: 'generic',
      name: 'Generic',
      characteristics: {
        dynamicForms: false,
        multiStep: false,
        requiresDelays: false,
        delayMs: 50
      }
    };

    return this.currentPlatform;
  }

  /**
   * Get platform-specific delay
   */
  getDelay() {
    if (!this.currentPlatform) this.detectPlatform();
    return this.currentPlatform.characteristics?.delayMs || 50;
  }

  /**
   * Check if platform requires delays between fills
   */
  requiresDelays() {
    if (!this.currentPlatform) this.detectPlatform();
    return this.currentPlatform.characteristics?.requiresDelays || false;
  }

  /**
   * Get platform-specific field selector
   */
  getPlatformFieldSelector(fieldType) {
    if (!this.currentPlatform) this.detectPlatform();

    const patterns = this.currentPlatform.fieldPatterns?.[fieldType];
    if (!patterns) return null;

    // Try to find field using platform-specific patterns
    for (const pattern of patterns) {
      // Try data attributes
      if (this.currentPlatform.characteristics?.usesDataAttributes) {
        const prefix = this.currentPlatform.characteristics.dataAttrPrefix;
        const selector = `[${prefix}="${pattern}"]`;
        const element = document.querySelector(selector);
        if (element) return element;
      }

      // Try data-testid
      if (this.currentPlatform.characteristics?.usesTestIds) {
        const element = document.querySelector(`[data-testid="${pattern}"]`);
        if (element) return element;
      }

      // Try data-qa
      if (this.currentPlatform.characteristics?.usesDataQa) {
        const element = document.querySelector(`[data-qa="${pattern}"]`);
        if (element) return element;
      }

      // Try name/id
      const byName = document.querySelector(`[name="${pattern}"]`);
      if (byName) return byName;

      const byId = document.querySelector(`#${pattern}`);
      if (byId) return byId;
    }

    return null;
  }

  /**
   * Get platform-specific filling strategy
   */
  getFillingStrategy() {
    if (!this.currentPlatform) this.detectPlatform();

    return {
      platform: this.currentPlatform.id,
      name: this.currentPlatform.name,
      useDelays: this.requiresDelays(),
      delayMs: this.getDelay(),
      multiStep: this.currentPlatform.characteristics?.multiStep || false,
      specialHandling: this.currentPlatform.specialHandling || {},

      // Event triggering strategy
      events: this.getEventStrategy(),

      // Field finding strategy
      fieldFinding: this.getFieldFindingStrategy()
    };
  }

  /**
   * Get platform-specific event triggering strategy
   */
  getEventStrategy() {
    const platformId = this.currentPlatform?.id || 'generic';

    const strategies = {
      workday: {
        events: ['input', 'change', 'blur', 'focusout'],
        triggerOnEach: true,
        waitAfter: 150
      },
      greenhouse: {
        events: ['input', 'change'],
        triggerOnEach: false,
        waitAfter: 50
      },
      lever: {
        events: ['input', 'change', 'blur'],
        triggerOnEach: false,
        waitAfter: 50
      },
      ashby: {
        events: ['input', 'change', 'blur'],
        triggerOnEach: true,
        waitAfter: 100
      },
      taleo: {
        events: ['change', 'blur', 'focusout'],
        triggerOnEach: true,
        waitAfter: 200
      },
      generic: {
        events: ['input', 'change', 'blur'],
        triggerOnEach: false,
        waitAfter: 50
      }
    };

    return strategies[platformId] || strategies.generic;
  }

  /**
   * Get field finding strategy
   */
  getFieldFindingStrategy() {
    const platformId = this.currentPlatform?.id || 'generic';

    return {
      usePlatformSelectors: platformId !== 'generic',
      useSemanticMatching: true,
      confidenceThreshold: platformId === 'workday' ? 0.7 : 0.6,
      fallbackToGeneric: true
    };
  }

  /**
   * Check if platform has special handling for a feature
   */
  hasSpecialHandling(feature) {
    if (!this.currentPlatform) this.detectPlatform();
    return this.currentPlatform.specialHandling?.[feature] || false;
  }

  /**
   * Get platform name
   */
  getPlatformName() {
    if (!this.currentPlatform) this.detectPlatform();
    return this.currentPlatform.name;
  }
}

// Export
if (typeof window !== 'undefined') {
  window.ATSPlatformIntelligence = ATSPlatformIntelligence;
}

