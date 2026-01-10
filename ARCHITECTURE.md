# Architecture

## Overview

Modular Chrome extension with 3 independent features organized into separate modules.

---

## Module Structure

### 🔍 `job-filter/`
**LinkedIn job filtering**

- `content.js` - Content script for LinkedIn pages
- `floating-panel.css` - Filter panel UI

Runs on: `https://www.linkedin.com/jobs/*`

---

### 📊 `tracking-dashboard/`
**Job application tracking**

- `dashboard.html/css/js` - Main dashboard
- `job-detail.html/css/js` - Job detail pages
- `job-tracker.js` - Tracking logic

Opened via: Extension popup or background script

---

### ⚡ `autofill/`
**Form autofill system**

- `autofill-content.js` - UI controller
- `autofill-engine.js` - Autofill logic
- `profile-setup.html/css/js` - Profile wizard
- `resume-manager.js` - Resume parsing

Runs on: Job application pages (Workday, Greenhouse, Lever, etc.)

---

### 🔧 `shared/`
**Common components**

- `popup.html/js` - Extension popup
- `background.js` - Background service worker

Always active

---

## Data Flow

```
User Action → Popup/Background → Module → Chrome Storage → Response
```

**Examples:**

1. **Track Job**: LinkedIn → Track Button → Background → Storage → Dashboard
2. **Autofill**: Application Page → Autofill Module → Profile Data → Form Fields
3. **Filter**: LinkedIn → Filter Panel → Content Script → Hide/Show Jobs

---

## Communication

**Message Passing:**
```javascript
// Content → Background
chrome.runtime.sendMessage({ action: 'trackJob', jobData: {...} });

// Background → Content
chrome.tabs.sendMessage(tabId, { action: 'togglePanel' });
```

**Storage:**
```javascript
{
  trackedJobs: [...],      // tracking-dashboard
  userProfile: {...},      // autofill
  filterSettings: {...}    // job-filter
}
```

---

## Tech Stack

- **Language**: Vanilla JavaScript (no frameworks)
- **Manifest**: Chrome Extension Manifest V3
- **Storage**: Chrome Storage API (local)
- **UI**: Modern CSS with animations
- **Architecture**: Modular, event-driven

---

## Key Benefits

✅ Separation of concerns
✅ Independent modules
✅ Easy to maintain
✅ Scalable architecture
✅ Clear code organization

---

## Adding a New Module

1. Create folder in root: `new-feature/`
2. Add your files
3. Update `manifest.json` (content scripts, resources)
4. Update `shared/background.js` if needed
5. Test independently

---

## File Conventions

- Folders: `kebab-case` (e.g., `job-filter`)
- Files: `feature-name.js` (e.g., `dashboard.js`)
- Modules: One feature per folder

