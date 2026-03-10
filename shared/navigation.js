// Shared Navigation Utilities

/**
 * Initialize navigation highlighting based on current page
 */
function initNavigation() {
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop();
        if (linkPage === currentPage) {
            link.classList.add('active');
        }
    });

    // Initialize profile menu data if elements exist
    const userNameEl = document.querySelector('.menu-header .user-name');
    const userRoleEl = document.querySelector('.menu-header .user-role');

    if (userNameEl) userNameEl.textContent = localStorage.getItem('user_name') || 'User';
    if (userRoleEl) {
        const role = localStorage.getItem('role');
        userRoleEl.textContent = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Guest';
    }

    // Close profile menu when clicking outside
    document.addEventListener('click', (e) => {
        const container = document.querySelector('.profile-container');
        const menu = document.getElementById('profileMenu');
        if (container && menu && menu.classList.contains('active') && !container.contains(e.target)) {
            menu.classList.remove('active');
        }
    });
}

/**
 * Toggle profile dropdown menu
 */
function toggleProfileMenu() {
    const menu = document.getElementById('profileMenu');
    if (menu) {
        menu.classList.toggle('active');
    }
}

/**
 * Show logout confirmation and perform logout
 */
function confirmLogout() {
    if (typeof showConfirm === 'function') {
        showConfirm(
            'Confirm Logout',
            'Are you sure you want to log out of the system?',
            (confirmed) => {
                if (confirmed) {
                    if (window.Auth && typeof window.Auth.logout === 'function') {
                        window.Auth.logout();
                    } else {
                        // Fallback in case Auth is not loaded
                        localStorage.removeItem('token');
                        localStorage.removeItem('role');
                        localStorage.removeItem('user_name');
                        window.location.href = '/';
                    }
                }
            }
        );
    } else {
        // Fallback to standard confirm if modal system is not loaded
        if (confirm('Are you sure you want to log out?')) {
            window.Auth.logout();
        }
    }
}

/**
 * Navigate to a different page
 */
function navigateTo(url) {
    window.location.href = url;
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', initNavigation);
