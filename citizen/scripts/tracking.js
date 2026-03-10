// Tracking Screen JavaScript

// Dummy reports data
// Data fetched from API
let allReportsData = [];

let currentReport = null;

/**
/**
 * Initialize tracking page
 */
async function initTracking() {
    // Fetch reports from API
    try {
        const response = await Auth.fetchWithAuth('/api/citizen/reports');
        if (response.ok) {
            const apiData = await response.json();

            // Transform API data to frontend model
            allReportsData = apiData.map(r => {
                // Determine timeline state based on status
                const steps = ['submitted', 'approved', 'assigned', 'in-progress', 'resolved'];
                const labels = ['Reported', 'Verified', 'Assigned', 'In Progress', 'Completed'];

                let currentStageIndex = steps.indexOf(r.status);
                if (currentStageIndex === -1 && r.status === 'rejected') currentStageIndex = 0; // Treat rejected as just reported for now
                if (currentStageIndex === -1) currentStageIndex = 0;

                const timeline = labels.map((label, idx) => ({
                    step: label,
                    date: idx <= currentStageIndex ? (idx === 0 ? new Date(r.created_at).toLocaleString() : 'Done') : null,
                    completed: idx < currentStageIndex,
                    active: idx === currentStageIndex
                }));

                return {
                    id: r.id,
                    location: r.location,
                    date: new Date(r.created_at).toLocaleDateString(),
                    status: r.status,
                    statusText: r.status.charAt(0).toUpperCase() + r.status.slice(1),
                    image: r.image_url,
                    department: {
                        name: 'Public Works Department',
                        contact: 'help@pwd.gov',
                        phone: '12345 67899'
                    },
                    timeline: timeline,
                    repairPhotos: [] // Populate if available from API
                };
            });
        }
    } catch (e) {
        console.error("Failed to load reports", e);
    }

    // Render all reports table
    renderAllReportsTable();

    // Check if a report was selected from dashboard
    const selectedReportId = sessionStorage.getItem('selectedReportId');
    if (selectedReportId) {
        selectReport(selectedReportId);
        sessionStorage.removeItem('selectedReportId');
    }
}

/**
 * Load report details
 */
function loadReportDetails() {
    if (!currentReport) return;

    // Toggle views
    document.getElementById('reportsList').style.display = 'none';
    document.getElementById('reportDetails').style.display = 'block';

    // Render timeline
    renderTimeline();

    // Set report image (Before)
    document.getElementById('reportImage').src = currentReport.image;

    // Set After image placehoder
    const afterContainer = document.getElementById('afterImageContainer');
    if (['resolved', 'completed'].includes(currentReport.status) && currentReport.repairPhotos && currentReport.repairPhotos.length > 0) {
        // Assume first repair photo for now
        afterContainer.innerHTML = `<img src="${currentReport.repairPhotos[0].url}" class="image-preview" style="margin-top:0; height: 100%; object-fit: cover;">`;
    } else {
        afterContainer.innerHTML = 'Repair Pending';
    }

    // Set department info
    renderDepartmentInfo();

    // Hide old repair photos section logic for now, using the side-by-side view instead
    const oldRepairSection = document.getElementById('repairPhotosSection');
    if (oldRepairSection) oldRepairSection.style.display = 'none';
    const viewEvidenceBtn = document.getElementById('viewEvidenceBtn');
    if (viewEvidenceBtn) viewEvidenceBtn.style.display = 'none';
}

/**
 * Render status timeline
 */
function renderTimeline() {
    const timelineContainer = document.getElementById('statusTimeline');
    timelineContainer.innerHTML = currentReport.timeline.map((item, index) => {
        let className = 'timeline-item';
        if (item.completed) className += ' completed';
        if (item.active) className += ' active';

        return `
            <div class="${className}">
                <div class="timeline-content">
                    <strong>${item.step}</strong>
                    ${item.date ? `<div class="timeline-date">${item.date}</div>` : '<div class="timeline-date">Pending</div>'}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render department information
 */
function renderDepartmentInfo() {
    const deptInfo = document.getElementById('departmentInfo');
    deptInfo.innerHTML = `
        <div class="department-detail">
            <strong>Department:</strong> ${currentReport.department.name}
        </div>
        <div class="department-detail">
            <strong>Email:</strong> ${currentReport.department.contact}
        </div>
        <div class="department-detail">
            <strong>Phone:</strong> ${currentReport.department.phone}
        </div>
    `;
}

/**
 * Render repair photos
 */
function renderRepairPhotos() {
    const grid = document.getElementById('repairPhotosGrid');
    grid.innerHTML = currentReport.repairPhotos.map(photo => `
        <div class="repair-photo-card">
            <img src="${photo.url}" alt="${photo.label}">
            <div class="photo-label">${photo.label}</div>
        </div>
    `).join('');
}

/**
/**
 * Close report details
 */
function closeReportDetails() {
    document.getElementById('reportDetails').style.display = 'none';
    document.getElementById('reportsList').style.display = 'block';
    currentReport = null;
}

/**
 * View evidence
 */
function viewEvidence() {
    if (!currentReport || currentReport.repairPhotos.length === 0) return;
    // Scroll to repair photos section
    document.getElementById('repairPhotosSection').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Render all reports table
 */
function renderAllReportsTable() {
    const tbody = document.getElementById('allReportsTable');
    tbody.innerHTML = allReportsData.map(report => `
        <tr>
            <td>${report.id}</td>
            <td>${report.location}</td>
            <td>${report.date}</td>
            <td><span class="status-chip status-${report.status}">${report.statusText}</span></td>
            <td>
                <button class="btn btn-secondary" onclick="selectReport('${report.id}')">View</button>
            </td>
        </tr>
    `).join('');
}

/**
 * Select report by ID
 */
function selectReport(reportId) {
    // Ensure loose comparison for ID (string vs number)
    currentReport = allReportsData.find(r => String(r.id) === String(reportId));
    if (currentReport) {
        loadReportDetails();
    } else {
        console.warn(`Report ${reportId} not found in loaded data`);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initTracking);
