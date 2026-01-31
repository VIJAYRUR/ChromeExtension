// Stats Overview Page - Simplified and Meaningful

class StatsManager {
  constructor() {
    this.jobs = [];
  }

  init() {
    // No event listeners needed for simplified version
  }

  render() {
    console.log('[Stats] Rendering with', this.jobs?.length || 0, 'jobs');

    if (!this.jobs || this.jobs.length === 0) {
      this.renderEmptyState();
      return;
    }

    this.renderSummary();
    this.renderHeatmap();
    this.renderFunnel();
    this.renderStatusBreakdown();
    this.renderWaitingList();
    this.renderRecentActivity();
  }

  renderSummary() {
    const total = this.jobs.length;

    // This week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = this.jobs.filter(j => new Date(j.dateApplied) >= weekAgo).length;

    // This month
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const thisMonth = this.jobs.filter(j => new Date(j.dateApplied) >= monthAgo).length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-this-week').textContent = thisWeek;
    document.getElementById('stat-this-month').textContent = thisMonth;
  }

  renderHeatmap() {
    const weeksContainer = document.getElementById('heatmap-weeks');
    const monthsContainer = document.getElementById('heatmap-months');
    const totalEl = document.getElementById('heatmap-total');

    if (!weeksContainer || !monthsContainer) return;

    // Get date range (last 52 weeks)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364); // Go back ~52 weeks
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday

    // Count applications per day
    const dayCounts = {};
    let totalLastYear = 0;

    this.jobs.forEach(job => {
      const date = new Date(job.dateApplied);
      const dateKey = date.toISOString().split('T')[0];

      // Check if within last year
      const yearAgo = new Date(today);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      if (date >= yearAgo) {
        totalLastYear++;
      }

      dayCounts[dateKey] = (dayCounts[dateKey] || 0) + 1;
    });

    totalEl.textContent = totalLastYear;

    // Generate weeks
    weeksContainer.innerHTML = '';
    monthsContainer.innerHTML = '';

    let currentDate = new Date(startDate);
    let currentMonth = -1;
    let weekCount = 0;

    while (currentDate <= today) {
      const weekEl = document.createElement('div');
      weekEl.className = 'heatmap-week';

      // Check if new month
      if (currentDate.getMonth() !== currentMonth) {
        currentMonth = currentDate.getMonth();
        const monthName = currentDate.toLocaleDateString('en-US', { month: 'short' });
        const monthEl = document.createElement('div');
        monthEl.className = 'heatmap-month';
        monthEl.textContent = monthName;
        monthEl.style.gridColumn = `${weekCount + 1}`;
        monthsContainer.appendChild(monthEl);
      }

      // Generate 7 days for this week
      for (let day = 0; day < 7; day++) {
        const cellDate = new Date(currentDate);
        cellDate.setDate(cellDate.getDate() + day);

        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';

        if (cellDate > today) {
          cell.classList.add('future');
        } else {
          const dateKey = cellDate.toISOString().split('T')[0];
          const count = dayCounts[dateKey] || 0;

          // Set level based on count
          if (count > 0) {
            if (count >= 4) cell.classList.add('level-4');
            else if (count >= 3) cell.classList.add('level-3');
            else if (count >= 2) cell.classList.add('level-2');
            else cell.classList.add('level-1');
          }

          // Add tooltip data
          cell.dataset.date = cellDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          cell.dataset.count = count;

          // Add hover events
          cell.addEventListener('mouseenter', (e) => this.showHeatmapTooltip(e, cell));
          cell.addEventListener('mouseleave', () => this.hideHeatmapTooltip());
        }

        weekEl.appendChild(cell);
      }

      weeksContainer.appendChild(weekEl);
      currentDate.setDate(currentDate.getDate() + 7);
      weekCount++;
    }
  }

  showHeatmapTooltip(e, cell) {
    const existing = document.querySelector('.heatmap-tooltip');
    if (existing) existing.remove();

    const count = cell.dataset.count;
    const date = cell.dataset.date;

    const tooltip = document.createElement('div');
    tooltip.className = 'heatmap-tooltip';
    tooltip.innerHTML = `<strong>${count} application${count !== '1' ? 's' : ''}</strong> on ${date}`;

    document.body.appendChild(tooltip);

    const rect = cell.getBoundingClientRect();
    tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
  }

  hideHeatmapTooltip() {
    const tooltip = document.querySelector('.heatmap-tooltip');
    if (tooltip) tooltip.remove();
  }

  renderFunnel() {
    const applied = this.jobs.filter(j => j.status === 'applied').length;
    const interview = this.jobs.filter(j => j.status === 'interview').length;
    const offer = this.jobs.filter(j => j.status === 'offer').length;
    const total = this.jobs.length;

    // Count for funnel (interview + offer for interview stage)
    const interviewTotal = interview + offer;

    // Calculate rates
    const interviewRate = total > 0 ? Math.round((interviewTotal / total) * 100) : 0;
    const offerRate = total > 0 ? Math.round((offer / total) * 100) : 0;

    // Update counts
    document.getElementById('funnel-count-applied').textContent = total;
    document.getElementById('funnel-count-interview').textContent = interviewTotal;
    document.getElementById('funnel-count-offer').textContent = offer;

    // Update rates
    document.getElementById('rate-interview').textContent = interviewRate + '%';
    document.getElementById('rate-offer').textContent = offerRate + '%';

    // Update funnel bars (visual width)
    const maxWidth = 100;
    const appliedWidth = maxWidth;
    const interviewWidth = total > 0 ? (interviewTotal / total) * maxWidth : 0;
    const offerWidth = total > 0 ? (offer / total) * maxWidth : 0;

    document.getElementById('funnel-applied').style.width = appliedWidth + '%';
    document.getElementById('funnel-interview').style.width = Math.max(interviewWidth, 5) + '%';
    document.getElementById('funnel-offer').style.width = Math.max(offerWidth, 5) + '%';
  }

  renderStatusBreakdown() {
    const counts = {
      applied: this.jobs.filter(j => j.status === 'applied').length,
      interview: this.jobs.filter(j => j.status === 'interview').length,
      offer: this.jobs.filter(j => j.status === 'offer').length,
      rejected: this.jobs.filter(j => j.status === 'rejected').length
    };

    document.getElementById('breakdown-applied').textContent = counts.applied;
    document.getElementById('breakdown-interview').textContent = counts.interview;
    document.getElementById('breakdown-offer').textContent = counts.offer;
    document.getElementById('breakdown-rejected').textContent = counts.rejected;
  }

  renderWaitingList() {
    const container = document.getElementById('waiting-list');

    // Jobs with status "applied" sorted by date (oldest first = waiting longest)
    const waitingJobs = this.jobs
      .filter(j => j.status === 'applied')
      .sort((a, b) => new Date(a.dateApplied) - new Date(b.dateApplied))
      .slice(0, 5);

    if (waitingJobs.length === 0) {
      container.innerHTML = '<div class="empty-state-small">No applications waiting for response</div>';
      return;
    }

    container.innerHTML = waitingJobs.map(job => {
      const daysAgo = this.getDaysAgo(job.dateApplied);
      const urgencyClass = daysAgo > 14 ? 'urgent' : daysAgo > 7 ? 'moderate' : '';

      return `
        <div class="waiting-item ${urgencyClass}" data-job-id="${job.id}">
          <div class="waiting-info">
            <div class="waiting-company">${job.company}</div>
            <div class="waiting-title">${job.title}</div>
          </div>
          <div class="waiting-days">${daysAgo}d ago</div>
        </div>
      `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.waiting-item').forEach(item => {
      item.addEventListener('click', () => {
        const jobId = item.dataset.jobId;
        window.location.href = `job-detail.html?id=${jobId}`;
      });
    });
  }

  renderRecentActivity() {
    const container = document.getElementById('activity-list');

    // Get recent status changes or applications (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentJobs = this.jobs
      .filter(j => {
        const appliedDate = new Date(j.dateApplied);
        const lastUpdated = j.lastUpdated ? new Date(j.lastUpdated) : appliedDate;
        return lastUpdated >= weekAgo || appliedDate >= weekAgo;
      })
      .sort((a, b) => {
        const dateA = a.lastUpdated ? new Date(a.lastUpdated) : new Date(a.dateApplied);
        const dateB = b.lastUpdated ? new Date(b.lastUpdated) : new Date(b.dateApplied);
        return dateB - dateA;
      })
      .slice(0, 5);

    if (recentJobs.length === 0) {
      container.innerHTML = '<div class="empty-state-small">No recent activity in the last 7 days</div>';
      return;
    }

    container.innerHTML = recentJobs.map(job => {
      const date = job.lastUpdated ? new Date(job.lastUpdated) : new Date(job.dateApplied);
      const dateStr = this.formatRelativeDate(date);
      const statusIcon = this.getStatusIcon(job.status);

      return `
        <div class="activity-item" data-job-id="${job.id}">
          <div class="activity-icon ${job.status}">${statusIcon}</div>
          <div class="activity-info">
            <div class="activity-text">
              <strong>${job.company}</strong> - ${job.title}
            </div>
            <div class="activity-meta">
              <span class="activity-status ${job.status}">${this.formatStatus(job.status)}</span>
              <span class="activity-date">${dateStr}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.activity-item').forEach(item => {
      item.addEventListener('click', () => {
        const jobId = item.dataset.jobId;
        window.location.href = `job-detail.html?id=${jobId}`;
      });
    });
  }

  getDaysAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    return diff;
  }

  formatRelativeDate(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  getStatusIcon(status) {
    const icons = {
      'applied': '📤',
      'interview': '💬',
      'offer': '🎉',
      'rejected': '❌',
      'withdrawn': '↩️'
    };
    return icons[status] || '📋';
  }

  renderEmptyState() {
    const wrapper = document.querySelector('.stats-wrapper');
    if (!wrapper) return;

    wrapper.innerHTML = `
      <div class="stats-empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 17v-6m3 6v-4m3 4v-8m-9 8h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
        <h3>No applications yet</h3>
        <p>Start tracking your job applications to see your stats</p>
      </div>
    `;
  }
}

// Initialize stats manager
window.statsManager = new StatsManager();
window.statsManager.init();
