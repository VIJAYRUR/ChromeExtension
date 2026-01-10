# Job Filter Module

## Overview
LinkedIn job filtering feature that helps users filter and browse jobs on LinkedIn with advanced filtering options.

## Files
- `content.js` - Main content script that runs on LinkedIn jobs pages
- `floating-panel.css` - Styles for the floating filter panel

## Features
- 🎯 Advanced job filtering on LinkedIn
- 🔍 Filter by location, work type, salary, etc.
- 💼 Real-time job filtering
- 📌 Floating panel UI for easy access

## How It Works
1. Runs on `https://www.linkedin.com/jobs/*` pages
2. Injects a floating panel with filter controls
3. Filters jobs based on user preferences
4. Updates the job list in real-time

## Dependencies
- Chrome Extension Manifest V3
- LinkedIn DOM structure

