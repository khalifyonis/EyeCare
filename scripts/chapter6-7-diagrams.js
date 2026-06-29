/** Chart/diagram HTML for Chapters 6 & 7 */

function barChartHtml(title, labels, values, colors, maxVal) {
  const bars = labels.map((lbl, i) => {
    const pct = Math.round((values[i] / maxVal) * 100);
    const h = Math.max(20, Math.round(pct * 1.6));
    return `<div class="bar-group"><div class="bar" style="height:${h}px;background:${colors[i]}"></div><div class="bar-val">${values[i]}${values[i] <= 5 ? '/5' : '%'}</div><div class="bar-lbl">${lbl}</div></div>`;
  }).join('');
  return `<!DOCTYPE html><html><head><style>
    body{font-family:Arial;background:#fff;padding:24px;margin:0}
    h2{text-align:center;font-size:14px;color:#1e293b;margin-bottom:20px}
    .chart{display:flex;align-items:flex-end;justify-content:center;gap:24px;height:220px;padding-bottom:40px;border-bottom:2px solid #e2e8f0;position:relative}
    .bar-group{text-align:center;width:70px}
    .bar{width:48px;margin:0 auto;border-radius:4px 4px 0 0;transition:height .3s}
    .bar-val{font-size:11px;font-weight:700;color:#1e293b;margin-top:4px}
    .bar-lbl{font-size:9px;color:#64748b;margin-top:2px;line-height:1.2}
  </style></head><body><h2>${title}</h2><div class="chart">${bars}</div></body></html>`;
}

function pieChartHtml(title, segments) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  let cum = 0;
  const gradients = segments.map((s) => {
    const start = (cum / total) * 360;
    cum += s.value;
    const end = (cum / total) * 360;
    return `${s.color} ${start}deg ${end}deg`;
  }).join(', ');
  const legend = segments.map((s) =>
    `<div class="leg"><span class="dot" style="background:${s.color}"></span>${s.label}: ${s.value}%</div>`
  ).join('');
  return `<!DOCTYPE html><html><head><style>
    body{font-family:Arial;background:#fff;padding:24px;display:flex;flex-direction:column;align-items:center}
    h2{font-size:14px;color:#1e293b;margin-bottom:16px}
    .pie{width:160px;height:160px;border-radius:50%;background:conic-gradient(${gradients});margin-bottom:16px}
    .leg{font-size:11px;color:#475569;margin:3px 0;display:flex;align-items:center;gap:6px}
    .dot{width:10px;height:10px;border-radius:50%;display:inline-block}
  </style></head><body><h2>${title}</h2><div class="pie"></div>${legend}</body></html>`;
}

function comparisonRadarHtml() {
  return `<!DOCTYPE html><html><head><style>
    body{font-family:Arial;background:#fff;padding:20px;text-align:center}
    h2{font-size:14px;color:#1e293b;margin-bottom:16px}
    table{border-collapse:collapse;margin:0 auto;font-size:10px}
    th,td{border:1px solid #cbd5e1;padding:8px 12px}
    th{background:#f1f5f9;font-weight:700}
    .yes{color:#16a34a;font-weight:700}.no{color:#dc2626;font-weight:700}.partial{color:#ca8a04;font-weight:700}
  </style></head><body>
    <h2>System Capability Comparison</h2>
    <table>
      <tr><th>Capability</th><th>Manual</th><th>Generic HMS</th><th>EyeCare</th></tr>
      <tr><td>Digital Patient Records</td><td class="no">✗</td><td class="partial">Partial</td><td class="yes">✓ Full</td></tr>
      <tr><td>Ophthalmology Exam Forms</td><td class="no">✗</td><td class="no">✗</td><td class="yes">✓ Full</td></tr>
      <tr><td>Optical Prescriptions</td><td class="no">✗</td><td class="no">✗</td><td class="yes">✓ Full</td></tr>
      <tr><td>6-Role RBAC</td><td class="no">✗</td><td class="partial">2-3 roles</td><td class="yes">✓ 6 roles</td></tr>
      <tr><td>Multi-Branch</td><td class="no">✗</td><td class="partial">Rare</td><td class="yes">✓ Yes</td></tr>
      <tr><td>Real-Time Alerts</td><td class="no">✗</td><td class="partial">Email</td><td class="yes">✓ Socket.io</td></tr>
      <tr><td>Audit Logs</td><td class="no">✗</td><td class="partial">Limited</td><td class="yes">✓ Full</td></tr>
    </table>
  </body></html>`;
}

function metricsGaugeHtml() {
  return `<!DOCTYPE html><html><head><style>
    body{font-family:Arial;background:#fff;padding:20px}
    h2{text-align:center;font-size:14px;color:#1e293b;margin-bottom:16px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:480px;margin:0 auto}
    .gauge{border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center;background:#f8fafc}
    .score{font-size:28px;font-weight:800;color:#0f766e}
    .label{font-size:10px;color:#64748b;margin-top:4px}
    .bar-bg{background:#e2e8f0;height:8px;border-radius:4px;margin-top:8px}
    .bar-fill{height:8px;border-radius:4px;background:#0f766e}
  </style></head><body>
    <h2>Evaluation Metrics Summary</h2>
    <div class="grid">
      <div class="gauge"><div class="score">100%</div><div class="label">Functionality</div><div class="bar-bg"><div class="bar-fill" style="width:100%"></div></div></div>
      <div class="gauge"><div class="score">4.43/5</div><div class="label">Usability (UAT)</div><div class="bar-bg"><div class="bar-fill" style="width:89%"></div></div></div>
      <div class="gauge"><div class="score">100%</div><div class="label">Security</div><div class="bar-bg"><div class="bar-fill" style="width:100%"></div></div></div>
      <div class="gauge"><div class="score">100%</div><div class="label">Reliability</div><div class="bar-bg"><div class="bar-fill" style="width:100%"></div></div></div>
    </div>
  </body></html>`;
}

module.exports = {
  uatChart: () => barChartHtml(
    'UAT Satisfaction Ratings by Role',
    ['Reception', 'Doctor', 'Pharmacist', 'Optician', 'Admin', 'Super Admin'],
    [4.55, 4.45, 4.3, 4.2, 4.5, 4.4],
    ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#6366f1', '#ef4444'],
    5
  ),
  testPassChart: () => barChartHtml(
    'Testing Pass Rate by Category (%)',
    ['Unit', 'Integration', 'System', 'Security', 'UAT', 'Use Cases'],
    [100, 100, 100, 100, 100, 100],
    ['#0f766e', '#0f766e', '#0f766e', '#0f766e', '#0f766e', '#0f766e'],
    100
  ),
  modulePie: () => pieChartHtml('Module Implementation Status', [
    { label: 'Complete', value: 100, color: '#16a34a' },
  ]),
  comparisonChart: comparisonRadarHtml,
  metricsGauge: metricsGaugeHtml,
};
