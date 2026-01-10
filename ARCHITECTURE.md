# Chrome Extension Architecture

## Overview
This Chrome extension is built with a **modular architecture** that separates three main features into independent modules. This design ensures clean separation of concerns, easier maintenance, and better scalability.

## Module Structure

### 1. 🔍 Job Filter Module (`job-filter/`)
**Purpose**: Filter and browse LinkedIn job listings

**Files**:
- `content.js` - Main content script for LinkedIn pages
- `floating-panel.css` - Styling for the filter panel

**Responsibilities**:
- Inject floating filter panel on LinkedIn jobs pages
- Filter jobs based on user preferences
- Real-time job list updates
- Communicate with shared module for tracking

**Entry Point**: Runs on `https://www.linkedin.com/jobs/*`

---

### 2. 📊 Tracking Dashboard Module (`tracking-dashboard/`)
**Purpose**: Track and manage job applications

**Files**:
- `dashboard.html/css/js` - Main dashboard interface
- `job-detail.html/css/js` - Individual job detail pages
- `job-tracker.js` - Core tracking logic

**Responsibilities**:
- Display all tracked jobs in a beautiful dashboard
- Manage job application status and timeline
- Store and retrieve job data from Chrome storage
- Handle resume and cover letter attachments
- Provide filtering, sorting, and search functionality

**Entry Point**: Opened via popup or background script

---

### 3. 📝 Autofill Module (`autofill/`)
**Purpose**: Automatically fill job application forms

**Files**:
- `autofill-content.js` - UI controller and floating button
- `autofill-engine.js` - Core autofill logic and field detection
- `profile-setup.html/css/js` - Profile setup wizard
- `resume-manager.js` - Resume parsing and management

**Responsibilities**:
- Detect job application pages
- Show autofill floating button
- Parse and store user profile data
- Intelligently map profile data to form fields
- Support multiple job application platforms

**Entry Point**: Runs on job application URLs (Workday, Greenhouse, etc.)

---

### 4. 🔧 Shared Module (`shared/`)
**Purpose**: Common functionality across all modules

**Files**:
- `popup.html/js` - Extension popup interface
- `background.js` - Background service worker

**Responsibilities**:
- Central navigation hub
- Display statistics
- Handle cross-module communication
- Manage extension-wide events
- Open dashboard and profile setup pages

**Entry Point**: Always active (background script) and popup

---

## Data Flow

```
User Action → Popup/Background → Module
                                    ↓
                            Chrome Storage
                                    ↓
                            Module Response
```

### Example Flows:

**1. Tracking a Job**:
```
LinkedIn Page → Job Filter → Track Button → Background Script → Storage → Dashboard
```

**2. Autofilling a Form**:
```
Application Page → Autofill Module → Profile Data → Form Fields → User Review
```

**3. Viewing Dashboard**:
```
Popup → Open Dashboard → Background Script → Dashboard Page → Display Jobs
```

---

## Communication Between Modules

### Message Passing
Modules communicate via Chrome's message passing API:

```javascript
// From content script to background
chrome.runtime.sendMessage({ action: 'trackJob', jobData: {...} });

// From background to content script
chrome.tabs.sendMessage(tabId, { action: 'togglePanel' });
```

### Storage
All modules share Chrome's local storage:

```javascript
// Shared data structure
{
  trackedJobs: [...],      // Used by tracking-dashboard
  userProfile: {...},      // Used by autofill
  filterSettings: {...}    // Used by job-filter
}
```

---

## Benefits of This Architecture

✅ **Separation of Concerns** - Each module has a single, well-defined purpose
✅ **Independent Development** - Modules can be developed and tested separately
✅ **Easy Maintenance** - Changes to one module don't affect others
✅ **Scalability** - New features can be added as new modules
✅ **Code Organization** - Clear structure makes codebase easy to navigate
✅ **Reusability** - Shared components are centralized
✅ **Testing** - Modules can be tested in isolation

---

## File Naming Conventions

- **HTML files**: `feature-name.html` (e.g., `dashboard.html`)
- **CSS files**: `feature-name.css` (e.g., `dashboard.css`)
- **JS files**: `feature-name.js` (e.g., `dashboard.js`)
- **Module folders**: `kebab-case` (e.g., `job-filter`, `tracking-dashboard`)

---

## Adding a New Module

1. Create a new folder in the root directory
2. Add your module files
3. Update `manifest.json` with new content scripts or resources
4. Update `shared/background.js` if cross-module communication is needed
5. Create a `README.md` in the module folder
6. Update main `README.md` with new module information

