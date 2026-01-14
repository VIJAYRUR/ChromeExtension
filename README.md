# 🎯 LinkedIn Jobs Extension

**Supercharge your job search with smart filtering, application tracking, analytics, and one-click autofill.**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://www.google.com/chrome/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue.svg)](https://github.com/VIJAYRUR/ChromeExtension)

---

## What This Does

This Chrome extension is an all-in-one job search companion that solves major pain points:

1. **🔍 Filter LinkedIn Jobs** - Hide reposted jobs, filter by time, blacklist companies
2. **📊 Track Applications** - Beautiful Notion-style dashboard with kanban, table, calendar, and stats views
3. **📈 Analytics & Insights** - Visualize your job search progress with charts and metrics
4. **⚡ Autofill Forms** - One-click autofill for job applications across 10+ platforms with intelligent field detection

---

## Quick Start

### Installation

**Option 1: Clone from GitHub (Recommended)**
```bash
git clone https://github.com/VIJAYRUR/ChromeExtension.git
cd ChromeExtension
```

**Option 2: Download ZIP**
1. Visit [GitHub Repository](https://github.com/VIJAYRUR/ChromeExtension)
2. Click "Code" → "Download ZIP"
3. Extract the ZIP file

**Load in Chrome:**
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the extension folder (ChromeExtension)
5. Pin the extension to your toolbar for easy access

### Usage

**Filter LinkedIn Jobs:**
- Visit LinkedIn Jobs page
- Click extension icon → Toggle filter panel
- Set your preferences (time range, hide reposts, blacklist companies)

**Track Applications:**
- On any LinkedIn job, click "Track Application" button
- Job details auto-extracted: location, salary, work type, description HTML
- Click extension icon → "Open Dashboard" to view all tracked jobs
- Switch between Kanban, Table, Calendar, and Stats views
- Update status, add notes, upload resumes

**View Analytics:**
- Open dashboard → Click "Stats overview" tab
- See application timeline, status distribution, response time analysis
- Filter by date range: Last 7 days, 30 days, 3 months, or all time

**Autofill Applications:**
- Click extension icon → "Setup Profile" (one-time setup)
- Complete 7-step profile wizard:
  1. Upload resume (PDF/DOC/DOCX) - auto-extracts data
  2. Personal information (name, email, phone)
  3. Address details
  4. Professional links (LinkedIn, GitHub, portfolio)
  5. Work experience
  6. Education history
  7. Skills and summary
- Visit any job application page (Workday, Greenhouse, Lever, etc.)
- Click the floating "Autofill" button
- Review auto-filled fields and submit

---

## Features

### 🔍 LinkedIn Jobs Filter
- **Time Filters**: 1h, 3h, 6h, 12h, 24h, 3d, 7d
- **Hide Reposts**: Automatically hide reposted jobs
- **Company Blacklist**: Block specific companies from results
- **Real-time Filtering**: No page reload needed
- **Draggable Panel**: Collapsible, movable filter panel
- **Clean UI**: Notion-style design with smooth animations

### 📊 Job Application Tracker

**Dashboard Views:**
- **Kanban Board**: Drag-and-drop cards by status (Applied, Interview, Offer, Rejected, Withdrawn)
- **Table View**: Sortable table with all job details
- **Calendar View**: See applications by date with monthly view
- **Stats Overview**: Analytics and insights (NEW!)

**Job Details Captured:**
- Company name
- Job title
- **Location** (auto-extracted from LinkedIn)
- **Salary** (auto-extracted from LinkedIn)
- **Work Type** (On-site/Remote/Hybrid - auto-extracted)
- **Description HTML** (formatted with bold headings)
- **Application Timing** (how long after job was posted - NEW!)
- **Competition Level** (number of applicants when you applied - NEW!)
- LinkedIn URL
- Date applied
- Status tracking

**Features:**
- Upload resumes (per job)
- Add cover letters
- Notes and tags
- Timeline tracking
- Priority levels
- Deadline management
- Contact information
- Interview dates
- Follow-up reminders
- Search and advanced filters
- Export data (JSON)
- Compact mode

**Status Options:**
- Applied (gray)
- Interview (yellow)
- Offer (green)
- Rejected (red)
- Withdrawn (dark gray)

### 📈 Stats Overview (NEW!)

**Quick Stats Cards:**
- Total applications count
- Success rate (offers ÷ total)
- Average response time
- Interview rate

**Charts & Visualizations:**
1. **Applications Timeline** (Bar Chart)
   - Weekly or monthly view based on date range
   - Stacked by status (Applied/Interview/Offer/Rejected)
   - Color-coded bars
   - Interactive tooltips

2. **Status Distribution** (Doughnut Chart)
   - Visual breakdown of all statuses
   - Percentages on hover
   - Legend with counts

3. **Response Time Analysis**
   - Average days to interview
   - Average days to rejection
   - Fastest response (with company name)
   - Slowest response (with company name)

4. **Application Timing Insights** (NEW!)
   - Interview rate vs. Application Speed
   - Shows if applying early improves interview chances
   - Buckets: 0-3h, 4-12h, 13-24h, 1-3d, 3-7d, 7d+

5. **Competition Level Insights** (NEW!)
   - Interview rate vs. Number of Applicants
   - Shows how competition affects outcomes
   - Buckets: 0-10, 11-25, 26-50, 51-100, 100+ applicants

6. **Your Best Application Window** (NEW!)
   - Personalized insight based on your data
   - Identifies optimal timing and competition levels
   - Appears after tracking 10+ jobs with timing data
   - Example: "Apply within 12 hours before 25 applicants"

**Date Range Filters:**
- Last 7 days
- Last 30 days
- Last 3 months
- All time

### ⚡ Autofill System (Enhanced!)

**Profile Setup:**
- One-time comprehensive profile setup with 7-step wizard
- Resume upload (PDF, DOC, DOCX) with automatic parsing
- Cover letter upload and management
- Extract information from resume: name, email, phone, LinkedIn, GitHub, website
- Work experience and education history
- Skills and professional summary
- Address and contact information

**Smart Autofill Features:**
- Supports 10+ ATS platforms (Workday, Greenhouse, Lever, Taleo, iCIMS, SmartRecruiters, Jobvite, Breezy HR, Workable, and more)
- Intelligent field detection and mapping (90+ field types recognized)
- Platform-specific autofill logic for optimal accuracy
- Multi-page form support with automatic page monitoring
- Auto-detect form types and adapt filling strategy
- Fills personal info, contact details, work experience, education, skills
- Handles complex fields: work authorization, EEO questions, legal questions
- Professional links: LinkedIn, GitHub, portfolio/website
- Visual feedback with field highlighting
- Review before submit

**Supported Field Types:**
- Personal: First/Last/Full Name, Email, Phone, Address, City, State, ZIP, Country
- Professional: LinkedIn, GitHub, Portfolio, Website, Current Company, Job Title
- Education: University, Degree, Major, GPA, Graduation Year
- Work: Years of Experience, Responsibilities, Start/End Dates
- Legal: Work Authorization, Sponsorship Requirements, Security Clearance
- EEO: Gender, Race, Veteran Status, Disability Status (optional)
- Additional: Preferred Location, Start Date, Relocation, Salary Expectations

### 🎨 Design Philosophy
- **Notion-inspired UI**: Clean, modern, professional
- **Subtle animations**: Smooth hover effects, transitions
- **Typography**: -0.02em letter spacing for headings, proper font weights
- **Color System**: Consistent color scheme across all views
- **Responsive**: Works on all screen sizes
- **Accessibility**: Proper ARIA labels, keyboard navigation

---

## Project Structure

```
ChromeExtension/
├── job-filter/
│   ├── content.js              # LinkedIn page filtering & job extraction
│   ├── filter-panel.css        # Filter panel styles
│   └── filter-panel.html       # Filter panel UI
│
├── tracking-dashboard/
│   ├── dashboard.html          # Main dashboard (4 views)
│   ├── dashboard.css           # Dashboard styles
│   ├── dashboard.js            # Dashboard logic & view switching
│   ├── job-detail.html         # Individual job detail page
│   ├── job-detail.css          # Job detail styles
│   ├── job-detail.js           # Job detail logic
│   ├── job-tracker.js          # Job data management
│   ├── stats.js                # Stats/analytics logic (NEW)
│   ├── stats.css               # Stats view styles (NEW)
│   └── chart.min.js            # Chart.js library (NEW)
│
├── autofill/
│   ├── profile-setup.html      # Profile setup page
│   ├── profile-setup.css       # Profile setup styles
│   ├── profile-setup.js        # Profile setup logic
│   ├── autofill-content.js     # Content script for autofill
│   └── autofill-engine.js      # Form autofill logic
│
├── shared/
│   ├── background.js           # Background service worker
│   ├── popup.html              # Extension popup
│   ├── popup.css               # Popup styles
│   ├── popup.js                # Popup logic
│   └── linkedin-html-cleaner.js # HTML cleaner for job descriptions (NEW)
│
└── manifest.json               # Extension configuration
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed documentation.

---

## Technical Details

### GitHub Integration

**Current Features:**
- Extract GitHub profile URL from resume during profile setup
- Autofill GitHub profile in job application forms
- Recognize GitHub field variations: "github", "github-url", "github-profile", "githuburl"

**Planned Features (Roadmap):**
- Pull repository statistics from GitHub API
- Display contribution graph and activity
- Show top languages and popular repositories
- Include GitHub stats in application tracking
- Auto-populate GitHub achievements in applications

### Auto-Extraction from LinkedIn

When you click "Track Application", the extension automatically extracts:

**Location:**
- Primary: `.tvm__text--low-emphasis` in tertiary description
- Fallback: `.jobs-unified-top-card__bullet`
- Example: "San Francisco Bay Area"

**Salary:**
- Primary: `.job-details-fit-level-preferences button` with salary text
- Regex: `/\$[\d,]+(?:K)?(?:\/yr)?(?:\s*-\s*\$[\d,]+(?:K)?(?:\/yr)?)?/i`
- Example: "$140K/yr - $250K/yr"

**Work Type:**
- Primary: `.job-details-fit-level-preferences button` with "On-site", "Remote", or "Hybrid"
- Example: "On-site"

**Description HTML:**
- Extracts full innerHTML from LinkedIn job description
- Preserves `<strong>` tags for headings
- Cleans LinkedIn-specific classes and IDs
- Maintains structure: `<p>`, `<ul>`, `<li>`

### Job Description Formatting

**HTML Cleaner** (`shared/linkedin-html-cleaner.js`):
- Removes LinkedIn classes, IDs, attributes
- Preserves semantic HTML structure
- Cleans up empty spans and HTML comments
- Removes excessive `<br>` tags
- Extracts 40+ skills (Python, JavaScript, React, Django, AWS, etc.)

**CSS Styling** (`tracking-dashboard/job-detail.css`):
```css
.description-content.formatted p strong {
  display: block;
  font-size: 16px;
  font-weight: 700;
  margin-top: 24px;
  margin-bottom: 12px;
}
```

Result: Bold headings with proper spacing like "Summary", "Requirements", "Benefits"

### Stats Analytics

**Data Processing:**
- Groups jobs by week or month
- Calculates success/interview rates
- Computes average response times
- Tracks timeline events

**Chart Configuration:**
- Uses Chart.js 4.4.1
- Stacked bar chart for timeline
- Doughnut chart for status distribution
- Custom tooltips and colors
- Responsive canvas sizing

**Response Time Calculation:**
```javascript
const days = Math.round((response - applied) / (1000 * 60 * 60 * 24));
```

---

## Supported Platforms

**Autofill works on:**
- Workday
- Greenhouse
- Lever
- Taleo
- iCIMS
- SmartRecruiters
- Jobvite
- Breezy HR
- Workable
- Generic application forms

---

## Recent Updates

### v2.1 - Enhanced Autofill System (Latest - 2026-01-14)
- ✅ **Major Autofill Overhaul**: Completely redesigned autofill engine with 90+ field types
- ✅ **7-Step Profile Setup**: Comprehensive wizard for profile creation
- ✅ **Resume Parsing**: Automatic extraction of data from uploaded resumes
- ✅ **Platform-Specific Logic**: Optimized autofill for Workday, Greenhouse, Lever, and more
- ✅ **GitHub Profile Support**: Extract and autofill GitHub profile URLs
- ✅ **Multi-Page Forms**: Automatic detection and filling across multiple form pages
- ✅ **Legal & EEO Fields**: Smart handling of work authorization and compliance questions
- ✅ **Enhanced Field Mapping**: Improved accuracy with better field detection algorithms
- ✅ **Visual Feedback**: Real-time highlighting of filled fields
- ✅ **Cover Letter Management**: Upload and manage cover letters

### v2.0 - Stats Overview & Auto-Extraction (2026-01-10)
- ✅ Added Stats Overview page with 5 charts
- ✅ Auto-extract location from LinkedIn
- ✅ Auto-extract salary from LinkedIn
- ✅ Auto-extract work type (On-site/Remote/Hybrid)
- ✅ Preserve job description HTML formatting
- ✅ Bold headings in job descriptions
- ✅ Skill extraction (40+ keywords)
- ✅ Response time tracking
- ✅ Application timing insights (how fast you applied)
- ✅ Competition level tracking (number of applicants)
- ✅ Date range filters
- ✅ Notion-style design polish

### Implementation Files (Recent)
- `autofill/autofill-engine.js` - Enhanced autofill engine (950 lines)
- `autofill/profile-setup.js` - 7-step profile wizard (501 lines)
- `autofill/profile-setup.html` - Profile setup UI
- `autofill/profile-setup.css` - Profile setup styles
- `autofill/resume-manager.js` - Resume parsing and management
- `tracking-dashboard/stats.js` - Stats manager class (382 lines)
- `tracking-dashboard/stats.css` - Stats view styles
- `tracking-dashboard/chart.min.js` - Chart.js library
- `shared/linkedin-html-cleaner.js` - HTML cleaner (126 lines)

---

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture and module details
- **manifest.json** - Extension configuration
- **[DEBUG.md](DEBUG.md)** - Debugging guide for formatting issues
- **[FEATURE-STATUS.md](FEATURE-STATUS.md)** - Feature implementation status

---

## Development

**Tech Stack:**
- Vanilla JavaScript (ES6+)
- Chrome Extension Manifest V3
- Chrome Storage API
- Chart.js 4.4.1 for analytics
- Modern CSS (Grid, Flexbox, CSS Variables)
- No frameworks or build tools

**Key Files:**
- `job-filter/content.js` - LinkedIn filtering & data extraction (875 lines)
- `tracking-dashboard/dashboard.js` - Dashboard UI & view switching (654 lines)
- `tracking-dashboard/stats.js` - Analytics & charts (382 lines)
- `autofill/autofill-engine.js` - Enhanced form autofill logic (950 lines)
- `autofill/profile-setup.js` - Profile setup wizard (501 lines)
- `autofill/resume-manager.js` - Resume parsing and data extraction
- `shared/background.js` - Background service worker
- `shared/linkedin-html-cleaner.js` - HTML cleaner (126 lines)

**Chrome APIs Used:**
- `chrome.storage.local` - Job data persistence
- `chrome.runtime` - Message passing
- `chrome.tabs` - Tab management
- `chrome.action` - Extension icon clicks

**Design System:**
- CSS Variables for colors
- Consistent spacing (8px grid)
- Typography scale (12px, 13px, 14px, 16px, 28px)
- Border radius: 6px (cards), 4px (buttons)
- Shadows: `0 2px 8px rgba(0,0,0,0.04)` on hover

---

## Browser Compatibility

- Chrome 88+ (Manifest V3 support)
- Edge 88+ (Chromium-based)
- Opera 74+ (Chromium-based)
- Brave (latest)

---

## Performance

- Minimal memory footprint (~5MB)
- Lazy loading of charts (only when Stats view active)
- Efficient DOM manipulation
- Debounced search/filters
- No external API calls (all local)

---

## Privacy

- All data stored locally in Chrome storage
- No data sent to external servers
- No tracking or analytics
- No permissions beyond necessary APIs
- Open source - audit the code yourself

---

## Known Limitations

- LinkedIn may change HTML structure (selectors may need updates)
- Old jobs (tracked before v2.0) won't have location/salary/HTML
- Charts require Chart.js to load (included locally)
- Calendar view shows max 100 jobs per month

---

## Troubleshooting

**Stats not showing:**
1. Check console for errors
2. Ensure Chart.js loaded (`window.Chart` should exist)
3. Reload extension
4. Clear browser cache

**Location/salary not auto-filled:**
1. LinkedIn may not show these fields for all jobs
2. Only NEW jobs (tracked after update) will have auto-extraction
3. Check console logs for extraction status

**Job descriptions not formatted:**
1. Only NEW jobs will have HTML formatting
2. Old jobs need to be re-tracked
3. See DEBUG.md for detailed troubleshooting

---

## Contributing

We welcome contributions! Here's how to get started:

### Getting Started
1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ChromeExtension.git
   cd ChromeExtension
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
4. **Make your changes**
5. **Test thoroughly**:
   - Reload extension in Chrome
   - Test all views (Kanban, Table, Calendar, Stats)
   - Test autofill on different platforms
   - Check console for errors
6. **Commit with descriptive message**:
   ```bash
   git add .
   git commit -m "Add amazing feature: description"
   ```
7. **Push to your fork**:
   ```bash
   git push origin feature/amazing-feature
   ```
8. **Open a Pull Request** on GitHub

### Coding Standards
- Use ES6+ features (arrow functions, async/await, destructuring)
- Add comments for complex logic
- Follow existing code style and naming conventions
- Test on multiple screen sizes
- Console log important operations with prefixes (e.g., `[Autofill]`, `[Dashboard]`)
- Keep functions focused and modular
- Update documentation for new features

### Pull Request Guidelines
- Describe what your PR does and why
- Include screenshots for UI changes
- Reference any related issues
- Ensure all tests pass
- Keep PRs focused on a single feature/fix

---

## Roadmap

**Completed Features:**
- [x] Enhanced autofill system with 90+ field types
- [x] Resume parsing and automatic data extraction
- [x] GitHub profile extraction and autofill
- [x] Multi-page form support
- [x] Platform-specific autofill logic
- [x] Stats overview with 5 charts
- [x] Application timing and competition tracking

**Planned Features:**
- [ ] GitHub API integration to pull repository stats and contributions
- [ ] Colored skill pills in job descriptions
- [ ] Export to PDF/CSV
- [ ] Email reminders for follow-ups
- [ ] Company research integration (Glassdoor, Blind)
- [ ] Salary comparison with market data
- [ ] Interview preparation notes and resources
- [ ] Job search goals and tracking
- [ ] Browser notifications for deadlines
- [ ] Dark mode
- [ ] AI-powered cover letter generation
- [ ] Resume tailoring suggestions based on job description

---

## License

MIT License - feel free to use, modify, and distribute

---

## Changelog

### v2.1.0 (2026-01-14)
- **Major Autofill Overhaul**: Complete redesign of autofill engine
- Enhanced profile setup with 7-step wizard
- Resume parsing with automatic data extraction
- GitHub profile URL extraction and autofill
- 90+ field types now supported (up from 30+)
- Platform-specific autofill logic for Workday, Greenhouse, Lever
- Multi-page form detection and automatic filling
- Legal and EEO field handling
- Cover letter upload and management
- Visual feedback with field highlighting
- Improved field detection algorithms

### v2.0.0 (2026-01-10)
- Added Stats Overview with 5 charts
- Auto-extract location, salary, work type from LinkedIn
- Job description HTML formatting with bold headings
- Skill extraction (40+ keywords)
- Response time tracking
- Application timing insights (how fast you applied)
- Competition level tracking (number of applicants)
- Date range filters (7d, 30d, 3m, all time)
- Notion-style design improvements
- LinkedIn HTML cleaner for job descriptions

### v1.0.0 (Initial Release)
- LinkedIn job filtering (time, reposts, blacklist)
- Job application tracking dashboard
- Kanban, Table, Calendar views
- Basic autofill system
- Chrome storage integration

---

## Support

Found a bug? Have a feature request? We'd love to hear from you!

### Reporting Issues
1. **Check existing issues** on [GitHub Issues](https://github.com/VIJAYRUR/ChromeExtension/issues)
2. **Create a new issue** with:
   - Clear, descriptive title
   - Browser version (Chrome/Edge/Brave)
   - Extension version (check `chrome://extensions/`)
   - Error messages from console (F12 → Console tab)
   - Screenshots or screen recordings
   - Steps to reproduce the issue
   - Expected vs. actual behavior

### Feature Requests
- Open a [GitHub Issue](https://github.com/VIJAYRUR/ChromeExtension/issues) with the "enhancement" label
- Describe the feature and why it would be useful
- Include mockups or examples if applicable

### Getting Help
- Check the [Troubleshooting](#troubleshooting) section below
- Review [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- Search [closed issues](https://github.com/VIJAYRUR/ChromeExtension/issues?q=is%3Aissue+is%3Aclosed) for similar problems

---

## Credits

**Built with:**
- Chart.js - https://www.chartjs.org/
- Chrome Extensions API - https://developer.chrome.com/docs/extensions/

**Inspired by:**
- Notion's clean design philosophy
- Modern productivity tools
- The pain of job searching 😅

---

## Repository

**GitHub**: [https://github.com/VIJAYRUR/ChromeExtension](https://github.com/VIJAYRUR/ChromeExtension)

### Staying Updated

**Pull Latest Changes:**
```bash
cd ChromeExtension
git pull origin main
```

**Check for Updates:**
- Watch the repository on GitHub for notifications
- Check the [Changelog](#changelog) for new features
- Review [Recent Updates](#recent-updates) section

**Version History:**
- Current: v2.1.0 (Enhanced Autofill)
- Previous: v2.0.0 (Stats & Analytics)
- Initial: v1.0.0 (Core Features)

---

**Made with ❤️ to make job searching less painful**

⭐ **Star this repo** if it helped you land a job!
🐛 **Report bugs** to help us improve
🚀 **Contribute** to make it even better
📢 **Share** with friends who are job hunting
