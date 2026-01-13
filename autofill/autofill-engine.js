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
      address: ['address', 'street', 'address-line-1', 'address1', 'street-address', 'addressline1'],
      address2: ['address-line-2', 'address2', 'apt', 'suite', 'unit', 'addressline2'],
      city: ['city', 'town', 'locality'],
      state: ['state', 'province', 'region', 'stateprovince'],
      zipCode: ['zip', 'zipcode', 'zip-code', 'postal', 'postalcode', 'postal-code', 'postcode'],
      country: ['country', 'nation'],

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
    try {
      const fields = [];

      // Find all input, textarea, and select elements
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
      const textareas = document.querySelectorAll('textarea');
      const selects = document.querySelectorAll('select');

      console.log(`[Autofill] 🔍 Found ${inputs.length} inputs, ${textareas.length} textareas, ${selects.length} selects`);

      [...inputs, ...textareas, ...selects].forEach(field => {
        try {
          if (this.isFieldVisible(field) || field.type === 'file') {
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
              className: field.className || '',
              accept: field.accept || ''
            });
          }
        } catch (error) {
          console.error('[Autofill] ❌ Error processing field:', field, error);
        }
      });

      console.log(`[Autofill] ✓ Processed ${fields.length} visible/file fields`);
      return fields;

    } catch (error) {
      console.error('[Autofill] ❌ Error in findAllFormFields:', error);
      return [];
    }
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
    try {
      console.log('[Autofill] 📝 Filling generic form...');

      // First, handle resume file upload if present
      await this.handleResumeUpload(fields, resumeData);

      // Then fill other fields
      for (const field of fields) {
        try {
          const fieldType = this.identifyFieldType(field);

          if (fieldType) {
            const value = this.getValueForField(fieldType, resumeData);
            if (value) {
              await this.fillField(field.element, value);
            }
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
            const value = this.getValueForField(fieldType, resumeData);
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
          const value = this.getValueForField(fieldType, resumeData);
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
            const value = this.getValueForField(fieldType, resumeData);
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
    const searchText = [
      field.name,
      field.id,
      field.placeholder,
      field.label,
      field.ariaLabel,
      field.dataTestId
    ].join(' ').toLowerCase();

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

    // Check each field mapping
    for (const [fieldType, keywords] of Object.entries(this.fieldMappings)) {
      for (const keyword of keywords) {
        if (searchText.includes(keyword)) {
          console.log(`[Autofill] 🎯 Identified field type: ${fieldType} for field: ${field.label || field.name || field.id}`);
          return fieldType;
        }
      }
    }

    return null;
  }

  getValueForField(fieldType, resumeData) {
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
    if (!element || !value || this.filledFields.has(element)) {
      return;
    }

    try {
      // Get field identifier for logging
      const fieldId = element.name || element.id || element.placeholder || 'unknown';
      const fieldLabel = this.getFieldLabel(element) || fieldId;

      // Focus the field
      element.focus();

      // Clear existing value
      element.value = '';

      // Set new value
      if (element.tagName === 'SELECT') {
        const success = this.fillSelectField(element, value);
        if (!success) {
          console.warn(`[Autofill] ⚠️ Could not find matching option for select field: ${fieldLabel}, value: ${value}`);
          return; // Don't mark as filled if we couldn't find a match
        }
      } else {
        // Check if this is a skills/autocomplete field
        const isSkillsField = fieldLabel.toLowerCase().includes('skill') ||
                             fieldId.toLowerCase().includes('skill') ||
                             element.getAttribute('role') === 'combobox' ||
                             element.getAttribute('aria-autocomplete');

        if (isSkillsField && typeof value === 'string' && value.includes(',')) {
          // For skills fields with comma-separated values, try to trigger autocomplete for each skill
          await this.fillSkillsField(element, value);
        } else {
          element.value = value;
        }
      }

      // Trigger events to ensure the form recognizes the change
      this.triggerChangeEvents(element);

      // Mark as filled
      this.filledFields.add(element);

      // Small delay for visual effect
      await this.delay(50);

      console.log(`[Autofill] ✓ Filled: "${fieldLabel}" (${fieldId}) = "${value}"`);

    } catch (error) {
      console.error('[Autofill] ❌ Error filling field:', element.name || element.id, error);
    }
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



