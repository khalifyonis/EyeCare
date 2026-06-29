/** Chapter 4 diagrams — improved System Architecture Diagram (Figure 4.8) */

function systemArchitectureHtml() {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; padding: 20px 24px; width: 820px; }
  h1 { text-align: center; font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 18px; }
  .tier { border: 2px solid #1e293b; border-radius: 12px; margin-bottom: 10px; overflow: hidden; }
  .tier-hdr { padding: 8px 14px; font-size: 12px; font-weight: 700; color: #fff; text-align: center; letter-spacing: 0.3px; }
  .t-users { background: #475569; }
  .t-present { background: #1d4ed8; }
  .t-app { background: #0f766e; }
  .t-data { background: #b45309; }
  .t-ext { background: #7c3aed; }
  .tier-body { padding: 12px 14px; background: #f8fafc; }
  .row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
  .box { border: 1.5px solid #94a3b8; border-radius: 8px; padding: 8px 10px; font-size: 10px; font-weight: 600; color: #1e293b; background: #fff; text-align: center; min-width: 88px; line-height: 1.35; }
  .box.wide { min-width: 120px; }
  .box.accent { border-color: #2563eb; background: #eff6ff; }
  .box.green { border-color: #0d9488; background: #f0fdfa; }
  .box.amber { border-color: #d97706; background: #fffbeb; }
  .arrow-row { text-align: center; font-size: 11px; font-weight: 700; color: #64748b; padding: 4px 0; }
  .arrow-row span { background: #e2e8f0; padding: 2px 10px; border-radius: 12px; font-size: 9px; }
  .modules { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .mod { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 4px; font-size: 9px; font-weight: 600; text-align: center; background: #fff; color: #334155; }
  .legend { display: flex; justify-content: center; gap: 16px; margin-top: 12px; font-size: 9px; color: #64748b; }
  .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
</style></head><body>
  <h1>Figure 4.8 — System Architecture Diagram of the EyeCare (Al-Ixsaan) Management System</h1>

  <div class="tier">
    <div class="tier-hdr t-users">CLIENT / USER LAYER</div>
    <div class="tier-body">
      <div class="row">
        <div class="box">Super Admin<br/><small>Browser</small></div>
        <div class="box">Administrator<br/><small>Browser</small></div>
        <div class="box">Receptionist<br/><small>Browser</small></div>
        <div class="box">Doctor<br/><small>Browser</small></div>
        <div class="box">Pharmacist<br/><small>Browser</small></div>
        <div class="box">Optician<br/><small>Browser</small></div>
      </div>
    </div>
  </div>

  <div class="arrow-row">▼ <span>HTTPS — Web Browser Access</span> ▼</div>

  <div class="tier">
    <div class="tier-hdr t-present">PRESENTATION LAYER — Next.js 16 · React 19 · TypeScript · Tailwind CSS</div>
    <div class="tier-body">
      <div class="row" style="margin-bottom:8px">
        <div class="box accent wide">Login & Auth Pages</div>
        <div class="box accent wide">Role Dashboards</div>
        <div class="box accent wide">Patient & Appointment UI</div>
        <div class="box accent wide">Clinical & Rx Forms</div>
        <div class="box accent wide">Billing & Reports</div>
      </div>
      <div class="row">
        <div class="box wide">Axios HTTP Client</div>
        <div class="box wide">Socket.io Client</div>
        <div class="box wide">Recharts Analytics</div>
        <div class="box wide">jsPDF Export</div>
      </div>
    </div>
  </div>

  <div class="arrow-row">▼ <span>REST API (JSON) + WebSocket</span> ▼</div>

  <div class="tier">
    <div class="tier-hdr t-app">APPLICATION LAYER — Node.js · Express.js 5 · JWT · Joi Validation</div>
    <div class="tier-body">
      <div class="row" style="margin-bottom:10px">
        <div class="box green">Auth Middleware</div>
        <div class="box green">RBAC Permissions</div>
        <div class="box green">Branch Scoping</div>
        <div class="box green">Error Handler</div>
        <div class="box green">Socket.io Server</div>
      </div>
      <div class="modules">
        <div class="mod">Auth & Users</div>
        <div class="mod">Patients</div>
        <div class="mod">Appointments</div>
        <div class="mod">Examinations</div>
        <div class="mod">Prescriptions</div>
        <div class="mod">Pharmacy</div>
        <div class="mod">Optical Shop</div>
        <div class="mod">Billing</div>
        <div class="mod">Reports</div>
        <div class="mod">Branches</div>
        <div class="mod">Audit Logs</div>
        <div class="mod">Dashboard</div>
      </div>
    </div>
  </div>

  <div class="arrow-row">▼ <span>Prisma ORM — Type-safe Queries & Migrations</span> ▼</div>

  <div class="tier">
    <div class="tier-hdr t-data">DATA LAYER — PostgreSQL 14+ Relational Database</div>
    <div class="tier-body">
      <div class="row">
        <div class="box amber">Patients & Appointments</div>
        <div class="box amber">Clinical Exams & Rx</div>
        <div class="box amber">Pharmacy & Optical Inventory</div>
        <div class="box amber">Billing & Payments</div>
        <div class="box amber">Users, Branches & Logs</div>
      </div>
    </div>
  </div>

  <div class="arrow-row">◄ <span>External Services</span> ►</div>

  <div class="tier">
    <div class="tier-hdr t-ext">EXTERNAL SERVICES</div>
    <div class="tier-body">
      <div class="row">
        <div class="box">SMTP Email<br/><small>Password Reset</small></div>
        <div class="box">File Storage<br/><small>Profile Images (Multer)</small></div>
        <div class="box">Cloud VPS Hosting<br/><small>Deployment</small></div>
      </div>
    </div>
  </div>

  <div class="legend">
    <span><i style="background:#475569"></i>Users</span>
    <span><i style="background:#1d4ed8"></i>Frontend</span>
    <span><i style="background:#0f766e"></i>Backend API</span>
    <span><i style="background:#b45309"></i>Database</span>
  </div>
</body></html>`;
}

module.exports = { systemArchitectureHtml };
