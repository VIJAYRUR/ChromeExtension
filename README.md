# 🎯 LinkedIn Jobs Extension

**Supercharge your job search with smart filtering, application tracking, and one-click autofill.**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://www.google.com/chrome/)

---

## What This Does

This Chrome extension solves three major job search pain points:

1. **🔍 Filter LinkedIn Jobs** - Hide reposted jobs, filter by time, blacklist companies
2. **📊 Track Applications** - Beautiful dashboard to manage all your job applications
3. **⚡ Autofill Forms** - One-click autofill for job applications across multiple platforms

---

## Quick Start

### Installation
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select the extension folder
5. Pin the extension to your toolbar

### Usage

**Filter LinkedIn Jobs:**
- Visit LinkedIn Jobs page
- Click extension icon → Toggle filter panel
- Set your preferences (time range, hide reposts, blacklist companies)

**Track Applications:**
- On any LinkedIn job, click "Track Application" button
- Click extension icon → "Open Dashboard" to view all tracked jobs
- Update status, add notes, upload resumes

**Autofill Applications:**
- Click extension icon → "Setup Profile" (one-time setup)
- Visit any job application page (Workday, Greenhouse, Lever, etc.)
- Click the floating "Autofill" button
- Review and submit

---

## Project Structure

```
ChromeExtension/
├── job-filter/              # LinkedIn filtering
├── tracking-dashboard/      # Application tracking
├── autofill/               # Form autofill
├── shared/                 # Common components (popup, background)
└── manifest.json
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed documentation.

---

## Features

### 🔍 LinkedIn Jobs Filter
- Filter by time posted (1h, 3h, 6h, 12h, 24h, 3d, 7d)
- Hide reposted jobs automatically
- Company blacklist with easy management
- Real-time filtering without page reload
- Draggable, collapsible filter panel

### 📊 Job Application Tracker
- Beautiful dashboard with kanban/table views
- Track: company, role, location, salary, status, dates
- Upload resumes and cover letters per application
- Add notes and track timeline
- Advanced search and filters
- Export data

### ⚡ Autofill System
- One-time profile setup
- Supports 10+ ATS platforms (Workday, Greenhouse, Lever, Taleo, etc.)
- Intelligent field detection and mapping
- Multi-page form support
- Review before submit

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

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture and module details
- **manifest.json** - Extension configuration

---

## Development

**Tech Stack:**
- Vanilla JavaScript (no frameworks)
- Chrome Extension Manifest V3
- Chrome Storage API
- Modern CSS with animations

**Key Files:**
- `job-filter/content.js` - LinkedIn page filtering
- `tracking-dashboard/dashboard.js` - Application dashboard
- `autofill/autofill-engine.js` - Form autofill logic
- `shared/background.js` - Background service worker

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## License

MIT License - feel free to use and modify

---

## Support

Found a bug? Have a feature request? Open an issue on GitHub.

---

**Made with ❤️ to make job searching less painful**
