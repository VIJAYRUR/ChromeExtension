# 🚀 Track376 - Job Tracker with Kanban & Chat

**Track Jobs with Friends - Share Opportunities, Chat & Succeed**

Track job applications with Kanban boards, smart autofill, real-time chat, and group collaboration features.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://www.google.com/chrome/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue.svg)](https://github.com/VIJAYRUR/ChromeExtension)
[![Node.js Backend](https://img.shields.io/badge/Backend-Node.js-brightgreen.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-green.svg)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-black.svg)](https://socket.io/)

---

## What This Does

This Chrome extension is an all-in-one job search companion with **real-time collaboration** that solves major pain points:

1. **🔍 Filter LinkedIn Jobs** - Hide reposted jobs, filter by time, blacklist companies
2. **📊 Track Applications** - Beautiful Notion-style dashboard with 5-column kanban (Saved, Applied, Interview, Offer, Rejected)
3. **📈 Analytics & Insights** - Visualize your job search progress with charts and metrics
4. **⚡ Autofill Forms** - One-click autofill for job applications across 10+ platforms with intelligent field detection
5. **👥 Group Collaboration** - Create/join groups, share jobs, real-time chat, and collaborate with peers (NEW!)
6. **💬 Real-time Chat** - Socket.io powered group chat with typing indicators and message reactions (NEW!)
7. **🔔 Live Notifications** - Get notified when jobs are shared, messages sent, and more (NEW!)

---

## Quick Start

### Installation

**Prerequisites:**
- Node.js v14+ (for backend)
- MongoDB (local or cloud)
- Chrome Browser

**Step 1: Clone Repository**
```bash
git clone https://github.com/VIJAYRUR/ChromeExtension.git
cd ChromeExtension
```

**Step 2: Backend Setup (Required for Group Features)**

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Configure environment variables:**
Create a `.env` file in the `backend` directory:
```env
PORT=3000
MONGODB_URI=your_production_mongodb_uri
MONGODB_LOCAL_URI=mongodb://localhost:27017/job-tracker-groups
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

3. **Start MongoDB locally:**
```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

4. **Start the backend server:**
```bash
npm start
```

The backend will run on `http://localhost:3000`

**Step 3: Chrome Extension Setup**

1. **Configure API URL:**
Edit `shared/config.js`:
```javascript
const API_CONFIG = {
  API_URL: 'http://localhost:3000/api', // For local development
  SOCKET_URL: 'http://localhost:3000' // For local development
};
```

2. **Load extension in Chrome:**
- Open Chrome and go to `chrome://extensions/`
- Enable "Developer mode" (top right toggle)
- Click "Load unpacked"
- Select the extension folder (ChromeExtension)
- Pin the extension to your toolbar for easy access

**Step 4: Create Account**
1. Click the extension icon
2. Click "Sign Up"
3. Enter your name, email, and password
4. Click "Create Account"
5. You're ready to use all features!

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

**Group Collaboration (NEW!):**

*Create a Group:*
1. Click "Groups" button in dashboard sidebar
2. Click "Create Group" button
3. Enter group name and description
4. Choose Public or Private
5. Click "Create Group"
6. Share the 6-character invite code with others

*Join a Group:*
1. Click "Groups" button in dashboard sidebar
2. Click "Join Group" button
3. Enter the invite code you received
4. Click "Join Group"

*Chat with Group Members:*
1. Open a group from the groups dashboard
2. Type a message in the chat input (left column)
3. Press Enter to send
4. React to messages by clicking the 😊 icon
5. See typing indicators when others are typing
6. Green dot shows who's online

*Share Jobs in Chat:*
1. Click the 📎 (attach) icon in chat input
2. Select a job from your personal tracker
3. Job appears as a rich card in the chat
4. Click the job card to view full details

*Share Jobs to Group:*
1. Go to "Shared Jobs" section (middle column)
2. Click "Share Job" button
3. Fill in job details (company, title, location, etc.)
4. Click "Share to Group"
5. Job appears in shared jobs list

*Save Shared Jobs:*
1. Browse shared jobs in the "Shared Jobs" section
2. Click "Save to My Jobs" on any job card
3. Job appears in your personal dashboard's "Saved" column
4. Click "Mark as Applied" when you apply to the job
5. Job moves to "Applied" column

*View Group Members:*
1. Go to "Members" section (right column)
2. See all members with their roles
3. Green dot indicates online status
4. View member stats (jobs shared, messages sent)

---

## Features

### 👥 Group Collaboration (NEW!)

**Create & Join Groups:**
- ✅ **Public/Private Groups** - Create groups with custom names and descriptions
- ✅ **Invite Codes** - Share unique 6-character codes to invite members
- ✅ **Role-based Access** - Admin, Moderator, and Member roles
- ✅ **Member Management** - View all group members with their roles and stats

**Real-time Chat:**
- ✅ **Socket.io Powered** - Instant message delivery with WebSocket technology
- ✅ **Typing Indicators** - See when others are typing in real-time
- ✅ **Online Status** - Green dot shows who's currently online
- ✅ **Message Reactions** - React with 👍 ❤️ 🔥 😂 emojis
- ✅ **Message Alignment** - Your messages on right, others on left
- ✅ **User Avatars** - Colorful initials for each member
- ✅ **Timestamps** - See when each message was sent

**Share Jobs:**
- ✅ **Share to Group** - Share job opportunities with all group members
- ✅ **Inline Job Sharing** - Share jobs directly in chat messages with rich cards
- ✅ **Job Details** - Company, title, location, salary, work type, description
- ✅ **Save to My Jobs** - Save shared jobs to your personal "Saved" kanban column
- ✅ **Mark as Applied** - Track when you apply to shared jobs
- ✅ **Job Statistics** - See how many members viewed, saved, or applied
- ✅ **Clickable Job Cards** - Click to view full job details in modal

**Group Features:**
- ✅ **Three-Column Layout** - Chat, Shared Jobs, and Members in one view
- ✅ **Job Filters** - Filter shared jobs by work type, date, or search
- ✅ **Member Stats** - See each member's contribution (jobs shared, messages sent)
- ✅ **Group Dashboard** - View all your groups in one place
- ✅ **Leave Group** - Leave groups you no longer want to be part of

### 🔍 LinkedIn Jobs Filter
- **Time Filters**: 1h, 3h, 6h, 12h, 24h, 3d, 7d
- **Hide Reposts**: Automatically hide reposted jobs
- **Company Blacklist**: Block specific companies from results
- **Real-time Filtering**: No page reload needed
- **Draggable Panel**: Collapsible, movable filter panel
- **Clean UI**: Notion-style design with smooth animations

### 📊 Job Application Tracker

**Dashboard Views:**
- **Kanban Board**: Drag-and-drop cards by status (Saved, Applied, Interview, Offer, Rejected)
- **Table View**: Sortable table with all job details
- **Calendar View**: See applications by date with monthly view
- **Stats Overview**: Analytics and insights

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
- Saved (purple) - NEW! Jobs saved from groups or for later
- Applied (gray)
- Interview (blue)
- Offer (green)
- Rejected (red)

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
├── backend/                    # Node.js + Express backend (NEW!)
│   ├── controllers/            # API controllers
│   │   ├── authController.js   # User authentication
│   │   ├── groupController.js  # Group management
│   │   ├── chatController.js   # Chat messages
│   │   ├── sharedJobController.js # Shared jobs
│   │   └── groupAnalyticsController.js # Analytics
│   ├── models/                 # MongoDB models
│   │   ├── User.js             # User model
│   │   ├── Group.js            # Group model
│   │   ├── GroupMember.js      # Group membership
│   │   ├── ChatMessage.js      # Chat messages
│   │   ├── SharedJob.js        # Shared jobs
│   │   └── Comment.js          # Job comments
│   ├── routes/                 # API routes
│   │   ├── auth.js             # Auth endpoints
│   │   ├── groups.js           # Group endpoints
│   │   ├── chat.js             # Chat endpoints
│   │   ├── sharedJobs.js       # Shared job endpoints
│   │   └── groupAnalytics.js   # Analytics endpoints
│   ├── socket/                 # Socket.io handlers
│   │   ├── chatHandlers.js     # Chat events
│   │   └── groupHandlers.js    # Group events
│   ├── middleware/             # Express middleware
│   │   ├── auth.js             # JWT authentication
│   │   └── rateLimiter.js      # Rate limiting
│   ├── config/                 # Configuration
│   │   └── database.js         # MongoDB connections
│   └── server.js               # Main server file
│
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
│   ├── stats.js                # Stats/analytics logic
│   ├── stats.css               # Stats view styles
│   ├── chart.min.js            # Chart.js library
│   ├── groups.html             # Groups dashboard (NEW!)
│   ├── groups.css              # Groups styles (NEW!)
│   ├── groups.js               # Groups logic (NEW!)
│   ├── group-detail.html       # Group detail page (NEW!)
│   ├── group-detail.css        # Group detail styles (NEW!)
│   └── group-detail.js         # Group detail logic (NEW!)
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
│   ├── linkedin-html-cleaner.js # HTML cleaner for job descriptions
│   ├── config.js               # API configuration (NEW!)
│   ├── auth-api.js             # Authentication API wrapper (NEW!)
│   ├── group-api.js            # Group API wrapper (NEW!)
│   └── socket-client.js        # Socket.io client (NEW!)
│
└── manifest.json               # Extension configuration
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed documentation.

---

## API Documentation

### Authentication Endpoints

**POST /api/auth/register**
- Register a new user account
- Body: `{ name, email, password }`
- Returns: `{ token, user }`

**POST /api/auth/login**
- Login to existing account
- Body: `{ email, password }`
- Returns: `{ token, user }`

**GET /api/auth/me**
- Get current user profile
- Headers: `Authorization: Bearer <token>`
- Returns: `{ user }`

### Group Endpoints

**GET /api/groups**
- Get all groups for current user
- Headers: `Authorization: Bearer <token>`
- Returns: `{ groups[] }`

**POST /api/groups**
- Create a new group
- Body: `{ name, description, isPublic }`
- Returns: `{ group, inviteCode }`

**GET /api/groups/:id**
- Get group details
- Returns: `{ group }`

**POST /api/groups/:id/join**
- Join a group with invite code
- Body: `{ inviteCode }`
- Returns: `{ group, member }`

**POST /api/groups/:id/leave**
- Leave a group
- Returns: `{ success: true }`

**GET /api/groups/:id/members**
- Get all group members
- Returns: `{ members[] }`

### Chat Endpoints

**GET /api/groups/:id/messages**
- Get chat messages for a group
- Query: `?limit=50&before=messageId`
- Returns: `{ messages[] }`

**POST /api/groups/:id/messages/:msgId/reactions**
- Add reaction to a message
- Body: `{ reactionType: '👍' }`
- Returns: `{ message }`

### Shared Jobs Endpoints

**GET /api/groups/:id/jobs**
- Get all shared jobs in a group
- Query: `?workType=remote&search=engineer`
- Returns: `{ jobs[] }`

**POST /api/groups/:id/jobs**
- Share a new job to the group
- Body: `{ company, title, location, salary, workType, description, linkedinUrl }`
- Returns: `{ job }`

**GET /api/groups/:id/jobs/:jobId**
- Get shared job details
- Returns: `{ job }`

**POST /api/groups/:id/jobs/:jobId/save**
- Save shared job to personal tracker
- Returns: `{ success: true, job }`

**POST /api/groups/:id/jobs/:jobId/apply**
- Mark shared job as applied
- Returns: `{ success: true, job }`

**DELETE /api/groups/:id/jobs/:jobId**
- Delete a shared job (admin/owner only)
- Returns: `{ success: true }`

### Analytics Endpoints

**GET /api/groups/:id/analytics**
- Get group analytics and statistics
- Returns: `{ stats, charts }`

**GET /api/groups/:id/leaderboard**
- Get member leaderboard
- Returns: `{ leaderboard[] }`

### Socket.io Events

**Client → Server:**
- `chat:join` - Join a group room
- `chat:leave` - Leave a group room
- `chat:message` - Send a chat message
- `chat:typing` - User is typing
- `chat:reaction` - Add message reaction

**Server → Client:**
- `chat:message` - New message received
- `chat:typing` - Someone is typing
- `chat:reaction` - Reaction added
- `job:shared` - New job shared
- `job:saved` - Job saved by member
- `job:applied` - Job applied by member
- `member:joined` - New member joined
- `member:left` - Member left group
- `user:online` - User came online
- `user:offline` - User went offline
- `error` - Error occurred

---

## Technical Details

### Backend Architecture (NEW!)

**Dual MongoDB Setup:**
- **Production MongoDB (Cloud)** - Stores user accounts and personal job data
- **Local MongoDB** - Stores group features, chat messages, and shared jobs
- **Why Dual Setup?** - Separates personal data from collaborative features for better scalability

**Cross-Database Data Fetching:**
- Manual user data fetching instead of Mongoose `.populate()`
- `.populate()` only works within the same database connection
- Solution: Fetch user from production DB, attach to chat message, broadcast via Socket.io

**Socket.io Real-time Events:**
- `chat:message` - New chat message
- `chat:typing` - User typing indicator
- `chat:reaction` - Message reaction added
- `job:shared` - New job shared to group
- `job:saved` - Member saved a shared job
- `job:applied` - Member applied to a shared job
- `member:joined` - New member joined group
- `member:left` - Member left group
- `user:online` - User came online
- `user:offline` - User went offline

**API Endpoints:**
- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- **Groups**: `/api/groups` (CRUD), `/api/groups/:id/join`, `/api/groups/:id/leave`
- **Chat**: `/api/groups/:id/messages`, `/api/groups/:id/messages/:msgId/reactions`
- **Shared Jobs**: `/api/groups/:id/jobs`, `/api/groups/:id/jobs/:jobId/save`, `/api/groups/:id/jobs/:jobId/apply`
- **Analytics**: `/api/groups/:id/analytics`, `/api/groups/:id/leaderboard`

**Security:**
- JWT authentication with Bearer tokens
- Rate limiting on all endpoints (100 requests/15 minutes)
- Role-based authorization (Admin, Moderator, Member)
- Input validation and sanitization
- CORS enabled for Chrome extension

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

### v3.0 - Group Collaboration & Real-time Chat (Latest - 2026-01-27)
- ✅ **Backend Infrastructure**: Node.js + Express + MongoDB + Socket.io
- ✅ **Group Management**: Create/join groups with invite codes
- ✅ **Real-time Chat**: Socket.io powered instant messaging
- ✅ **Share Jobs**: Share job opportunities with group members
- ✅ **Inline Job Sharing**: Share jobs directly in chat with rich cards
- ✅ **Save to My Jobs**: Save shared jobs to personal "Saved" kanban column
- ✅ **Mark as Applied**: Track applications from shared jobs
- ✅ **Message Reactions**: React with 👍 ❤️ 🔥 😂 emojis
- ✅ **Typing Indicators**: See when others are typing
- ✅ **Online Status**: Green dot for online members
- ✅ **Job Statistics**: Track views, saves, and applications
- ✅ **Member Management**: View members with roles and stats
- ✅ **Dual MongoDB Setup**: Production + Local databases
- ✅ **JWT Authentication**: Secure user authentication
- ✅ **Rate Limiting**: Prevent spam and abuse
- ✅ **5-Column Kanban**: Added "Saved" column (purple)

### v2.1 - Enhanced Autofill System (2026-01-14)
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
- `backend/server.js` - Express + Socket.io server (NEW!)
- `backend/controllers/` - 5 API controllers (NEW!)
- `backend/models/` - 6 MongoDB models (NEW!)
- `backend/socket/chatHandlers.js` - Socket.io chat events (NEW!)
- `tracking-dashboard/groups.js` - Groups dashboard (NEW!)
- `tracking-dashboard/group-detail.js` - Group detail page (2500+ lines) (NEW!)
- `shared/socket-client.js` - Socket.io client wrapper (NEW!)
- `shared/group-api.js` - Group API wrapper (NEW!)
- `autofill/autofill-engine.js` - Enhanced autofill engine (950 lines)
- `autofill/profile-setup.js` - 7-step profile wizard (501 lines)
- `tracking-dashboard/stats.js` - Stats manager class (382 lines)
- `shared/linkedin-html-cleaner.js` - HTML cleaner (126 lines)

---

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture and module details
- **[JOB_SHARE_SUMMARY.md](JOB_SHARE_SUMMARY.md)** - Group collaboration feature roadmap (NEW!)
- **[JOB_SHARE_TASKS.md](JOB_SHARE_TASKS.md)** - Detailed task breakdown for group features (NEW!)
- **manifest.json** - Extension configuration
- **[DEBUG.md](DEBUG.md)** - Debugging guide for formatting issues
- **[FEATURE-STATUS.md](FEATURE-STATUS.md)** - Feature implementation status

---

## Development

**Tech Stack:**
- **Frontend**: Vanilla JavaScript (ES6+), Chrome Extension Manifest V3
- **Backend**: Node.js, Express.js, Socket.io
- **Database**: MongoDB (Dual setup - Production + Local)
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.io WebSockets
- **Charts**: Chart.js 4.4.1 for analytics
- **Storage**: Chrome Storage API + MongoDB
- **Styling**: Modern CSS (Grid, Flexbox, CSS Variables)
- **No frontend frameworks** - Pure JavaScript for performance

**Key Files:**
- `backend/server.js` - Express + Socket.io server (NEW!)
- `backend/socket/chatHandlers.js` - Real-time chat events (NEW!)
- `tracking-dashboard/group-detail.js` - Group detail page (2500+ lines) (NEW!)
- `shared/socket-client.js` - Socket.io client wrapper (NEW!)
- `shared/group-api.js` - Group API wrapper (NEW!)
- `job-filter/content.js` - LinkedIn filtering & data extraction (875 lines)
- `tracking-dashboard/dashboard.js` - Dashboard UI & view switching (654 lines)
- `tracking-dashboard/stats.js` - Analytics & charts (382 lines)
- `autofill/autofill-engine.js` - Enhanced form autofill logic (950 lines)
- `autofill/profile-setup.js` - Profile setup wizard (501 lines)
- `shared/background.js` - Background service worker
- `shared/linkedin-html-cleaner.js` - HTML cleaner (126 lines)

**Chrome APIs Used:**
- `chrome.storage.local` - Job data persistence
- `chrome.runtime` - Message passing
- `chrome.tabs` - Tab management
- `chrome.action` - Extension icon clicks

**Backend APIs:**
- **Express.js** - RESTful API server
- **Socket.io** - WebSocket server for real-time features
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **cors** - Cross-origin resource sharing

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

**Personal Job Data:**
- All personal job tracking data stored locally in Chrome storage
- Synced to your personal MongoDB account (optional)
- No third-party access to your job data

**Group Collaboration Data:**
- Group messages and shared jobs stored in MongoDB
- Only visible to group members
- Encrypted in transit (HTTPS/WSS)
- No data sold to third parties

**Authentication:**
- Passwords hashed with bcrypt
- JWT tokens for secure API access
- Tokens stored securely in Chrome storage

**Open Source:**
- Full source code available on GitHub
- Audit the code yourself
- No hidden tracking or analytics

---

## Known Limitations

**Extension:**
- LinkedIn may change HTML structure (selectors may need updates)
- Old jobs (tracked before v2.0) won't have location/salary/HTML
- Charts require Chart.js to load (included locally)
- Calendar view shows max 100 jobs per month

**Group Collaboration:**
- Backend server must be running for group features to work
- Requires internet connection for real-time chat
- Socket.io connection may timeout after 30 minutes of inactivity
- Maximum 50 members per group (configurable)
- Maximum 1000 messages per group (older messages archived)
- File uploads not yet supported in chat
- Cannot edit/delete messages yet (coming in v3.1)

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

**Group features not working:**
1. **Check backend server is running:**
   ```bash
   cd backend
   npm start
   ```
2. **Verify MongoDB is running:**
   ```bash
   # macOS
   brew services list | grep mongodb

   # Linux
   sudo systemctl status mongod
   ```
3. **Check API URL in `shared/config.js`:**
   - Should be `http://localhost:3000/api` for local development
   - Should be production URL if using deployed backend
4. **Check browser console for errors:**
   - Open DevTools (F12) → Console tab
   - Look for authentication errors or network errors
5. **Clear Chrome storage and re-login:**
   - Go to `chrome://extensions/`
   - Click "Remove" on the extension
   - Reload the extension
   - Login again

**Chat messages not sending:**
1. Check Socket.io connection in console (should see "Socket connected")
2. Verify you're a member of the group
3. Check network tab for WebSocket connection
4. Reload the page

**Shared jobs not appearing:**
1. Refresh the page
2. Check if you have permission to view shared jobs
3. Verify the job was shared to the correct group
4. Check console for API errors

**"Unknown User" in chat:**
1. This was a known issue in v3.0.0 - fixed in latest version
2. Update to latest version from GitHub
3. Reload the extension

**Socket.io disconnecting:**
1. Check your internet connection
2. Backend server may have restarted
3. Refresh the page to reconnect
4. Check backend logs for errors

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

**Completed Features (v3.0):**
- [x] Group collaboration with real-time chat
- [x] Share jobs to groups
- [x] Save shared jobs to personal tracker
- [x] Inline job sharing in chat
- [x] Message reactions and typing indicators
- [x] Socket.io real-time communication
- [x] Dual MongoDB setup (Production + Local)
- [x] JWT authentication
- [x] 5-column kanban with "Saved" status
- [x] Enhanced autofill system with 90+ field types
- [x] Resume parsing and automatic data extraction
- [x] GitHub profile extraction and autofill
- [x] Multi-page form support
- [x] Platform-specific autofill logic
- [x] Stats overview with 5 charts
- [x] Application timing and competition tracking

**In Progress (v3.1):**
- [ ] Share job from dashboard to groups
- [ ] LinkedIn share integration (share while browsing)
- [ ] Comments on shared jobs
- [ ] Reactions on shared jobs (👍 🔥 ❤️)
- [ ] @Mentions in chat
- [ ] Group analytics dashboard

**Planned Features (v3.2+):**
- [ ] Edit/delete messages
- [ ] Search and filter shared jobs
- [ ] Group settings UI (admin controls)
- [ ] Member management UI (promote/demote/remove)
- [ ] Notifications system (badge counts)
- [ ] GitHub API integration to pull repository stats
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

### v3.0.0 (2026-01-27) - Group Collaboration
- **Backend Infrastructure**: Node.js + Express + MongoDB + Socket.io
- **Group Management**: Create/join groups with invite codes
- **Real-time Chat**: Socket.io powered instant messaging with typing indicators
- **Share Jobs**: Share job opportunities with group members
- **Inline Job Sharing**: Share jobs directly in chat with rich cards
- **Save to My Jobs**: Save shared jobs to personal "Saved" kanban column
- **Mark as Applied**: Track applications from shared jobs
- **Message Reactions**: React with 👍 ❤️ 🔥 😂 emojis
- **Online Status**: See who's currently online with green dot
- **Job Statistics**: Track views, saves, and applications for shared jobs
- **Member Management**: View members with roles (Admin, Moderator, Member)
- **Dual MongoDB Setup**: Production (cloud) + Local databases
- **JWT Authentication**: Secure user authentication with Bearer tokens
- **Rate Limiting**: Prevent spam and abuse (100 req/15min)
- **5-Column Kanban**: Added "Saved" column (purple) for saved jobs
- **Cross-Database Fetching**: Manual user data fetching across MongoDB connections
- **Socket Rooms**: Group-specific real-time broadcasts
- **API Endpoints**: 30+ RESTful endpoints for groups, chat, jobs, analytics

### v2.1.0 (2026-01-14) - Enhanced Autofill
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
- Current: v3.0.0 (Group Collaboration & Real-time Chat)
- Previous: v2.1.0 (Enhanced Autofill)
- Previous: v2.0.0 (Stats & Analytics)
- Initial: v1.0.0 (Core Features)

---

**Made with ❤️ to make job searching less painful**

⭐ **Star this repo** if it helped you land a job!
🐛 **Report bugs** to help us improve
🚀 **Contribute** to make it even better
📢 **Share** with friends who are job hunting
