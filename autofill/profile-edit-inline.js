// Inline Profile Editor - Apple/Notion Style

let currentProfile = null;
let editingSection = null; // null means edit all
let uploadedResume = null;
let uploadedResumeFile = null; // Store the actual File object for parsing
let experienceCount = 0;
let educationCount = 0;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadProfile();
  await loadSection();
  setupEventListeners();
});

async function loadProfile() {
  try {
    const result = await chrome.storage.local.get(['userProfile']);
    if (result.userProfile) {
      currentProfile = result.userProfile;
      console.log('[Edit Inline] Profile loaded:', currentProfile);
    } else {
      currentProfile = {};
    }
  } catch (error) {
    console.error('[Edit Inline] Error loading profile:', error);
    currentProfile = {};
  }
}

async function loadSection() {
  // Check URL parameter for specific section
  const urlParams = new URLSearchParams(window.location.search);
  editingSection = urlParams.get('section');

  if (editingSection) {
    console.log('[Edit Inline] Editing section:', editingSection);
    document.getElementById('editTitle').textContent = `Edit ${getSectionTitle(editingSection)}`;

    // Show only the relevant section
    document.querySelectorAll('.edit-section').forEach(section => {
      const sectionName = section.getAttribute('data-section');
      if (sectionName === editingSection) {
        section.style.display = 'block';
      } else {
        section.style.display = 'none';
      }
    });
  } else {
    console.log('[Edit Inline] Editing all sections');
    document.getElementById('editTitle').textContent = 'Edit Profile';
  }

  // Populate form with existing data
  populateForm();
}

function getSectionTitle(section) {
  const titles = {
    'personal': 'Personal Information',
    'contact': 'Contact Information',
    'experience': 'Work Experience',
    'skills': 'Skills',
    'education': 'Education',
    'authorization': 'Work Authorization',
    'documents': 'Documents'
  };
  return titles[section] || 'Profile';
}

function setupEventListeners() {
  // Navigation
  document.getElementById('backBtn').addEventListener('click', goBack);
  document.getElementById('cancelBtn').addEventListener('click', goBack);
  document.getElementById('saveBtn').addEventListener('click', saveProfile);

  // Dynamic entries
  document.getElementById('addExperienceBtn').addEventListener('click', addExperienceEntry);
  document.getElementById('addEducationBtn').addEventListener('click', addEducationEntry);

  // Resume upload
  const resumeUploadArea = document.getElementById('resumeUploadArea');
  const resumeFile = document.getElementById('resumeFile');
  const removeResumeBtn = document.getElementById('removeResumeBtn');

  resumeUploadArea.addEventListener('click', () => resumeFile.click());
  resumeFile.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleResumeUpload(e.target.files[0]);
    }
  });
  removeResumeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearResumeUpload();
  });

}

function populateForm() {
  if (!currentProfile) return;

  // Personal Information
  setFieldValue('firstName', currentProfile.firstName);
  setFieldValue('middleName', currentProfile.middleName);
  setFieldValue('lastName', currentProfile.lastName);
  setFieldValue('professionalSummary', currentProfile.professionalSummary);

  // Contact Information
  setFieldValue('email', currentProfile.email);
  setFieldValue('phone', currentProfile.phone);
  setFieldValue('city', currentProfile.city);
  setFieldValue('state', currentProfile.state);
  setFieldValue('country', currentProfile.country);
  setFieldValue('linkedin', currentProfile.linkedin);
  setFieldValue('github', currentProfile.github);
  setFieldValue('portfolio', currentProfile.portfolio);

  // Work Experience
  if (currentProfile.experiences && currentProfile.experiences.length > 0) {
    currentProfile.experiences.forEach(exp => {
      addExperienceEntry(exp);
    });
  }

  // Skills
  setFieldValue('skills', currentProfile.skills);

  // Education
  if (currentProfile.education && currentProfile.education.length > 0) {
    currentProfile.education.forEach(edu => {
      addEducationEntry(edu);
    });
  }

  // Work Authorization
  setFieldValue('workAuthorization', currentProfile.workAuthorization);
  setFieldValue('workAuthorizationType', currentProfile.workAuthorizationType);
  setFieldValue('requireSponsorship', currentProfile.requireSponsorship);
  setFieldValue('preferredLocation', currentProfile.preferredLocation);
  setFieldValue('remotePreference', currentProfile.remotePreference);

  // Resume
  if (currentProfile.resumeFile) {
    uploadedResume = currentProfile.resumeFile;
    showResumeUploaded(currentProfile.resumeFile.name);
  }
}

function setFieldValue(id, value) {
  const field = document.getElementById(id);
  if (field && value) {
    field.value = value;
  }
}

// Dynamic Experience Entries
function addExperienceEntry(data = null) {
  experienceCount++;
  const container = document.getElementById('experienceContainer');

  const card = document.createElement('div');
  card.className = 'entry-card';
  card.id = `experience-${experienceCount}`;

  card.innerHTML = `
    <div class="entry-card-header">
      <span class="entry-card-title">Experience #${experienceCount}</span>
      <button type="button" class="btn-remove-entry" onclick="removeEntry('experience-${experienceCount}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Company</label>
        <input type="text" name="experiences[${experienceCount}][company]" value="${data?.company || ''}">
      </div>
      <div class="form-group">
        <label>Job Title</label>
        <input type="text" name="experiences[${experienceCount}][title]" value="${data?.title || ''}">
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Start Date</label>
        <input type="month" name="experiences[${experienceCount}][startDate]" value="${data?.startDate || ''}">
      </div>
      <div class="form-group">
        <label>End Date</label>
        <input type="month" name="experiences[${experienceCount}][endDate]" value="${data?.endDate || ''}">
        <small>Leave blank if current position</small>
      </div>
    </div>

    <div class="form-group">
      <label>Description</label>
      <textarea name="experiences[${experienceCount}][responsibilities]" rows="3">${data?.responsibilities || ''}</textarea>
    </div>
  `;

  container.appendChild(card);
}

// Dynamic Education Entries
function addEducationEntry(data = null) {
  educationCount++;
  const container = document.getElementById('educationContainer');

  const card = document.createElement('div');
  card.className = 'entry-card';
  card.id = `education-${educationCount}`;

  card.innerHTML = `
    <div class="entry-card-header">
      <span class="entry-card-title">Education #${educationCount}</span>
      <button type="button" class="btn-remove-entry" onclick="removeEntry('education-${educationCount}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Degree</label>
        <select name="education[${educationCount}][degree]">
          <option value="">Select</option>
          <option value="High School" ${data?.degree === 'High School' ? 'selected' : ''}>High School</option>
          <option value="Associate" ${data?.degree === 'Associate' ? 'selected' : ''}>Associate's</option>
          <option value="Bachelor" ${data?.degree === 'Bachelor' ? 'selected' : ''}>Bachelor's</option>
          <option value="Master" ${data?.degree === 'Master' ? 'selected' : ''}>Master's</option>
          <option value="PhD" ${data?.degree === 'PhD' ? 'selected' : ''}>PhD</option>
        </select>
      </div>
      <div class="form-group">
        <label>University</label>
        <input type="text" name="education[${educationCount}][university]" value="${data?.university || ''}">
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Major</label>
        <input type="text" name="education[${educationCount}][major]" value="${data?.major || ''}">
      </div>
      <div class="form-group">
        <label>GPA</label>
        <input type="text" name="education[${educationCount}][gpa]" value="${data?.gpa || ''}" placeholder="3.8">
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Start Date</label>
        <input type="month" name="education[${educationCount}][startDate]" value="${data?.startDate || ''}">
      </div>
      <div class="form-group">
        <label>Graduation Date</label>
        <input type="month" name="education[${educationCount}][endDate]" value="${data?.endDate || ''}">
        <small>Leave blank if currently enrolled</small>
      </div>
    </div>
  `;

  container.appendChild(card);
}

// Remove entry function (global)
window.removeEntry = function(entryId) {
  const entry = document.getElementById(entryId);
  if (entry) {
    entry.remove();
  }
};

// Resume Upload
function handleResumeUpload(file) {
  const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const maxSize = 5 * 1024 * 1024;

  if (!validTypes.includes(file.type)) {
    alert('Please upload a PDF, DOC, or DOCX file');
    return;
  }

  if (file.size > maxSize) {
    alert('File size must be less than 5MB');
    return;
  }

  // Store the file object for future parsing
  uploadedResumeFile = file;

  const reader = new FileReader();
  reader.onload = () => {
    uploadedResume = {
      name: file.name,
      data: reader.result,
      type: file.type,
      size: file.size
    };
    showResumeUploaded(file.name);

    // Show "coming soon" notice for all file types
    document.getElementById('parseResumeSection').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function showResumeUploaded(filename) {
  document.getElementById('resumeUploadContent').style.display = 'none';
  document.getElementById('resumeUploadSuccess').style.display = 'flex';
  document.getElementById('resumeFileName').textContent = filename;
}

function clearResumeUpload() {
  uploadedResume = null;
  uploadedResumeFile = null;
  document.getElementById('resumeUploadContent').style.display = 'block';
  document.getElementById('resumeUploadSuccess').style.display = 'none';
  document.getElementById('resumeFile').value = '';
  document.getElementById('parseResumeSection').style.display = 'none';
  document.getElementById('parsingStatus').style.display = 'none';
  document.getElementById('parsingSuccess').style.display = 'none';
}

// Save Profile
async function saveProfile() {
  console.log('[Edit Inline] Saving profile...');

  const formData = new FormData(document.getElementById('editForm'));
  const profile = { ...currentProfile }; // Preserve existing data

  // Process form data
  profile.experiences = [];
  profile.education = [];

  formData.forEach((value, key) => {
    // Handle experience entries
    if (key.startsWith('experiences[')) {
      const match = key.match(/experiences\[(\d+)\]\[(\w+)\]/);
      if (match) {
        const index = parseInt(match[1]);
        const field = match[2];
        if (!profile.experiences[index]) {
          profile.experiences[index] = {};
        }
        profile.experiences[index][field] = value;
      }
    }
    // Handle education entries
    else if (key.startsWith('education[')) {
      const match = key.match(/education\[(\d+)\]\[(\w+)\]/);
      if (match) {
        const index = parseInt(match[1]);
        const field = match[2];
        if (!profile.education[index]) {
          profile.education[index] = {};
        }
        profile.education[index][field] = value;
      }
    }
    // Handle regular fields
    else {
      profile[key] = value;
    }
  });

  // Clean up arrays
  profile.experiences = profile.experiences.filter(exp => exp && Object.keys(exp).length > 0);
  profile.education = profile.education.filter(edu => edu && Object.keys(edu).length > 0);

  // Add full name
  if (profile.firstName && profile.lastName) {
    profile.fullName = `${profile.firstName} ${profile.middleName || ''} ${profile.lastName}`.trim();
  }

  // Parse skills
  if (profile.skills) {
    profile.skillsArray = profile.skills.split(',').map(s => s.trim()).filter(s => s);
  }

  // Add resume if uploaded
  if (uploadedResume) {
    profile.resumeFile = uploadedResume;
  }

  console.log('[Edit Inline] Processed profile:', profile);

  try {
    await chrome.storage.local.set({ userProfile: profile });
    console.log('[Edit Inline] ✅ Profile saved successfully!');

    // Notify parent window if in iframe
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'profileSaved', profile }, '*');
    } else {
      // If standalone, go back to profile view
      window.location.href = 'profile.html';
    }
  } catch (error) {
    console.error('[Edit Inline] ❌ Error saving profile:', error);
    alert('Error saving profile. Please try again.');
  }
}

// Navigation
function goBack() {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'cancelEdit' }, '*');
  } else {
    window.location.href = 'profile.html';
  }
}

// Resume Parsing
async function handleParseResume() {
  if (!uploadedResumeFile) {
    alert('Please upload a resume first');
    return;
  }

  if (uploadedResumeFile.type !== 'application/pdf') {
    alert('Resume parsing is currently only supported for PDF files');
    return;
  }

  try {
    // Show parsing status
    document.getElementById('parseResumeSection').style.display = 'none';
    document.getElementById('parsingStatus').style.display = 'block';
    document.getElementById('parsingSuccess').style.display = 'none';

    console.log('[Profile Edit] Starting resume parsing...');

    // Create parser instance
    const parser = new ResumeParser();

    // Parse the resume
    const parsedData = await parser.parseResume(uploadedResumeFile);

    console.log('[Profile Edit] Parsed data:', parsedData);

    // Populate the form with parsed data
    populateFormWithParsedData(parsedData);

    // Show success message
    document.getElementById('parsingStatus').style.display = 'none';
    document.getElementById('parsingSuccess').style.display = 'block';

    // Scroll to top to see the populated form
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Auto-hide success message after 5 seconds
    setTimeout(() => {
      document.getElementById('parsingSuccess').style.display = 'none';
    }, 5000);

  } catch (error) {
    console.error('[Profile Edit] ❌ Error parsing resume:', error);

    // Hide parsing status
    document.getElementById('parsingStatus').style.display = 'none';
    document.getElementById('parseResumeSection').style.display = 'block';

    alert('Error parsing resume. Please try again or fill in the information manually.\n\nError: ' + error.message);
  }
}

function populateFormWithParsedData(data) {
  console.log('[Profile Edit] Populating form with parsed data...');

  // Personal Information
  if (data.firstName) setFieldValue('firstName', data.firstName);
  if (data.lastName) setFieldValue('lastName', data.lastName);
  if (data.professionalSummary) setFieldValue('professionalSummary', data.professionalSummary);

  // Contact Information
  if (data.email) setFieldValue('email', data.email);
  if (data.phone) setFieldValue('phone', data.phone);
  if (data.city) setFieldValue('city', data.city);
  if (data.state) setFieldValue('state', data.state);
  if (data.country) setFieldValue('country', data.country);
  if (data.linkedin) setFieldValue('linkedin', data.linkedin);
  if (data.github) setFieldValue('github', data.github);
  if (data.portfolio) setFieldValue('portfolio', data.portfolio);

  // Work Experience
  if (data.experiences && data.experiences.length > 0) {
    // Clear existing experience entries
    document.getElementById('experienceContainer').innerHTML = '';
    experienceCount = 0;

    // Add parsed experiences
    data.experiences.forEach(exp => {
      addExperienceEntry(exp);
    });
  }

  // Skills
  if (data.skills) {
    setFieldValue('skills', data.skills);
  }

  // Education
  if (data.education && data.education.length > 0) {
    // Clear existing education entries
    document.getElementById('educationContainer').innerHTML = '';
    educationCount = 0;

    // Add parsed education
    data.education.forEach(edu => {
      addEducationEntry(edu);
    });
  }

  console.log('[Profile Edit] ✅ Form populated with parsed data');
}
