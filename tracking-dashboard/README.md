# Tracking Dashboard Module

## Overview
Job application tracking dashboard that helps users manage and track their job applications with a beautiful interface.

## Files
- `dashboard.html` - Main dashboard page
- `dashboard.css` - Dashboard styling
- `dashboard.js` - Dashboard logic and interactions
- `job-detail.html` - Individual job detail page
- `job-detail.css` - Job detail page styling
- `job-detail.js` - Job detail page logic
- `job-tracker.js` - Core job tracking functionality

## Features
- 📊 Beautiful dashboard to view all tracked jobs
- 📝 Detailed job information pages
- 🏷️ Status tracking (Applied, Interview, Offer, Rejected)
- 📅 Timeline tracking for each application
- 📎 Resume and cover letter management
- 🔔 Follow-up reminders
- 🎨 Modern, responsive UI

## How It Works
1. Jobs are tracked from LinkedIn via the job-filter module
2. Data is stored in Chrome's local storage
3. Dashboard displays all tracked jobs with filtering and sorting
4. Users can update job status, add notes, and manage applications

## Data Structure
Jobs are stored with the following properties:
- Basic info (company, title, location, salary)
- Application status and timeline
- Documents (resume, cover letter)
- Notes and tags
- Contact information
- Interview dates and follow-ups

