// Job Application Tracker - Core Logic

class JobTracker {
  constructor() {
    this.jobs = [];
    this.init();
  }

  async init() {
    await this.loadJobs();
    console.log('[Job Tracker] 📊 Loaded', this.jobs.length, 'tracked jobs');
  }

  async loadJobs() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['trackedJobs'], (result) => {
        this.jobs = result.trackedJobs || [];
        resolve();
      });
    });
  }

  async saveJobs() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ trackedJobs: this.jobs }, () => {
        console.log('[Job Tracker] 💾 Saved', this.jobs.length, 'jobs');
        resolve();
      });
    });
  }

  // Create a new job application entry
  async addJob(jobData) {
    const job = {
      id: this.generateId(),
      company: jobData.company || 'Unknown Company',
      title: jobData.title || 'Unknown Position',
      description: jobData.description || '',
      location: jobData.location || '',
      salary: jobData.salary || '',
      workType: jobData.workType || 'Not specified', // onsite, remote, hybrid
      linkedinUrl: jobData.linkedinUrl || '',
      dateApplied: new Date().toISOString(),
      status: 'applied', // applied, interview, offer, rejected, withdrawn
      resumeFile: null, // Will store base64 or file reference
      coverLetter: '',
      notes: '',
      timeline: [
        {
          date: new Date().toISOString(),
          event: 'Application tracked',
          type: 'created'
        }
      ],
      tags: jobData.tags || [],
      priority: jobData.priority || 'medium', // low, medium, high
      deadline: jobData.deadline || null,
      contactPerson: jobData.contactPerson || '',
      contactEmail: jobData.contactEmail || '',
      interviewDates: [],
      followUpDate: null,
      archived: false
    };

    this.jobs.unshift(job); // Add to beginning
    await this.saveJobs();
    
    console.log('[Job Tracker] ✅ Added job:', job.company, '-', job.title);
    return job;
  }

  // Update job status
  async updateJobStatus(jobId, newStatus, note = '') {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) return false;

    job.status = newStatus;
    job.timeline.push({
      date: new Date().toISOString(),
      event: `Status changed to ${newStatus}`,
      type: 'status_change',
      note: note
    });

    await this.saveJobs();
    console.log('[Job Tracker] 📝 Updated status:', job.company, '-', newStatus);
    return true;
  }

  // Update job details
  async updateJob(jobId, updates) {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) return false;

    Object.assign(job, updates);
    
    job.timeline.push({
      date: new Date().toISOString(),
      event: 'Job details updated',
      type: 'update'
    });

    await this.saveJobs();
    return true;
  }

  // Delete job
  async deleteJob(jobId) {
    const index = this.jobs.findIndex(j => j.id === jobId);
    if (index === -1) return false;

    const job = this.jobs[index];
    this.jobs.splice(index, 1);
    await this.saveJobs();
    
    console.log('[Job Tracker] 🗑️ Deleted job:', job.company, '-', job.title);
    return true;
  }

  // Search and filter jobs
  searchJobs(query, filters = {}) {
    let results = [...this.jobs];

    // Text search
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(job => 
        job.company.toLowerCase().includes(q) ||
        job.title.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (filters.status && filters.status !== 'all') {
      results = results.filter(job => job.status === filters.status);
    }

    // Filter by work type
    if (filters.workType && filters.workType !== 'all') {
      results = results.filter(job => job.workType === filters.workType);
    }

    // Filter by date range
    if (filters.dateFrom) {
      results = results.filter(job => new Date(job.dateApplied) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      results = results.filter(job => new Date(job.dateApplied) <= new Date(filters.dateTo));
    }

    return results;
  }

  generateId() {
    return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// Make it globally available
window.jobTracker = new JobTracker();

