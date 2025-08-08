const out = document.getElementById('output');
const scanBtn = document.getElementById('scanBtn');
const pathInput = document.getElementById('path');

function println(text = '') { out.textContent += text + "\n"; }
function clear() { out.textContent = ''; }

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function renderIssue(issue, idx) {
  const lineInfo = issue.line != null ? `:${issue.line}` : '';
  println(`[${issue.file_path}${lineInfo}] ${issue.severity.toUpperCase()} - ${issue.title}`);
  println(`  ${issue.description}`);
  if (issue.suggestion) println(`  Suggestion: ${issue.suggestion}`);
  if (issue.fix && issue.fix.before && issue.fix.after) {
    println(`  Fix available: use Apply Fix #${idx+1}`);
    println(`  Command: /apply ${issue.id}`);
  }
  println();
}

async function startScan() {
  clear();
  println('Starting scan...');
  try {
    const path = pathInput.value.trim();
    const data = await postJSON('/scan', { path, options: { reasoning: 'medium', temperature: 0.2 } });
    println(`Analyzed ${data.summary.num_files} files. Found ${data.summary.num_issues} issues.`);
    println();
    (data.issues || []).forEach((iss, idx) => renderIssue(iss, idx));
    println('Type "/apply <issue_id>" in the browser console to apply a fix.');
    window.__issues = data.issues;
  } catch (e) {
    println('Error: ' + e.message);
  }
}

async function applyFix(issueId) {
  println(`Applying fix for ${issueId}...`);
  try {
    const res = await postJSON('/apply_fix', { issue_id: issueId });
    println(`Fix applied for ${issueId}.`);
  } catch (e) {
    println('Apply error: ' + e.message);
  }
}

scanBtn.addEventListener('click', startScan);

// Expose command-like function in console
window.apply = applyFix;


