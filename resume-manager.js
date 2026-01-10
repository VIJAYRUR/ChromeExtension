// Resume Manager - Stores and manages user resume data

class ResumeManager {
  constructor() {
    this.resumeData = null;
    this.init();
  }

  async init() {
    await this.loadResumeData();
    console.log('[Resume Manager] 📄 Initialized');
  }

  async loadResumeData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['resumeData'], (result) => {
        this.resumeData = result.resumeData || null;
        if (this.resumeData) {
          console.log('[Resume Manager] ✅ Loaded resume data');
        }
        resolve();
      });
    });
  }

  async saveResumeData(data) {
    this.resumeData = data;
    return new Promise((resolve) => {
      chrome.storage.local.set({ resumeData: data }, () => {
        console.log('[Resume Manager] 💾 Saved resume data');
        resolve();
      });
    });
  }

  async parseResumeFromPDF(file) {
    console.log('[Resume Manager] 📖 Parsing PDF:', file.name);
    
    try {
      const text = await this.extractTextFromPDF(file);
      const parsedData = this.parseResumeText(text);
      
      // Store the PDF as base64 for later use
      const base64PDF = await this.fileToBase64(file);
      parsedData.resumeFile = {
        name: file.name,
        data: base64PDF,
        type: file.type,
        size: file.size
      };
      
      await this.saveResumeData(parsedData);
      
      console.log('[Resume Manager] ✅ Resume parsed successfully');
      return parsedData;
    } catch (error) {
      console.error('[Resume Manager] ❌ Error parsing resume:', error);
      throw error;
    }
  }

  async extractTextFromPDF(file) {
    // For now, we'll use a workaround since PDF.js requires CSP changes
    // We'll prompt the user to paste their resume text
    throw new Error('PDF_PARSING_NOT_AVAILABLE');
  }

  async parseResumeFromText(text) {
    console.log('[Resume Manager] 📖 Parsing resume text...');

    try {
      const parsedData = this.parseResumeText(text);

      // Store the text
      parsedData.resumeText = text;

      await this.saveResumeData(parsedData);
      return parsedData;
    } catch (error) {
      console.error('[Resume Manager] ❌ Error parsing resume:', error);
      throw error;
    }
  }

  parseResumeText(text) {
    console.log('[Resume Manager] 🔍 Parsing resume text...');
    
    const data = {
      fullName: this.extractName(text),
      email: this.extractEmail(text),
      phone: this.extractPhone(text),
      linkedin: this.extractLinkedIn(text),
      github: this.extractGitHub(text),
      website: this.extractWebsite(text),
      address: this.extractAddress(text),
      city: this.extractCity(text),
      state: this.extractState(text),
      zipCode: this.extractZipCode(text),
      country: this.extractCountry(text),
      workExperience: this.extractWorkExperience(text),
      education: this.extractEducation(text),
      skills: this.extractSkills(text),
      summary: this.extractSummary(text),
      rawText: text
    };
    
    return data;
  }

  extractName(text) {
    // Name is usually at the top of the resume
    const lines = text.split('\n').filter(line => line.trim());
    // First non-empty line is often the name
    const firstLine = lines[0]?.trim();
    
    // Check if it looks like a name (2-4 words, capitalized, no special chars)
    if (firstLine && /^[A-Z][a-z]+(\s[A-Z][a-z]+){1,3}$/.test(firstLine)) {
      return firstLine;
    }
    
    return '';
  }

  extractEmail(text) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);
    return matches ? matches[0] : '';
  }

  extractPhone(text) {
    const phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const matches = text.match(phoneRegex);
    return matches ? matches[0] : '';
  }

  extractLinkedIn(text) {
    const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/gi;
    const matches = text.match(linkedinRegex);
    return matches ? matches[0] : '';
  }

  extractGitHub(text) {
    const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/gi;
    const matches = text.match(githubRegex);
    return matches ? matches[0] : '';
  }

  extractWebsite(text) {
    const websiteRegex = /(?:https?:\/\/)?(?:www\.)?[\w-]+\.(?:com|net|org|io|dev|me)(?:\/[\w-]*)?/gi;
    const matches = text.match(websiteRegex);
    // Filter out linkedin, github, email domains
    const filtered = matches?.filter(url =>
      !url.includes('linkedin.com') &&
      !url.includes('github.com') &&
      !url.includes('@')
    );
    return filtered && filtered.length > 0 ? filtered[0] : '';
  }

  extractAddress(text) {
    // Look for address patterns
    const addressRegex = /\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir)/gi;
    const matches = text.match(addressRegex);
    return matches ? matches[0] : '';
  }

  extractCity(text) {
    // Cities are often followed by state abbreviations
    const cityStateRegex = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*([A-Z]{2})/g;
    const matches = text.match(cityStateRegex);
    if (matches && matches.length > 0) {
      return matches[0].split(',')[0].trim();
    }
    return '';
  }

  extractState(text) {
    const stateRegex = /,\s*([A-Z]{2})(?:\s|,|$)/g;
    const matches = text.match(stateRegex);
    if (matches && matches.length > 0) {
      return matches[0].replace(/,|\s/g, '');
    }
    return '';
  }

  extractZipCode(text) {
    const zipRegex = /\b\d{5}(?:-\d{4})?\b/g;
    const matches = text.match(zipRegex);
    return matches ? matches[0] : '';
  }

  extractCountry(text) {
    const countries = ['USA', 'United States', 'Canada', 'UK', 'United Kingdom', 'India', 'Australia'];
    for (const country of countries) {
      if (text.includes(country)) {
        return country;
      }
    }
    return 'USA'; // Default
  }

  extractWorkExperience(text) {
    // Look for work experience section
    const experienceSection = this.extractSection(text, ['experience', 'work history', 'employment', 'professional experience']);

    if (!experienceSection) return [];

    // Parse individual jobs (simplified)
    const jobs = [];
    const lines = experienceSection.split('\n');

    let currentJob = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check if line contains a date range (likely a job entry)
      if (/\d{4}\s*[-–]\s*(?:\d{4}|present|current)/i.test(trimmed)) {
        if (currentJob) jobs.push(currentJob);
        currentJob = { title: '', company: '', duration: trimmed, description: '' };
      } else if (currentJob) {
        if (!currentJob.title) {
          currentJob.title = trimmed;
        } else if (!currentJob.company) {
          currentJob.company = trimmed;
        } else {
          currentJob.description += trimmed + ' ';
        }
      }
    }

    if (currentJob) jobs.push(currentJob);

    return jobs;
  }

  extractEducation(text) {
    const educationSection = this.extractSection(text, ['education', 'academic background', 'qualifications']);

    if (!educationSection) return [];

    const education = [];
    const lines = educationSection.split('\n');

    let currentEdu = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check for degree keywords
      if (/bachelor|master|phd|doctorate|associate|b\.s\.|m\.s\.|b\.a\.|m\.a\./i.test(trimmed)) {
        if (currentEdu) education.push(currentEdu);
        currentEdu = { degree: trimmed, school: '', year: '' };
      } else if (currentEdu) {
        if (!currentEdu.school) {
          currentEdu.school = trimmed;
        } else if (/\d{4}/.test(trimmed)) {
          currentEdu.year = trimmed;
        }
      }
    }

    if (currentEdu) education.push(currentEdu);

    return education;
  }

  extractSkills(text) {
    const skillsSection = this.extractSection(text, ['skills', 'technical skills', 'core competencies', 'technologies']);

    if (!skillsSection) return [];

    // Common skill separators
    const skills = skillsSection
      .split(/[,;•\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length < 50);

    return skills;
  }

  extractSummary(text) {
    const summarySection = this.extractSection(text, ['summary', 'profile', 'objective', 'about']);
    return summarySection || '';
  }

  extractSection(text, keywords) {
    const lowerText = text.toLowerCase();

    for (const keyword of keywords) {
      const regex = new RegExp(`(${keyword})[:\\s]*([\\s\\S]*?)(?=\\n\\n|$)`, 'i');
      const match = lowerText.match(regex);

      if (match) {
        const startIndex = match.index + match[1].length;
        const endIndex = startIndex + 1000; // Get next 1000 chars
        return text.substring(startIndex, endIndex).trim();
      }
    }

    return null;
  }

  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  getResumeData() {
    return this.resumeData;
  }

  hasResumeData() {
    return this.resumeData !== null;
  }

  clearResumeData() {
    this.resumeData = null;
    chrome.storage.local.remove(['resumeData']);
    console.log('[Resume Manager] 🗑️ Cleared resume data');
  }
}

// Make it globally available
if (typeof window !== 'undefined') {
  window.resumeManager = new ResumeManager();
}


