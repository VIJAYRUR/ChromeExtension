# Privacy Policy for Track376 Chrome Extension

**Last Updated:** February 3, 2026

## Introduction

Track376 ("we", "our", or "the extension") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our Chrome extension.

## Data We Collect

### Personal Information
- **Account Information**: Email address, name, password (hashed with bcrypt)
- **Profile Data**: Phone number, address, LinkedIn URL, GitHub URL, portfolio website
- **Resume Files**: PDF/DOC/DOCX files uploaded for autofill functionality

### Job Application Data
- **Job Details**: Company name, job title, location, salary, work type, job description
- **Application Tracking**: Status, dates applied, interview dates, notes, tags, priority levels
- **Resume Attachments**: Resume files associated with specific job applications

### Group Collaboration Data
- **Group Information**: Group names, descriptions, member lists, roles
- **Chat Messages**: Text messages, timestamps, reactions, typing indicators
- **Shared Jobs**: Job opportunities shared within groups

### Usage Data
- **Analytics**: Error logs, performance metrics (via Sentry - anonymized)
- **Activity**: Login times, feature usage patterns

## How We Use Your Data

We use your data to:
- **Provide Core Functionality**: Track job applications, autofill forms, sync across devices
- **Enable Collaboration**: Facilitate group chat and job sharing features
- **Improve Service**: Analyze errors and performance to fix bugs and optimize features
- **Authenticate Users**: Secure access to your account with JWT tokens
- **Store Files**: Save resumes on AWS S3 for autofill functionality

## Data Storage

### Storage Locations
- **User Accounts & Personal Jobs**: MongoDB Atlas (cloud database, encrypted at rest)
- **Group Features & Chat**: Local MongoDB instance (for collaborative features)
- **Resume Files**: AWS S3 (private bucket, encrypted, signed URLs with 1-hour expiry)
- **Cache**: Upstash Redis (temporary cache, 24-hour TTL for chat, 5-minute TTL for jobs)
- **Local Storage**: Chrome Storage API (offline access, synced across your devices)

### Security Measures
- Passwords hashed with bcrypt (industry-standard encryption)
- JWT tokens for secure authentication
- HTTPS/WSS encryption for all data in transit
- Private S3 bucket with signed URLs (not publicly accessible)
- Rate limiting to prevent abuse (100 requests per 15 minutes)
- Input sanitization to prevent XSS and NoSQL injection attacks

## Data Retention

- **Active Accounts**: Data retained indefinitely while your account is active
- **Deleted Accounts**: All data permanently deleted within 30 days of account deletion
- **Resume Files**: Automatically deleted 90 days after associated job is archived
- **Chat Messages**: Stored indefinitely (older messages may be archived after 1000 messages per group)
- **Cache**: Automatically expires (24 hours for chat, 5 minutes for jobs)

## Third-Party Services

We use the following third-party services:

### Infrastructure
- **MongoDB Atlas**: Database hosting (encrypted at rest, SOC 2 compliant)
- **AWS S3**: File storage for resumes (encrypted, private bucket)
- **Upstash Redis**: Caching service (temporary data, auto-expiring)

### Monitoring & Analytics
- **Sentry**: Error tracking and performance monitoring (anonymized, no PII)
  - Free tier: 5,000 errors/month
  - Data retention: 90 days
  - Used only for debugging and improving service quality

### No Third-Party Sharing
- We **DO NOT** sell your data to third parties
- We **DO NOT** share your data with advertisers
- We **DO NOT** use your data for marketing purposes

## Your Rights

You have the right to:

### Access Your Data
- View all your tracked jobs in the dashboard
- Export your data in JSON format (Settings → Export Data)

### Delete Your Data
- Delete individual jobs, notes, or messages
- Delete your entire account (Settings → Delete Account)
- All data permanently removed within 30 days

### Opt Out of Analytics
- Disable error tracking in extension settings
- Note: This may limit our ability to fix bugs affecting you

### Data Portability
- Export all your data in JSON format
- Import data into other tools or services

## Children's Privacy

This extension is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13.

## Changes to Privacy Policy

We may update this Privacy Policy from time to time. We will notify users of material changes via:
- Email notification to registered email address
- In-app notification in the extension
- Updated "Last Updated" date at the top of this policy

Continued use of the extension after changes constitutes acceptance of the updated policy.

## Data Breach Notification

In the unlikely event of a data breach affecting your personal information, we will:
- Notify affected users within 72 hours
- Provide details about what data was affected
- Explain steps we're taking to prevent future breaches
- Offer guidance on protecting your account

## Contact Us

For privacy concerns, questions, or requests:

- **Email**: privacy@jobtracker.com (replace with your actual email)
- **GitHub Issues**: https://github.com/VIJAYRUR/ChromeExtension/issues
- **Response Time**: Within 48 hours for privacy-related inquiries

## Legal Compliance

This extension complies with:
- **GDPR** (General Data Protection Regulation) for EU users
- **CCPA** (California Consumer Privacy Act) for California users
- **Chrome Web Store Developer Program Policies**

## Consent

By using Job Tracker, you consent to:
- Collection and use of your data as described in this policy
- Storage of your data on third-party services (MongoDB, AWS, Redis)
- Use of cookies and local storage for authentication and functionality

You can withdraw consent at any time by deleting your account.

---

**Effective Date:** February 2, 2026

**Version:** 1.0.0

For the full source code and transparency, visit: https://github.com/VIJAYRUR/ChromeExtension

