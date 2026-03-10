// Citizen Dashboard JavaScript

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireRole('citizen');
    await loadReports();
});

/**
 * Fetch and render reports from API
 */
async function loadReports() {
    const container = document.getElementById('recentReportsList');
    container.innerHTML = '<div style="text-align:center; padding: 2rem;">Loading reports...</div>';

    try {
        const response = await Auth.fetchWithAuth('/api/citizen/reports');
        if (!response.ok) throw new Error('Failed to fetch reports');

        const reports = await response.json();
        renderRecentReports(reports);
        updateStatusSummary(reports);

    } catch (error) {
        console.error('Load Error:', error);
        container.innerHTML = `<div style="text-align:center; color: #ff6b6b; padding: 2rem;">Error: ${error.message}</div>`;
    }
}

/**
 * Render recent reports list
 */
function renderRecentReports(reports) {
    const container = document.getElementById('recentReportsList');

    if (reports.length === 0) {
        container.innerHTML = '<div style="text-align:center; color: #888; padding: 2rem;">No reports found. Submit your first report!</div>';
        return;
    }

    container.innerHTML = reports.map(report => {
        // Map backend status to frontend classes/text
        const statusMap = {
            'submitted': { class: 'reported', text: 'Reported' },
            'approved': { class: 'reported', text: 'Verified' },
            'verified': { class: 'reported', text: 'Verified' }, // Fallback
            'assigned': { class: 'in-progress', text: 'Assigned' },
            'in-progress': { class: 'in-progress', text: 'In Progress' },
            'resolved': { class: 'completed', text: 'Completed' },
            'rejected': { class: 'completed', text: 'Rejected' }
        };

        const statusInfo = statusMap[report.status] || { class: 'reported', text: report.status };
        const dateStr = new Date(report.created_at).toLocaleDateString();

        return `
            <div class="report-card">
                <div class="report-card-info">
                    <div class="report-card-title">${report.damage_type || 'Infrastructure Issue'}</div>
                    <div class="report-card-meta">
                        📍 ${report.location || 'Unknown Location'} | 📅 ${dateStr}
                    </div>
                    <span class="status-chip status-${statusInfo.class}">${statusInfo.text}</span>
                </div>
                <div class="report-card-actions">
                    <button class="btn btn-secondary" onclick="viewReport('${report.id}')">
                        View Details
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Update Status Summary Chips
 */
function updateStatusSummary(reports) {
    // Include 'approved' (Verified) in Reported count as requested
    const reported = reports.filter(r => ['submitted', 'approved'].includes(r.status)).length;
    const inProgress = reports.filter(r => ['assigned', 'in-progress'].includes(r.status)).length;
    const completed = reports.filter(r => ['resolved', 'rejected'].includes(r.status)).length;

    // Update counts by ID to preserve HTML structure
    if (document.getElementById('reportedCount')) {
        document.getElementById('reportedCount').textContent = reported;
    }
    if (document.getElementById('inProgressCount')) {
        document.getElementById('inProgressCount').textContent = inProgress;
    }
    if (document.getElementById('completedCount')) {
        document.getElementById('completedCount').textContent = completed;
    }
}

/**
 * View report details
 */
function viewReport(reportId) {
    sessionStorage.setItem('selectedReportId', reportId);
    window.location.href = 'tracking.html';
}

window.viewReport = viewReport; // Make accessible globally
