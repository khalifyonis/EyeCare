/** SVG diagram HTML for Chapter 5 — reference-thesis style with icons */

function baseStyles() {
  return `* { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; padding: 28px; }
    h2 { text-align: center; font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 24px; }
    .wrap { display: flex; justify-content: center; align-items: center; min-height: 180px; }`;
}

function uatDiagramHtml() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyles()}
    .flow { display: flex; align-items: center; gap: 18px; }
    .step { text-align: center; width: 110px; }
    .icon { width: 64px; height: 64px; border-radius: 12px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; border: 2px solid #cbd5e1; background: #f8fafc; }
    .lbl { font-size: 12px; font-weight: 700; color: #1e293b; }
    .arr { font-size: 22px; color: #64748b; font-weight: 700; }
  </style></head><body>
    <h2>User Acceptance Testing (UAT)</h2>
    <div class="wrap"><div class="flow">
      <div class="step"><div class="icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" fill="#2563eb"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#2563eb"/></svg></div><div class="lbl">User</div></div>
      <div class="arr">→</div>
      <div class="step"><div class="icon"><svg width="32" height="36" viewBox="0 0 24 24" fill="none"><rect x="6" y="2" width="12" height="20" rx="2" fill="#ea580c"/><rect x="8" y="4" width="8" height="14" rx="1" fill="#fff"/><circle cx="12" cy="19" r="1" fill="#fff"/></svg></div><div class="lbl">Test System</div></div>
      <div class="arr">→</div>
      <div class="step"><div class="icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v12H8l-4 4V4z" fill="#2563eb"/><circle cx="9" cy="10" r="1" fill="#fff"/><circle cx="12" cy="10" r="1" fill="#fff"/><circle cx="15" cy="10" r="1" fill="#fff"/></svg></div><div class="lbl">Feedback</div></div>
      <div class="arr">→</div>
      <div class="step"><div class="icon" style="background:#ecfdf5;border-color:#86efac"><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#16a34a"/><path d="M12 7v6l4 2" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></div><div class="lbl">Improvements</div></div>
    </div></div>
  </body></html>`;
}

function validationDiagramHtml() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyles()}
    .flow { display: flex; align-items: center; gap: 14px; position: relative; }
    .step { text-align: center; width: 100px; }
    .icon { width: 60px; height: 60px; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; }
    .box { border: 2px solid #1e293b; border-radius: 8px; padding: 10px 12px; font-size: 11px; font-weight: 700; background: #fff; min-width: 90px; text-align: center; }
    .diamond { width: 90px; height: 90px; background: #f97316; transform: rotate(45deg); margin: 12px auto; display: flex; align-items: center; justify-content: center; }
    .diamond span { transform: rotate(-45deg); color: #fff; font-size: 10px; font-weight: 700; }
    .arr { font-size: 20px; color: #64748b; }
    .shield { width: 48px; height: 48px; background: #2563eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 8px auto; }
  </style></head><body>
    <h2>Validation and Verification Flow with Security Enforcement</h2>
    <div class="wrap"><div class="flow">
      <div class="step"><div class="icon"><svg width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="#2563eb"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#2563eb"/></svg></div><div class="lbl" style="font-size:11px;font-weight:700">User</div></div>
      <div class="arr">→</div>
      <div class="step"><div class="diamond"><span>Validation</span></div></div>
      <div class="arr">→</div>
      <div class="step"><div class="box">Verification</div></div>
      <div class="arr">→</div>
      <div class="step"><div class="icon"><svg width="44" height="44" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#16a34a"/><path d="M8 12l3 3 5-6" stroke="#fff" stroke-width="2" fill="none"/></svg></div><div class="lbl" style="font-size:11px;font-weight:700">Access Granted</div></div>
    </div></div>
    <div style="text-align:center;margin-top:-60px;margin-left:-180px"><div class="shield"><svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l8 4v6c0 5-3.5 9-8 10C7.5 21 4 17 4 12V6l8-4z"/></svg></div><div style="font-size:9px;font-weight:700;color:#2563eb">Security Rules</div></div>
  </body></html>`;
}

function integrationDiagramHtml() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyles()}
    .flow { display: flex; align-items: flex-start; gap: 16px; }
    .col { text-align: center; }
    .box { border: 2px solid #1e293b; border-radius: 10px; padding: 12px 14px; font-size: 11px; font-weight: 700; background: #fff; min-width: 100px; }
    .icon-box { border: 2px solid #2563eb; border-radius: 10px; padding: 14px; background: #eff6ff; }
    .diamond { width: 80px; height: 80px; background: #f97316; transform: rotate(45deg); margin: 8px auto; display: flex; align-items: center; justify-content: center; }
    .diamond span { transform: rotate(-45deg); color: #fff; font-size: 9px; font-weight: 700; text-align: center; line-height: 1.2; }
    .arr { font-size: 22px; color: #64748b; margin-top: 36px; }
    .stack { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
  </style></head><body>
    <h2>Integration Testing</h2>
    <div class="wrap"><div class="flow">
      <div class="col"><div class="icon-box"><svg width="36" height="36" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="#2563eb"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#2563eb"/></svg></div><div class="box" style="margin-top:8px">Login</div></div>
      <div class="arr">→</div>
      <div class="col"><div class="diamond"><span>JWT<br/>Authentication</span></div></div>
      <div class="arr">→</div>
      <div class="col"><div class="stack"><div class="box">PostgreSQL<br/>Query</div><div class="box">Prisma ORM</div></div></div>
      <div class="arr">→</div>
      <div class="col"><div class="icon-box"><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M3 11l9-8 9 8v9H3V11z" fill="#0f766e"/><rect x="9" y="14" width="6" height="6" fill="#fff"/></svg></div><div class="box" style="margin-top:8px">Role Dashboard</div></div>
    </div></div>
  </body></html>`;
}

function architectureDiagramHtml() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Arial; background: #fff; padding: 24px; }
    h2 { text-align: center; font-size: 15px; margin-bottom: 20px; color: #1e293b; }
    .layers { width: 520px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
    .layer { border: 2px solid #1e293b; border-radius: 10px; padding: 14px; text-align: center; }
    .l1 { background: #eff6ff; }
    .l2 { background: #ecfdf5; }
    .l3 { background: #fef3c7; }
    .title { font-size: 13px; font-weight: 700; margin-bottom: 6px; }
    .items { font-size: 11px; color: #475569; }
    .arrow { text-align: center; font-size: 18px; color: #64748b; }
  </style></head><body>
    <h2>EyeCare System — Three-Tier Architecture</h2>
    <div class="layers">
      <div class="layer l1"><div class="title">Presentation Layer</div><div class="items">Next.js 16 · React 19 · TypeScript · Tailwind CSS · Axios · Socket.io Client</div></div>
      <div class="arrow">↕ REST API + WebSocket</div>
      <div class="layer l2"><div class="title">Application Layer</div><div class="items">Node.js · Express 5 · JWT Auth · Joi Validation · Controllers · Middleware</div></div>
      <div class="arrow">↕ Prisma ORM</div>
      <div class="layer l3"><div class="title">Data Layer</div><div class="items">PostgreSQL — patients, appointments, examinations, prescriptions, billing, logs</div></div>
    </div>
  </body></html>`;
}

function clinicWorkflowHtml() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Arial; background: #fff; padding: 20px; }
    h2 { text-align: center; font-size: 14px; margin-bottom: 16px; }
    .flow { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
    .box { border: 2px solid #0f766e; border-radius: 8px; padding: 8px 10px; font-size: 10px; font-weight: 700; background: #f0fdfa; text-align: center; width: 88px; }
    .role { font-size: 8px; color: #64748b; font-weight: 600; margin-top: 3px; }
    .arr { color: #64748b; font-size: 16px; }
  </style></head><body>
    <h2>Clinic Workflow — End-to-End System Testing</h2>
    <div class="flow">
      <div class="box">Register Patient<div class="role">Receptionist</div></div><div class="arr">→</div>
      <div class="box">Schedule Appt<div class="role">Receptionist</div></div><div class="arr">→</div>
      <div class="box">Examination<div class="role">Doctor</div></div><div class="arr">→</div>
      <div class="box">Prescription<div class="role">Doctor</div></div><div class="arr">→</div>
      <div class="box">Dispense<div class="role">Pharmacist</div></div><div class="arr">→</div>
      <div class="box">Billing<div class="role">Receptionist</div></div><div class="arr">→</div>
      <div class="box">Reports<div class="role">Administrator</div></div>
    </div>
  </body></html>`;
}

module.exports = {
  uatDiagramHtml,
  validationDiagramHtml,
  integrationDiagramHtml,
  architectureDiagramHtml,
  clinicWorkflowHtml,
};
