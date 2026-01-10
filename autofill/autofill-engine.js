// Autofill Engine - Intelligently fills job application forms

class AutofillEngine {
  constructor() {
    this.platformDetector = new PlatformDetector();
    this.fieldMappings = this.initializeFieldMappings();
    this.filledFields = new Set();
    this.isAutofilling = false;
  }

  initializeFieldMappings() {
    return {
      // Name fields
      firstName: ['firstname', 'first-name', 'first_name', 'fname', 'givenname', 'given-name', 'forename'],
      lastName: ['lastname', 'last-name', 'last_name', 'lname', 'surname', 'familyname', 'family-name'],
      fullName: ['fullname', 'full-name', 'full_name', 'name', 'applicant-name', 'candidate-name', 'your-name'],
      
      // Contact fields
      email: ['email', 'e-mail', 'email-address', 'emailaddress', 'mail', 'contact-email'],
      phone: ['phone', 'telephone', 'mobile', 'cell', 'phonenumber', 'phone-number', 'phone_number', 'contact-number'],
      
      // Address fields
      address: ['address', 'street', 'address-line-1', 'address1', 'street-address', 'addressline1'],
      address2: ['address-line-2', 'address2', 'apt', 'suite', 'unit', 'addressline2'],
      city: ['city', 'town', 'locality'],
      state: ['state', 'province', 'region', 'stateprovince'],
      zipCode: ['zip', 'zipcode', 'zip-code', 'postal', 'postalcode', 'postal-code', 'postcode'],
      country: ['country', 'nation'],
      
      // Professional fields
      linkedin: ['linkedin', 'linkedin-url', 'linkedin-profile', 'linkedinurl'],
      github: ['github', 'github-url', 'github-profile', 'githuburl'],
      website: ['website', 'portfolio', 'personal-website', 'url', 'homepage'],
      
      // Work authorization
      workAuthorization: ['work-authorization', 'authorized', 'work-permit', 'visa-status', 'employment-eligibility'],
      requireSponsorship: ['sponsorship', 'visa-sponsorship', 'require-sponsorship', 'need-sponsorship'],
      
      // Other common fields
      currentCompany: ['current-company', 'employer', 'current-employer', 'company'],
      yearsOfExperience: ['years-experience', 'experience-years', 'years-of-experience', 'total-experience'],
      desiredSalary: ['salary', 'desired-salary', 'expected-salary', 'salary-expectation', 'compensation'],
      startDate: ['start-date', 'available-date', 'availability', 'earliest-start'],
      
      // Cover letter / Additional info
      coverLetter: ['cover-letter', 'coverletter', 'message', 'additional-information', 'why-interested'],
      
      // Education
      university: ['university', 'college', 'school', 'institution', 'education'],
      degree: ['degree', 'education-level', 'highest-degree'],
      major: ['major', 'field-of-study', 'discipline', 'concentration'],
      gpa: ['gpa', 'grade-point-average'],
      graduationYear: ['graduation-year', 'grad-year', 'year-graduated', 'completion-year']
    };
  }

  async autofillForm(resumeData) {
    if (this.isAutofilling) {
      console.log('[Autofill] ⏭️ Already autofilling, skipping...');
      return;
    }

    this.isAutofilling = true;
    this.filledFields.clear();

    console.log('[Autofill] 🚀 Starting autofill...');
    
    try {
      const platform = this.platformDetector.detectPlatform();
      console.log('[Autofill] 🎯 Detected platform:', platform);

      // Get all form fields
      const fields = this.findAllFormFields();
      console.log('[Autofill] 📝 Found', fields.length, 'form fields');

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

  findAllFormFields() {
    const fields = [];
    
    // Find all input, textarea, and select elements
    const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
    const textareas = document.querySelectorAll('textarea');
    const selects = document.querySelectorAll('select');
    
    [...inputs, ...textareas, ...selects].forEach(field => {
      if (this.isFieldVisible(field)) {
        fields.push({
          element: field,
          type: field.tagName.toLowerCase(),
          inputType: field.type || 'text',
          name: field.name || '',
          id: field.id || '',
          placeholder: field.placeholder || '',
          label: this.getFieldLabel(field),
          ariaLabel: field.getAttribute('aria-label') || '',
          dataTestId: field.getAttribute('data-testid') || '',
          className: field.className || ''
        });
      }
    });
    
    return fields;
  }

  isFieldVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    
    return true;
  }

  getFieldLabel(field) {
    // Try to find associated label
    if (field.id) {
      const label = document.querySelector(`label[for="${field.id}"]`);
      if (label) return label.textContent.trim();
    }

    // Check parent label
    const parentLabel = field.closest('label');
    if (parentLabel) return parentLabel.textContent.trim();

    // Check previous sibling
    let prev = field.previousElementSibling;
    if (prev && prev.tagName === 'LABEL') {
      return prev.textContent.trim();
    }

    return '';
  }

  async fillGenericForm(fields, resumeData) {
    for (const field of fields) {
      const fieldType = this.identifyFieldType(field);

      if (fieldType) {
        const value = this.getValueForField(fieldType, resumeData);
        if (value) {
          await this.fillField(field.element, value);
        }
      }
    }
  }

  async fillWorkdayForm(fields, resumeData) {
    console.log('[Autofill] 🏢 Filling Workday form...');

    // Workday has specific field patterns
    for (const field of fields) {
      const fieldType = this.identifyFieldType(field);

      if (fieldType) {
        const value = this.getValueForField(fieldType, resumeData);
        if (value) {
          await this.fillField(field.element, value);

          // Workday often requires triggering change events
          this.triggerWorkdayEvents(field.element);
        }
      }
    }

    // Wait for any dynamic content to load
    await this.delay(500);
  }

  async fillGreenhouseForm(fields, resumeData) {
    console.log('[Autofill] 🌱 Filling Greenhouse form...');

    for (const field of fields) {
      const fieldType = this.identifyFieldType(field);

      if (fieldType) {
        const value = this.getValueForField(fieldType, resumeData);
        if (value) {
          await this.fillField(field.element, value);
        }
      }
    }
  }

  async fillLeverForm(fields, resumeData) {
    console.log('[Autofill] 🎚️ Filling Lever form...');

    for (const field of fields) {
      const fieldType = this.identifyFieldType(field);

      if (fieldType) {
        const value = this.getValueForField(fieldType, resumeData);
        if (value) {
          await this.fillField(field.element, value);
        }
      }
    }
  }

  identifyFieldType(field) {
    const searchText = [
      field.name,
      field.id,
      field.placeholder,
      field.label,
      field.ariaLabel,
      field.dataTestId
    ].join(' ').toLowerCase();

    // Check each field mapping
    for (const [fieldType, keywords] of Object.entries(this.fieldMappings)) {
      for (const keyword of keywords) {
        if (searchText.includes(keyword)) {
          return fieldType;
        }
      }
    }

    return null;
  }

  getValueForField(fieldType, resumeData) {
    const mapping = {
      firstName: () => this.splitName(resumeData.fullName).firstName,
      lastName: () => this.splitName(resumeData.fullName).lastName,
      fullName: () => resumeData.fullName,
      email: () => resumeData.email,
      phone: () => resumeData.phone,
      address: () => resumeData.address,
      city: () => resumeData.city,
      state: () => resumeData.state,
      zipCode: () => resumeData.zipCode,
      country: () => resumeData.country,
      linkedin: () => resumeData.linkedin,
      github: () => resumeData.github,
      website: () => resumeData.website,
      university: () => resumeData.education?.[0]?.school || '',
      degree: () => resumeData.education?.[0]?.degree || '',
      major: () => resumeData.education?.[0]?.major || '',
      graduationYear: () => resumeData.education?.[0]?.year || '',
      currentCompany: () => resumeData.workExperience?.[0]?.company || '',
      yearsOfExperience: () => this.calculateYearsOfExperience(resumeData.workExperience),
      coverLetter: () => this.generateCoverLetter(resumeData)
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

  generateCoverLetter(resumeData) {
    if (!resumeData.summary) return '';

    return `Dear Hiring Manager,\n\n${resumeData.summary}\n\nI look forward to discussing this opportunity further.\n\nBest regards,\n${resumeData.fullName}`;
  }

  async fillField(element, value) {
    if (!element || !value || this.filledFields.has(element)) {
      return;
    }

    try {
      // Focus the field
      element.focus();

      // Clear existing value
      element.value = '';

      // Set new value
      if (element.tagName === 'SELECT') {
        this.fillSelectField(element, value);
      } else {
        element.value = value;
      }

      // Trigger events to ensure the form recognizes the change
      this.triggerChangeEvents(element);

      // Mark as filled
      this.filledFields.add(element);

      // Small delay for visual effect
      await this.delay(50);

      console.log('[Autofill] ✓ Filled:', element.name || element.id, '=', value);

    } catch (error) {
      console.error('[Autofill] ❌ Error filling field:', error);
    }
  }

  fillSelectField(selectElement, value) {
    // Try to find matching option
    const options = Array.from(selectElement.options);

    // Exact match
    let option = options.find(opt => opt.value.toLowerCase() === value.toLowerCase());

    // Partial match
    if (!option) {
      option = options.find(opt =>
        opt.text.toLowerCase().includes(value.toLowerCase()) ||
        value.toLowerCase().includes(opt.text.toLowerCase())
      );
    }

    if (option) {
      selectElement.value = option.value;
      return true;
    }

    return false;
  }

  triggerChangeEvents(element) {
    // Trigger multiple events to ensure compatibility
    const events = ['input', 'change', 'blur'];

    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    });

    // Also trigger React events if present
    if (element._valueTracker) {
      element._valueTracker.setValue('');
    }
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
        setTimeout(() => {
          if (window.resumeManager && window.resumeManager.hasResumeData()) {
            this.autofillForm(window.resumeManager.getResumeData());
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
      generic: 'Unknown Platform'
    };

    return names[platform] || 'Unknown Platform';
  }
}

// Make it globally available
if (typeof window !== 'undefined') {
  window.autofillEngine = new AutofillEngine();
}



