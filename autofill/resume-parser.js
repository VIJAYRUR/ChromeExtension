// Intelligent Resume Parser
// Works with various resume formats and structures

class ResumeParser {
  constructor() {
    this.parsedData = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      city: '',
      state: '',
      country: '',
      linkedin: '',
      github: '',
      portfolio: '',
      professionalSummary: '',
      experiences: [],
      education: [],
      skills: '',
      skillsArray: []
    };
  }

  /**
   * Main parsing method - extracts text from PDF and parses it
   */
  async parseResume(file) {
    try {
      console.log('[Resume Parser] Starting to parse:', file.name);

      // Load PDF.js library dynamically if not already loaded
      if (typeof pdfjsLib === 'undefined') {
        await this.loadPDFJS();
      }

      const text = await this.extractTextFromPDF(file);
      console.log('[Resume Parser] Extracted text length:', text.length);

      // Parse the extracted text
      this.parseText(text);

      console.log('[Resume Parser] ✅ Parsing complete:', this.parsedData);
      return this.parsedData;
    } catch (error) {
      console.error('[Resume Parser] ❌ Error parsing resume:', error);
      throw error;
    }
  }

  /**
   * Load PDF.js library dynamically
   */
  async loadPDFJS() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'pdf.min.js';
      script.onload = () => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Extract text from PDF file
   */
  async extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  }

  /**
   * Main text parsing logic
   */
  parseText(text) {
    // Normalize text
    const normalizedText = this.normalizeText(text);

    // Extract different sections
    this.extractContactInfo(normalizedText);
    this.extractName(normalizedText);
    this.extractSummary(normalizedText);
    this.extractExperience(normalizedText);
    this.extractEducation(normalizedText);
    this.extractSkills(normalizedText);
  }

  /**
   * Normalize text for easier parsing
   */
  normalizeText(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract contact information (email, phone, location, links)
   */
  extractContactInfo(text) {
    // Email
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
      this.parsedData.email = emailMatch[0];
    }

    // Phone - multiple formats
    const phonePatterns = [
      /\+?1?\s*\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})/,  // US format
      /\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/  // International
    ];

    for (const pattern of phonePatterns) {
      const phoneMatch = text.match(pattern);
      if (phoneMatch) {
        this.parsedData.phone = phoneMatch[0].replace(/[^\d+]/g, '');
        break;
      }
    }

    // LinkedIn
    const linkedinPatterns = [
      /linkedin\.com\/in\/([a-zA-Z0-9-]+)/i,
      /linkedin\.com\/([a-zA-Z0-9-]+)/i
    ];

    for (const pattern of linkedinPatterns) {
      const linkedinMatch = text.match(pattern);
      if (linkedinMatch) {
        this.parsedData.linkedin = linkedinMatch[0];
        break;
      }
    }

    // GitHub
    const githubPatterns = [
      /github\.com\/([a-zA-Z0-9-]+)/i,
      /github:?\s*([a-zA-Z0-9-]+)/i
    ];

    for (const pattern of githubPatterns) {
      const githubMatch = text.match(pattern);
      if (githubMatch) {
        this.parsedData.github = githubMatch[0].includes('github.com')
          ? githubMatch[0]
          : `github.com/${githubMatch[1]}`;
        break;
      }
    }

    // Portfolio/Website
    const portfolioPatterns = [
      /(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?/gi
    ];

    const urlMatches = text.match(portfolioPatterns[0]);
    if (urlMatches) {
      // Filter out email, LinkedIn, GitHub, and common sites
      const portfolio = urlMatches.find(url =>
        !url.includes('@') &&
        !url.includes('linkedin.com') &&
        !url.includes('github.com') &&
        !url.includes('facebook.com') &&
        !url.includes('twitter.com')
      );
      if (portfolio) {
        this.parsedData.portfolio = portfolio;
      }
    }

    // Location - look for city, state patterns
    const locationPatterns = [
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*([A-Z]{2})/,  // City, ST
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*([A-Z][a-z]+)/  // City, State
    ];

    for (const pattern of locationPatterns) {
      const locationMatch = text.match(pattern);
      if (locationMatch) {
        this.parsedData.city = locationMatch[1];
        this.parsedData.state = locationMatch[2];
        break;
      }
    }
  }

  /**
   * Extract name from resume
   */
  extractName(text) {
    // Name is usually at the top, look for capitalized words
    const lines = text.split('\n');
    const topLines = lines.slice(0, 10).join(' ');

    // Pattern for full name (2-3 capitalized words at the start)
    const namePatterns = [
      /^([A-Z][a-z]+(?:\s[A-Z][a-z]*\.?)?\s[A-Z][a-z]+)/,  // First Middle Last
      /^([A-Z][a-z]+\s[A-Z][a-z]+)/  // First Last
    ];

    for (const pattern of namePatterns) {
      const nameMatch = topLines.match(pattern);
      if (nameMatch) {
        const nameParts = nameMatch[1].trim().split(/\s+/);
        if (nameParts.length >= 2) {
          this.parsedData.firstName = nameParts[0];
          this.parsedData.lastName = nameParts[nameParts.length - 1];
          if (nameParts.length === 3) {
            // Middle name or initial
            const middle = nameParts[1];
            if (middle.length <= 2) {
              // It's an initial, skip it
            } else {
              // It's a middle name, but we'll keep firstName as is
            }
          }
          break;
        }
      }
    }
  }

  /**
   * Extract professional summary/objective
   */
  extractSummary(text) {
    const summaryKeywords = [
      'summary', 'objective', 'profile', 'about', 'overview', 'professional summary',
      'career objective', 'career summary', 'qualifications'
    ];

    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase().trim();

      // Check if line contains summary keyword
      const hasSummaryKeyword = summaryKeywords.some(keyword =>
        line === keyword || line === keyword + ':' || line.startsWith(keyword + ':')
      );

      if (hasSummaryKeyword) {
        // Extract the next few lines as summary
        const summaryLines = [];
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const nextLine = lines[j].trim();

          // Stop if we hit another section
          if (this.isSectionHeader(nextLine)) {
            break;
          }

          if (nextLine.length > 20) {
            summaryLines.push(nextLine);
          }
        }

        if (summaryLines.length > 0) {
          this.parsedData.professionalSummary = summaryLines.join(' ').trim();
          break;
        }
      }
    }
  }

  /**
   * Extract work experience
   */
  extractExperience(text) {
    const experienceKeywords = [
      'experience', 'work experience', 'employment', 'work history',
      'professional experience', 'career history'
    ];

    const lines = text.split('\n');
    let inExperienceSection = false;
    let currentExp = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineLower = line.toLowerCase();

      // Check if we're entering the experience section
      if (!inExperienceSection) {
        const hasKeyword = experienceKeywords.some(keyword =>
          lineLower === keyword || lineLower === keyword + ':' || lineLower.startsWith(keyword + ':')
        );

        if (hasKeyword) {
          inExperienceSection = true;
          continue;
        }
      }

      if (inExperienceSection) {
        // Stop if we hit another major section
        if (this.isSectionHeader(lineLower) && !experienceKeywords.some(k => lineLower.includes(k))) {
          break;
        }

        // Look for job title and company patterns
        // Pattern 1: "Job Title | Company"
        // Pattern 2: "Job Title at Company"
        // Pattern 3: "Job Title, Company"
        // Pattern 4: "Company - Job Title"

        const separators = /[\|,]|at|–|—|-/i;
        const parts = line.split(separators).map(p => p.trim());

        if (parts.length >= 2 && line.length > 10) {
          // This might be a new experience entry
          if (currentExp && (currentExp.title || currentExp.company)) {
            this.parsedData.experiences.push(currentExp);
          }

          currentExp = {
            title: parts[0],
            company: parts[1],
            startDate: '',
            endDate: '',
            responsibilities: ''
          };

          // Look for dates in the same line or next lines
          const dateMatch = this.extractDateRange(line);
          if (dateMatch) {
            currentExp.startDate = dateMatch.start;
            currentExp.endDate = dateMatch.end;
          }
        } else if (currentExp) {
          // Check for dates
          const dateMatch = this.extractDateRange(line);
          if (dateMatch && !currentExp.startDate) {
            currentExp.startDate = dateMatch.start;
            currentExp.endDate = dateMatch.end;
          }
          // Check for bullet points or descriptions
          else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') ||
                   (line.length > 30 && !this.looksLikeHeader(line))) {
            const cleanLine = line.replace(/^[•\-*]\s*/, '');
            if (currentExp.responsibilities) {
              currentExp.responsibilities += '\n' + cleanLine;
            } else {
              currentExp.responsibilities = cleanLine;
            }
          }
        }
      }
    }

    // Add last experience
    if (currentExp && (currentExp.title || currentExp.company)) {
      this.parsedData.experiences.push(currentExp);
    }

    // Limit to 5 most recent experiences
    this.parsedData.experiences = this.parsedData.experiences.slice(0, 5);
  }

  /**
   * Extract education
   */
  extractEducation(text) {
    const educationKeywords = [
      'education', 'academic', 'qualifications', 'degrees', 'university', 'college'
    ];

    const lines = text.split('\n');
    let inEducationSection = false;
    let currentEdu = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineLower = line.toLowerCase();

      // Check if we're entering the education section
      if (!inEducationSection) {
        const hasKeyword = educationKeywords.some(keyword =>
          lineLower === keyword || lineLower === keyword + ':' || lineLower.startsWith(keyword + ':')
        );

        if (hasKeyword) {
          inEducationSection = true;
          continue;
        }
      }

      if (inEducationSection) {
        // Stop if we hit another major section
        if (this.isSectionHeader(lineLower) && !educationKeywords.some(k => lineLower.includes(k))) {
          break;
        }

        // Look for degree keywords
        const degreePatterns = [
          /bachelor|b\.?s\.?|b\.?a\.?|undergraduate/i,
          /master|m\.?s\.?|m\.?a\.?|mba|graduate/i,
          /ph\.?d|doctorate|doctoral/i,
          /associate|a\.?s\.?|a\.?a\.?/i
        ];

        const hasDegree = degreePatterns.some(pattern => pattern.test(line));

        if (hasDegree || (line.length > 10 && !currentEdu)) {
          // Save previous education entry
          if (currentEdu && (currentEdu.degree || currentEdu.university)) {
            this.parsedData.education.push(currentEdu);
          }

          currentEdu = {
            degree: '',
            university: '',
            major: '',
            startDate: '',
            endDate: '',
            gpa: ''
          };

          // Try to extract degree type
          if (/bachelor|b\.?s\.?|b\.?a\.?/i.test(line)) {
            currentEdu.degree = 'Bachelor';
          } else if (/master|m\.?s\.?|m\.?a\.?|mba/i.test(line)) {
            currentEdu.degree = 'Master';
          } else if (/ph\.?d|doctorate/i.test(line)) {
            currentEdu.degree = 'PhD';
          } else if (/associate|a\.?s\.?/i.test(line)) {
            currentEdu.degree = 'Associate';
          }

          // Extract university name (usually after "from" or "at" or on the line)
          const universityPatterns = [
            /(?:from|at)\s+([A-Z][^,\n]+(?:University|College|Institute|School))/i,
            /([A-Z][^,\n]+(?:University|College|Institute|School))/i
          ];

          for (const pattern of universityPatterns) {
            const match = line.match(pattern);
            if (match) {
              currentEdu.university = match[1].trim();
              break;
            }
          }

          // Extract major/field of study
          const majorPatterns = [
            /in\s+([A-Z][^,\n]+?)(?:\s+from|\s+at|,|$)/i,
            /major:?\s*([A-Z][^,\n]+?)(?:,|$)/i
          ];

          for (const pattern of majorPatterns) {
            const match = line.match(pattern);
            if (match) {
              currentEdu.major = match[1].trim();
              break;
            }
          }

          // Extract dates
          const dateMatch = this.extractDateRange(line);
          if (dateMatch) {
            currentEdu.startDate = dateMatch.start;
            currentEdu.endDate = dateMatch.end;
          }

          // Extract GPA
          const gpaMatch = line.match(/gpa:?\s*(\d+\.?\d*)/i);
          if (gpaMatch) {
            currentEdu.gpa = gpaMatch[1];
          }
        } else if (currentEdu && !currentEdu.university) {
          // Check if this line contains the university
          if (/university|college|institute|school/i.test(line)) {
            currentEdu.university = line;
          }
        }
      }
    }

    // Add last education entry
    if (currentEdu && (currentEdu.degree || currentEdu.university)) {
      this.parsedData.education.push(currentEdu);
    }
  }

  /**
   * Extract skills
   */
  extractSkills(text) {
    const skillsKeywords = [
      'skills', 'technical skills', 'core competencies', 'expertise',
      'technologies', 'tools', 'proficiencies'
    ];

    const lines = text.split('\n');
    let inSkillsSection = false;
    const skillsList = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineLower = line.toLowerCase();

      // Check if we're entering the skills section
      if (!inSkillsSection) {
        const hasKeyword = skillsKeywords.some(keyword =>
          lineLower === keyword || lineLower === keyword + ':' || lineLower.startsWith(keyword + ':')
        );

        if (hasKeyword) {
          inSkillsSection = true;
          continue;
        }
      }

      if (inSkillsSection) {
        // Stop if we hit another major section
        if (this.isSectionHeader(lineLower) && !skillsKeywords.some(k => lineLower.includes(k))) {
          break;
        }

        // Extract skills from the line
        // Skills are often separated by: comma, pipe, bullet, semicolon
        if (line.length > 2) {
          const separators = /[,;|•]/;
          const skills = line.split(separators)
            .map(s => s.trim())
            .filter(s => s.length > 1 && s.length < 50);

          skillsList.push(...skills);
        }
      }
    }

    // Remove duplicates and clean up
    const uniqueSkills = [...new Set(skillsList)]
      .filter(skill =>
        skill.length > 1 &&
        !this.isSectionHeader(skill.toLowerCase()) &&
        !/^\d+$/.test(skill)  // Remove pure numbers
      );

    this.parsedData.skillsArray = uniqueSkills;
    this.parsedData.skills = uniqueSkills.join(', ');
  }

  /**
   * Extract date ranges from text
   */
  extractDateRange(text) {
    // Patterns for date ranges:
    // "Jan 2020 - Dec 2022"
    // "January 2020 - December 2022"
    // "2020 - 2022"
    // "Jan 2020 - Present"

    const monthNames = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
    const year = '\\d{4}';

    const patterns = [
      new RegExp(`(${monthNames})\\s+(${year})\\s*[-–—]\\s*(${monthNames})?\\s*(${year}|Present)`, 'i'),
      new RegExp(`(${year})\\s*[-–—]\\s*(${year}|Present)`, 'i')
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let startDate = '';
        let endDate = '';

        if (match[1] && match[2] && match[4]) {
          // Month Year format
          startDate = `${match[2]}-${this.monthToNumber(match[1])}`;
          if (match[4].toLowerCase() === 'present') {
            endDate = '';
          } else {
            endDate = `${match[4]}-${this.monthToNumber(match[3] || 'Dec')}`;
          }
        } else if (match[1] && match[2]) {
          // Year only format
          startDate = `${match[1]}-01`;
          if (match[2].toLowerCase() === 'present') {
            endDate = '';
          } else {
            endDate = `${match[2]}-12`;
          }
        }

        return { start: startDate, end: endDate };
      }
    }

    return null;
  }

  /**
   * Convert month name to number
   */
  monthToNumber(month) {
    const months = {
      'jan': '01', 'january': '01',
      'feb': '02', 'february': '02',
      'mar': '03', 'march': '03',
      'apr': '04', 'april': '04',
      'may': '05',
      'jun': '06', 'june': '06',
      'jul': '07', 'july': '07',
      'aug': '08', 'august': '08',
      'sep': '09', 'september': '09',
      'oct': '10', 'october': '10',
      'nov': '11', 'november': '11',
      'dec': '12', 'december': '12'
    };

    return months[month.toLowerCase()] || '01';
  }

  /**
   * Check if a line is a section header
   */
  isSectionHeader(line) {
    const sectionKeywords = [
      'experience', 'education', 'skills', 'summary', 'objective', 'profile',
      'work history', 'employment', 'projects', 'certifications', 'awards',
      'publications', 'languages', 'interests', 'references', 'volunteer'
    ];

    const lineLower = line.toLowerCase().replace(/[:\s]/g, '');

    return sectionKeywords.some(keyword => {
      const keywordClean = keyword.replace(/\s/g, '');
      return lineLower === keywordClean || lineLower.startsWith(keywordClean);
    });
  }

  /**
   * Check if a line looks like a header (short, capitalized)
   */
  looksLikeHeader(line) {
    return line.length < 50 &&
           /^[A-Z]/.test(line) &&
           !line.includes('.') &&
           line.split(' ').length <= 5;
  }
}

// Export for use in other scripts
window.ResumeParser = ResumeParser;
