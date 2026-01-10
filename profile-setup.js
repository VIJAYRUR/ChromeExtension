// Profile Setup JavaScript

let currentStep = 1;
const totalSteps = 5;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadExistingProfile();
  setupEventListeners();
  updateStepDisplay();
});

function setupEventListeners() {
  document.getElementById('nextBtn').addEventListener('click', nextStep);
  document.getElementById('prevBtn').addEventListener('click', prevStep);
  document.getElementById('profile-form').addEventListener('submit', saveProfile);
  document.getElementById('closeBtn')?.addEventListener('click', () => {
    window.close();
  });
}

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

  // Update progress bar
  document.querySelectorAll('.progress-step').forEach((step, index) => {
    const stepNum = index + 1;
    step.classList.toggle('active', stepNum === currentStep);
    step.classList.toggle('completed', stepNum < currentStep);
  });

  // Update buttons
  document.getElementById('prevBtn').style.display = currentStep === 1 ? 'none' : 'block';
  document.getElementById('nextBtn').style.display = currentStep === totalSteps ? 'none' : 'block';
  document.getElementById('submitBtn').style.display = currentStep === totalSteps ? 'block' : 'none';

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateCurrentStep() {
  const currentStepElement = document.querySelector(`.form-step[data-step="${currentStep}"]`);
  const requiredInputs = currentStepElement.querySelectorAll('[required]');
  
  let isValid = true;
  requiredInputs.forEach(input => {
    if (!input.value.trim()) {
      input.style.borderColor = '#dc3545';
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
  const profile = {};

  formData.forEach((value, key) => {
    profile[key] = value;
  });

  // Add full name
  profile.fullName = `${profile.firstName} ${profile.lastName}`.trim();

  // Parse skills into array
  if (profile.skills) {
    profile.skillsArray = profile.skills.split(',').map(s => s.trim()).filter(s => s);
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

