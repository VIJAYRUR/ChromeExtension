// Auth guard - check authentication before showing dashboard
(async function() {
  const authLoading = document.getElementById('auth-loading');
  const authGuard = document.getElementById('auth-guard');

  if (!authLoading || !authGuard) return;

  try {
    if (window.authManager) {
      const isAuth = await window.authManager.init();

      if (!isAuth) {
        authLoading.style.display = 'none';
        authGuard.style.display = 'flex';

        document.getElementById('auth-login-btn')?.addEventListener('click', () => {
          window.location.href = '../auth/login.html?returnUrl=' + encodeURIComponent(window.location.href);
        });

        document.getElementById('auth-register-btn')?.addEventListener('click', () => {
          window.location.href = '../auth/register.html?returnUrl=' + encodeURIComponent(window.location.href);
        });
        return;
      }
    }

    authLoading.style.display = 'none';
    authGuard.style.display = 'none';
  } catch (error) {
    console.error('Auth check failed:', error);
    authLoading.style.display = 'none';
    authGuard.style.display = 'none'; // Allow access on error
  }
})();
