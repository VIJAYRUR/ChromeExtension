// Stats Overview Page

class StatsManager {
  constructor() {
    this.jobs = [];
    this.dateRange = 'all';
    this.timelineChart = null;
    this.statusChart = null;
    this.timingInterviewChart = null;
    this.competitionInterviewChart = null;
    this.notionInsightChart = null;
    this.currentInsightType = '';
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Date range selector
    document.querySelectorAll('.date-range-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.date-range-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.dateRange = e.target.dataset.range;
        this.render();
      });
    });

    // Notion insight selector
    const insightSelector = document.getElementById('insight-type-selector');
    if (insightSelector) {
      insightSelector.addEventListener('change', (e) => {
        this.currentInsightType = e.target.value;
        this.renderNotionInsight(this.getFilteredJobs());
      });
    }
  }

  getFilteredJobs() {
    if (!this.jobs || !Array.isArray(this.jobs)) {
      return [];
    }

    if (this.dateRange === 'all') {
      return this.jobs;
    }

    const days = parseInt(this.dateRange);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.jobs.filter(job => {
      const jobDate = new Date(job.dateApplied);
      return jobDate >= cutoffDate;
    });
  }

  render() {
    console.log('[Stats] Rendering with', this.jobs?.length || 0, 'jobs');

    if (!this.jobs || this.jobs.length === 0) {
      console.log('[Stats] No jobs, showing empty state');
      this.renderEmptyState();
      return;
    }

    const filteredJobs = this.getFilteredJobs();
    console.log('[Stats] Filtered to', filteredJobs.length, 'jobs for range:', this.dateRange);

    if (filteredJobs.length === 0) {
      this.renderEmptyState();
      return;
    }

    this.renderQuickStats(filteredJobs);
    this.renderResponseBuckets(filteredJobs);
    this.renderTimelineChart(filteredJobs);
    this.renderStatusChart(filteredJobs);
    this.renderResponseTimeAnalysis(filteredJobs);
    this.renderTimingInsights(filteredJobs);
    this.renderBestWindow(filteredJobs);
    this.renderNotionInsight(filteredJobs);
  }

  renderQuickStats(jobs) {
    // Total applications
    document.getElementById('stat-total').textContent = jobs.length;

    // Success rate (offers / total)
    const offers = jobs.filter(j => j.status === 'offer').length;
    const successRate = jobs.length > 0 ? Math.round((offers / jobs.length) * 100) : 0;
    document.getElementById('stat-success').textContent = successRate + '%';

    // Interview rate
    const interviews = jobs.filter(j => j.status === 'interview' || j.status === 'offer').length;
    const interviewRate = jobs.length > 0 ? Math.round((interviews / jobs.length) * 100) : 0;
    document.getElementById('stat-interview').textContent = interviewRate + '%';

    // Average response time
    const responseTimes = [];
    jobs.forEach(job => {
      if (job.timeline && job.timeline.length > 1) {
        const applied = new Date(job.timeline[0].date);
        const response = new Date(job.timeline[1].date);
        const days = Math.round((response - applied) / (1000 * 60 * 60 * 24));
        if (days > 0) responseTimes.push(days);
      }
    });

    if (responseTimes.length > 0) {
      const avgDays = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
      document.getElementById('stat-response').textContent = avgDays + ' days';
    } else {
      document.getElementById('stat-response').textContent = '-';
    }
  }

  renderResponseBuckets(jobs) {
    const buckets = {
      veryFast: { count: 0, label: '0-3 days', shortLabel: 'Very fast', class: 'very-fast', jobs: [] },
      fast: { count: 0, label: '4-7 days', shortLabel: 'Fast', class: 'fast', jobs: [] },
      normal: { count: 0, label: '8-14 days', shortLabel: 'Normal', class: 'normal', jobs: [] },
      slow: { count: 0, label: '15-30 days', shortLabel: 'Slow', class: 'slow', jobs: [] },
      verySlow: { count: 0, label: '30+ days', shortLabel: 'Very slow', class: 'very-slow', jobs: [] }
    };

    jobs.forEach(job => {
      if (job.status === 'applied' || !job.timeline || job.timeline.length < 2) return;

      const appliedDate = new Date(job.timeline[0].date);
      const responseDate = new Date(job.timeline[1].date);
      const days = Math.floor((responseDate - appliedDate) / (1000 * 60 * 60 * 24));

      if (days <= 3) {
        buckets.veryFast.count++;
        buckets.veryFast.jobs.push({ ...job, responseDays: days });
      } else if (days <= 7) {
        buckets.fast.count++;
        buckets.fast.jobs.push({ ...job, responseDays: days });
      } else if (days <= 14) {
        buckets.normal.count++;
        buckets.normal.jobs.push({ ...job, responseDays: days });
      } else if (days <= 30) {
        buckets.slow.count++;
        buckets.slow.jobs.push({ ...job, responseDays: days });
      } else {
        buckets.verySlow.count++;
        buckets.verySlow.jobs.push({ ...job, responseDays: days });
      }
    });

    const maxCount = Math.max(...Object.values(buckets).map(b => b.count), 1);
    const container = document.getElementById('response-buckets');

    let bucketIndex = 0;
    container.innerHTML = Object.values(buckets).map(bucket => {
      const height = (bucket.count / maxCount) * 100;
      const currentIndex = bucketIndex++;
      const showLimit = 5;
      const hasMore = bucket.jobs.length > showLimit;

      // Sort jobs by response days (fastest first within each bucket)
      const sortedJobs = bucket.jobs.sort((a, b) => a.responseDays - b.responseDays);
      const visibleJobs = sortedJobs.slice(0, showLimit);

      return `
        <div class="vertical-bucket-column" data-bucket-index="${currentIndex}">
          <div class="vertical-bucket-bar ${bucket.class}" style="height: ${height}%">
            <div class="bucket-count-top">${bucket.count}</div>
          </div>
          <div class="vertical-bucket-label">
            <div class="bucket-time-range">${bucket.label}</div>
            <div class="bucket-speed-label">${bucket.shortLabel}</div>
          </div>
          ${bucket.jobs.length > 0 ? `
            <div class="vertical-bucket-companies">
              ${visibleJobs.map(j => `
                <div class="vertical-company-chip ${bucket.class}" data-job-id="${j.id}">
                  <span class="chip-company">${j.company}</span>
                  <span class="chip-days">${j.responseDays}d</span>
                </div>
              `).join('')}
              ${hasMore ? `
                <button class="show-more-btn-vertical" data-bucket-index="${currentIndex}">
                  +${bucket.jobs.length - showLimit} more
                </button>
              ` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Store buckets for modal access
    this.buckets = Object.values(buckets);

    // Add event listeners (avoiding inline onclick)
    this.attachBucketEventListeners();
  }

  attachBucketEventListeners() {
    // Company chip clicks
    document.querySelectorAll('.vertical-company-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const jobId = e.currentTarget.getAttribute('data-job-id');
        this.openJobDetail(jobId);
      });
    });

    // Show more button clicks
    document.querySelectorAll('.show-more-btn-vertical').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bucketIndex = parseInt(e.currentTarget.getAttribute('data-bucket-index'));
        const bucket = this.buckets[bucketIndex];
        this.showBucketModal(bucketIndex, bucket.label + ' (' + bucket.shortLabel + ')', bucket.class);
      });
    });
  }

  showBucketModal(bucketIndex, label, cssClass) {
    const bucket = this.buckets[bucketIndex];
    if (!bucket) return;

    const sortedJobs = bucket.jobs.sort((a, b) => a.responseDays - b.responseDays);

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'bucket-modal';
    modal.innerHTML = `
      <div class="bucket-modal-overlay"></div>
      <div class="bucket-modal-content">
        <div class="bucket-modal-header">
          <h3>${label} - ${bucket.jobs.length} jobs</h3>
          <button class="modal-close-btn">×</button>
        </div>
        <div class="bucket-modal-body">
          <div class="bucket-jobs-list">
            ${sortedJobs.map(job => `
              <div class="bucket-job-card ${cssClass}" data-job-id="${job.id}">
                <div class="bucket-job-header">
                  <div class="bucket-job-company">${job.company}</div>
                  <div class="bucket-job-days ${cssClass}">${job.responseDays} days</div>
                </div>
                <div class="bucket-job-title">${job.title}</div>
                <div class="bucket-job-meta">
                  <span class="bucket-job-status ${job.status}">${this.formatStatus(job.status)}</span>
                  <span>Applied: ${new Date(job.dateApplied).toLocaleDateString()}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector('.bucket-modal-overlay').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-close-btn').addEventListener('click', () => modal.remove());
    modal.querySelectorAll('.bucket-job-card').forEach(card => {
      card.addEventListener('click', () => {
        const jobId = card.getAttribute('data-job-id');
        this.openJobDetail(jobId);
      });
    });
  }

  openJobDetail(jobId) {
    // Close modal if open
    const modal = document.querySelector('.bucket-modal');
    if (modal) modal.remove();

    // Navigate to job detail page
    window.location.href = `job-detail.html?id=${jobId}`;
  }

  formatStatus(status) {
    const statusMap = {
      'applied': 'Applied',
      'interview': 'Interview',
      'offer': 'Offer',
      'rejected': 'Rejected',
      'withdrawn': 'Withdrawn'
    };
    return statusMap[status] || status;
  }

  renderCompanyTable(jobs) {
    const companyData = {};

    jobs.forEach(job => {
      if (!companyData[job.company]) {
        companyData[job.company] = { count: 0, totalDays: 0, responded: 0 };
      }

      companyData[job.company].count++;

      if (job.status !== 'applied' && job.timeline && job.timeline.length >= 2) {
        const appliedDate = new Date(job.timeline[0].date);
        const responseDate = new Date(job.timeline[1].date);
        const days = Math.floor((responseDate - appliedDate) / (1000 * 60 * 60 * 24));
        companyData[job.company].totalDays += days;
        companyData[job.company].responded++;
      }
    });

    // Create simple table sorted by response time (fastest first)
    const companies = Object.entries(companyData)
      .filter(([_, data]) => data.responded > 0)
      .map(([name, data]) => ({
        name,
        avgDays: Math.round(data.totalDays / data.responded),
        responseRate: `${data.responded}/${data.count}`
      }))
      .sort((a, b) => a.avgDays - b.avgDays);

    const container = document.getElementById('company-table');

    if (companies.length === 0) {
      container.innerHTML = '<div class="empty-state">No company response data yet. Track more jobs to see insights!</div>';
      return;
    }

    container.innerHTML = `
      <table class="simple-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Avg Response Time</th>
            <th>Response Rate</th>
          </tr>
        </thead>
        <tbody>
          ${companies.map(c => {
            let speedClass = '';
            if (c.avgDays <= 3) speedClass = 'very-fast';
            else if (c.avgDays <= 7) speedClass = 'fast';
            else if (c.avgDays <= 14) speedClass = 'normal';
            else if (c.avgDays <= 30) speedClass = 'slow';
            else speedClass = 'very-slow';

            return `
              <tr>
                <td class="company-name-cell">${c.name}</td>
                <td class="response-time-cell">
                  <span class="badge ${speedClass}">${c.avgDays} days</span>
                </td>
                <td>${c.responseRate}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }


  renderTimelineChart(jobs) {
    // Group jobs by week or month depending on date range
    const groupBy = this.dateRange === 'all' || parseInt(this.dateRange) > 30 ? 'month' : 'week';

    const grouped = {};
    const statusGroups = {
      applied: [],
      interview: [],
      offer: [],
      rejected: [],
      withdrawn: []
    };

    jobs.forEach(job => {
      const date = new Date(job.dateApplied);
      let key;

      if (groupBy === 'week') {
        // Get week start date
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        // Group by month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = { applied: 0, interview: 0, offer: 0, rejected: 0, withdrawn: 0 };
      }
      grouped[key][job.status]++;
    });

    // Sort by date
    const sortedKeys = Object.keys(grouped).sort();
    const labels = sortedKeys.map(key => {
      const date = new Date(key);
      if (groupBy === 'week') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    });

    const datasets = [
      {
        label: 'Applied',
        data: sortedKeys.map(k => grouped[k].applied),
        backgroundColor: 'rgba(145, 145, 145, 0.7)',
        borderColor: 'rgb(145, 145, 145)',
        borderWidth: 1
      },
      {
        label: 'Interview',
        data: sortedKeys.map(k => grouped[k].interview),
        backgroundColor: 'rgba(219, 148, 0, 0.7)',
        borderColor: 'rgb(219, 148, 0)',
        borderWidth: 1
      },
      {
        label: 'Offer',
        data: sortedKeys.map(k => grouped[k].offer),
        backgroundColor: 'rgba(0, 135, 107, 0.7)',
        borderColor: 'rgb(0, 135, 107)',
        borderWidth: 1
      },
      {
        label: 'Rejected',
        data: sortedKeys.map(k => grouped[k].rejected),
        backgroundColor: 'rgba(235, 87, 87, 0.7)',
        borderColor: 'rgb(235, 87, 87)',
        borderWidth: 1
      }
    ];

    // Destroy existing chart
    if (this.timelineChart) {
      this.timelineChart.destroy();
    }

    const ctx = document.getElementById('timeline-chart').getContext('2d');
    this.timelineChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 13, weight: '600' },
            bodyFont: { size: 13 },
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { font: { size: 12 } }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              font: { size: 12 },
              stepSize: 1
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          }
        }
      }
    });

    // Render legend
    this.renderTimelineLegend(datasets);
  }

  renderTimelineLegend(datasets) {
    const legendContainer = document.getElementById('timeline-legend');
    legendContainer.innerHTML = datasets.map(ds => `
      <div class="legend-item">
        <div class="legend-dot" style="background: ${ds.borderColor};"></div>
        <span>${ds.label}</span>
      </div>
    `).join('');
  }

  renderStatusChart(jobs) {
    const statusCounts = {
      applied: jobs.filter(j => j.status === 'applied').length,
      interview: jobs.filter(j => j.status === 'interview').length,
      offer: jobs.filter(j => j.status === 'offer').length,
      rejected: jobs.filter(j => j.status === 'rejected').length,
      withdrawn: jobs.filter(j => j.status === 'withdrawn').length
    };

    const data = {
      labels: ['Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn'],
      datasets: [{
        data: [
          statusCounts.applied,
          statusCounts.interview,
          statusCounts.offer,
          statusCounts.rejected,
          statusCounts.withdrawn
        ],
        backgroundColor: [
          'rgba(145, 145, 145, 0.8)',
          'rgba(219, 148, 0, 0.8)',
          'rgba(0, 135, 107, 0.8)',
          'rgba(235, 87, 87, 0.8)',
          'rgba(120, 120, 120, 0.8)'
        ],
        borderWidth: 0
      }]
    };

    // Destroy existing chart
    if (this.statusChart) {
      this.statusChart.destroy();
    }

    const ctx = document.getElementById('status-chart').getContext('2d');
    this.statusChart = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 13, weight: '600' },
            bodyFont: { size: 13 },
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((context.parsed / total) * 100);
                return ` ${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  renderResponseTimeAnalysis(jobs) {
    const toInterview = [];
    const toRejection = [];
    const allResponses = [];

    jobs.forEach(job => {
      if (!job.timeline || job.timeline.length < 2) return;

      const appliedDate = new Date(job.timeline[0].date);

      job.timeline.slice(1).forEach(event => {
        const eventDate = new Date(event.date);
        const days = Math.round((eventDate - appliedDate) / (1000 * 60 * 60 * 24));

        if (days > 0) {
          allResponses.push({ days, company: job.company });

          if (event.type === 'interview' || job.status === 'interview') {
            toInterview.push(days);
          } else if (event.type === 'rejected' || job.status === 'rejected') {
            toRejection.push(days);
          }
        }
      });
    });

    // Average to interview
    if (toInterview.length > 0) {
      const avg = Math.round(toInterview.reduce((a, b) => a + b) / toInterview.length);
      document.getElementById('avg-to-interview').textContent = avg + ' days';
    } else {
      document.getElementById('avg-to-interview').textContent = '-';
    }

    // Average to rejection
    if (toRejection.length > 0) {
      const avg = Math.round(toRejection.reduce((a, b) => a + b) / toRejection.length);
      document.getElementById('avg-to-rejection').textContent = avg + ' days';
    } else {
      document.getElementById('avg-to-rejection').textContent = '-';
    }

    // Fastest response
    if (allResponses.length > 0) {
      const fastest = allResponses.reduce((min, r) => r.days < min.days ? r : min);
      document.getElementById('fastest-response').textContent = fastest.days + ' days';
      document.getElementById('fastest-company').textContent = fastest.company;
    } else {
      document.getElementById('fastest-response').textContent = '-';
      document.getElementById('fastest-company').textContent = '';
    }

    // Slowest response
    if (allResponses.length > 0) {
      const slowest = allResponses.reduce((max, r) => r.days > max.days ? r : max);
      document.getElementById('slowest-response').textContent = slowest.days + ' days';
      document.getElementById('slowest-company').textContent = slowest.company;
    } else {
      document.getElementById('slowest-response').textContent = '-';
      document.getElementById('slowest-company').textContent = '';
    }
  }

  renderTimingInsights(jobs) {
    // Filter jobs that have timing data
    const jobsWithTiming = jobs.filter(j => j.timeToApplyBucket && j.timeToApplyBucket !== null);
    const jobsWithCompetition = jobs.filter(j => j.competitionBucket && j.competitionBucket !== null);

    console.log('[Stats] Jobs with timing data:', jobsWithTiming.length);
    console.log('[Stats] Jobs with competition data:', jobsWithCompetition.length);

    // Render timing chart
    if (jobsWithTiming.length > 0) {
      this.renderTimingInterviewChart(jobsWithTiming);
    } else {
      this.renderEmptyTimingChart('timing-interview-chart', 'No timing data available yet');
    }

    // Render competition chart
    if (jobsWithCompetition.length > 0) {
      this.renderCompetitionInterviewChart(jobsWithCompetition);
    } else {
      this.renderEmptyTimingChart('competition-interview-chart', 'No competition data available yet');
    }
  }

  renderTimingInterviewChart(jobs) {
    // Define bucket order
    const bucketOrder = ['0-3h', '4-12h', '13-24h', '1-3d', '3-7d', '7d+'];
    const bucketLabels = {
      '0-3h': '0-3 hours',
      '4-12h': '4-12 hours',
      '13-24h': '13-24 hours',
      '1-3d': '1-3 days',
      '3-7d': '3-7 days',
      '7d+': '7+ days'
    };

    // Group jobs by bucket
    const bucketData = {};
    bucketOrder.forEach(bucket => {
      bucketData[bucket] = { total: 0, interview: 0, offer: 0 };
    });

    jobs.forEach(job => {
      const bucket = job.timeToApplyBucket;
      if (bucketData[bucket]) {
        bucketData[bucket].total++;
        if (job.status === 'interview' || job.status === 'offer') {
          bucketData[bucket].interview++;
        }
        if (job.status === 'offer') {
          bucketData[bucket].offer++;
        }
      }
    });

    // Calculate interview rates
    const labels = [];
    const interviewRates = [];
    const jobCounts = [];

    bucketOrder.forEach(bucket => {
      if (bucketData[bucket].total > 0) {
        labels.push(bucketLabels[bucket]);
        const rate = Math.round((bucketData[bucket].interview / bucketData[bucket].total) * 100);
        interviewRates.push(rate);
        jobCounts.push(bucketData[bucket].total);
      }
    });

    // Destroy existing chart
    if (this.timingInterviewChart) {
      this.timingInterviewChart.destroy();
    }

    const ctx = document.getElementById('timing-interview-chart').getContext('2d');
    this.timingInterviewChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Interview Rate (%)',
          data: interviewRates,
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: 'rgb(99, 102, 241)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            callbacks: {
              label: (context) => {
                const index = context.dataIndex;
                const rate = context.parsed.y;
                const count = jobCounts[index];
                return [
                  `Interview rate: ${rate}%`,
                  `Jobs applied: ${count}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              font: { size: 12 },
              callback: (value) => value + '%'
            },
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          }
        }
      }
    });
  }

  renderCompetitionInterviewChart(jobs) {
    // Define bucket order
    const bucketOrder = ['0-10', '11-25', '26-50', '51-100', '100+'];

    // Group jobs by bucket
    const bucketData = {};
    bucketOrder.forEach(bucket => {
      bucketData[bucket] = { total: 0, interview: 0, offer: 0 };
    });

    jobs.forEach(job => {
      const bucket = job.competitionBucket;
      if (bucketData[bucket]) {
        bucketData[bucket].total++;
        if (job.status === 'interview' || job.status === 'offer') {
          bucketData[bucket].interview++;
        }
        if (job.status === 'offer') {
          bucketData[bucket].offer++;
        }
      }
    });

    // Calculate interview rates
    const labels = [];
    const interviewRates = [];
    const jobCounts = [];

    bucketOrder.forEach(bucket => {
      if (bucketData[bucket].total > 0) {
        labels.push(bucket + ' applicants');
        const rate = Math.round((bucketData[bucket].interview / bucketData[bucket].total) * 100);
        interviewRates.push(rate);
        jobCounts.push(bucketData[bucket].total);
      }
    });

    // Destroy existing chart
    if (this.competitionInterviewChart) {
      this.competitionInterviewChart.destroy();
    }

    const ctx = document.getElementById('competition-interview-chart').getContext('2d');
    this.competitionInterviewChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Interview Rate (%)',
          data: interviewRates,
          backgroundColor: 'rgba(139, 92, 246, 0.7)',
          borderColor: 'rgb(139, 92, 246)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            callbacks: {
              label: (context) => {
                const index = context.dataIndex;
                const rate = context.parsed.y;
                const count = jobCounts[index];
                return [
                  `Interview rate: ${rate}%`,
                  `Jobs applied: ${count}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              font: { size: 12 },
              callback: (value) => value + '%'
            },
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          }
        }
      }
    });
  }

  renderEmptyTimingChart(canvasId, message) {
    const canvas = document.getElementById(canvasId);
    const parent = canvas.parentElement;
    parent.style.display = 'flex';
    parent.style.alignItems = 'center';
    parent.style.justifyContent = 'center';
    parent.style.minHeight = '200px';
    parent.innerHTML = `<div class="empty-state" style="padding: 32px;">${message}</div>`;
  }

  renderBestWindow(jobs) {
    const container = document.getElementById('best-window-container');
    const textElement = document.getElementById('best-window-text');

    // Need at least 20 jobs with timing data to show insight
    const jobsWithData = jobs.filter(j =>
      j.timeToApplyBucket && j.competitionBucket &&
      (j.status === 'interview' || j.status === 'offer' || j.status === 'rejected')
    );

    if (jobsWithData.length < 10) {
      container.style.display = 'none';
      return;
    }

    // Calculate best bucket by timing
    const timingBuckets = ['0-3h', '4-12h', '13-24h', '1-3d', '3-7d', '7d+'];
    const timingStats = {};

    timingBuckets.forEach(bucket => {
      const bucketJobs = jobsWithData.filter(j => j.timeToApplyBucket === bucket);
      if (bucketJobs.length >= 3) {
        const interviews = bucketJobs.filter(j => j.status === 'interview' || j.status === 'offer').length;
        timingStats[bucket] = {
          rate: (interviews / bucketJobs.length) * 100,
          count: bucketJobs.length
        };
      }
    });

    // Calculate best bucket by competition
    const competitionBuckets = ['0-10', '11-25', '26-50', '51-100', '100+'];
    const competitionStats = {};

    competitionBuckets.forEach(bucket => {
      const bucketJobs = jobsWithData.filter(j => j.competitionBucket === bucket);
      if (bucketJobs.length >= 3) {
        const interviews = bucketJobs.filter(j => j.status === 'interview' || j.status === 'offer').length;
        competitionStats[bucket] = {
          rate: (interviews / bucketJobs.length) * 100,
          count: bucketJobs.length
        };
      }
    });

    // Find best timing and competition buckets
    let bestTiming = null;
    let bestCompetition = null;

    Object.entries(timingStats).forEach(([bucket, stats]) => {
      if (!bestTiming || stats.rate > bestTiming.rate) {
        bestTiming = { bucket, ...stats };
      }
    });

    Object.entries(competitionStats).forEach(([bucket, stats]) => {
      if (!bestCompetition || stats.rate > bestCompetition.rate) {
        bestCompetition = { bucket, ...stats };
      }
    });

    // Generate insight text
    if (bestTiming || bestCompetition) {
      container.style.display = 'block';

      const timingText = bestTiming ?
        this.formatTimingBucket(bestTiming.bucket) :
        'any time';

      const competitionText = bestCompetition ?
        `before ${this.formatCompetitionBucket(bestCompetition.bucket)}` :
        'at any competition level';

      const timingRate = bestTiming ? Math.round(bestTiming.rate) : 0;
      const competitionRate = bestCompetition ? Math.round(bestCompetition.rate) : 0;

      textElement.innerHTML = `
        In your data, you get the best results when you apply <strong>${timingText}</strong> ${competitionText}.
        <br><br>
        ${bestTiming ? `Applying ${timingText} has led to a <strong>${timingRate}% interview rate</strong> in ${bestTiming.count} jobs.` : ''}
        ${bestCompetition ? `Jobs with ${this.formatCompetitionBucket(bestCompetition.bucket)} have a <strong>${competitionRate}% interview rate</strong> in ${bestCompetition.count} jobs.` : ''}
      `;
    } else {
      container.style.display = 'none';
    }
  }

  formatTimingBucket(bucket) {
    const labels = {
      '0-3h': 'within 3 hours',
      '4-12h': 'within 4-12 hours',
      '13-24h': 'within 24 hours',
      '1-3d': 'within 1-3 days',
      '3-7d': 'within 3-7 days',
      '7d+': 'after 7+ days'
    };
    return labels[bucket] || bucket;
  }

  formatCompetitionBucket(bucket) {
    const labels = {
      '0-10': '10 applicants',
      '11-25': '25 applicants',
      '26-50': '50 applicants',
      '51-100': '100 applicants',
      '100+': '100+ applicants'
    };
    return labels[bucket] || bucket;
  }

  renderNotionInsight(jobs) {
    const tableDiv = document.getElementById('simple-insights-table');
    if (!tableDiv) return;

    // If no insight type selected, show empty state
    if (!this.currentInsightType) {
      tableDiv.innerHTML = `
        <div class="insights-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/>
          </svg>
          <p>Select a view to see insights</p>
        </div>
      `;
      return;
    }

    let tableHTML;

    switch (this.currentInsightType) {
      case 'by-hours':
        tableHTML = this.getStatusByHoursTable(jobs);
        break;
      case 'by-applicants':
        tableHTML = this.getStatusByApplicantsTable(jobs);
        break;
      default:
        return;
    }

    tableDiv.innerHTML = tableHTML;
  }

  getStatusByHoursTable(jobs) {
    const buckets = [
      { key: '0-3h', label: '0-3h' },
      { key: '4-12h', label: '4-12h' },
      { key: '13-24h', label: '13-24h' },
      { key: '1-3d', label: '1-3d' },
      { key: '4-7d', label: '4-7d' },
      { key: '7d+', label: '7d+' }
    ];

    const statuses = ['applied', 'interview', 'rejected'];

    const rows = buckets.map(bucket => {
      const bucketJobs = jobs.filter(j => j.timeToApplyBucket === bucket.key);
      const total = bucketJobs.length;

      if (total === 0) {
        return `
          <tr>
            <td class="category-cell">${bucket.label}</td>
            <td class="number-cell">0</td>
            <td class="percent-cell">-</td>
            <td class="percent-cell">-</td>
            <td class="percent-cell">-</td>
          </tr>
        `;
      }

      const applied = bucketJobs.filter(j => j.status === 'applied').length;
      const interview = bucketJobs.filter(j => j.status === 'interview' || j.status === 'offer').length;
      const rejected = bucketJobs.filter(j => j.status === 'rejected').length;

      const appliedPct = Math.round((applied / total) * 100);
      const interviewPct = Math.round((interview / total) * 100);
      const rejectedPct = Math.round((rejected / total) * 100);

      return `
        <tr>
          <td class="category-cell"><strong>${bucket.label}</strong></td>
          <td class="number-cell">${total}</td>
          <td class="percent-cell">${appliedPct}%</td>
          <td class="percent-cell">${interviewPct}%</td>
          <td class="percent-cell">${rejectedPct}%</td>
        </tr>
      `;
    }).join('');

    return `
      <table>
        <thead>
          <tr>
            <th>Time After Posting</th>
            <th>Total</th>
            <th>Applied %</th>
            <th>Interview %</th>
            <th>Rejected %</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  getStatusByApplicantsTable(jobs) {
    const buckets = [
      { key: '0-10', label: '0-10' },
      { key: '11-25', label: '11-25' },
      { key: '26-50', label: '26-50' },
      { key: '51-100', label: '51-100' },
      { key: '100+', label: '100+' }
    ];

    const rows = buckets.map(bucket => {
      const bucketJobs = jobs.filter(j => j.competitionBucket === bucket.key);
      const total = bucketJobs.length;

      if (total === 0) {
        return `
          <tr>
            <td class="category-cell">${bucket.label}</td>
            <td class="number-cell">0</td>
            <td class="percent-cell">-</td>
            <td class="percent-cell">-</td>
            <td class="percent-cell">-</td>
          </tr>
        `;
      }

      const applied = bucketJobs.filter(j => j.status === 'applied').length;
      const interview = bucketJobs.filter(j => j.status === 'interview' || j.status === 'offer').length;
      const rejected = bucketJobs.filter(j => j.status === 'rejected').length;

      const appliedPct = Math.round((applied / total) * 100);
      const interviewPct = Math.round((interview / total) * 100);
      const rejectedPct = Math.round((rejected / total) * 100);

      return `
        <tr>
          <td class="category-cell"><strong>${bucket.label}</strong></td>
          <td class="number-cell">${total}</td>
          <td class="percent-cell">${appliedPct}%</td>
          <td class="percent-cell">${interviewPct}%</td>
          <td class="percent-cell">${rejectedPct}%</td>
        </tr>
      `;
    }).join('');

    return `
      <table>
        <thead>
          <tr>
            <th>Applicants</th>
            <th>Total</th>
            <th>Applied %</th>
            <th>Interview %</th>
            <th>Rejected %</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  renderEmptyState() {
    const statsWrapper = document.querySelector('.stats-wrapper');
    statsWrapper.innerHTML = `
      <div class="stats-empty-state">
        <svg viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 5.35v5.3c0 .36.29.65.65.65h10.7a.65.65 0 0 0 .65-.65v-5.3a.65.65 0 0 0-.65-.65H2.65a.65.65 0 0 0-.65.65z"/>
        </svg>
        <h3>No data yet</h3>
        <p>Track some jobs to see your stats and insights</p>
      </div>
    `;
  }
}

// Initialize stats manager
window.statsManager = new StatsManager();
window.statsManager.init();
