// Intelligent Semantic Field Matcher
// Uses NLP-like techniques to understand field intent regardless of wording

class SemanticFieldMatcher {
  constructor() {
    this.fieldPatterns = this.initializePatterns();
    this.questionPatterns = this.initializeQuestionPatterns();
    this.contextualHints = this.initializeContextualHints();
  }

  /**
   * Initialize comprehensive field patterns with semantic understanding
   * Each pattern includes: keywords, synonyms, question formats, and context
   */
  initializePatterns() {
    return {
      // PERSONAL INFORMATION
      firstName: {
        keywords: ['first', 'given', 'forename', 'fname', 'christian'],
        patterns: [/first\s*name/i, /given\s*name/i, /what.*first.*name/i],
        context: ['name', 'personal', 'contact'],
        weight: 1.0
      },
      
      lastName: {
        keywords: ['last', 'family', 'surname', 'lname'],
        patterns: [/last\s*name/i, /family\s*name/i, /surname/i, /what.*last.*name/i],
        context: ['name', 'personal', 'contact'],
        weight: 1.0
      },
      
      fullName: {
        keywords: ['full', 'complete', 'legal', 'name'],
        patterns: [/full\s*name/i, /legal\s*name/i, /complete\s*name/i, /your\s*name/i],
        context: ['name', 'personal', 'identity'],
        weight: 0.9,
        excludeIf: ['first', 'last', 'middle'] // Don't match if it's asking for specific part
      },
      
      email: {
        keywords: ['email', 'e-mail', 'mail', 'electronic'],
        patterns: [/e-?mail/i, /email\s*address/i, /contact\s*email/i],
        context: ['contact', 'communication'],
        weight: 1.0
      },
      
      phone: {
        keywords: ['phone', 'mobile', 'cell', 'telephone', 'contact', 'number'],
        patterns: [/phone/i, /mobile/i, /cell/i, /telephone/i, /contact.*number/i],
        context: ['contact', 'communication'],
        weight: 1.0,
        excludeIf: ['fax', 'emergency']
      },
      
      // ADDRESS FIELDS
      address: {
        keywords: ['address', 'street', 'residence', 'location'],
        patterns: [/street\s*address/i, /address\s*line/i, /residential\s*address/i, /home\s*address/i],
        context: ['address', 'location', 'residence'],
        weight: 0.9
      },
      
      city: {
        keywords: ['city', 'town', 'municipality'],
        patterns: [/city/i, /town/i, /what.*city/i],
        context: ['address', 'location'],
        weight: 1.0,
        excludeIf: ['state', 'country', 'zip', 'postal']
      },
      
      state: {
        keywords: ['state', 'province', 'region'],
        patterns: [/state/i, /province/i, /region/i],
        context: ['address', 'location'],
        weight: 1.0
      },
      
      zipCode: {
        keywords: ['zip', 'postal', 'postcode', 'pincode'],
        patterns: [/zip\s*code/i, /postal\s*code/i, /post\s*code/i, /pin\s*code/i],
        context: ['address', 'location'],
        weight: 1.0
      },
      
      country: {
        keywords: ['country', 'nation', 'citizenship'],
        patterns: [/country/i, /nation/i, /what.*country/i],
        context: ['address', 'location', 'citizenship'],
        weight: 1.0
      },
      
      // PROFESSIONAL LINKS
      linkedin: {
        keywords: ['linkedin', 'linked-in'],
        patterns: [/linkedin/i, /linked\s*in/i, /linkedin.*profile/i, /linkedin.*url/i],
        context: ['social', 'professional', 'profile'],
        weight: 1.0
      },
      
      github: {
        keywords: ['github', 'git'],
        patterns: [/github/i, /git\s*hub/i, /github.*profile/i, /github.*username/i],
        context: ['social', 'technical', 'portfolio'],
        weight: 1.0
      },
      
      portfolio: {
        keywords: ['portfolio', 'website', 'personal', 'site'],
        patterns: [/portfolio/i, /personal.*site/i, /website/i, /personal.*website/i],
        context: ['professional', 'showcase'],
        weight: 0.8,
        excludeIf: ['linkedin', 'github']
      },
      
      // WORK AUTHORIZATION - Critical for ATS
      workAuthorization: {
        keywords: ['authorized', 'authorization', 'legally', 'eligible', 'right to work', 'work permit'],
        patterns: [
          /authorized.*work/i,
          /legally.*work/i,
          /eligible.*work/i,
          /right.*work/i,
          /work.*authorization/i,
          /work.*permit/i,
          /legally.*employed/i,
          /authorized.*employment/i
        ],
        questionFormats: [
          'Are you authorized to work in',
          'Do you have authorization to work',
          'Are you legally authorized to work',
          'Do you have the legal right to work',
          'Are you eligible to work'
        ],
        context: ['legal', 'employment', 'authorization'],
        weight: 1.0,
        answerMapping: {
          'Yes': ['yes', 'authorized', 'eligible', 'permitted'],
          'No': ['no', 'not authorized', 'require sponsorship']
        }
      },

      requireSponsorship: {
        keywords: ['sponsorship', 'visa', 'sponsor', 'require', 'need'],
        patterns: [
          /require.*sponsorship/i,
          /need.*sponsorship/i,
          /visa.*sponsorship/i,
          /sponsor.*now/i,
          /sponsor.*future/i,
          /require.*visa/i
        ],
        questionFormats: [
          'Do you require sponsorship',
          'Will you require sponsorship',
          'Do you need visa sponsorship',
          'Will you need sponsorship now or in the future'
        ],
        context: ['legal', 'visa', 'immigration'],
        weight: 1.0
      },

      // EDUCATION
      university: {
        keywords: ['university', 'college', 'school', 'institution', 'alma mater'],
        patterns: [/university/i, /college/i, /school/i, /institution/i, /where.*study/i],
        context: ['education', 'academic'],
        weight: 0.9
      },

      degree: {
        keywords: ['degree', 'qualification', 'diploma', 'education level'],
        patterns: [/degree/i, /qualification/i, /education.*level/i, /highest.*education/i],
        context: ['education', 'academic'],
        weight: 0.9
      },

      major: {
        keywords: ['major', 'field', 'study', 'specialization', 'concentration'],
        patterns: [/major/i, /field.*study/i, /specialization/i, /concentration/i],
        context: ['education', 'academic'],
        weight: 0.9
      },

      gpa: {
        keywords: ['gpa', 'grade', 'average', 'cgpa'],
        patterns: [/gpa/i, /grade.*average/i, /cgpa/i, /cumulative.*gpa/i],
        context: ['education', 'academic'],
        weight: 1.0
      },

      graduationDate: {
        keywords: ['graduation', 'graduated', 'completion', 'finish'],
        patterns: [/graduation.*date/i, /when.*graduate/i, /completion.*date/i],
        context: ['education', 'academic'],
        weight: 0.9
      },

      // EXPERIENCE
      currentCompany: {
        keywords: ['current', 'present', 'employer', 'company'],
        patterns: [/current.*company/i, /current.*employer/i, /present.*employer/i],
        context: ['employment', 'work'],
        weight: 0.9
      },

      currentTitle: {
        keywords: ['current', 'title', 'position', 'role', 'job'],
        patterns: [/current.*title/i, /current.*position/i, /current.*role/i, /job.*title/i],
        context: ['employment', 'work'],
        weight: 0.9
      },

      yearsExperience: {
        keywords: ['years', 'experience', 'how long', 'duration'],
        patterns: [/years.*experience/i, /how.*long.*worked/i, /total.*experience/i],
        context: ['employment', 'work'],
        weight: 0.9
      },

      // SKILLS
      skills: {
        keywords: ['skill', 'expertise', 'proficiency', 'competenc', 'technical'],
        patterns: [/skills/i, /expertise/i, /proficienc/i, /technical.*skills/i, /competenc/i],
        context: ['technical', 'abilities'],
        weight: 0.8
      },

      // DIVERSITY & INCLUSION (EEO)
      gender: {
        keywords: ['gender', 'sex', 'identify'],
        patterns: [/gender/i, /sex/i, /gender.*identity/i],
        context: ['diversity', 'eeo', 'demographic'],
        weight: 1.0
      },

      race: {
        keywords: ['race', 'ethnicity', 'racial'],
        patterns: [/race/i, /ethnicity/i, /racial/i, /ethnic.*background/i],
        context: ['diversity', 'eeo', 'demographic'],
        weight: 1.0
      },

      hispanicLatino: {
        keywords: ['hispanic', 'latino', 'latina', 'latinx'],
        patterns: [/hispanic/i, /latino/i, /latina/i, /latinx/i, /hispanic.*latino/i],
        context: ['diversity', 'eeo', 'demographic'],
        weight: 1.0
      },

      veteranStatus: {
        keywords: ['veteran', 'military', 'armed forces', 'service'],
        patterns: [/veteran/i, /military/i, /armed.*forces/i, /military.*service/i],
        context: ['diversity', 'eeo', 'demographic'],
        weight: 1.0
      },

      disability: {
        keywords: ['disability', 'disabled', 'accommodation'],
        patterns: [/disability/i, /disabled/i, /accommodation/i, /special.*needs/i],
        context: ['diversity', 'eeo', 'accessibility'],
        weight: 1.0
      },

      // PREFERENCES
      preferredLocation: {
        keywords: ['preferred', 'location', 'geographic', 'where', 'relocate'],
        patterns: [/preferred.*location/i, /geographic.*preference/i, /where.*work/i, /willing.*relocate/i],
        context: ['preference', 'location'],
        weight: 0.8
      },

      startDate: {
        keywords: ['start', 'available', 'begin', 'commence'],
        patterns: [/start.*date/i, /available.*start/i, /when.*start/i, /earliest.*start/i],
        context: ['availability', 'timing'],
        weight: 0.9
      },

      salary: {
        keywords: ['salary', 'compensation', 'pay', 'wage', 'expected'],
        patterns: [/salary/i, /compensation/i, /expected.*salary/i, /desired.*salary/i],
        context: ['compensation', 'financial'],
        weight: 0.8
      },

      // REFERRAL
      referral: {
        keywords: ['referral', 'referred', 'reference', 'how did you hear'],
        patterns: [/referral/i, /referred.*by/i, /how.*hear/i, /how.*find/i],
        context: ['source', 'referral'],
        weight: 0.7
      },
    };
  }

  /**
   * Initialize question pattern recognition
   * Helps identify fields even when asked as questions
   */
  initializeQuestionPatterns() {
    return {
      yesNo: [
        /are you/i,
        /do you/i,
        /will you/i,
        /have you/i,
        /can you/i,
        /would you/i
      ],

      whatWhere: [
        /what is your/i,
        /what's your/i,
        /where is your/i,
        /where do you/i,
        /what are your/i
      ],

      howMany: [
        /how many/i,
        /how much/i,
        /how long/i
      ],

      when: [
        /when did you/i,
        /when can you/i,
        /when will you/i,
        /when are you/i
      ]
    };
  }

  /**
   * Initialize contextual hints
   * Helps understand field context from surrounding elements
   */
  initializeContextualHints() {
    return {
      personal: ['personal information', 'about you', 'contact details', 'your information'],
      address: ['address', 'location', 'residence', 'where you live'],
      education: ['education', 'academic', 'school', 'university', 'degree'],
      experience: ['experience', 'employment', 'work history', 'professional'],
      legal: ['legal', 'authorization', 'eligibility', 'compliance'],
      diversity: ['diversity', 'equal opportunity', 'eeo', 'demographic', 'voluntary'],
      preferences: ['preferences', 'additional information', 'other']
    };
  }

  /**
   * Main matching function - intelligently identifies field type
   * @param {Object} field - Field metadata (label, name, id, placeholder, etc.)
   * @param {Object} context - Surrounding context (section, nearby labels, etc.)
   * @returns {Object} - { fieldType, confidence, reasoning }
   */
  matchField(field, context = {}) {
    const searchText = this.buildSearchText(field);
    const matches = [];

    // Score each potential field type
    for (const [fieldType, pattern] of Object.entries(this.fieldPatterns)) {
      const score = this.calculateMatchScore(searchText, pattern, field, context);

      if (score > 0) {
        matches.push({
          fieldType,
          confidence: score,
          pattern: pattern
        });
      }
    }

    // Sort by confidence (highest first)
    matches.sort((a, b) => b.confidence - a.confidence);

    // Return best match if confidence is high enough
    if (matches.length > 0 && matches[0].confidence >= 0.5) {
      return {
        fieldType: matches[0].fieldType,
        confidence: matches[0].confidence,
        allMatches: matches.slice(0, 3), // Top 3 matches for debugging
        reasoning: this.explainMatch(matches[0], searchText)
      };
    }

    return {
      fieldType: null,
      confidence: 0,
      allMatches: matches.slice(0, 3),
      reasoning: 'No confident match found'
    };
  }

  /**
   * Build comprehensive search text from field metadata
   */
  buildSearchText(field) {
    const parts = [
      field.label || '',
      field.name || '',
      field.id || '',
      field.placeholder || '',
      field.ariaLabel || '',
      field.dataTestId || '',
      field.title || '',
      field.className || ''
    ];

    return parts.join(' ').toLowerCase();
  }

  /**
   * Calculate match score using multiple signals
   */
  calculateMatchScore(searchText, pattern, field, context) {
    let score = 0;
    const maxScore = 1.0;

    // 1. Keyword matching (40% weight)
    const keywordScore = this.scoreKeywords(searchText, pattern.keywords);
    score += keywordScore * 0.4;

    // 2. Pattern matching (30% weight)
    const patternScore = this.scorePatterns(searchText, pattern.patterns);
    score += patternScore * 0.3;

    // 3. Context matching (20% weight)
    const contextScore = this.scoreContext(searchText, pattern.context, context);
    score += contextScore * 0.2;

    // 4. Exclusion rules (can reduce score to 0)
    if (pattern.excludeIf && this.hasExcludedTerms(searchText, pattern.excludeIf)) {
      score = 0;
    }

    // 5. Field type bonus (10% weight)
    const typeScore = this.scoreFieldType(field, pattern);
    score += typeScore * 0.1;

    // Apply pattern weight
    score *= (pattern.weight || 1.0);

    return Math.min(score, maxScore);
  }

  /**
   * Score keyword matches
   */
  scoreKeywords(searchText, keywords) {
    if (!keywords || keywords.length === 0) return 0;

    let matchCount = 0;
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    return matchCount / keywords.length;
  }

  /**
   * Score regex pattern matches
   */
  scorePatterns(searchText, patterns) {
    if (!patterns || patterns.length === 0) return 0;

    let matchCount = 0;
    for (const pattern of patterns) {
      if (pattern.test(searchText)) {
        matchCount++;
      }
    }

    return matchCount > 0 ? 1.0 : 0;
  }

  /**
   * Score context relevance
   */
  scoreContext(searchText, patternContext, providedContext) {
    if (!patternContext || patternContext.length === 0) return 0.5; // Neutral if no context

    // Check if search text contains context keywords
    let contextMatch = 0;
    for (const ctx of patternContext) {
      if (searchText.includes(ctx.toLowerCase())) {
        contextMatch++;
      }
    }

    // Check provided context (section headers, nearby labels)
    if (providedContext.section) {
      const sectionText = providedContext.section.toLowerCase();
      for (const ctx of patternContext) {
        if (sectionText.includes(ctx.toLowerCase())) {
          contextMatch += 0.5;
        }
      }
    }

    return Math.min(contextMatch / patternContext.length, 1.0);
  }

  /**
   * Check for excluded terms
   */
  hasExcludedTerms(searchText, excludeTerms) {
    for (const term of excludeTerms) {
      if (searchText.includes(term.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  /**
   * Score based on field type (input type, element type)
   */
  scoreFieldType(field, pattern) {
    // Email fields should be type="email"
    if (pattern.keywords && pattern.keywords.includes('email')) {
      return field.inputType === 'email' ? 1.0 : 0.5;
    }

    // Phone fields should be type="tel"
    if (pattern.keywords && pattern.keywords.includes('phone')) {
      return field.inputType === 'tel' ? 1.0 : 0.5;
    }

    return 0.5; // Neutral
  }

  /**
   * Explain why a match was made (for debugging)
   */
  explainMatch(match, searchText) {
    const reasons = [];

    if (match.pattern.keywords) {
      const matchedKeywords = match.pattern.keywords.filter(k =>
        searchText.includes(k.toLowerCase())
      );
      if (matchedKeywords.length > 0) {
        reasons.push(`Keywords: ${matchedKeywords.join(', ')}`);
      }
    }

    if (match.pattern.patterns) {
      const matchedPatterns = match.pattern.patterns.filter(p => p.test(searchText));
      if (matchedPatterns.length > 0) {
        reasons.push(`Patterns: ${matchedPatterns.length} matched`);
      }
    }

    return reasons.join(' | ');
  }

  /**
   * Detect if field is asking a yes/no question
   */
  isYesNoQuestion(searchText) {
    return this.questionPatterns.yesNo.some(pattern => pattern.test(searchText));
  }

  /**
   * Extract question type
   */
  getQuestionType(searchText) {
    for (const [type, patterns] of Object.entries(this.questionPatterns)) {
      if (patterns.some(pattern => pattern.test(searchText))) {
        return type;
      }
    }
    return 'statement';
  }

  /**
   * Get section context from DOM
   */
  getSectionContext(element) {
    // Look for section headers, fieldsets, or parent containers
    let current = element.parentElement;
    let depth = 0;
    const maxDepth = 5;

    while (current && depth < maxDepth) {
      // Check for section headers
      const header = current.querySelector('h1, h2, h3, h4, legend');
      if (header) {
        return {
          section: header.textContent.trim(),
          element: current
        };
      }

      // Check for aria-label or data attributes
      if (current.getAttribute('aria-label')) {
        return {
          section: current.getAttribute('aria-label'),
          element: current
        };
      }

      current = current.parentElement;
      depth++;
    }

    return { section: '', element: null };
  }
}

// Export for use in autofill engine
if (typeof window !== 'undefined') {
  window.SemanticFieldMatcher = SemanticFieldMatcher;
}


