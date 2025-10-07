// DOM elements
const scanBtn = document.getElementById('scanBtn');
const pathInput = document.getElementById('path');
const reasoningSelect = document.getElementById('reasoning');
const extensionsSelect = document.getElementById('extensions');
const customExtensionsDiv = document.getElementById('customExtensions');
const customExtInput = document.getElementById('customExtInput');
const loadingDiv = document.getElementById('loading');
const welcomeMessage = document.getElementById('welcomeMessage');
const resultsSummary = document.getElementById('resultsSummary');
const issuesContainer = document.getElementById('issuesContainer');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// State
let currentIssues = [];
let isScanning = false;

// Utility functions
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function updateStatus(status, type = 'ready') {
  statusText.textContent = status;
  statusDot.className = `status-dot ${type}`;
}

function showLoading() {
  loadingDiv.style.display = 'flex';
  welcomeMessage.style.display = 'none';
  resultsSummary.style.display = 'none';
  issuesContainer.innerHTML = '';
}

function hideLoading() {
  loadingDiv.style.display = 'none';
}

function updateSummary(summary) {
  document.getElementById('filesScanned').textContent = summary.num_files || 0;
  document.getElementById('criticalIssues').textContent = summary.by_severity?.critical || 0;
  document.getElementById('highIssues').textContent = summary.by_severity?.high || 0;
  document.getElementById('mediumIssues').textContent = summary.by_severity?.medium || 0;
  document.getElementById('lowIssues').textContent = summary.by_severity?.low || 0;
  
  resultsSummary.style.display = 'block';
}

function renderIssue(issue) {
  const severityClass = issue.severity?.toLowerCase() || 'medium';
  const lineInfo = issue.line ? `:${issue.line}` : '';
  const cweInfo = issue.cwe_id ? ` (${issue.cwe_id})` : '';
  
  return `
    <div class="issue-card">
      <div class="issue-header">
        <div>
          <div class="issue-title">${escapeHtml(issue.title)}${cweInfo}</div>
          <div class="issue-file">${escapeHtml(issue.file_path)}${lineInfo}</div>
        </div>
        <span class="issue-severity ${severityClass}">${severityClass}</span>
      </div>
      
      <div class="issue-description">${escapeHtml(issue.description)}</div>
      
      ${issue.suggestion ? `
        <div class="issue-suggestion">
          <strong>Suggestion:</strong>
          ${escapeHtml(issue.suggestion)}
        </div>
      ` : ''}
      
      ${issue.owasp_category ? `
        <div class="issue-suggestion">
          <strong>OWASP Category:</strong>
          ${escapeHtml(issue.owasp_category)}
        </div>
      ` : ''}
      
      ${issue.compliance_impact && issue.compliance_impact.length > 0 ? `
        <div class="issue-suggestion">
          <strong>Compliance Impact:</strong>
          ${issue.compliance_impact.map(impact => escapeHtml(impact.framework + ': ' + impact.description)).join(', ')}
        </div>
      ` : ''}
      
      <div class="issue-actions">
        ${issue.fix && issue.fix.before && issue.fix.after ? `
          <button class="btn btn-primary" onclick="applyFix('${issue.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            Apply Fix
          </button>
        ` : ''}
        <button class="btn btn-secondary" onclick="copyIssueInfo('${issue.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          </svg>
          Copy Info
        </button>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderResults(data) {
  hideLoading();
  
  if (data.issues && data.issues.length > 0) {
    updateSummary({
      num_files: data.summary.num_files,
      by_severity: data.issues.reduce((acc, issue) => {
        const severity = issue.severity || 'medium';
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      }, {})
    });
    
    issuesContainer.innerHTML = data.issues.map(issue => renderIssue(issue)).join('');
    currentIssues = data.issues;
  } else {
    issuesContainer.innerHTML = `
      <div class="welcome-message">
        <div class="welcome-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"/>
            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
            <path d="M13 12h3"/>
            <path d="M8 12h3"/>
          </svg>
        </div>
        <h4>No Issues Found</h4>
        <p>Great! No security vulnerabilities were detected in the scanned code.</p>
      </div>
    `;
    resultsSummary.style.display = 'none';
  }
}

async function startScan() {
  if (isScanning) return;
  
  const path = pathInput.value.trim();
  if (!path) {
    alert('Please enter a path to scan');
    return;
  }
  
  isScanning = true;
  scanBtn.disabled = true;
  scanBtn.innerHTML = `
    <div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
    Scanning...
  `;
  
  updateStatus('Scanning...', 'scanning');
  showLoading();
  
  try {
    const extensions = getFileExtensions();
    const options = {
      reasoning: reasoningSelect.value,
      temperature: 0.2,
      include_exts: extensions,
      max_file_mb: 1.5
    };
    
    const data = await postJSON('/scan', { path, options });
    renderResults(data);
    updateStatus('Scan Complete', 'success');
    
    // Store issues for console access
    window.__issues = data.issues || [];
    
  } catch (error) {
    hideLoading();
    issuesContainer.innerHTML = `
      <div class="welcome-message">
        <div class="welcome-icon" style="color: var(--error-color);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h4>Scan Error</h4>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
    updateStatus('Error', 'error');
  } finally {
    isScanning = false;
    scanBtn.disabled = false;
    scanBtn.innerHTML = `
      <svg class="scan-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
      Start Security Scan
    `;
  }
}

function getFileExtensions() {
  const extensionValue = extensionsSelect.value;
  
  switch (extensionValue) {
    case 'python':
      return ['.py'];
    case 'web':
      return ['.js', '.jsx', '.ts', '.tsx'];
    case 'custom':
      const customExts = customExtInput.value.split(',').map(ext => ext.trim()).filter(ext => ext);
      return customExts.length > 0 ? customExts : ['.py', '.js', '.ts'];
    case 'all':
    default:
      return ['.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.go', '.sol'];
  }
}

async function applyFix(issueId) {
  const issue = currentIssues.find(i => i.id === issueId);
  if (!issue) {
    alert('Issue not found');
    return;
  }
  
  if (!confirm(`Apply fix for: ${issue.title}?`)) {
    return;
  }
  
  try {
    updateStatus('Applying fix...', 'scanning');
    const result = await postJSON('/apply_fix', { issue_id: issueId });
    
    if (result.status === 'applied') {
      updateStatus('Fix Applied', 'success');
      alert('Fix applied successfully!');
      // Refresh the scan to show updated results
      setTimeout(() => startScan(), 1000);
    } else {
      throw new Error(result.reason || 'Fix could not be applied');
    }
  } catch (error) {
    updateStatus('Fix Failed', 'error');
    alert(`Failed to apply fix: ${error.message}`);
  }
}

function copyIssueInfo(issueId) {
  const issue = currentIssues.find(i => i.id === issueId);
  if (!issue) {
    alert('Issue not found');
    return;
  }
  
  const info = `
Issue: ${issue.title}
Severity: ${issue.severity}
File: ${issue.file_path}${issue.line ? `:${issue.line}` : ''}
Description: ${issue.description}
${issue.suggestion ? `Suggestion: ${issue.suggestion}` : ''}
${issue.cwe_id ? `CWE: ${issue.cwe_id}` : ''}
${issue.owasp_category ? `OWASP: ${issue.owasp_category}` : ''}
  `.trim();
  
  navigator.clipboard.writeText(info).then(() => {
    alert('Issue information copied to clipboard');
  }).catch(() => {
    alert('Failed to copy to clipboard');
  });
}

// Event listeners
scanBtn.addEventListener('click', startScan);

extensionsSelect.addEventListener('change', (e) => {
  if (e.target.value === 'custom') {
    customExtensionsDiv.style.display = 'flex';
  } else {
    customExtensionsDiv.style.display = 'none';
  }
});

// Enter key support
pathInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    startScan();
  }
});

// Expose functions for console access
window.applyFix = applyFix;
window.startScan = startScan;
window.copyIssueInfo = copyIssueInfo;

// Initialize
updateStatus('Ready', 'ready');


