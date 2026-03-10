// Work Monitoring Screen JavaScript

// Dummy work orders data
// Data fetched from API
let workOrdersData = [];

let currentWork = null;

/**
 * Initialize monitoring page
 */
async function initMonitoring() {
    Auth.requireRole('official');
    await fetchWorkOrders();
    populateWorkSelector();
    renderActiveWorks();
}

async function fetchWorkOrders() {
    try {
        const response = await Auth.fetchWithAuth('/api/official/work-reports');
        if (response.ok) {
            const data = await response.json();
            // Transform
            workOrdersData = data.map(r => ({
                id: r.id,
                reportId: r.id, // Using Work ID as report ID ref for now
                location: r.location,
                contractor: (r.contractor && r.contractor.name) || 'Not Assigned',
                status: r.status === 'Pending Verification' ? 'pending' : 'in-progress',
                statusText: r.status,
                assignedDate: r.date,
                expectedCompletion: 'TBD',
                beforePhoto: 'https://via.placeholder.com/600x400/cccccc/ffffff?text=No+Image', // Placeholder for now
                afterPhoto: null,
                logs: []
            }));
        }
    } catch (e) {
        console.error("Fetch Error", e);
    }
}

/**
 * Populate work selector
 */
function populateWorkSelector() {
    const selector = document.getElementById('workSelector');
    workOrdersData.forEach(work => {
        const option = document.createElement('option');
        option.value = work.id;
        option.textContent = `${work.id} - ${work.location} (${work.statusText})`;
        selector.appendChild(option);
    });
}

/**
 * Load work details
 */
function loadWorkDetails() {
    const workId = document.getElementById('workSelector').value;
    if (!workId) {
        document.getElementById('workDetails').style.display = 'none';
        return;
    }

    currentWork = workOrdersData.find(w => w.id === workId);
    if (!currentWork) return;

    // Show work details section
    document.getElementById('workDetails').style.display = 'block';

    // Render status indicator
    renderStatusIndicator();

    // Render photos
    renderPhotos();

    // Render logs
    renderLogs();

    // Show/hide mark completed button
    if (currentWork.status === 'in-progress') {
        document.getElementById('markCompletedBtn').style.display = 'inline-block';
    } else {
        document.getElementById('markCompletedBtn').style.display = 'none';
    }
}

/**
 * Render status indicator
 */
function renderStatusIndicator() {
    const indicator = document.getElementById('workStatusIndicator');
    indicator.innerHTML = `
        <div class="status-badge status-${currentWork.status}">${currentWork.statusText}</div>
        <div style="margin-top: 1rem;">
            <p><strong>Work Order ID:</strong> ${currentWork.id}</p>
            <p><strong>Report ID:</strong> ${currentWork.reportId}</p>
            <p><strong>Contractor:</strong> ${currentWork.contractor}</p>
            <p><strong>Assigned Date:</strong> ${currentWork.assignedDate}</p>
            <p><strong>Expected Completion:</strong> ${currentWork.expectedCompletion}</p>
        </div>
    `;
}

/**
 * Render photos
 */
function renderPhotos() {
    document.getElementById('beforePhoto').src = currentWork.beforePhoto;

    if (currentWork.afterPhoto) {
        document.getElementById('afterPhoto').src = currentWork.afterPhoto;
    } else {
        document.getElementById('afterPhoto').src = 'https://via.placeholder.com/600x400/cccccc/666666?text=Not+Available+Yet';
    }
}

/**
 * Render logs
 */
function renderLogs() {
    const container = document.getElementById('logsContainer');
    container.innerHTML = currentWork.logs.map(log => `
        <div class="log-entry">
            <div class="log-entry-header">
                <span>🕐 ${log.timestamp}</span>
                <span>📍 ${log.location}</span>
            </div>
            <div class="log-entry-details">
                <strong>Action:</strong> ${log.action}<br>
                <strong>Contractor:</strong> ${log.contractor}
            </div>
        </div>
    `).join('');
}

/**
 * Render active works grid
 */
function renderActiveWorks() {
    const grid = document.getElementById('worksGrid');
    grid.innerHTML = workOrdersData.map(work => `
        <div class="work-card" onclick="selectWork('${work.id}')">
            <div class="work-card-header">
                <div class="work-card-title">${work.id}</div>
                <span class="status-chip status-${work.status}">${work.statusText}</span>
            </div>
            <div class="work-card-meta">
                <strong>Report:</strong> ${work.reportId}<br>
                <strong>Location:</strong> ${work.location}<br>
                <strong>Contractor:</strong> ${work.contractor}<br>
                <strong>Expected:</strong> ${work.expectedCompletion}
            </div>
        </div>
    `).join('');
}

/**
 * Select work from grid
 */
function selectWork(workId) {
    document.getElementById('workSelector').value = workId;
    loadWorkDetails();
    document.getElementById('workSelector').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Mark work as completed
 */
function markCompleted() {
    if (!currentWork) return;

    showConfirm('Confirm Completion', `Mark work order ${currentWork.id} as completed?`, () => {
        // In a real app, send completion to backend
        showAlert('Work Completed', `Work order ${currentWork.id} has been marked as completed.\n\nRedirecting to dashboard...`, 'success', () => {
            // Update status
            currentWork.status = 'completed';
            currentWork.statusText = 'Completed';

            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        });
    });
}

/**
 * Flag issue
 */
function flagIssue() {
    if (!currentWork) return;

    showPrompt('Flag Issue', 'Please describe the issue:', 'Enter issue description...', (reason) => {
        if (reason) {
            showAlert('Issue Flagged', `Issue flagged for work order ${currentWork.id}.\n\nReason: ${reason}\n\nThis will be reviewed by the supervisor.`, 'warning');
        }
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initMonitoring);
