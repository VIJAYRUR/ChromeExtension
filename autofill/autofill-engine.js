// Autofill Engine - Intelligently fills job application forms

class AutofillEngine {
  constructor() {
    // Initialize intelligent systems
    this.semanticMatcher = new SemanticFieldMatcher();
    this.valueMapper = new IntelligentValueMapper();
    this.platformIntelligence = new ATSPlatformIntelligence();

    // Legacy systems (keep for backward compatibility)
    this.platformDetector = new PlatformDetector();
    this.fieldMappings = this.initializeFieldMappings();

    // State
    this.filledFields = new Set();
    this.isAutofilling = false;
    this.useIntelligentMatching = true; // Feature flag

    console.log('[Autofill Engine] 🧠 Intelligent autofill system initialized');
  }

  initializeFieldMappings() {
    return {
      // Name fields
      firstName: ['firstname', 'first-name', 'first_name', 'fname', 'givenname', 'given-name', 'forename'],
      middleName: ['middlename', 'middle-name', 'middle_name', 'mname', 'middle-initial'],
      lastName: ['lastname', 'last-name', 'last_name', 'lname', 'surname', 'familyname', 'family-name'],
      fullName: ['fullname', 'full-name', 'full_name', 'name', 'applicant-name', 'candidate-name', 'your-name'],
      // Removed 'profile' from professionalSummary to avoid matching LinkedIn Profile fields
      professionalSummary: ['summary', 'professional-summary', 'about', 'bio', 'objective', 'career-summary'],

      // Contact fields
      email: ['email', 'e-mail', 'email-address', 'emailaddress', 'mail', 'contact-email'],
      phone: ['phone', 'telephone', 'mobile', 'cell', 'phonenumber', 'phone-number', 'phone_number', 'contact-number'],
      phoneCountryCode: ['country-code', 'phone-country', 'dial-code', 'phone-code'],
      phoneType: ['phone-type', 'phonetype', 'number-type'],
      mobileNumber: ['mobile', 'mobile-number', 'cell-phone', 'cellphone'],

      // Address fields
      address: ['address', 'street', 'address-line-1', 'address1', 'street-address', 'addressline1', 'home-address', 'residential-address'],
      address2: ['address-line-2', 'address2', 'apt', 'suite', 'unit', 'addressline2'],
      city: ['city', 'town', 'locality', 'current-city', 'location-city'],
      state: ['state', 'province', 'region', 'stateprovince', 'current-state'],
      zipCode: ['zip', 'zipcode', 'zip-code', 'postal', 'postalcode', 'postal-code', 'postcode'],
      country: ['country', 'nation', 'current-country'],

      // Professional fields
      linkedin: ['linkedin', 'linkedin-url', 'linkedin-profile', 'linkedinurl'],
      github: ['github', 'github-url', 'github-profile', 'githuburl'],
      portfolio: ['portfolio', 'portfolio-url', 'portfolio-website'],
      website: ['website', 'personal-website', 'url', 'homepage'],

      // Work Experience
      currentCompany: ['current-company', 'employer', 'current-employer', 'company', 'organization'],
      jobTitle: ['job-title', 'title', 'position', 'role', 'current-title'],
      companyLocation: ['company-location', 'work-location', 'job-location'],
      startDate: ['start-date', 'from-date', 'begin-date', 'employment-start'],
      endDate: ['end-date', 'to-date', 'until-date', 'employment-end'],
      responsibilities: ['responsibilities', 'duties', 'description', 'job-description'],
      yearsOfExperience: ['years-experience', 'experience-years', 'years-of-experience', 'total-experience'],

      // Education
      university: ['university', 'college', 'school', 'institution', 'education'],
      degree: ['degree', 'education-level', 'highest-degree', 'degree-type'],
      major: ['major', 'field-of-study', 'discipline', 'concentration', 'field'],
      gpa: ['gpa', 'grade-point-average', 'grade'],
      graduationYear: ['graduation-year', 'grad-year', 'year-graduated', 'completion-year', 'end-date-year'],

      // Skills
      skills: ['skills', 'technical-skills', 'competencies', 'expertise'],

      // Work authorization & Legal
      workAuthorization: ['work-authorization', 'authorized', 'work-permit', 'visa-status', 'employment-eligibility', 'legal-right-to-work', 'i-9'],
      requireSponsorship: ['sponsorship', 'visa-sponsorship', 'require-sponsorship', 'need-sponsorship', 'transfer-visa', 'extend-visa'],
      clearanceEligibility: ['clearance', 'security-clearance', 'clearance-level'],

      // Workday-specific legal questions
      legalRightToWork: ['legal-right-to-work', 'proof-of-legal-right', 'i-9-form', 'employment-eligibility-verification'],
      unrestrictedWorkRight: ['unrestricted-right-to-work', 'unrestricted-work-authorization', 'daca', 'tps'],
      governmentEmployee: ['government-employment', 'federal-employee', 'state-employee', 'local-government', 'special-government-employee'],
      governmentResponsibilities: ['government-responsibilities', 'procurement', 'evaluation', 'source-selection'],
      familyGovernmentEmployee: ['family-member', 'immediate-family', 'government-employee-family'],
      postGovernmentRestrictions: ['post-government', 'employment-restrictions', 'post-employment-advice'],
      debarred: ['debarred', 'suspended', 'ineligible', 'contract-award'],
      restrictedCountryCitizen: ['iran', 'cuba', 'north-korea', 'syria', 'export-control'],

      // EEO fields
      gender: ['gender', 'sex'],
      race: ['race', 'ethnicity', 'racial', 'ethnic'],
      hispanicLatino: ['hispanic', 'latino', 'latina', 'latinx'],
      veteranStatus: ['veteran', 'veteran-status', 'military', 'military-status'],
      disability: ['disability', 'disability-status', 'disabled'],

      // Additional Information
      preferredLocation: ['preferred-location', 'geographic-location', 'location-preference'],
      availableStartDate: ['available-date', 'availability', 'earliest-start', 'start-date'],
      willingToRelocate: ['relocate', 'relocation', 'willing-to-relocate', 'open-to-relocation'],
      desiredSalary: ['salary', 'desired-salary', 'expected-salary', 'salary-expectation', 'compensation'],

      // Cover letter / Additional info
      coverLetter: ['cover-letter', 'coverletter', 'message', 'additional-information', 'why-interested']
    };
  }

  async autofillForm(resumeData) {
    if (this.isAutofilling) {
      console.log('[Autofill] ⏭️ Already autofilling, skipping...');
      return;
    }

    this.isAutofilling = true;
    this.filledFields.clear();

    console.log('[Autofill] 🚀 Starting intelligent autofill...');

    try {
      const platform = this.platformDetector.detectPlatform();
      console.log('[Autofill] 🎯 Detected platform:', platform);

      // Wait for dynamic content to load
      await this.waitForFormToLoad();

      // Get all form fields with retry
      let fields = await this.findFormFieldsWithRetry();
      console.log('[Autofill] 📝 Found', fields.length, 'form fields');

      if (fields.length === 0) {
        console.warn('[Autofill] ⚠️ No form fields found, setting up dynamic monitoring...');
        this.setupDynamicFormMonitoring(resumeData);
        return;
      }

      // Fill fields based on platform-specific logic
      if (platform === 'workday') {
        await this.fillWorkdayForm(fields, resumeData);
      } else if (platform === 'greenhouse') {
        await this.fillGreenhouseForm(fields, resumeData);
      } else if (platform === 'lever') {
        await this.fillLeverForm(fields, resumeData);
      } else {
        // Generic autofill for unknown platforms
        await this.fillGenericForm(fields, resumeData);
      }

      // Set up monitoring for fields that appear later
      this.setupDynamicFormMonitoring(resumeData);

      console.log('[Autofill] ✅ Autofill complete! Filled', this.filledFields.size, 'fields');

      // Show success notification
      this.showNotification(`✅ Autofilled ${this.filledFields.size} fields`, 'success');

    } catch (error) {
      console.error('[Autofill] ❌ Error during autofill:', error);
      this.showNotification('❌ Autofill failed', 'error');
    } finally {
      this.isAutofilling = false;
    }
  }

  /**
   * Wait for form to load (for dynamic forms)
   */
  async waitForFormToLoad() {
    console.log('[Autofill] ⏳ Waiting for form to load...');

    // Wait for common form selectors
    const selectors = [
      'form',
      'input[type="text"]',
      'input[type="email"]',
      '[role="form"]',
      '[class*="form"]',
      '[id*="form"]'
    ];

    let attempts = 0;
    const maxAttempts = 10;
    const delayMs = 300;

    while (attempts < maxAttempts) {
      for (const selector of selectors) {
        if (document.querySelector(selector)) {
          console.log('[Autofill] ✓ Form detected via selector:', selector);
          // Wait a bit more for full render
          await this.delay(500);
          return;
        }
      }

      attempts++;
      await this.delay(delayMs);
    }

    console.log('[Autofill] ⚠️ Form detection timeout, proceeding anyway...');
  }

  /**
   * Find form fields with retry logic
   */
  async findFormFieldsWithRetry(maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`[Autofill] 🔍 Finding form fields (attempt ${attempt}/${maxAttempts})...`);

      const fields = this.findAllFormFields();

      if (fields.length > 0) {
        return fields;
      }

      if (attempt < maxAttempts) {
        console.log('[Autofill] ⏳ No fields found, waiting before retry...');
        await this.delay(1000);
      }
    }

    return [];
  }

  /**
   * Set up MutationObserver to detect and fill dynamically added fields
   */
  setupDynamicFormMonitoring(resumeData) {
    // Disconnect any existing observer
    if (this.formObserver) {
      this.formObserver.disconnect();
    }

    console.log('[Autofill] 👁️ Setting up dynamic form monitoring...');

    this.formObserver = new MutationObserver(async (mutations) => {
      // Debounce rapid mutations
      if (this.observerTimeout) {
        clearTimeout(this.observerTimeout);
      }

      this.observerTimeout = setTimeout(async () => {
        console.log('[Autofill] 🔄 DOM changed, checking for new fields...');

        // Check if new form fields were added
        const newFields = this.findAllFormFields().filter(
          field => !this.filledFields.has(field.element)
        );

        if (newFields.length > 0) {
          console.log(`[Autofill] 🆕 Found ${newFields.length} new fields, autofilling...`);

          for (const field of newFields) {
            try {
              const fieldType = this.identifyFieldType(field);
              if (fieldType) {
                const value = this.getValueForField(fieldType, resumeData, field);
                if (value !== null && value !== undefined && value !== '') {
                  await this.fillField(field.element, value);
                  await this.delay(50);
                }
              }
            } catch (error) {
              console.error('[Autofill] ❌ Error filling new field:', error);
            }
          }
        }
      }, 500); // Debounce 500ms
    });

    // Start observing
    this.formObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });

    console.log('[Autofill] ✓ Dynamic monitoring active');
  }

  findAllFormFields() {
    try {
      const fields = [];
      const processedElements = new Set();

      // Helper to process elements from a root
      const processRoot = (root) => {
        // Find all input, textarea, and select elements
        const inputs = root.querySelectorAll('input:not([type="submit"]):not([type="button"]):not([type="image"]):not([type="reset"])');
        const textareas = root.querySelectorAll('textarea');
        const selects = root.querySelectorAll('select');
        const contentEditables = root.querySelectorAll('[contenteditable="true"]');

        return [...inputs, ...textareas, ...selects, ...contentEditables];
      };

      // 1. Process main document
      let allElements = processRoot(document);

      // 2. Process iframes (for embedded application forms)
      try {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
              console.log('[Autofill] 🖼️ Processing iframe:', iframe.src || iframe.id);
              const iframeElements = processRoot(iframeDoc);
              allElements = [...allElements, ...iframeElements];
            }
          } catch (e) {
            // Cross-origin iframe, skip silently
            console.log('[Autofill] ⚠️ Cannot access iframe (cross-origin):', iframe.src);
          }
        });
      } catch (error) {
        console.warn('[Autofill] ⚠️ Error processing iframes:', error);
      }

      // 3. Process shadow DOMs (for web components)
      try {
        const shadowHosts = document.querySelectorAll('*');
        shadowHosts.forEach(host => {
          if (host.shadowRoot) {
            console.log('[Autofill] 🌑 Processing shadow DOM in:', host.tagName);
            const shadowElements = processRoot(host.shadowRoot);
            allElements = [...allElements, ...shadowElements];
          }
        });
      } catch (error) {
        console.warn('[Autofill] ⚠️ Error processing shadow DOMs:', error);
      }

      console.log(`[Autofill] 🔍 Found ${allElements.length} total form elements`);

      // Process all elements
      allElements.forEach(field => {
        try {
          // Skip if already processed
          if (processedElements.has(field)) return;
          processedElements.add(field);

          const isVisible = this.isFieldVisible(field);
          const isFile = field.type === 'file';
          const isHiddenButRelevant = field.type === 'hidden' && (field.name || field.id);

          // Include visible fields, file inputs, or hidden fields with identifiers
          if (isVisible || isFile || isHiddenButRelevant) {
            const fieldData = {
              element: field,
              type: field.tagName.toLowerCase(),
              inputType: field.type || 'text',
              name: field.name || '',
              id: field.id || '',
              placeholder: field.placeholder || '',
              label: this.getFieldLabel(field),
              ariaLabel: field.getAttribute('aria-label') || '',
              dataTestId: field.getAttribute('data-testid') || '',
              dataAutomationId: field.getAttribute('data-automation-id') || '',
              dataQa: field.getAttribute('data-qa') || '',
              dataFieldName: field.getAttribute('data-field-name') || '',
              className: field.className || '',
              accept: field.accept || '',
              value: field.value || '',
              isVisible: isVisible,
              role: field.getAttribute('role') || '',
              autocomplete: field.getAttribute('autocomplete') || ''
            };

            fields.push(fieldData);
          }
        } catch (error) {
          console.error('[Autofill] ❌ Error processing field:', field, error);
        }
      });

      console.log(`[Autofill] ✓ Processed ${fields.length} fields (${fields.filter(f => f.isVisible).length} visible)`);
      return fields;

    } catch (error) {
      console.error('[Autofill] ❌ Error in findAllFormFields:', error);
      return [];
    }
  }

  isFieldVisible(element) {
    if (!element) return false;

    try {
      // Check if element is connected to DOM
      if (!element.isConnected) return false;

      // Get computed style
      const style = window.getComputedStyle(element);

      // Check display and visibility
      if (style.display === 'none') return false;
      if (style.visibility === 'hidden') return false;

      // Allow low opacity (some forms use it for animation)
      if (parseFloat(style.opacity) === 0) return false;

      // Check dimensions
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;

      // Check if element or parent has hidden attribute
      if (element.hasAttribute('hidden')) return false;

      // Check if disabled
      if (element.disabled) return false;

      // Check if element or parent has aria-hidden
      if (element.getAttribute('aria-hidden') === 'true') return false;

      // Check if any parent is hidden (walk up the tree, max 10 levels)
      let parent = element.parentElement;
      let depth = 0;
      const maxDepth = 10;

      while (parent && depth < maxDepth) {
        const parentStyle = window.getComputedStyle(parent);
        if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') {
          return false;
        }
        parent = parent.parentElement;
        depth++;
      }

      return true;
    } catch (error) {
      // If we can't determine visibility, assume it's visible
      console.warn('[Autofill] ⚠️ Error checking field visibility:', error);
      return true;
    }
  }

  getFieldLabel(field) {
    try {
      // Strategy 1: Label with 'for' attribute
      if (field.id) {
        const label = document.querySelector(`label[for="${field.id}"]`);
        if (label) return this.cleanLabelText(label.textContent);
      }

      // Strategy 2: Parent label
      const parentLabel = field.closest('label');
      if (parentLabel) return this.cleanLabelText(parentLabel.textContent);

      // Strategy 3: Previous sibling label
      let prev = field.previousElementSibling;
      if (prev && prev.tagName === 'LABEL') {
        return this.cleanLabelText(prev.textContent);
      }

      // Strategy 4: Look for nearby text (within parent container)
      const parent = field.parentElement;
      if (parent) {
        // Check for span, div, or p before the input
        const textElements = parent.querySelectorAll('span, div, p, legend');
        for (const el of textElements) {
          const text = this.cleanLabelText(el.textContent);
          if (text && text.length > 0 && text.length < 200) {
            return text;
          }
        }
      }

      // Strategy 5: Check aria-label or aria-labelledby
      if (field.getAttribute('aria-label')) {
        return this.cleanLabelText(field.getAttribute('aria-label'));
      }

      if (field.getAttribute('aria-labelledby')) {
        const labelId = field.getAttribute('aria-labelledby');
        const labelEl = document.getElementById(labelId);
        if (labelEl) return this.cleanLabelText(labelEl.textContent);
      }

      // Strategy 6: Check data attributes
      const dataLabel = field.getAttribute('data-label') || field.getAttribute('data-field-label');
      if (dataLabel) return this.cleanLabelText(dataLabel);

      // Strategy 7: Look at parent's parent (for complex nested structures)
      const grandparent = parent?.parentElement;
      if (grandparent) {
        const labels = grandparent.querySelectorAll('label');
        if (labels.length === 1) {
          return this.cleanLabelText(labels[0].textContent);
        }
      }

    } catch (error) {
      console.error('[Autofill] Error getting field label:', error);
    }

    return '';
  }

  cleanLabelText(text) {
    if (!text) return '';
    return text
      .trim()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\*$/, '')     // Remove asterisks (required field markers)
      .replace(/\(optional\)/i, '')  // Remove "(optional)"
      .replace(/\(required\)/i, '')  // Remove "(required)"
      .trim();
  }

  async fillGenericForm(fields, resumeData) {
    try {
      console.log('[Autofill] 📝 Filling generic form...');

      // First, handle resume file upload if present
      await this.handleResumeUpload(fields, resumeData);

      // Then fill other fields
      for (const field of fields) {
        try {
          const fieldType = this.identifyFieldType(field);

          if (fieldType) {
            const value = this.getValueForField(fieldType, resumeData, field);
            if (value !== null && value !== undefined && value !== '') {
              console.log(`[Autofill] ✍️ Filling ${fieldType} with value: ${value}`);
              await this.fillField(field.element, value);
            } else {
              console.log(`[Autofill] ⏭️ Skipping ${fieldType} - no value available`);
            }
          } else {
            console.log(`[Autofill] ❓ Could not identify field type for: ${field.label || field.name || field.id}`);
          }
        } catch (error) {
          console.error('[Autofill] ❌ Error filling field:', field, error);
        }
      }

      console.log('[Autofill] ✅ Generic form filling complete');
    } catch (error) {
      console.error('[Autofill] ❌ Error in fillGenericForm:', error);
    }
  }

  async fillWorkdayForm(fields, resumeData) {
    try {
      console.log('[Autofill] 🏢 Filling Workday form...');
      console.log('[Autofill] 📊 Workday resume data:', {
        hasWorkAuth: !!resumeData.workAuthorization,
        hasSponsorship: !!resumeData.requireSponsorship,
        hasGovernmentEmployee: !!resumeData.governmentEmployee,
        hasLegalQuestions: !!(resumeData.governmentEmployee || resumeData.restrictedCountryCitizen)
      });

      // First, handle resume upload if present
      await this.handleResumeUpload(fields, resumeData);

      // Add delay to allow Workday form to fully load
      await this.delay(500);

      // Workday has specific field patterns and requires special handling
      for (const field of fields) {
        try {
          const fieldType = this.identifyFieldType(field);

          if (fieldType) {
            const value = this.getValueForField(fieldType, resumeData, field);
            if (value) {
              console.log(`[Autofill] 🏢 Workday filling ${fieldType}: ${value}`);
              await this.fillField(field.element, value);

              // Workday often requires triggering additional change events
              this.triggerWorkdayEvents(field.element);

              // Extra delay for Workday's dynamic form updates
              await this.delay(100);
            }
          }
        } catch (error) {
          console.error('[Autofill] ❌ Error filling Workday field:', field, error);
        }
      }

      // Wait for any dynamic content to load
      await this.delay(500);

      console.log('[Autofill] ✅ Workday form filling complete');
    } catch (error) {
      console.error('[Autofill] ❌ Error in fillWorkdayForm:', error);
    }
  }

  async fillGreenhouseForm(fields, resumeData) {
    console.log('[Autofill] 🌱 Filling Greenhouse form...');
    console.log('[Autofill] 📊 Resume data:', {
      hasEducation: !!resumeData.education?.length,
      education: resumeData.education,
      hasGender: !!resumeData.gender,
      hasRace: !!resumeData.race,
      hasHispanicLatino: !!resumeData.hispanicLatino,
      hasVeteranStatus: !!resumeData.veteranStatus
    });

    // First, handle resume upload if present
    await this.handleResumeUpload(fields, resumeData);

    // Add delay to allow form to fully load
    await this.delay(300);

    for (const field of fields) {
      try {
        const fieldType = this.identifyFieldType(field);

        if (fieldType) {
          const value = this.getValueForField(fieldType, resumeData, field);
          if (value) {
            console.log(`[Autofill] 📝 Attempting to fill ${fieldType}: ${value}`);
            await this.fillField(field.element, value);
          } else {
            console.log(`[Autofill] ⏭️ Skipping ${fieldType} - no value available`);
          }
        }
      } catch (error) {
        console.error(`[Autofill] ❌ Error processing field:`, field, error);
      }
    }

    console.log('[Autofill] ✅ Greenhouse form filling complete');
  }

  async fillLeverForm(fields, resumeData) {
    try {
      console.log('[Autofill] 🎚️ Filling Lever form...');

      // First, handle resume upload if present
      await this.handleResumeUpload(fields, resumeData);

      for (const field of fields) {
        try {
          const fieldType = this.identifyFieldType(field);

          if (fieldType) {
            const value = this.getValueForField(fieldType, resumeData, field);
            if (value) {
              await this.fillField(field.element, value);
            }
          }
        } catch (error) {
          console.error('[Autofill] ❌ Error filling Lever field:', field, error);
        }
      }

      console.log('[Autofill] ✅ Lever form filling complete');
    } catch (error) {
      console.error('[Autofill] ❌ Error in fillLeverForm:', error);
    }
  }

  identifyFieldType(field) {
    // Use intelligent semantic matching if enabled
    if (this.useIntelligentMatching) {
      return this.identifyFieldTypeIntelligent(field);
    }

    // Fallback to legacy matching
    return this.identifyFieldTypeLegacy(field);
  }

  /**
   * Intelligent field type identification using semantic matching
   */
  identifyFieldTypeIntelligent(field) {
    // Try legacy matching FIRST (it's more comprehensive)
    const legacyMatch = this.identifyFieldTypeLegacy(field);

    if (legacyMatch) {
      console.log(`[Autofill] 🎯 Legacy match: ${legacyMatch} for field: ${field.label || field.name || field.id}`);
      return legacyMatch;
    }

    // If legacy fails, try intelligent matching
    const context = this.semanticMatcher.getSectionContext(field.element);
    const match = this.semanticMatcher.matchField(field, context);

    // Lower threshold to 30% to be more aggressive
    if (match.fieldType && match.confidence >= 0.3) {
      console.log(
        `[Autofill] 🧠 Intelligent match: ${match.fieldType} ` +
        `(confidence: ${(match.confidence * 100).toFixed(0)}%) ` +
        `for field: ${field.label || field.name || field.id}`
      );
      console.log(`[Autofill] 💡 Reasoning: ${match.reasoning}`);

      return match.fieldType;
    }

    console.log(`[Autofill] ❓ No match found for field: ${field.label || field.name || field.id}`);
    return null;
  }

  /**
   * Legacy field type identification (backward compatibility)
   */
  identifyFieldTypeLegacy(field) {
    const searchText = [
      field.name,
      field.id,
      field.placeholder,
      field.label,
      field.ariaLabel,
      field.dataTestId
    ].join(' ').toLowerCase();

    // Special case: File inputs for resume/CV - MUST CHECK FIRST
    if (field.inputType === 'file') {
      if (searchText.includes('resume') || searchText.includes('cv')) {
        console.log(`[Autofill] 🎯 Identified field type: FILE (resume) for field: ${field.label || field.name || field.id}`);
        return null; // Don't try to fill file inputs with text
      }
    }

    // Special case: Exclude LinkedIn fields from professional summary matching
    if (searchText.includes('linkedin')) {
      // Only match linkedin field type
      for (const keyword of this.fieldMappings.linkedin) {
        if (searchText.includes(keyword)) {
          return 'linkedin';
        }
      }
      return null; // Don't match other field types for LinkedIn fields
    }

    // Check each field mapping with priority order
    // Check more specific fields first to avoid false matches
    const priorityOrder = [
      'firstName', 'lastName', 'middleName', 'fullName',
      'email', 'phone', 'mobileNumber',
      'linkedin', 'github', 'portfolio', 'website',
      'address', 'address2', 'city', 'state', 'zipCode', 'country',
      'currentCompany', 'jobTitle',
      'university', 'degree', 'major', 'gpa', 'graduationYear',
      'workAuthorization', 'requireSponsorship'
    ];

    // First check priority fields
    for (const fieldType of priorityOrder) {
      const keywords = this.fieldMappings[fieldType];
      if (keywords) {
        for (const keyword of keywords) {
          if (searchText.includes(keyword)) {
            console.log(`[Autofill] 🎯 Identified field type: ${fieldType} for field: ${field.label || field.name || field.id}`);
            return fieldType;
          }
        }
      }
    }

    // Then check remaining fields
    for (const [fieldType, keywords] of Object.entries(this.fieldMappings)) {
      if (priorityOrder.includes(fieldType)) continue; // Skip already checked

      for (const keyword of keywords) {
        if (searchText.includes(keyword)) {
          console.log(`[Autofill] 🎯 Legacy match: ${fieldType} for field: ${field.label || field.name || field.id}`);
          return fieldType;
        }
      }
    }

    return null;
  }

  getValueForField(fieldType, resumeData, field = null) {
    // Always try legacy first (it's more comprehensive)
    const legacyValue = this.getValueForFieldLegacy(fieldType, resumeData);

    if (legacyValue !== null && legacyValue !== undefined && legacyValue !== '') {
      return legacyValue;
    }

    // If legacy fails and intelligent matching is enabled, try intelligent mapper
    if (this.useIntelligentMatching && field) {
      const value = this.valueMapper.getValue(fieldType, resumeData, field);
      if (value !== null && value !== undefined && value !== '') {
        console.log(`[Autofill] 🧠 Intelligent value mapping: ${fieldType} = ${value}`);
        return value;
      }
    }

    return null;
  }

  getValueForFieldLegacy(fieldType, resumeData) {
    const mapping = {
      // Personal Information
      firstName: () => resumeData.firstName || this.splitName(resumeData.fullName).firstName,
      middleName: () => resumeData.middleName || '',
      lastName: () => resumeData.lastName || this.splitName(resumeData.fullName).lastName,
      fullName: () => resumeData.fullName,
      professionalSummary: () => resumeData.professionalSummary || '',

      // Contact Information
      email: () => resumeData.email,
      phone: () => resumeData.phone,
      phoneCountryCode: () => resumeData.phoneCountryCode || '+1',
      phoneType: () => resumeData.phoneType || 'Mobile',
      mobileNumber: () => resumeData.mobileNumber || resumeData.phone,
      address: () => resumeData.address,
      city: () => resumeData.city,
      state: () => resumeData.state,
      zipCode: () => resumeData.zipCode,
      country: () => resumeData.country,
      linkedin: () => resumeData.linkedin,
      github: () => resumeData.github,
      portfolio: () => resumeData.portfolio || resumeData.website,
      website: () => resumeData.website || resumeData.portfolio,

      // Work Experience (first entry)
      currentCompany: () => resumeData.experiences?.[0]?.company || '',
      jobTitle: () => resumeData.experiences?.[0]?.title || '',
      companyLocation: () => resumeData.experiences?.[0]?.location || '',
      startDate: () => resumeData.experiences?.[0]?.startDate || '',
      endDate: () => resumeData.experiences?.[0]?.endDate || '',
      responsibilities: () => resumeData.experiences?.[0]?.responsibilities || '',

      // Education (first entry)
      university: () => resumeData.education?.[0]?.university || '',
      degree: () => resumeData.education?.[0]?.degree || '',
      major: () => resumeData.education?.[0]?.major || '',
      graduationYear: () => resumeData.education?.[0]?.endDate || '',
      gpa: () => resumeData.education?.[0]?.gpa || '',

      // Skills
      skills: () => resumeData.skills || (resumeData.skillsArray ? resumeData.skillsArray.join(', ') : ''),

      // Legal & Additional
      workAuthorization: () => resumeData.workAuthorization || '',
      requireSponsorship: () => resumeData.requireSponsorship || '',
      clearanceEligibility: () => resumeData.clearanceEligibility || '',

      // Workday-specific legal questions (default to safe/common answers)
      legalRightToWork: () => resumeData.legalRightToWork || 'Yes',
      unrestrictedWorkRight: () => resumeData.unrestrictedWorkRight || 'Yes',
      governmentEmployee: () => resumeData.governmentEmployee || 'No',
      governmentResponsibilities: () => resumeData.governmentResponsibilities || 'No',
      familyGovernmentEmployee: () => resumeData.familyGovernmentEmployee || 'No',
      postGovernmentRestrictions: () => resumeData.postGovernmentRestrictions || 'No',
      debarred: () => resumeData.debarred || 'No',
      restrictedCountryCitizen: () => resumeData.restrictedCountryCitizen || 'No',

      // EEO fields
      gender: () => resumeData.gender || '',
      race: () => resumeData.race || '',
      hispanicLatino: () => resumeData.hispanicLatino || '',
      veteranStatus: () => resumeData.veteranStatus || '',
      disability: () => resumeData.disability || '',

      preferredLocation: () => resumeData.preferredLocation || resumeData.city || '',
      availableStartDate: () => resumeData.availableStartDate || '',
      willingToRelocate: () => resumeData.willingToRelocate || '',
      desiredSalary: () => resumeData.desiredSalary || '',

      // Legacy/Other
      yearsOfExperience: () => this.calculateYearsOfExperience(resumeData.experiences),
      coverLetter: () => '' // Users upload their own cover letter
    };

    const getter = mapping[fieldType];
    return getter ? getter() : '';
  }

  splitName(fullName) {
    if (!fullName) return { firstName: '', lastName: '' };

    const parts = fullName.trim().split(' ');
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }

  calculateYearsOfExperience(workExperience) {
    if (!workExperience || workExperience.length === 0) return '';

    // Simple calculation - count years from first job
    const firstJob = workExperience[0];
    const yearMatch = firstJob.duration?.match(/(\d{4})/);
    if (yearMatch) {
      const startYear = parseInt(yearMatch[1]);
      const currentYear = new Date().getFullYear();
      return (currentYear - startYear).toString();
    }

    return '';
  }

  async handleResumeUpload(fields, resumeData) {
    try {
      // Find file input fields that accept resumes
      const fileInputs = fields.filter(field =>
        field.inputType === 'file' &&
        (field.accept.includes('.pdf') ||
         field.accept.includes('.doc') ||
         field.accept.includes('application/pdf') ||
         field.label.toLowerCase().includes('resume') ||
         field.label.toLowerCase().includes('cv') ||
         field.name.toLowerCase().includes('resume') ||
         field.name.toLowerCase().includes('cv') ||
         field.id.toLowerCase().includes('resume') ||
         field.id.toLowerCase().includes('cv'))
      );

      console.log(`[Autofill] 🔍 Found ${fileInputs.length} resume upload field(s)`);

      if (fileInputs.length === 0) {
        console.log('[Autofill] ℹ️ No resume upload field found');
        return;
      }

      // Get the stored resume file from userProfile
      const result = await chrome.storage.local.get(['userProfile']);
      const resumeFile = result.userProfile?.resumeFile;

      if (!resumeFile) {
        console.log('[Autofill] ⚠️ No resume file stored in profile');
        return;
      }

      console.log('[Autofill] 📄 Resume file found:', resumeFile.name, `(${(resumeFile.size / 1024).toFixed(2)} KB)`);

      // Upload resume to each file input with retry logic
      for (const fileInput of fileInputs) {
        let uploadSuccess = false;
        let attempts = 0;
        const maxAttempts = 3;

        while (!uploadSuccess && attempts < maxAttempts) {
          attempts++;
          try {
            console.log(`[Autofill] 📤 Uploading resume (attempt ${attempts}/${maxAttempts})...`);
            await this.uploadResumeToField(fileInput.element, resumeFile);
            uploadSuccess = true;
            console.log('[Autofill] ✅ Resume uploaded successfully to:', fileInput.label || fileInput.name || fileInput.id);
          } catch (error) {
            console.error(`[Autofill] ❌ Upload attempt ${attempts} failed:`, error);
            if (attempts < maxAttempts) {
              console.log(`[Autofill] 🔄 Retrying in 500ms...`);
              await this.delay(500);
            }
          }
        }

        if (!uploadSuccess) {
          console.error('[Autofill] ❌ Failed to upload resume after', maxAttempts, 'attempts');
        }
      }
    } catch (error) {
      console.error('[Autofill] ❌ Error in handleResumeUpload:', error);
    }
  }

  async uploadResumeToField(fileInput, resumeFile) {
    try {
      if (!fileInput) {
        throw new Error('File input element is null or undefined');
      }

      if (!resumeFile || !resumeFile.data) {
        throw new Error('Resume file data is missing');
      }

      // Convert base64 back to File object
      const base64Data = resumeFile.data.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid base64 data');
      }

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: resumeFile.type || 'application/pdf' });
      const file = new File([blob], resumeFile.name || 'resume.pdf', {
        type: resumeFile.type || 'application/pdf',
        lastModified: Date.now()
      });

      console.log('[Autofill] 📎 Created file object:', file.name, `(${(file.size / 1024).toFixed(2)} KB)`);

      // Create a DataTransfer object to set files
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      // Set the files on the input
      fileInput.files = dataTransfer.files;

      // Verify the file was set
      if (fileInput.files.length === 0) {
        throw new Error('Failed to set file on input element');
      }

      console.log('[Autofill] ✓ File set on input, triggering events...');

      // Trigger change events
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);

      // Also trigger input event for some frameworks
      const inputEvent = new Event('input', { bubbles: true });
      fileInput.dispatchEvent(inputEvent);

      // Wait a bit for the events to process
      await this.delay(200);

      // Mark as filled
      this.filledFields.add(fileInput);

      console.log('[Autofill] ✅ Resume upload complete');

    } catch (error) {
      console.error('[Autofill] ❌ Error in uploadResumeToField:', error);
      throw error; // Re-throw to allow retry logic
    }
  }

  async fillField(element, value) {
    if (!element || value === null || value === undefined || this.filledFields.has(element)) {
      return;
    }

    try {
      // Get field identifier for logging
      const fieldId = element.name || element.id || element.placeholder || 'unknown';
      const fieldLabel = this.getFieldLabel(element) || fieldId;

      console.log(`[Autofill] 🖊️ Filling: "${fieldLabel}" with "${value}"`);

      // Focus the field first
      element.focus();
      await this.delay(50);

      // Handle different field types
      if (element.tagName === 'SELECT') {
        const success = this.fillSelectField(element, value);
        if (!success) {
          console.warn(`[Autofill] ⚠️ Could not find matching option for select: ${fieldLabel}`);
          return;
        }
      } else if (element.type === 'radio') {
        const success = this.fillRadioField(element, value);
        if (!success) {
          console.warn(`[Autofill] ⚠️ Could not select radio button: ${fieldLabel}`);
          return;
        }
      } else if (element.type === 'checkbox') {
        this.fillCheckboxField(element, value);
      } else if (element.type === 'date') {
        this.fillDateField(element, value);
      } else if (element.type === 'email') {
        this.fillEmailField(element, value);
      } else if (element.type === 'tel') {
        this.fillPhoneField(element, value);
      } else if (element.getAttribute('contenteditable') === 'true') {
        this.fillContentEditableField(element, value);
      } else {
        // Standard text/textarea field
        // Check if it's a special autocomplete field
        const isAutocomplete = element.getAttribute('role') === 'combobox' ||
                              element.getAttribute('aria-autocomplete') ||
                              fieldLabel.toLowerCase().includes('skill');

        if (isAutocomplete && typeof value === 'string' && value.includes(',')) {
          await this.fillSkillsField(element, value);
        } else {
          // Use native setter to bypass React/Vue
          this.setValueNatively(element, value);
        }
      }

      // Trigger comprehensive events
      this.triggerChangeEvents(element);

      // Mark as filled
      this.filledFields.add(element);

      // Small delay between fields
      await this.delay(50);

      console.log(`[Autofill] ✓ Successfully filled: "${fieldLabel}"`);

    } catch (error) {
      console.error('[Autofill] ❌ Error filling field:', element.name || element.id, error);
    }
  }

  /**
   * Set value using native setters (bypasses framework restrictions)
   */
  setValueNatively(element, value) {
    const descriptor = Object.getOwnPropertyDescriptor(
      element.constructor.prototype,
      'value'
    );

    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
  }

  /**
   * Fill radio button field
   */
  fillRadioField(element, value) {
    const name = element.name;
    if (!name) {
      element.checked = this.parseBooleanValue(value);
      return true;
    }

    // Find all radio buttons with the same name
    const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
    const valueStr = String(value).toLowerCase();

    // Try to find matching radio button
    for (const radio of radios) {
      const radioValue = (radio.value || '').toLowerCase();
      const radioLabel = (this.getFieldLabel(radio) || '').toLowerCase();

      if (radioValue === valueStr || radioLabel.includes(valueStr) || valueStr.includes(radioLabel)) {
        radio.checked = true;
        this.triggerChangeEvents(radio);
        console.log(`[Autofill] ✓ Selected radio: ${radio.value}`);
        return true;
      }
    }

    // Fallback: check first radio if value suggests "yes" or positive
    if (this.parseBooleanValue(value) && radios.length > 0) {
      radios[0].checked = true;
      this.triggerChangeEvents(radios[0]);
      return true;
    }

    return false;
  }

  /**
   * Fill checkbox field
   */
  fillCheckboxField(element, value) {
    element.checked = this.parseBooleanValue(value);
    this.triggerChangeEvents(element);
  }

  /**
   * Fill date field
   */
  fillDateField(element, value) {
    // Ensure date is in YYYY-MM-DD format
    let formattedDate = value;

    if (value && typeof value === 'string') {
      // Parse various date formats
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        formattedDate = `${year}-${month}-${day}`;
      }
    }

    this.setValueNatively(element, formattedDate);
  }

  /**
   * Fill email field
   */
  fillEmailField(element, value) {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(value)) {
      this.setValueNatively(element, value);
    } else {
      console.warn(`[Autofill] ⚠️ Invalid email format: ${value}`);
    }
  }

  /**
   * Fill phone field
   */
  fillPhoneField(element, value) {
    // Clean phone number
    let phone = String(value).replace(/\D/g, '');

    // Format based on length
    if (phone.length === 10) {
      // US format: (123) 456-7890
      phone = `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    } else if (phone.length === 11 && phone[0] === '1') {
      // US with country code: +1 (123) 456-7890
      phone = `+1 (${phone.slice(1, 4)}) ${phone.slice(4, 7)}-${phone.slice(7)}`;
    }

    this.setValueNatively(element, phone);
  }

  /**
   * Fill contenteditable field
   */
  fillContentEditableField(element, value) {
    element.textContent = value;
    element.innerText = value;

    // Trigger input event for contenteditable
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: value
    });
    element.dispatchEvent(inputEvent);
  }

  /**
   * Parse boolean value from various formats
   */
  parseBooleanValue(value) {
    if (typeof value === 'boolean') return value;

    const str = String(value).toLowerCase().trim();
    const truthyValues = ['yes', 'y', 'true', '1', 'on', 'checked', 'selected'];

    return truthyValues.includes(str);
  }

  async fillSkillsField(element, skillsString) {
    try {
      console.log('[Autofill] 🎯 Detected skills field, attempting to fill:', skillsString);

      // Try different approaches for skills fields

      // Approach 1: Just set the value directly (works for some forms)
      element.value = skillsString;
      this.triggerChangeEvents(element);
      await this.delay(100);

      // Approach 2: Type each skill individually (for autocomplete fields)
      const skills = skillsString.split(',').map(s => s.trim()).filter(s => s);

      for (const skill of skills.slice(0, 10)) { // Limit to 10 skills
        element.value = skill;

        // Trigger input event to show autocomplete
        const inputEvent = new Event('input', { bubbles: true });
        element.dispatchEvent(inputEvent);

        await this.delay(200);

        // Try to press Enter to add the skill
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        });
        element.dispatchEvent(enterEvent);

        await this.delay(100);
      }

      console.log('[Autofill] ✓ Skills field filled');

    } catch (error) {
      console.error('[Autofill] ❌ Error filling skills field:', error);
      // Fallback: just set the comma-separated string
      element.value = skillsString;
    }
  }

  fillSelectField(selectElement, value) {
    try {
      // Get all options
      const options = Array.from(selectElement.options);

      if (options.length === 0) {
        console.warn('[Autofill] ⚠️ Select field has no options:', selectElement.name || selectElement.id);
        return false;
      }

      console.log(`[Autofill] 🔍 Trying to match "${value}" in select field with ${options.length} options`);

      // Strategy 1: Exact value match (case-insensitive)
      let option = options.find(opt =>
        opt.value && opt.value.toLowerCase() === value.toLowerCase()
      );

      // Strategy 2: Exact text match (case-insensitive)
      if (!option) {
        option = options.find(opt =>
          opt.text && opt.text.toLowerCase() === value.toLowerCase()
        );
      }

      // Strategy 3: Partial text match - value contains option text
      if (!option) {
        option = options.find(opt =>
          opt.text && value.toLowerCase().includes(opt.text.toLowerCase())
        );
      }

      // Strategy 4: Partial text match - option text contains value
      if (!option) {
        option = options.find(opt =>
          opt.text && opt.text.toLowerCase().includes(value.toLowerCase())
        );
      }

      // Strategy 5: Partial value match
      if (!option) {
        option = options.find(opt =>
          opt.value && (
            opt.value.toLowerCase().includes(value.toLowerCase()) ||
            value.toLowerCase().includes(opt.value.toLowerCase())
          )
        );
      }

      if (option) {
        selectElement.value = option.value;
        console.log(`[Autofill] ✓ Matched option: "${option.text}" (value: "${option.value}")`);
        return true;
      }

      // Log available options for debugging
      console.warn(`[Autofill] ⚠️ No match found. Available options:`,
        options.map(opt => `"${opt.text}" (value: "${opt.value}")`).join(', ')
      );
      return false;

    } catch (error) {
      console.error('[Autofill] ❌ Error in fillSelectField:', error);
      return false;
    }
  }

  triggerChangeEvents(element) {
    // Comprehensive event triggering for maximum compatibility

    // 1. Standard DOM events
    const events = [
      { type: 'input', bubbles: true, cancelable: true },
      { type: 'change', bubbles: true, cancelable: true },
      { type: 'blur', bubbles: true, cancelable: false },
      { type: 'focusout', bubbles: true, cancelable: false }
    ];

    events.forEach(({ type, bubbles, cancelable }) => {
      const event = new Event(type, { bubbles, cancelable });
      element.dispatchEvent(event);
    });

    // 2. React-specific events
    // React uses internal event system, need to trigger both native and React events
    if (element._valueTracker) {
      element._valueTracker.setValue('');
    }

    // Trigger React's synthetic events by dispatching native events
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;

    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;

    if (element instanceof HTMLInputElement && nativeInputValueSetter) {
      nativeInputValueSetter.call(element, element.value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (element instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(element, element.value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 3. Vue-specific events
    // Vue listens to input events, trigger v-model update
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      data: element.value
    });
    element.dispatchEvent(inputEvent);

    // 4. Angular-specific events
    // Angular uses zone.js, trigger both input and change
    const changeEvent = new Event('change', { bubbles: true });
    element.dispatchEvent(changeEvent);

    // 5. Keyboard events (some forms validate on keyup)
    const keyboardEvents = ['keydown', 'keypress', 'keyup'];
    keyboardEvents.forEach(type => {
      const keyEvent = new KeyboardEvent(type, {
        bubbles: true,
        cancelable: true,
        key: 'Unidentified',
        code: 'Unidentified'
      });
      element.dispatchEvent(keyEvent);
    });

    // 6. Focus events
    const focusEvent = new FocusEvent('focus', { bubbles: false });
    element.dispatchEvent(focusEvent);
  }

  triggerWorkdayEvents(element) {
    // Workday uses specific event patterns
    this.triggerChangeEvents(element);

    // Additional Workday-specific events
    const keyboardEvent = new KeyboardEvent('keydown', { bubbles: true });
    element.dispatchEvent(keyboardEvent);

    const keyupEvent = new KeyboardEvent('keyup', { bubbles: true });
    element.dispatchEvent(keyupEvent);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `autofill-notification autofill-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#000' : '#e74c3c'};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 999999;
      animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Monitor for page changes (for multi-page forms like Workday)
  startPageMonitoring() {
    console.log('[Autofill] 👀 Monitoring for page changes...');

    // Watch for URL changes
    let lastUrl = location.href;
    const urlObserver = setInterval(() => {
      if (location.href !== lastUrl) {
        console.log('[Autofill] 🔄 Page changed, re-autofilling...');
        lastUrl = location.href;

        // Wait for page to load
        setTimeout(async () => {
          const result = await chrome.storage.local.get(['userProfile']);
          if (result.userProfile) {
            this.autofillForm(result.userProfile);
          }
        }, 1000);
      }
    }, 500);

    // Store observer ID for cleanup
    this.urlObserver = urlObserver;
  }

  stopPageMonitoring() {
    if (this.urlObserver) {
      clearInterval(this.urlObserver);
      this.urlObserver = null;
    }

    if (this.formObserver) {
      this.formObserver.disconnect();
      this.formObserver = null;
    }
  }

  /**
   * Get autofill statistics for debugging
   */
  getStats() {
    return {
      totalFieldsFound: this.findAllFormFields().length,
      fieldsFilled: this.filledFields.size,
      isMonitoring: !!this.formObserver,
      platform: this.platformDetector.getPlatformName(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Export debug information
   */
  exportDebugInfo() {
    const fields = this.findAllFormFields();

    return {
      stats: this.getStats(),
      fields: fields.map(f => ({
        label: f.label,
        name: f.name,
        id: f.id,
        type: f.inputType,
        visible: f.isVisible,
        filled: this.filledFields.has(f.element)
      })),
      platform: this.platformDetector.detectPlatform(),
      url: window.location.href
    };
  }
}

// Platform Detector
class PlatformDetector {
  detectPlatform() {
    const url = window.location.href.toLowerCase();
    const hostname = window.location.hostname.toLowerCase();

    if (hostname.includes('myworkdayjobs.com') || url.includes('workday')) {
      return 'workday';
    }

    if (hostname.includes('greenhouse.io') || url.includes('greenhouse')) {
      return 'greenhouse';
    }

    if (hostname.includes('lever.co') || url.includes('lever')) {
      return 'lever';
    }

    if (hostname.includes('taleo.net') || url.includes('taleo')) {
      return 'taleo';
    }

    if (hostname.includes('icims.com') || url.includes('icims')) {
      return 'icims';
    }

    if (hostname.includes('smartrecruiters.com')) {
      return 'smartrecruiters';
    }

    if (hostname.includes('jobvite.com')) {
      return 'jobvite';
    }

    // NEW: Ashby ATS
    if (hostname.includes('ashbyhq.com') || url.includes('ashby')) {
      return 'ashby';
    }

    // NEW: Breezy HR
    if (hostname.includes('breezy.hr')) {
      return 'breezy';
    }

    // NEW: Workable
    if (hostname.includes('workable.com')) {
      return 'workable';
    }

    return 'generic';
  }

  getPlatformName() {
    const platform = this.detectPlatform();
    const names = {
      workday: 'Workday',
      greenhouse: 'Greenhouse',
      lever: 'Lever',
      taleo: 'Oracle Taleo',
      icims: 'iCIMS',
      smartrecruiters: 'SmartRecruiters',
      jobvite: 'Jobvite',
      ashby: 'Ashby',
      breezy: 'Breezy HR',
      workable: 'Workable',
      generic: 'Unknown Platform'
    };

    return names[platform] || 'Unknown Platform';
  }
}

// Make it globally available
if (typeof window !== 'undefined') {
  window.autofillEngine = new AutofillEngine();
}



