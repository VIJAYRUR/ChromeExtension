// Intelligent Value Mapper
// Maps profile data to various question formats and field types

class IntelligentValueMapper {
  constructor() {
    this.yesNoVariations = this.initializeYesNoVariations();
    this.selectOptionMatcher = new SelectOptionMatcher();
  }

  /**
   * Initialize yes/no answer variations
   */
  initializeYesNoVariations() {
    return {
      yes: ['yes', 'y', 'true', '1', 'affirmative', 'correct', 'i am', 'i do', 'i have', 'i will'],
      no: ['no', 'n', 'false', '0', 'negative', 'incorrect', 'i am not', 'i do not', 'i have not', 'i will not']
    };
  }

  /**
   * Get value for a field based on field type and profile data
   * @param {string} fieldType - Identified field type
   * @param {Object} profileData - User's profile data
   * @param {Object} field - Field metadata
   * @returns {string|null} - Value to fill
   */
  getValue(fieldType, profileData, field) {
    // Map field types to profile data
    const valueMapping = {
      // Personal Information
      firstName: () => profileData.firstName || this.extractFirstName(profileData.fullName),
      lastName: () => profileData.lastName || this.extractLastName(profileData.fullName),
      fullName: () => profileData.fullName || `${profileData.firstName} ${profileData.lastName}`.trim(),
      email: () => profileData.email,
      phone: () => profileData.phone,
      
      // Address
      address: () => profileData.address || profileData.addressLine1,
      city: () => profileData.city,
      state: () => profileData.state,
      zipCode: () => profileData.zipCode || profileData.postalCode,
      country: () => profileData.country || 'United States',
      
      // Professional Links
      linkedin: () => profileData.linkedin,
      github: () => profileData.github,
      portfolio: () => profileData.portfolio || profileData.website,
      
      // Work Authorization - Smart Yes/No handling
      workAuthorization: () => this.mapYesNo(profileData.workAuthorization, field, true),
      requireSponsorship: () => this.mapYesNo(profileData.requireSponsorship, field, false),
      
      // Education
      university: () => this.getLatestEducation(profileData, 'university'),
      degree: () => this.getLatestEducation(profileData, 'degree'),
      major: () => this.getLatestEducation(profileData, 'major'),
      gpa: () => this.getLatestEducation(profileData, 'gpa'),
      graduationDate: () => this.getLatestEducation(profileData, 'endDate'),
      
      // Experience
      currentCompany: () => this.getCurrentExperience(profileData, 'company'),
      currentTitle: () => this.getCurrentExperience(profileData, 'title'),
      yearsExperience: () => this.calculateYearsOfExperience(profileData.experiences),
      
      // Skills
      skills: () => profileData.skills,
      
      // EEO/Diversity
      gender: () => profileData.gender,
      race: () => profileData.race,
      hispanicLatino: () => profileData.hispanicLatino,
      veteranStatus: () => profileData.veteranStatus,
      disability: () => profileData.disability,
      
      // Preferences
      preferredLocation: () => profileData.preferredLocation || profileData.city,
      startDate: () => profileData.availableStartDate || this.getDefaultStartDate(),
      salary: () => profileData.desiredSalary,
      referral: () => profileData.referralSource || ''
    };

    const getter = valueMapping[fieldType];
    if (!getter) {
      console.warn(`[Value Mapper] ⚠️ No mapping for field type: ${fieldType}`);
      return null;
    }

    const value = getter();
    
    // Post-process value based on field type
    return this.postProcessValue(value, field);
  }

  /**
   * Map yes/no values intelligently based on field type and options
   */
  mapYesNo(value, field, defaultValue = true) {
    // If value is already set in profile, use it
    if (value !== undefined && value !== null && value !== '') {
      // Handle boolean
      if (typeof value === 'boolean') {
        return this.formatYesNo(value, field);
      }
      
      // Handle string
      const lowerValue = value.toString().toLowerCase();
      if (this.yesNoVariations.yes.includes(lowerValue)) {
        return this.formatYesNo(true, field);
      }
      if (this.yesNoVariations.no.includes(lowerValue)) {
        return this.formatYesNo(false, field);
      }
    }

    // Use default value
    return this.formatYesNo(defaultValue, field);
  }

  /**
   * Format yes/no answer based on field options
   */
  formatYesNo(boolValue, field) {
    // For select fields, check available options
    if (field.type === 'select' && field.element) {
      const options = Array.from(field.element.options || []);
      const optionTexts = options.map(opt => opt.text.toLowerCase());
      
      // Check for common variations
      if (boolValue) {
        if (optionTexts.some(t => t.includes('yes'))) return 'Yes';
        if (optionTexts.some(t => t.includes('authorized'))) return 'Authorized';
        if (optionTexts.some(t => t.includes('eligible'))) return 'Eligible';
        if (optionTexts.some(t => t === 'true')) return 'true';
        if (optionTexts.some(t => t === '1')) return '1';
      } else {
        if (optionTexts.some(t => t.includes('no'))) return 'No';
        if (optionTexts.some(t => t.includes('not authorized'))) return 'Not Authorized';
        if (optionTexts.some(t => t.includes('not eligible'))) return 'Not Eligible';
        if (optionTexts.some(t => t === 'false')) return 'false';
        if (optionTexts.some(t => t === '0')) return '0';
      }
    }

    // Default format
    return boolValue ? 'Yes' : 'No';
  }

  /**
   * Get latest education entry
   */
  getLatestEducation(profileData, field) {
    if (!profileData.education || !Array.isArray(profileData.education) || profileData.education.length === 0) {
      return '';
    }

    // Get most recent education (last in array or by end date)
    const latest = profileData.education[profileData.education.length - 1];
    return latest[field] || '';
  }

  /**
   * Get current experience
   */
  getCurrentExperience(profileData, field) {
    if (!profileData.experiences || !Array.isArray(profileData.experiences) || profileData.experiences.length === 0) {
      return '';
    }

    // Find current job (no end date) or most recent
    const current = profileData.experiences.find(exp => !exp.endDate) ||
                    profileData.experiences[profileData.experiences.length - 1];

    return current[field] || '';
  }

  /**
   * Calculate total years of experience
   */
  calculateYearsOfExperience(experiences) {
    if (!experiences || !Array.isArray(experiences) || experiences.length === 0) {
      return '';
    }

    let totalMonths = 0;
    const now = new Date();

    for (const exp of experiences) {
      if (!exp.startDate) continue;

      const start = new Date(exp.startDate);
      const end = exp.endDate ? new Date(exp.endDate) : now;

      const months = (end.getFullYear() - start.getFullYear()) * 12 +
                     (end.getMonth() - start.getMonth());

      totalMonths += Math.max(0, months);
    }

    const years = Math.floor(totalMonths / 12);
    return years > 0 ? years.toString() : '0';
  }

  /**
   * Get default start date (2 weeks from now)
   */
  getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  /**
   * Extract first name from full name
   */
  extractFirstName(fullName) {
    if (!fullName) return '';
    return fullName.split(' ')[0];
  }

  /**
   * Extract last name from full name
   */
  extractLastName(fullName) {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * Post-process value based on field characteristics
   */
  postProcessValue(value, field) {
    if (!value) return value;

    // Trim whitespace
    if (typeof value === 'string') {
      value = value.trim();
    }

    // Format phone numbers
    if (field.inputType === 'tel' && typeof value === 'string') {
      value = this.formatPhoneNumber(value);
    }

    // Format dates
    if (field.inputType === 'date' && typeof value === 'string') {
      value = this.formatDate(value);
    }

    return value;
  }

  /**
   * Format phone number
   */
  formatPhoneNumber(phone) {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX for US numbers
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    return phone; // Return as-is if not 10 digits
  }

  /**
   * Format date to YYYY-MM-DD
   */
  formatDate(dateStr) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (e) {
      return dateStr;
    }
  }
}

/**
 * Select Option Matcher - Intelligently matches values to select options
 */
class SelectOptionMatcher {
  /**
   * Find best matching option for a value
   * @param {HTMLSelectElement} selectElement
   * @param {string} value
   * @returns {HTMLOptionElement|null}
   */
  findBestMatch(selectElement, value) {
    if (!selectElement || !value) return null;

    const options = Array.from(selectElement.options);
    if (options.length === 0) return null;

    const valueLower = value.toLowerCase();
    const strategies = [
      // Strategy 1: Exact value match
      (opt) => opt.value.toLowerCase() === valueLower,

      // Strategy 2: Exact text match
      (opt) => opt.text.toLowerCase() === valueLower,

      // Strategy 3: Value contains search term
      (opt) => opt.value.toLowerCase().includes(valueLower),

      // Strategy 4: Text contains search term
      (opt) => opt.text.toLowerCase().includes(valueLower),

      // Strategy 5: Search term contains option text
      (opt) => valueLower.includes(opt.text.toLowerCase()),

      // Strategy 6: Fuzzy match (Levenshtein distance)
      (opt) => this.fuzzyMatch(opt.text.toLowerCase(), valueLower) > 0.8
    ];

    // Try each strategy
    for (const strategy of strategies) {
      const match = options.find(strategy);
      if (match) return match;
    }

    return null;
  }

  /**
   * Fuzzy string matching using Levenshtein distance
   */
  fuzzyMatch(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

// Export for use in autofill engine
if (typeof window !== 'undefined') {
  window.IntelligentValueMapper = IntelligentValueMapper;
  window.SelectOptionMatcher = SelectOptionMatcher;
}

