// Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// State
let currentUser = null;
let currentPage = 1;
let currentJobsPage = 1;
let selectedUserId = null;
let searchTimeout = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupEventListeners();
});

// Check authentication
async function checkAuth() {
  const token = localStorage.getItem('token');

  if (!token) {
    window.location.href = '../auth/login.html';
    return;
  }

  try {
    // Get current user info
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const data = await response.json();
    currentUser = data.data;

    // Check if user is admin
    if (currentUser.role !== 'admin') {
      alert('Access denied. Admin privileges required.');
      window.location.href = '../tracking-dashboard/dashboard.html';
      return;
    }

    displayAdminInfo();
    loadDashboardStats();
    loadUsers();
  } catch (error) {
    console.error('Auth error:', error);
    localStorage.removeItem('token');
    window.location.href = '../auth/login.html';
  }
}

// Display admin info
function displayAdminInfo() {
  document.getElementById('adminEmail').textContent = currentUser.email;
}

// Setup event listeners
function setupEventListeners() {
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Search users
  document.getElementById('searchUsers').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      loadUsers(e.target.value);
    }, 500);
  });

  // Back to users
  document.getElementById('backToUsers').addEventListener('click', () => {
    document.getElementById('userJobsSection').style.display = 'none';
    document.getElementById('usersSection').style.display = 'block';
    selectedUserId = null;
  });

  // Status filter
  document.getElementById('statusFilter').addEventListener('change', () => {
    currentJobsPage = 1;
    loadUserJobs(selectedUserId);
  });

  // Search jobs
  document.getElementById('searchJobs').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentJobsPage = 1;
      loadUserJobs(selectedUserId, e.target.value);
    }, 500);
  });
}

// Load dashboard stats
async function loadDashboardStats() {
  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${API_BASE_URL}/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load stats');

    const { data } = await response.json();

    document.getElementById('totalUsers').textContent = data.totalUsers || 0;
    document.getElementById('activeUsers').textContent = data.activeUsers || 0;
    document.getElementById('totalJobs').textContent = data.totalJobs || 0;
    document.getElementById('totalApplications').textContent = data.jobsByStatus?.applied || 0;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Load users
async function loadUsers(search = '') {
  const token = localStorage.getItem('token');
  const tbody = document.getElementById('usersTableBody');

  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: 20,
      search: search
    });

    const response = await fetch(`${API_BASE_URL}/admin/users?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load users');

    const { data } = await response.json();

    displayUsers(data.users);
    updateUsersPagination(data.pagination);
  } catch (error) {
    console.error('Error loading users:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-danger py-4">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Failed to load users
        </td>
      </tr>
    `;
  }
}

// Display users
function displayUsers(users) {
  const tbody = document.getElementById('usersTableBody');

  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-muted py-4">
          <i class="bi bi-inbox me-2"></i>
          No users found
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = users.map(user => {
    const stats = user.jobStats || { total: 0, byStatus: {} };
    const joinedDate = new Date(user.createdAt).toLocaleDateString();
    const isActive = user.isActive !== false;
    const role = user.role || 'user';

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <div class="avatar-circle me-2">
              ${(user.fullName || user.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="fw-semibold">${user.fullName || 'N/A'}</div>
              <small class="text-muted">${user._id}</small>
            </div>
          </div>
        </td>
        <td>${user.email}</td>
        <td>
          <span class="badge ${role === 'admin' ? 'bg-danger' : 'bg-secondary'}">
            ${role}
          </span>
        </td>
        <td>
          <span class="badge bg-primary">${stats.total}</span>
        </td>
        <td>
          <span class="badge bg-info">${stats.byStatus.applied || 0}</span>
        </td>
        <td>
          <span class="badge bg-warning">${stats.byStatus.interview || 0}</span>
        </td>
        <td>
          <span class="badge ${isActive ? 'bg-success' : 'bg-secondary'}">
            ${isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>${joinedDate}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="viewUserJobs('${user._id}', '${user.fullName || user.email}')">
            <i class="bi bi-briefcase me-1"></i>
            View Jobs
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Update users pagination
function updateUsersPagination(pagination) {
  const paginationInfo = document.getElementById('usersPagination');
  const paginationButtons = document.getElementById('usersPaginationButtons');

  paginationInfo.textContent = `Showing ${pagination.totalUsers > 0 ? (pagination.currentPage - 1) * pagination.limit + 1 : 0} - ${Math.min(pagination.currentPage * pagination.limit, pagination.totalUsers)} of ${pagination.totalUsers} users`;

  // Generate pagination buttons
  let buttons = '';

  // Previous button
  buttons += `
    <li class="page-item ${pagination.currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changePage(${pagination.currentPage - 1}); return false;">
        <i class="bi bi-chevron-left"></i>
      </a>
    </li>
  `;

  // Page numbers
  for (let i = 1; i <= pagination.totalPages; i++) {
    if (
      i === 1 ||
      i === pagination.totalPages ||
      (i >= pagination.currentPage - 2 && i <= pagination.currentPage + 2)
    ) {
      buttons += `
        <li class="page-item ${i === pagination.currentPage ? 'active' : ''}">
          <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
        </li>
      `;
    } else if (i === pagination.currentPage - 3 || i === pagination.currentPage + 3) {
      buttons += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
  }

  // Next button
  buttons += `
    <li class="page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changePage(${pagination.currentPage + 1}); return false;">
        <i class="bi bi-chevron-right"></i>
      </a>
    </li>
  `;

  paginationButtons.innerHTML = buttons;
}

// Change page
function changePage(page) {
  currentPage = page;
  const searchValue = document.getElementById('searchUsers').value;
  loadUsers(searchValue);
}

// View user jobs
function viewUserJobs(userId, userName) {
  selectedUserId = userId;
  document.getElementById('selectedUserName').textContent = userName;
  document.getElementById('usersSection').style.display = 'none';
  document.getElementById('userJobsSection').style.display = 'block';
  currentJobsPage = 1;
  loadUserJobs(userId);
}

// Load user jobs
async function loadUserJobs(userId, search = '') {
  const token = localStorage.getItem('token');
  const tbody = document.getElementById('jobsTableBody');
  const status = document.getElementById('statusFilter').value;

  try {
    const params = new URLSearchParams({
      page: currentJobsPage,
      limit: 50,
      search: search,
      status: status
    });

    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/jobs?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load jobs');

    const { data } = await response.json();

    displayJobs(data.jobs);
    updateJobsPagination(data.pagination);
  } catch (error) {
    console.error('Error loading jobs:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger py-4">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Failed to load jobs
        </td>
      </tr>
    `;
  }
}

// Display jobs
function displayJobs(jobs) {
  const tbody = document.getElementById('jobsTableBody');

  if (!jobs || jobs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          <i class="bi bi-inbox me-2"></i>
          No jobs found
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = jobs.map(job => {
    const appliedDate = new Date(job.dateApplied).toLocaleDateString();
    const statusBadge = getStatusBadge(job.status);
    const priorityBadge = getPriorityBadge(job.priority);

    return `
      <tr>
        <td>
          <div class="fw-semibold">${job.company}</div>
        </td>
        <td>${job.title}</td>
        <td>
          <small class="text-muted">
            <i class="bi bi-geo-alt me-1"></i>
            ${job.location || 'N/A'}
          </small>
        </td>
        <td>${statusBadge}</td>
        <td>${appliedDate}</td>
        <td>${priorityBadge}</td>
        <td>
          <span class="badge bg-light text-dark">${job.source || 'Manual'}</span>
        </td>
      </tr>
    `;
  }).join('');
}

// Get status badge
function getStatusBadge(status) {
  const badges = {
    'saved': 'secondary',
    'applied': 'primary',
    'screening': 'info',
    'interview': 'warning',
    'offer': 'success',
    'rejected': 'danger',
    'withdrawn': 'dark',
    'archived': 'secondary'
  };

  const color = badges[status] || 'secondary';
  return `<span class="badge bg-${color}">${status}</span>`;
}

// Get priority badge
function getPriorityBadge(priority) {
  const badges = {
    'low': 'secondary',
    'medium': 'primary',
    'high': 'warning',
    'urgent': 'danger'
  };

  const color = badges[priority] || 'secondary';
  return `<span class="badge bg-${color}">${priority}</span>`;
}

// Update jobs pagination
function updateJobsPagination(pagination) {
  const paginationInfo = document.getElementById('jobsPagination');
  const paginationButtons = document.getElementById('jobsPaginationButtons');

  paginationInfo.textContent = `Showing ${pagination.totalJobs > 0 ? (pagination.currentPage - 1) * pagination.limit + 1 : 0} - ${Math.min(pagination.currentPage * pagination.limit, pagination.totalJobs)} of ${pagination.totalJobs} jobs`;

  // Generate pagination buttons
  let buttons = '';

  // Previous button
  buttons += `
    <li class="page-item ${pagination.currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changeJobsPage(${pagination.currentPage - 1}); return false;">
        <i class="bi bi-chevron-left"></i>
      </a>
    </li>
  `;

  // Page numbers
  for (let i = 1; i <= pagination.totalPages; i++) {
    if (
      i === 1 ||
      i === pagination.totalPages ||
      (i >= pagination.currentPage - 2 && i <= pagination.currentPage + 2)
    ) {
      buttons += `
        <li class="page-item ${i === pagination.currentPage ? 'active' : ''}">
          <a class="page-link" href="#" onclick="changeJobsPage(${i}); return false;">${i}</a>
        </li>
      `;
    } else if (i === pagination.currentPage - 3 || i === pagination.currentPage + 3) {
      buttons += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
  }

  // Next button
  buttons += `
    <li class="page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changeJobsPage(${pagination.currentPage + 1}); return false;">
        <i class="bi bi-chevron-right"></i>
      </a>
    </li>
  `;

  paginationButtons.innerHTML = buttons;
}

// Change jobs page
function changeJobsPage(page) {
  currentJobsPage = page;
  const searchValue = document.getElementById('searchJobs').value;
  loadUserJobs(selectedUserId, searchValue);
}

// Logout
function logout() {
  localStorage.removeItem('token');
  window.location.href = '../auth/login.html';
}
