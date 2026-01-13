// Profile Setup JavaScript

let currentStep = 1;
const totalSteps = 7;
let uploadedResume = null;
let uploadedCoverLetter = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadExistingProfile();
  setupEventListeners();
  updateStepDisplay();
});

function setupEventListeners() {
  // Navigation
  document.getElementById('nextBtn').addEventListener('click', nextStep);
  document.getElementById('prevBtn').addEventListener('click', prevStep);
  document.getElementById('profile-form').addEventListener('submit', saveProfile);
  document.getElementById('closeBtn')?.addEventListener('click', () => {
    window.close();
  });

  // Resume upload
  const uploadArea = document.getElementById('uploadArea');
  const resumeFile = document.getElementById('resumeFile');
  const removeResume = document.getElementById('removeResume');

  uploadArea.addEventListener('click', () => resumeFile.click());

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#0071e3';
    uploadArea.style.background = '#f5f5f7';
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#d2d2d7';
    uploadArea.style.background = '';
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#d2d2d7';
    uploadArea.style.background = '';

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleResumeUpload(files[0]);
    }
  });

  resumeFile.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleResumeUpload(e.target.files[0]);
    }
  });

  removeResume.addEventListener('click', (e) => {
    e.stopPropagation();
    clearResumeUpload();
  });

  // Dynamic entries
  document.getElementById('addExperienceBtn')?.addEventListener('click', addExperienceEntry);
  document.getElementById('addEducationBtn')?.addEventListener('click', addEducationEntry);

  // Cover letter upload
  const coverLetterFile = document.getElementById('coverLetterFile');
  if (coverLetterFile) {
    coverLetterFile.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleCoverLetterUpload(e.target.files[0]);
      }
    });
  }
}

function handleResumeUpload(file) {
  // Validate file
  const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    alert('Please upload a PDF, DOC, or DOCX file');
    return;
  }

  if (file.size > maxSize) {
    alert('File size must be less than 5MB');
    return;
  }

  uploadedResume = file;

  // Show success state
  document.querySelector('.upload-content').style.display = 'none';
  document.getElementById('uploadSuccess').style.display = 'flex';
  document.getElementById('uploadFilename').textContent = file.name;

  // TODO: In the future, parse resume and populate fields
  console.log('[Profile Setup] Resume uploaded:', file.name);
  // parseResume(file);
}

function clearResumeUpload() {
  uploadedResume = null;
  document.querySelector('.upload-content').style.display = 'block';
  document.getElementById('uploadSuccess').style.display = 'none';
  document.getElementById('resumeFile').value = '';
}

function handleCoverLetterUpload(file) {
  // Validate file
  const validTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    alert('Please upload a PDF, DOC, DOCX, or TXT file');
    return;
  }

  if (file.size > maxSize) {
    alert('File size must be less than 5MB');
    return;
  }

  uploadedCoverLetter = file;
  console.log('[Profile Setup] Cover letter uploaded:', file.name);
}

// Dynamic Experience Entries
let experienceCount = 0;

function addExperienceEntry() {
  experienceCount++;
  const container = document.getElementById('experienceContainer');

  const entryDiv = document.createElement('div');
  entryDiv.className = 'entry-container';
  entryDiv.id = `experience-${experienceCount}`;

  entryDiv.innerHTML = `
    <div class="entry-header">
      <h3 class="entry-title">Work Experience #${experienceCount}</h3>
      <button type="button" class="remove-button" onclick="removeEntry('experience-${experienceCount}')">Remove</button>
    </div>

    <div class="form-group">
      <label for="company${experienceCount}">Company Name</label>
      <input type="text" id="company${experienceCount}" name="experiences[${experienceCount}][company]" placeholder="Acme Corporation">
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="title${experienceCount}">Job Title</label>
        <input type="text" id="title${experienceCount}" name="experiences[${experienceCount}][title]" placeholder="Software Engineer">
      </div>
      <div class="form-group">
        <label for="location${experienceCount}">Location</label>
        <input type="text" id="location${experienceCount}" name="experiences[${experienceCount}][location]" placeholder="San Francisco, CA">
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="startDate${experienceCount}">Start Date</label>
        <input type="month" id="startDate${experienceCount}" name="experiences[${experienceCount}][startDate]">
      </div>
      <div class="form-group">
        <label for="endDate${experienceCount}">End Date</label>
        <input type="month" id="endDate${experienceCount}" name="experiences[${experienceCount}][endDate]">
        <small>Leave blank if current position</small>
      </div>
    </div>

    <div class="form-group">
      <label for="responsibilities${experienceCount}">Key Responsibilities & Achievements</label>
      <textarea id="responsibilities${experienceCount}" name="experiences[${experienceCount}][responsibilities]" rows="5" placeholder="• Developed and maintained web applications
• Collaborated with cross-functional teams
• Improved system performance"></textarea>
    </div>
  `;

  container.appendChild(entryDiv);
}

// Dynamic Education Entries
let educationCount = 0;

function addEducationEntry() {
  educationCount++;
  const container = document.getElementById('educationContainer');

  const entryDiv = document.createElement('div');
  entryDiv.className = 'entry-container';
  entryDiv.id = `education-${educationCount}`;

  entryDiv.innerHTML = `
    <div class="entry-header">
      <h3 class="entry-title">Education #${educationCount}</h3>
      <button type="button" class="remove-button" onclick="removeEntry('education-${educationCount}')">Remove</button>
    </div>

    <div class="form-group">
      <label for="degree${educationCount}">Degree Type</label>
      <select id="degree${educationCount}" name="education[${educationCount}][degree]">
        <option value="">Select</option>
        <option value="High School">High School Diploma</option>
        <option value="Associate">Associate's Degree</option>
        <option value="Bachelor">Bachelor's Degree</option>
        <option value="Master">Master's Degree</option>
        <option value="PhD">PhD</option>
        <option value="Other">Other</option>
      </select>
    </div>

    <div class="form-group">
      <label for="university${educationCount}">University/College</label>
      <input type="text" id="university${educationCount}" name="education[${educationCount}][university]" placeholder="State University">
    </div>

    <div class="form-group">
      <label for="major${educationCount}">Field of Study</label>
      <input type="text" id="major${educationCount}" name="education[${educationCount}][major]" placeholder="Computer Science">
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="startMonth${educationCount}">Start Date</label>
        <input type="month" id="startMonth${educationCount}" name="education[${educationCount}][startDate]">
      </div>
      <div class="form-group">
        <label for="endMonth${educationCount}">End Date</label>
        <input type="month" id="endMonth${educationCount}" name="education[${educationCount}][endDate]">
        <small>Leave blank if currently enrolled</small>
      </div>
    </div>

    <div class="form-group">
      <label for="gpa${educationCount}">GPA</label>
      <input type="text" id="gpa${educationCount}" name="education[${educationCount}][gpa]" placeholder="3.5">
    </div>
  `;

  container.appendChild(entryDiv);
}

// Remove entry function (global scope for onclick)
window.removeEntry = function(entryId) {
  const entry = document.getElementById(entryId);
  if (entry) {
    entry.remove();
  }
};

async function loadExistingProfile() {
  const result = await chrome.storage.local.get(['userProfile']);
  if (result.userProfile) {
    console.log('[Profile Setup] Loading existing profile...');
    populateForm(result.userProfile);
  }
}

function populateForm(profile) {
  Object.keys(profile).forEach(key => {
    const input = document.getElementById(key);
    if (input) {
      input.value = profile[key] || '';
    }
  });
}

function nextStep() {
  if (!validateCurrentStep()) {
    return;
  }

  if (currentStep < totalSteps) {
    currentStep++;
    updateStepDisplay();
  }
}

function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    updateStepDisplay();
  }
}

function updateStepDisplay() {
  // Update form steps
  document.querySelectorAll('.form-step').forEach((step, index) => {
    step.classList.toggle('active', index + 1 === currentStep);
  });

  // Update progress steps
  document.querySelectorAll('.step').forEach((step, index) => {
    const stepNum = index + 1;
    step.classList.toggle('active', stepNum === currentStep);
    step.classList.toggle('completed', stepNum < currentStep);
  });

  // Update progress bar fill
  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
  document.getElementById('progressFill').style.width = `${progressPercentage}%`;

  // Update buttons
  document.getElementById('prevBtn').style.display = currentStep === 1 ? 'none' : 'block';
  document.getElementById('nextBtn').style.display = currentStep === totalSteps ? 'none' : 'block';
  document.getElementById('submitBtn').style.display = currentStep === totalSteps ? 'block' : 'none';

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateCurrentStep() {
  // Step 1 (resume upload) is optional, always valid
  if (currentStep === 1) {
    return true;
  }

  const currentStepElement = document.querySelector(`.form-step[data-step="${currentStep}"]`);
  const requiredInputs = currentStepElement.querySelectorAll('[required]');

  let isValid = true;
  requiredInputs.forEach(input => {
    if (!input.value.trim()) {
      input.style.borderColor = '#ff3b30';
      isValid = false;

      // Remove error styling after user starts typing
      input.addEventListener('input', () => {
        input.style.borderColor = '';
      }, { once: true });
    }
  });

  if (!isValid) {
    alert('Please fill in all required fields before continuing.');
  }

  return isValid;
}

async function saveProfile(e) {
  e.preventDefault();

  if (!validateCurrentStep()) {
    return;
  }

  const formData = new FormData(e.target);
  const profile = {
    experiences: [],
    education: []
  };

  // Process form data
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

  // Clean up arrays (remove undefined entries)
  profile.experiences = profile.experiences.filter(exp => exp && Object.keys(exp).length > 0);
  profile.education = profile.education.filter(edu => edu && Object.keys(edu).length > 0);

  // Add full name
  if (profile.firstName && profile.lastName) {
    profile.fullName = `${profile.firstName} ${profile.middleName ? profile.middleName + ' ' : ''}${profile.lastName}`.trim();
  }

  // Parse skills into array
  if (profile.skills) {
    profile.skillsArray = profile.skills.split(',').map(s => s.trim()).filter(s => s);
  }

  // Add resume file if uploaded
  if (uploadedResume) {
    try {
      const base64Resume = await fileToBase64(uploadedResume);
      profile.resumeFile = {
        name: uploadedResume.name,
        data: base64Resume,
        type: uploadedResume.type,
        size: uploadedResume.size
      };
      console.log('[Profile Setup] 📎 Resume file included:', uploadedResume.name);
    } catch (error) {
      console.error('[Profile Setup] ❌ Error converting resume to base64:', error);
    }
  }

  // Add cover letter file if uploaded
  if (uploadedCoverLetter) {
    try {
      const base64CoverLetter = await fileToBase64(uploadedCoverLetter);
      profile.coverLetterFile = {
        name: uploadedCoverLetter.name,
        data: base64CoverLetter,
        type: uploadedCoverLetter.type,
        size: uploadedCoverLetter.size
      };
      console.log('[Profile Setup] 📎 Cover letter file included:', uploadedCoverLetter.name);
    } catch (error) {
      console.error('[Profile Setup] ❌ Error converting cover letter to base64:', error);
    }
  }

  console.log('[Profile Setup] Saving profile...', profile);

  try {
    await chrome.storage.local.set({ userProfile: profile });
    console.log('[Profile Setup] ✅ Profile saved successfully!');

    // Show success message
    document.getElementById('profile-form').style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    document.getElementById('successMessage').style.display = 'block';
  } catch (error) {
    console.error('[Profile Setup] ❌ Error saving profile:', error);
    alert('Error saving profile. Please try again.');
  }
}

// Helper function to convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Auto-save draft as user types (debounced)
let autoSaveTimeout;
document.getElementById('profile-form').addEventListener('input', () => {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    saveDraft();
  }, 2000);
});

async function saveDraft() {
  const formData = new FormData(document.getElementById('profile-form'));
  const draft = {};
  formData.forEach((value, key) => {
    if (value) draft[key] = value;
  });
  
  await chrome.storage.local.set({ profileDraft: draft });
  console.log('[Profile Setup] 💾 Draft auto-saved');
}

// Load draft on page load
async function loadDraft() {
  const result = await chrome.storage.local.get(['profileDraft']);
  if (result.profileDraft && !result.userProfile) {
    populateForm(result.profileDraft);
    console.log('[Profile Setup] 📝 Loaded draft');
  }
}

// Call loadDraft after DOM is ready
setTimeout(loadDraft, 100);

