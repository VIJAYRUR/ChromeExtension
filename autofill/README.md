# Autofill Module

## Overview
Intelligent job application autofill system that automatically fills out job application forms using your profile data.

## Files
- `autofill-content.js` - Main autofill UI and controller
- `autofill-engine.js` - Core autofill logic and field detection
- `profile-setup.html` - Profile setup wizard
- `profile-setup.css` - Profile setup styling
- `profile-setup.js` - Profile setup logic
- `resume-manager.js` - Resume parsing and management

## Features
- 🚀 One-click autofill for job applications
- 📋 Profile-based form filling
- 🎯 Smart field detection and mapping
- 📄 Resume parsing and data extraction
- 🔄 Multi-platform support (Workday, Greenhouse, Lever, etc.)
- ✨ Beautiful profile setup wizard
- 💾 Secure local storage of profile data

## Supported Platforms
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

## How It Works
1. User sets up their profile via the profile setup wizard
2. Profile data is stored securely in Chrome's local storage
3. When visiting a job application page, autofill button appears
4. Clicking autofill intelligently fills form fields with profile data
5. User can review and submit the application

## Profile Data Structure
- Personal Information (name, email, phone, address)
- Work Experience (company, title, dates, description)
- Education (school, degree, dates, GPA)
- Skills and certifications
- Resume file
- Custom answers to common questions

