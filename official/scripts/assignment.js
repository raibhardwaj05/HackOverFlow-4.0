// =====================================================
// OFFICIAL AUTH GUARD
// =====================================================
Auth.requireRole('official');

// =====================================================
// GET REPORT ID
// assignment.html?id=12
// =====================================================
const params = new URLSearchParams(window.location.search);
const reportId = params.get('id');

if (!reportId) {
    showModal('Error', 'No approved report selected');
    throw new Error('Missing report ID');
}

// =====================================================
// GLOBAL STATE
// =====================================================
let reportData = null;
let contractors = [];

// =====================================================
// LOAD INITIAL DATA
// =====================================================
async function initAssignment() {
    try {
        await loadReport();
        await loadContractors();
        setDefaultDate();
        bindPreviewUpdates();
        updatePreview();
    } catch (err) {
        showModal('Error', err.message);
    }
}

// =====================================================
// LOAD APPROVED REPORT
// =====================================================
async function loadReport() {
    const res = await Auth.fetchWithAuth(
        `/api/official/reports/${reportId}`
    );

    if (!res.ok) {
        throw new Error('Failed to load report');
    }

    const report = await res.json();

    if (report.status !== 'APPROVED') {
        throw new Error('Only approved reports can be assigned');
    }

    reportData = report;
    renderReportDetails(report);
}

// =====================================================
// LOAD CONTRACTORS
// =====================================================
async function loadContractors() {
    const res = await Auth.fetchWithAuth('/api/official/contractors');

    if (!res.ok) {
        throw new Error('Failed to load contractors');
    }

    contractors = await res.json();
    populateContractorSelect();
}

// =====================================================
// RENDER REPORT DETAILS
// =====================================================
function renderReportDetails(report) {
    document.getElementById('reportDetails').innerHTML = `
        <div class="report-detail-row"><strong>Report ID:</strong> ${report.id}</div>
        <div class="report-detail-row"><strong>Location:</strong> ${report.location}</div>
        <div class="report-detail-row"><strong>Damage Type:</strong> ${report.damage_type}</div>
        <div class="report-detail-row"><strong>Severity:</strong> ${report.severity}</div>
        <div class="report-detail-row"><strong>Confidence:</strong> ${(report.confidence * 100).toFixed(2)}%</div>
    `;
}

// =====================================================
// CONTRACTOR SELECT
// =====================================================
function populateContractorSelect() {
    const select = document.getElementById('contractorSelect');

    contractors.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.specialization}) ⭐ ${c.rating}`;
        select.appendChild(opt);
    });
}

// =====================================================
// DEFAULT DATE
// =====================================================
function setDefaultDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    document.getElementById('completionDate').valueAsDate = date;
}

// =====================================================
// PREVIEW UPDATES
// =====================================================
function bindPreviewUpdates() {
    ['contractorSelect', 'prioritySelect', 'completionDate', 'instructionsInput']
        .forEach(id => {
            document.getElementById(id).addEventListener('change', updatePreview);
            document.getElementById(id).addEventListener('input', updatePreview);
        });
}

function updatePreview() {
    if (!reportData) return;

    const contractorId = document.getElementById('contractorSelect').value;
    const priority = document.getElementById('prioritySelect').value;
    const completionDate = document.getElementById('completionDate').value;
    const instructions = document.getElementById('instructionsInput').value;

    const contractor = contractors.find(c => c.id == contractorId);

    document.getElementById('workOrderPreview').textContent = `
WORK ORDER
========================================
Report ID: ${reportData.id}
Damage Type: ${reportData.damage_type}
Location: ${reportData.location}

----------------------------------------
Contractor: ${contractor ? contractor.name : '[Not Selected]'}
Priority: ${priority}
Expected Completion: ${completionDate || '[Not Set]'}

----------------------------------------
Special Instructions:
${instructions || 'None'}

========================================
    `.trim();
}

// =====================================================
// ASSIGN WORK ORDER
// =====================================================
async function assignWork() {
    const contractorId = document.getElementById('contractorSelect').value;
    const priority = document.getElementById('prioritySelect').value;
    const completionDate = document.getElementById('completionDate').value;
    const instructions = document.getElementById('instructionsInput').value;

    if (!contractorId || !completionDate) {
        showModal('Validation Error', 'Contractor and completion date are required');
        return;
    }

    try {
        const res = await Auth.fetchWithAuth(
            `/api/official/reports/${reportId}/assign`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contractor_id: contractorId,
                    priority: priority,
                    expected_completion: completionDate,
                    instructions: instructions
                })
            }
        );

        if (!res.ok) {
            throw new Error('Assignment failed');
        }

        showModal(
            'Success',
            'Work order assigned successfully',
            'success'
        );

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (err) {
        showModal('Error', err.message);
    }
}

// =====================================================
// CANCEL
// =====================================================
function cancelAssignment() {
    window.location.href = 'dashboard.html';
}

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', initAssignment);
