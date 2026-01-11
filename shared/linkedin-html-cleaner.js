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
      const regex = new RegExp(`\\b${skill.toLowerCase()}\\b`, 'i');
      if (regex.test(lowerText)) {
        found.push(skill);
      }
    }

    return found;
  }

  /**
   * Format HTML for display - ensures proper paragraph spacing
   */
  format(html) {
    const cleaned = this.cleanHTML(html);

    // Parse cleaned HTML
    const temp = document.createElement('div');
    temp.innerHTML = cleaned;

    // Process all paragraphs
    const paragraphs = temp.querySelectorAll('p');
    paragraphs.forEach(p => {
      // Check if paragraph contains only a <strong> tag
      if (p.children.length === 1 && p.children[0].tagName === 'STRONG') {
        // This is a heading paragraph - add heading class
        p.classList.add('heading');
      }
    });

    return temp.innerHTML;
  }
}

// Export
if (typeof window !== 'undefined') {
  window.LinkedInHTMLCleaner = LinkedInHTMLCleaner;
  window.linkedInCleaner = new LinkedInHTMLCleaner();
}
