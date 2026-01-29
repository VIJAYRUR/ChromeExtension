/**
 * LinkedIn HTML Cleaner
 * Extracts and cleans job description HTML from LinkedIn
 * Preserves <strong> tags for headings, cleans LinkedIn-specific markup
 */

class LinkedInHTMLCleaner {
  constructor() {
    // Skill keywords for extraction
    this.skillKeywords = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'Go', 'Rust', 'PHP', 'Swift', 'Kotlin',
      'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Rails',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'CI/CD',
      'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch', 'DynamoDB',
      'Git', 'Agile', 'Scrum', 'REST', 'GraphQL', 'API', 'Microservices', 'NLP', 'Machine Learning'
    ];
  }

  /**
   * Clean LinkedIn HTML - remove classes, keep structure
   */
  cleanHTML(html) {
    if (!html) return '';

    // Create temporary div to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remove all LinkedIn-specific classes and attributes
    this.removeLinkedInAttributes(temp);

    // Get cleaned HTML
    let cleaned = temp.innerHTML;

    // Additional cleanup
    cleaned = cleaned
      // Remove empty spans
      .replace(/<span><\/span>/g, '')
      // Remove comment markers
      .replace(/<!---->/g, '')
      // Clean up excessive <br> tags
      .replace(/(<br>\s*){3,}/g, '<br><br>')
      // Remove leading/trailing breaks
      .replace(/^(<br>\s*)+/, '')
      .replace(/(<br>\s*)+$/, '');

    return cleaned;
  }

  /**
   * Remove LinkedIn-specific attributes from all elements
   */
  removeLinkedInAttributes(element) {
    // Remove classes and IDs
    if (element.removeAttribute) {
      element.removeAttribute('class');
      element.removeAttribute('id');
      element.removeAttribute('tabindex');
      element.removeAttribute('dir');
    }

    // Recursively process children
    if (element.children) {
      Array.from(element.children).forEach(child => {
        this.removeLinkedInAttributes(child);
      });
    }
  }

  /**
   * Extract plain text from HTML (for skill extraction)
   */
  extractText(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  }

  /**
   * Extract skills from HTML
   */
  extractSkills(html) {
    const text = this.extractText(html);
    const found = [];
    const lowerText = text.toLowerCase();

    for (const skill of this.skillKeywords) {
      // Escape special regex characters (like + in C++)
      const escapedSkill = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
      if (regex.test(lowerText)) {
        found.push(skill);
      }
    }

    return found;
  }

  /**
   * Common section heading patterns in job descriptions
   */
  get headingPatterns() {
    return [
      /^About\s+(the\s+)?(job|role|position|company|us|team)/i,
      /^(The\s+)?Role/i,
      /^What\s+You('ll|'ll|\s+will)\s+(Do|Be\s+Doing)/i,
      /^(Your\s+)?Responsibilities/i,
      /^(Key\s+)?Requirements/i,
      /^(Required|Preferred)\s+(Skills|Qualifications|Experience)/i,
      /^Qualifications/i,
      /^(Must|Nice)\s+(Have|to\s+Have)/i,
      /^Skills/i,
      /^Experience/i,
      /^Benefits/i,
      /^Perks/i,
      /^Compensation/i,
      /^Why\s+(Join|Work)/i,
      /^Who\s+(You\s+Are|We('re|\s+Are)\s+Looking)/i,
      /^(Technical|Functional)\s+Skills/i,
      /^Roles?\s+(&|and)\s+Responsibilities/i,
      /^Job\s+Description/i,
      /^Overview/i,
      /^Summary/i
    ];
  }

  /**
   * Check if text looks like a section heading
   */
  isHeadingText(text) {
    if (!text) return false;
    const trimmed = text.trim();
    // Short text (under 60 chars) matching heading patterns
    if (trimmed.length > 60) return false;
    return this.headingPatterns.some(pattern => pattern.test(trimmed));
  }

  /**
   * Format HTML for display - ensures proper paragraph spacing and headings
   */
  format(html) {
    if (!html) return '';

    const cleaned = this.cleanHTML(html);
    const temp = document.createElement('div');
    temp.innerHTML = cleaned;

    // First pass: process existing structure
    const paragraphs = temp.querySelectorAll('p');
    paragraphs.forEach(p => {
      const text = p.textContent.trim();

      // Check if paragraph contains only a <strong> tag (heading)
      if (p.children.length === 1 && p.children[0].tagName === 'STRONG') {
        p.classList.add('section-heading');
      }
      // Check if text matches heading patterns
      else if (this.isHeadingText(text)) {
        p.classList.add('section-heading');
        p.innerHTML = `<strong>${p.innerHTML}</strong>`;
      }
    });

    // Second pass: handle text that's not in paragraphs (plain text with <br> only)
    let result = temp.innerHTML;

    // If the content looks like it's just text with <br> tags (no real structure)
    if (paragraphs.length === 0 || (paragraphs.length === 1 && temp.textContent.length > 500)) {
      result = this.structureContent(result);
    }

    return result;
  }

  /**
   * Add structure to unstructured content (text with only <br> tags)
   */
  structureContent(html) {
    if (!html) return '';

    // Split by double line breaks or <br><br>
    let sections = html
      .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .split(/\n\n+/);

    const result = sections.map(section => {
      const trimmed = section.trim();
      if (!trimmed) return '';

      // Check if this section is a heading
      const plainText = trimmed.replace(/<[^>]*>/g, '').trim();

      if (this.isHeadingText(plainText)) {
        return `<p class="section-heading"><strong>${trimmed}</strong></p>`;
      }

      // Check if it's a list (starts with bullet points, dashes, or numbers)
      const lines = trimmed.split('\n').filter(l => l.trim());
      const looksLikeList = lines.length > 1 && lines.every(line => {
        const t = line.trim();
        return /^[•\-\*\d+\.]\s/.test(t) || /^[a-z]\)\s/i.test(t);
      });

      if (looksLikeList) {
        const items = lines.map(line => {
          const cleanLine = line.trim().replace(/^[•\-\*\d+\.]\s*/, '').replace(/^[a-z]\)\s*/i, '');
          return `<li>${cleanLine}</li>`;
        }).join('');
        return `<ul>${items}</ul>`;
      }

      // Regular paragraph - preserve line breaks within
      const withBreaks = trimmed.replace(/\n/g, '<br>');
      return `<p>${withBreaks}</p>`;
    }).filter(s => s).join('\n');

    return result;
  }
}

// Export
if (typeof window !== 'undefined') {
  window.LinkedInHTMLCleaner = LinkedInHTMLCleaner;
  window.linkedInCleaner = new LinkedInHTMLCleaner();
}
