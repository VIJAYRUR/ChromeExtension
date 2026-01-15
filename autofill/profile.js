// Profile View & Edit Manager

let currentProfile = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadProfile();
  setupEventListeners();
});

function setupEventListeners() {
  // Edit button (edit all)
  document.getElementById('editBtn')?.addEventListener('click', () => enterEditMode());

  // Create profile button (empty state)
  document.getElementById('createProfileBtn')?.addEventListener('click', () => enterEditMode());

  // Section edit buttons
  document.querySelectorAll('.btn-section-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = btn.getAttribute('data-step');
      enterEditMode(step);
    });
  });

  // Clear profile button (with double confirmation)
  document.getElementById('clearProfileBtn')?.addEventListener('click', () => handleClearProfile());

  // Listen for profile updates from the edit iframe
  window.addEventListener('message', handleProfileUpdate);
}

async function loadProfile() {
  try {
    const result = await chrome.storage.local.get(['userProfile']);

    if (result.userProfile && Object.keys(result.userProfile).length > 0) {
      currentProfile = result.userProfile;
      displayProfile(currentProfile);
      showProfileContent();

      // Re-attach section edit button listeners after profile is displayed
      attachSectionEditListeners();
    } else {
      showEmptyState();
    }
  } catch (error) {
    console.error('[Profile View] Error loading profile:', error);
    showEmptyState();
  }
}

function attachSectionEditListeners() {
  document.querySelectorAll('.btn-section-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = btn.getAttribute('data-step');
      enterEditMode(step);
    });
  });
}

function showEmptyState() {
  document.getElementById('emptyState').style.display = 'flex';
  document.getElementById('profileContent').style.display = 'none';
}

function showProfileContent() {
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('profileContent').style.display = 'block';
}

function displayProfile(profile) {
  console.log('[Profile View] Displaying profile:', profile);

  // Personal Information
  const fullName = profile.fullName ||
    `${profile.firstName || ''} ${profile.middleName || ''} ${profile.lastName || ''}`.trim();

  setTextContent('view-fullName', fullName);
  setTextContent('view-professionalSummary', profile.professionalSummary);

  // Contact Information
  setTextContent('view-email', profile.email);

  const phone = profile.phoneCountryCode && profile.phone
    ? `${profile.phoneCountryCode} ${formatPhone(profile.phone)}`
    : profile.phone;
  setTextContent('view-phone', phone);

  const location = [
    profile.city,
    profile.state,
    profile.country
  ].filter(Boolean).join(', ');
  setTextContent('view-location', location);

  setLink('view-linkedin', profile.linkedin);
  setLink('view-github', profile.github);
  setLink('view-portfolio', profile.portfolio);

  // Work Experience
  displayExperiences(profile.experiences);

  // Education
  displayEducation(profile.education);

  // Skills
  displaySkills(profile.skills || profile.skillsArray);

  // Work Authorization
  setTextContent('view-workAuthorization', profile.workAuthorization);
  setTextContent('view-workAuthorizationType', profile.workAuthorizationType);
  setTextContent('view-requireSponsorship', profile.requireSponsorship);
  setTextContent('view-clearanceEligibility', profile.clearanceEligibility);

  // Additional Information
  setTextContent('view-preferredLocation', profile.preferredLocation);
  setTextContent('view-salaryExpectation', profile.salaryExpectation);
  setTextContent('view-availableStartDate', formatDate(profile.availableStartDate));
  setTextContent('view-noticePeriod', profile.noticePeriod);
  setTextContent('view-willingToRelocate', profile.willingToRelocate);
  setTextContent('view-remotePreference', profile.remotePreference);

  // Files
  displayFiles(profile);
}

function setTextContent(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value || '-';
  }
}

function setLink(elementId, url) {
  const element = document.getElementById(elementId);
  if (element) {
    if (url) {
      element.href = url.startsWith('http') ? url : `https://${url}`;
      element.textContent = url;
      element.style.display = 'inline';
    } else {
      element.textContent = '-';
      element.href = '#';
      element.style.pointerEvents = 'none';
      element.style.color = 'var(--gray-600)';
    }
  }
}

function displayExperiences(experiences) {
  const container = document.getElementById('view-experiences');

  if (!experiences || experiences.length === 0) {
    container.innerHTML = '<div class="empty-section">No work experience added yet</div>';
    return;
  }

  container.innerHTML = experiences.map(exp => `
    <div class="timeline-item">
      <div class="timeline-header">
        <div class="timeline-title">${escapeHtml(exp.title || 'Position')}</div>
        <div class="timeline-subtitle">${escapeHtml(exp.company || 'Company')}</div>
        <div class="timeline-meta">
          ${formatDateRange(exp.startDate, exp.endDate)}
          ${exp.location ? `• ${escapeHtml(exp.location)}` : ''}
        </div>
      </div>
      ${exp.responsibilities ? `<div class="timeline-description">${escapeHtml(exp.responsibilities)}</div>` : ''}
    </div>
  `).join('');
}

function displayEducation(education) {
  const container = document.getElementById('view-education');

  if (!education || education.length === 0) {
    container.innerHTML = '<div class="empty-section">No education added yet</div>';
    return;
  }

  container.innerHTML = education.map(edu => `
    <div class="timeline-item">
      <div class="timeline-header">
        <div class="timeline-title">${escapeHtml(edu.degree || 'Degree')}</div>
        <div class="timeline-subtitle">${escapeHtml(edu.university || 'University')}</div>
        <div class="timeline-meta">
          ${formatDateRange(edu.startDate, edu.endDate)}
          ${edu.major ? `• ${escapeHtml(edu.major)}` : ''}
          ${edu.gpa ? `• GPA: ${escapeHtml(edu.gpa)}` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function displaySkills(skills) {
  const container = document.getElementById('view-skills');

  let skillsArray = [];

  if (Array.isArray(skills)) {
    skillsArray = skills;
  } else if (typeof skills === 'string') {
    skillsArray = skills.split(',').map(s => s.trim()).filter(s => s);
  }

  if (skillsArray.length === 0) {
    container.innerHTML = '<div class="empty-section">No skills added yet</div>';
    return;
  }

  container.innerHTML = skillsArray.map(skill =>
    `<span class="skill-tag">${escapeHtml(skill)}</span>`
  ).join('');
}

function displayFiles(profile) {
  // Resume
  const resumeFile = document.getElementById('view-resumeFile');
  const resumeFileName = document.getElementById('view-resumeFileName');

  if (profile.resumeFile && profile.resumeFile.name) {
    resumeFile.style.display = 'flex';
    resumeFileName.textContent = profile.resumeFile.name;
  } else {
    resumeFile.style.display = 'none';
  }

  // Cover Letter
  const coverLetterFile = document.getElementById('view-coverLetterFile');
  const coverLetterFileName = document.getElementById('view-coverLetterFileName');

  if (profile.coverLetterFile && profile.coverLetterFile.name) {
    coverLetterFile.style.display = 'flex';
    coverLetterFileName.textContent = profile.coverLetterFile.name;
  } else {
    coverLetterFile.style.display = 'none';
  }
}

// Helper Functions

function formatPhone(phone) {
  // Format US phone numbers as (XXX) XXX-XXXX
  const cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function formatDate(dateString) {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatDateRange(startDate, endDate) {
  if (!startDate) return 'Date not specified';

  const formatMonthYear = (dateString) => {
    if (!dateString) return null;

    // Parse YYYY-MM format directly to avoid timezone issues
    const [year, month] = dateString.split('-');
    if (!year || !month) return dateString;

    const monthIndex = parseInt(month) - 1;
    if (monthIndex < 0 || monthIndex > 11) return dateString;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${monthNames[monthIndex]} ${year}`;
  };

  const start = formatMonthYear(startDate);
  const end = endDate ? formatMonthYear(endDate) : 'Present';

  return `${start} - ${end}`;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Mode Switching

function enterEditMode(section = null) {
  console.log('[Profile View] Entering edit mode', section ? `for section: ${section}` : '(all)');

  document.getElementById('viewMode').style.display = 'none';
  document.getElementById('editMode').style.display = 'block';

  // Load the inline edit page
  const iframe = document.getElementById('editFrame');

  // Map step numbers to section names
  const sectionMap = {
    '1': 'documents',
    '2': 'personal',
    '3': 'contact',
    '4': 'experience',
    '5': 'skills',
    '6': 'education',
    '7': 'authorization'
  };

  const sectionName = sectionMap[section] || section;

  // If a section is specified, pass it as a URL parameter
  if (sectionName) {
    iframe.src = `profile-edit-inline.html?section=${sectionName}`;
  } else {
    iframe.src = 'profile-edit-inline.html';
  }
}

function exitEditMode() {
  console.log('[Profile View] Exiting edit mode');

  document.getElementById('editMode').style.display = 'none';
  document.getElementById('viewMode').style.display = 'block';

  // Reload profile
  loadProfile();
}

function handleProfileUpdate(event) {
  // Listen for messages from the edit iframe
  if (event.data && event.data.type === 'profileSaved') {
    console.log('[Profile View] Profile updated from edit mode');
    exitEditMode();
  } else if (event.data && event.data.type === 'cancelEdit') {
    console.log('[Profile View] Edit cancelled');
    exitEditMode();
  }
}

// Clear Profile with Double Confirmation
async function handleClearProfile() {
  // First confirmation
  const firstConfirm = confirm(
    '⚠️ Warning: This will permanently delete all your profile information.\n\n' +
    'This includes:\n' +
    '• Personal information\n' +
    '• Contact details\n' +
    '• Work experience\n' +
    '• Education\n' +
    '• Skills\n' +
    '• Uploaded documents\n\n' +
    'Are you sure you want to continue?'
  );

  if (!firstConfirm) {
    return;
  }

  // Second confirmation
  const secondConfirm = confirm(
    '⚠️ FINAL WARNING ⚠️\n\n' +
    'This action CANNOT be undone!\n\n' +
    'All your profile data will be permanently deleted.\n\n' +
    'Click OK to permanently delete your profile, or Cancel to keep it.'
  );

  if (!secondConfirm) {
    return;
  }

  try {
    console.log('[Profile View] Clearing profile...');

    // Clear the profile from storage
    await chrome.storage.local.remove(['userProfile']);

    console.log('[Profile View] ✅ Profile cleared successfully');

    // Reset current profile
    currentProfile = null;

    // Show empty state
    showEmptyState();

    // Show success notification
    alert('✅ Profile cleared successfully.\n\nAll your profile information has been deleted.');

  } catch (error) {
    console.error('[Profile View] ❌ Error clearing profile:', error);
    alert('❌ Error clearing profile. Please try again.');
  }
}

// Export for debugging
window.profileView = {
  loadProfile,
  displayProfile,
  enterEditMode,
  exitEditMode,
  getCurrentProfile: () => currentProfile,
  clearProfile: handleClearProfile
};
