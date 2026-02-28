import { createServer } from 'node:http';
import { getStatus, type Phase } from './status.js';
import { validateArtifacts } from './validator.js';
import { analyzeCoverage } from './coverage.js';
import { listRfcs } from './rfc.js';
import { listInvestigations } from './investigate.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function startDashboard(cwd: string, port: number, version: string): void {
  const server = createServer((req, res) => {
    if (req.url === '/api/data') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(collectData(cwd)));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(generateHtml(version));
  });

  server.listen(port, () => {
    console.log(`\n🌐 Dashboard running at http://localhost:${port}\n`);
    console.log(`   Press Ctrl+C to stop.\n`);
  });

  function shutdown() {
    console.log('\n  Shutting down dashboard...');
    server.close();
    process.exit(0);
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

function collectData(cwd: string) {
  const status = getStatus(cwd);
  const validation = validateArtifacts(cwd);
  const coverage = analyzeCoverage(cwd);
  const rfcs = listRfcs(cwd);
  const investigations = listInvestigations(cwd);

  // Count escalations
  const escDir = join(cwd, '.devkit', 'qa', 'escalations');
  let escalations: { id: string; level: string; status: string }[] = [];
  if (existsSync(escDir)) {
    escalations = readdirSync(escDir)
      .filter(f => f.startsWith('ESC-'))
      .map(f => {
        const content = readFileSync(join(escDir, f), 'utf-8');
        const levelMatch = content.match(/^ESCALATED_TO:\s*(.+)/m);
        const statusMatch = content.match(/^STATUS:\s*(.+)/m);
        return {
          id: f.replace('.md', ''),
          level: levelMatch?.[1]?.trim() ?? 'unknown',
          status: statusMatch?.[1]?.trim() ?? 'unknown',
        };
      });
  }

  return {
    status,
    validation: {
      total: validation.filesChecked,
      errors: validation.errors.length,
      errorList: validation.errors.slice(0, 10),
    },
    coverage: {
      percentage: coverage.percentage,
      covered: coverage.covered,
      partial: coverage.partial,
      uncovered: coverage.uncovered,
      total: coverage.totalInvariants,
      entries: coverage.entries,
    },
    rfcs,
    investigations,
    escalations,
  };
}

function generateHtml(version: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DevKit Dashboard</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  :root {
    --bg: #0a0a0f;
    --surface: #12121a;
    --surface2: #1a1a25;
    --border: #2a2a3a;
    --text: #e0e0e8;
    --text-dim: #8888a0;
    --accent: #6c5ce7;
    --accent-glow: rgba(108, 92, 231, 0.15);
    --green: #00cc88;
    --yellow: #ffbe0b;
    --red: #ff5555;
    --blue: #4fc3f7;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }

  .header {
    padding: 28px 40px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 16px;
    background: linear-gradient(135deg, var(--surface) 0%, rgba(108, 92, 231, 0.05) 100%);
  }

  .header h1 {
    font-size: 24px;
    font-weight: 600;
    background: linear-gradient(135deg, #6c5ce7, #a29bfe);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .header .version {
    background: var(--accent-glow);
    border: 1px solid rgba(108, 92, 231, 0.3);
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 12px;
    color: #a29bfe;
  }

  .header .refresh {
    margin-left: auto;
    font-size: 13px;
    color: var(--text-dim);
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
    padding: 28px 40px;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    transition: border-color 0.2s;
  }

  .card:hover { border-color: rgba(108, 92, 231, 0.4); }

  .card-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-dim);
    margin-bottom: 16px;
    font-weight: 600;
  }

  .card.wide { grid-column: span 2; }
  .card.full { grid-column: span 3; }

  /* Phase Progress */
  .phases { display: flex; gap: 8px; align-items: center; }
  .phase {
    flex: 1;
    text-align: center;
    padding: 12px 8px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    position: relative;
  }
  .phase.done { background: rgba(0, 204, 136, 0.1); color: var(--green); border: 1px solid rgba(0, 204, 136, 0.2); }
  .phase.current { background: var(--accent-glow); color: #a29bfe; border: 1px solid rgba(108, 92, 231, 0.4); animation: pulse 2s infinite; }
  .phase.pending { background: var(--surface2); color: var(--text-dim); border: 1px solid var(--border); }
  .phase-arrow { color: var(--text-dim); font-size: 18px; }

  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(108, 92, 231, 0.3); }
    50% { box-shadow: 0 0 12px 4px rgba(108, 92, 231, 0.15); }
  }

  /* Stats */
  .stats { display: flex; gap: 24px; }
  .stat-value { font-size: 36px; font-weight: 700; }
  .stat-label { font-size: 12px; color: var(--text-dim); margin-top: 4px; }
  .stat-value.green { color: var(--green); }
  .stat-value.yellow { color: var(--yellow); }
  .stat-value.red { color: var(--red); }

  /* Coverage Bar */
  .coverage-bar-container { margin: 12px 0; }
  .coverage-bar {
    height: 8px;
    background: var(--surface2);
    border-radius: 4px;
    overflow: hidden;
  }
  .coverage-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.5s ease;
  }
  .coverage-pct { font-size: 32px; font-weight: 700; margin-bottom: 4px; }

  /* Items list */
  .items { display: flex; flex-direction: column; gap: 8px; }
  .item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px;
    background: var(--surface2);
    border-radius: 8px;
    font-size: 13px;
  }
  .item-icon { font-size: 16px; }
  .item-id { font-weight: 600; color: var(--blue); min-width: 60px; }
  .item-text { flex: 1; color: var(--text); }
  .item-status {
    padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500;
  }
  .item-status.open { background: rgba(255, 190, 11, 0.15); color: var(--yellow); }
  .item-status.accepted, .item-status.resolved { background: rgba(0, 204, 136, 0.15); color: var(--green); }

  /* Coverage entries */
  .cov-entry {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 12px;
    background: var(--surface2);
    border-radius: 8px;
    font-size: 13px;
  }
  .cov-entry.covered { border-left: 3px solid var(--green); }
  .cov-entry.partial { border-left: 3px solid var(--yellow); }
  .cov-entry.uncovered { border-left: 3px solid var(--red); }
  .cov-entry .tests { color: var(--text-dim); font-size: 11px; margin-left: auto; }

  /* Validation errors */
  .error-item {
    padding: 10px 12px;
    background: rgba(255, 85, 85, 0.05);
    border-left: 3px solid var(--red);
    border-radius: 0 8px 8px 0;
    font-size: 13px;
    margin-bottom: 6px;
  }
  .error-file { color: var(--blue); font-weight: 500; }
  .error-msg { color: var(--text); margin-top: 4px; }
  .error-fix { color: var(--green); font-size: 12px; margin-top: 2px; }

  .empty { color: var(--text-dim); font-style: italic; font-size: 13px; }

  /* Escalation flow */
  .flow { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .flow-node {
    padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500;
  }
  .flow-node.speckit { background: rgba(79, 195, 247, 0.15); color: var(--blue); }
  .flow-node.archkit { background: rgba(108, 92, 231, 0.15); color: #a29bfe; }
  .flow-node.productkit { background: rgba(255, 190, 11, 0.15); color: var(--yellow); }
  .flow-node.researchkit { background: rgba(0, 204, 136, 0.15); color: var(--green); }
</style>
</head>
<body>
  <div class="header">
    <h1>⬡ DevKit Dashboard</h1>
    <span class="version">v${version}</span>
    <span class="refresh" id="refresh-time">Loading...</span>
  </div>

  <div class="grid" id="content">
    <div class="card full" style="text-align:center; padding: 60px;">
      <div style="font-size: 24px; margin-bottom: 12px;">⏳</div>
      <div style="color: var(--text-dim);">Loading dashboard...</div>
    </div>
  </div>

<script>
async function loadData() {
  const res = await fetch('/api/data');
  const data = await res.json();
  render(data);
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function render(d) {
  const s = d.status;
  const phases = ['research', 'product', 'arch', 'spec', 'qa'];
  const labels = { research: 'Research', product: 'Product', arch: 'Arch', spec: 'Spec', qa: 'QA' };

  // Phase statuses — phaseProgress is a Record<phase, status>
  const phaseMap = s ? (s.phaseProgress || {}) : {};

  const phaseHtml = phases.map(p => {
    const st = phaseMap[p] || 'pending';
    const cls = st === 'done' ? 'done' : (s && s.phase === p) ? 'current' : 'pending';
    const icon = st === 'done' ? '✅' : (s && s.phase === p) ? '◆' : '○';
    return '<div class="phase ' + cls + '">' + icon + ' ' + labels[p] + 'Kit</div>';
  }).join('<span class="phase-arrow">→</span>');

  // Coverage color
  const pct = Number(d.coverage.percentage) || 0;
  const covColor = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';

  // Coverage entries
  const covHtml = d.coverage.entries.map(e => {
    const tests = e.coveredBy.length > 0 ? esc(e.coveredBy.join(', ')) : 'none';
    return '<div class="cov-entry ' + esc(e.status) + '">' +
      '<span>' + (e.status === 'covered' ? '✅' : e.status === 'partial' ? '🟡' : '❌') + '</span>' +
      '<span>' + esc(e.invariant) + '</span>' +
      '<span class="tests">' + tests + '</span></div>';
  }).join('') || '<div class="empty">No invariants found</div>';

  // RFCs
  const rfcHtml = d.rfcs.map(r => {
    const title = r.title.replace(r.id + ': ', '');
    return '<div class="item"><span class="item-id">' + esc(r.id) + '</span>' +
      '<span class="item-text">' + esc(title) + '</span>' +
      '<span class="item-status ' + esc(r.status) + '">' + esc(r.status) + '</span></div>';
  }).join('') || '<div class="empty">No RFCs created</div>';

  // Investigations
  const invHtml = d.investigations.map(i => {
    const title = i.title.replace(i.id + ': ', '');
    return '<div class="item"><span class="item-id">' + esc(i.id) + '</span>' +
      '<span class="item-text">' + esc(title) + '</span>' +
      '<span class="item-status ' + esc(i.status) + '">' + esc(i.status) + '</span></div>';
  }).join('') || '<div class="empty">No investigations</div>';

  // Escalations
  const escHtml = d.escalations.map(e =>
    '<div class="item"><span class="item-id">' + esc(e.id) + '</span>' +
    '<span class="flow-node ' + esc(e.level) + '">' + esc(e.level) + '</span>' +
    '<span class="item-status ' + esc(e.status) + '">' + esc(e.status) + '</span></div>'
  ).join('') || '<div class="empty">No escalations</div>';

  // Validation errors
  const errHtml = d.validation.errorList.map(e =>
    '<div class="error-item"><div class="error-file">' + esc(e.file) + ':' + esc(e.line) + '</div>' +
    '<div class="error-msg">' + esc(e.message) + '</div>' +
    '<div class="error-fix">Fix: ' + esc(e.fix) + '</div></div>'
  ).join('') || '<div class="empty" style="color: var(--green);">✅ All artifacts valid</div>';

  document.getElementById('content').innerHTML =
    // Row 1: Phase progress
    '<div class="card full"><div class="card-title">Phase Progress</div><div class="phases">' + phaseHtml + '</div></div>' +

    // Row 2: Stats + Coverage + Validation
    '<div class="card"><div class="card-title">Overview</div><div class="stats">' +
      '<div><div class="stat-value green">' + esc(d.coverage.covered) + '</div><div class="stat-label">Covered</div></div>' +
      '<div><div class="stat-value yellow">' + esc(d.coverage.partial) + '</div><div class="stat-label">Partial</div></div>' +
      '<div><div class="stat-value red">' + esc(d.coverage.uncovered) + '</div><div class="stat-label">Uncovered</div></div>' +
    '</div></div>' +

    '<div class="card"><div class="card-title">Coverage</div>' +
      '<div class="coverage-pct" style="color:' + covColor + '">' + pct + '%</div>' +
      '<div class="coverage-bar-container"><div class="coverage-bar"><div class="coverage-fill" style="width:' + pct + '%; background:' + covColor + '"></div></div></div>' +
      '<div class="stat-label">' + esc(d.coverage.covered) + ' of ' + esc(d.coverage.total) + ' invariants fully tested</div></div>' +

    '<div class="card"><div class="card-title">Validation</div>' +
      '<div class="stat-value ' + (d.validation.errors > 0 ? 'red' : 'green') + '">' + esc(d.validation.errors) + '</div>' +
      '<div class="stat-label">errors in ' + esc(d.validation.total) + ' artifacts</div></div>' +

    // Row 3: Coverage + Errors
    '<div class="card wide"><div class="card-title">Invariant Coverage Map</div><div class="items">' + covHtml + '</div></div>' +
    '<div class="card"><div class="card-title">Validation Errors</div>' + errHtml + '</div>' +

    // Row 4: RFCs + Investigations + Escalations
    '<div class="card"><div class="card-title">📋 RFCs</div><div class="items">' + rfcHtml + '</div></div>' +
    '<div class="card"><div class="card-title">🔬 Investigations</div><div class="items">' + invHtml + '</div></div>' +
    '<div class="card"><div class="card-title">🚨 Escalations</div><div class="items">' + escHtml + '</div></div>';

  document.getElementById('refresh-time').textContent = 'Last: ' + new Date().toLocaleTimeString() + ' · Auto-refresh 5s';
}

loadData();
setInterval(loadData, 5000);
</script>
</body>
</html>`;
}
