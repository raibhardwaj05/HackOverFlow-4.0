// Notifications Screen JavaScript

// Dummy notifications data
// TODO: Fetch notifications from backend /api/citizen/notifications
const notificationsData = [];

/**
 * Render notifications list
 */
function renderNotifications() {
    const container = document.getElementById('notificationsList');
    const emptyState = document.getElementById('emptyState');

    if (notificationsData.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    container.style.display = 'block';
    emptyState.style.display = 'none';

    // Sort by timestamp (newest first)
    const sortedNotifications = [...notificationsData].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    container.innerHTML = sortedNotifications.map(notif => `
        <div class="notification-item ${notif.read ? '' : 'unread'}" onclick="openRelatedReport('${notif.reportId}')">
            <div class="notification-content">
                <div class="notification-title">${notif.title}</div>
                <div class="notification-message">${notif.message}</div>
                <div class="notification-timestamp">🕐 ${notif.timestamp}</div>
            </div>
            <div class="notification-actions">
                ${!notif.read ? '<span class="status-chip status-pending">New</span>' : ''}
            </div>
        </div>
    `).join('');
}

/**
 * Open related report
 */
function openRelatedReport(reportId) {
    // Mark notification as read
    const notification = notificationsData.find(n => n.reportId === reportId);
    if (notification) {
        notification.read = true;
    }

    // Navigate to tracking page with report selected
    sessionStorage.setItem('selectedReportId', reportId);
    window.location.href = 'tracking.html';
}

/**
 * Mark all notifications as read
 */
function markAllAsRead() {
    notificationsData.forEach(notif => {
        notif.read = true;
    });
    renderNotifications();
    showAlert('Notifications', 'All notifications marked as read.', 'success');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', renderNotifications);
