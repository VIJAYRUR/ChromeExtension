# 🚀 Quick Start Guide

## ✅ What Changed?

**NEW**: Floating draggable panel instead of popup!

### Why This is Better:
- ✅ **Always visible** - No need to keep clicking the icon
- ✅ **Real-time stats** - See filter results instantly
- ✅ **Draggable** - Move it anywhere on the page
- ✅ **Minimizable** - Save space when needed
- ✅ **Instant updates** - Changes apply immediately

---

## 📦 Installation (30 seconds)

1. Go to `chrome://extensions/`
2. Enable **"Developer mode"** (top right toggle)
3. Click **"Load unpacked"**
4. Select this folder
5. Done! ✅

---

## 🎯 How to Use

### 1. Open LinkedIn Jobs
Go to `https://www.linkedin.com/jobs/`

### 2. Click Extension Icon
Click the extension icon in your Chrome toolbar

### 3. Floating Panel Appears!
A panel will appear on the right side with:
- **Hide Reposted Jobs** toggle
- **Time Range** input (hours)
- **Company Blacklist** input
- **Live Stats** (Total / Visible / Hidden)

### 4. Configure Your Filters

**Hide Reposted Jobs:**
- Toggle ON to hide jobs marked as "Reposted" or "Promoted"
- Jobs disappear **instantly**

**Time Range:**
- Enter `24` to show only jobs from last 24 hours
- Enter `0` to show all jobs
- Changes apply **instantly**

**Blacklist Companies:**
- Type company name (e.g., "High Code")
- Press **Enter**
- Jobs from that company disappear **instantly**
- Click **×** on tag to remove

---

## 🎨 Panel Controls

### Drag
Click and hold the **header** (blue bar) to drag the panel anywhere

### Minimize
Click the **−** button to minimize (shows only header)

### Close
Click the **×** button to close (click extension icon to reopen)

---

## 📊 Live Stats

The panel shows real-time counts:

- **Total**: All jobs on the page
- **Visible**: Jobs currently shown
- **Hidden**: Jobs filtered out

Stats update **instantly** as you:
- Toggle filters
- Add/remove companies
- Scroll and load more jobs

---

## ✨ Features

### 🔁 Hide Reposted Jobs
Detects and hides:
- Jobs with "Reposted" text
- Jobs with "Promoted" text
- Jobs with repost/promoted CSS classes

### ⏰ Time Range Filter
- Enter hours (e.g., 24, 48, 72)
- Only shows jobs posted within that time
- Enter 0 to disable

### 🚫 Company Blacklist
- Add unlimited companies
- Partial matching (e.g., "Dice" matches "Jobs Via Dice")
- Persistent across sessions
- Easy to remove

### 📊 Real-time Stats
- Total jobs on page
- Visible jobs (after filtering)
- Hidden jobs (filtered out)
- Updates automatically

---

## 🐛 Troubleshooting

### Panel doesn't appear?
1. Make sure you're on `linkedin.com/jobs`
2. Click the extension icon
3. Refresh the page (Ctrl+Shift+R)

### Filters not working?
1. Press F12 to open console
2. Look for `[LinkedIn Jobs Filter]` messages
3. Check if settings are being saved

### Jobs still showing?
1. Make sure toggle is ON
2. Check if jobs actually say "Reposted"
3. Try adding company to blacklist manually

---

## 🎯 Example Usage

### Scenario 1: Hide All Reposted Jobs
1. Click extension icon
2. Toggle "Hide Reposted Jobs" to ON
3. Watch reposted jobs disappear instantly
4. Stats update to show how many were hidden

### Scenario 2: Only Show Recent Jobs
1. Click extension icon
2. Enter `24` in Time Range
3. Only jobs from last 24 hours remain
4. Stats show how many were filtered

### Scenario 3: Block Specific Companies
1. Click extension icon
2. Type "High Code" and press Enter
3. Type "Jobs Via Dice" and press Enter
4. All jobs from these companies disappear
5. Stats update instantly

---

## 📝 Files (Clean!)

```
linkedin-jobs-filter/
├── manifest.json          # Extension config
├── background.js          # Icon click handler
├── content.js            # Main logic + panel
├── floating-panel.css    # Panel styling
└── icons/                # Extension icons
```

**Removed:**
- ❌ All old popup files
- ❌ All documentation files
- ❌ All test files
- ❌ All unnecessary files

**Only 4 files needed!**

---

## 🎉 Enjoy!

The extension is now:
- ✅ Clean and simple
- ✅ Fully functional
- ✅ Real-time updates
- ✅ Better UX
- ✅ Production-ready

**Click the extension icon and start filtering!** 🚀

