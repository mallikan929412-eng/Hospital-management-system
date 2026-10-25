/* ============================================================
   MedCare HMS – Reports Module
   ============================================================ */

const HMS_Reports = (() => {
  const { fmt, chartColors, esc } = HMS_Utils;

  const render = () => {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="page-breadcrumb">HMS <span>/ Reports</span></div>
          <h1 class="page-title">Analytics & Reports</h1>
          <p class="page-subtitle">Comprehensive hospital analytics and performance insights</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="window.print()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print Report
          </button>
        </div>
      </div>

      <!-- Summary -->
      <div id="reportSummary"></div>

      <div class="dashboard-row" style="margin-bottom:24px">
        <div class="chart-card">
          <div class="chart-header"><div class="chart-title">Patient Status Distribution</div></div>
          <div class="chart-body"><canvas id="rStatusChart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div class="chart-title">Doctor Availability</div></div>
          <div class="chart-body"><canvas id="rDoctorChart"></canvas></div>
        </div>
      </div>

      <div class="dashboard-row" style="margin-bottom:24px">
        <div class="chart-card">
          <div class="chart-header"><div class="chart-title">Revenue vs Outstanding (Monthly)</div></div>
          <div class="chart-body"><canvas id="rRevenueChart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><div class="chart-title">Appointment Types</div></div>
          <div class="chart-body"><canvas id="rApptChart"></canvas></div>
        </div>
      </div>

      <!-- Top Departments Table -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-header"><div class="card-title">Department Performance</div></div>
        <div class="table-wrapper card-body" style="padding-top:0">
          <table>
            <thead><tr><th>Department</th><th>Patients</th><th>Doctors</th><th>Revenue</th><th>Avg Bill</th></tr></thead>
            <tbody id="deptTable"></tbody>
          </table>
        </div>
      </div>
    `;

    buildReports();
  };

  const buildReports = () => {
    const patients = HMS_DB.Patients().getAll();
    const doctors = HMS_DB.Doctors().getAll();
    const bills = HMS_DB.Billing().getAll();
    const appts = HMS_DB.Appointments().getAll();

    const isDark = !document.body.classList.contains('light-theme');
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const textColor = isDark ? '#64748B' : '#94A3B8';
    if (typeof Chart !== 'undefined' && Chart.defaults) {
      Chart.defaults.color = textColor;
    }

    // Summary cards
    const totalRevenue = bills.reduce((s,b) => s + (b.total||0), 0);
    const collected = bills.reduce((s,b) => s + (b.paid||0), 0);
    const summary = document.getElementById('reportSummary');
    if (summary) {
      summary.innerHTML = `
        <div class="dashboard-grid" style="margin-bottom:24px">
          <div class="stat-card blue"><div class="stat-label">Total Patients</div><div class="stat-value">${fmt.shortNumber(patients.length)}</div></div>
          <div class="stat-card emerald"><div class="stat-label">Total Revenue</div><div class="stat-value">${fmt.shortNumber(totalRevenue)}</div></div>
          <div class="stat-card purple"><div class="stat-label">Total Appointments</div><div class="stat-value">${fmt.shortNumber(appts.length)}</div></div>
          <div class="stat-card amber"><div class="stat-label">Collection Rate</div><div class="stat-value">${fmt.percent(collected, totalRevenue)}</div></div>
        </div>
      `;
    }

    // Patient Status
    const statusMap = {};
    patients.forEach(p => { statusMap[p.status] = (statusMap[p.status]||0) + 1; });
    const statusColors = { 'Active':'#3B82F6','Admitted':'#F59E0B','Discharged':'#64748B','Critical':'#F43F5E','Under Observation':'#8B5CF6','Outpatient':'#06B6D4' };
    new Chart(document.getElementById('rStatusChart'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusMap),
        datasets: [{ data: Object.values(statusMap), backgroundColor: Object.keys(statusMap).map(k => statusColors[k]||'#64748B'), borderColor: isDark?'#111827':'#fff', borderWidth: 3, hoverOffset: 8 }]
      },
      options: { responsive:true, plugins: { legend: { position:'right', labels:{ color:textColor, padding:12, font:{size:12} } } }, cutout:'60%' }
    });

    // Doctor Availability
    const doctorStatus = {};
    doctors.forEach(d => { doctorStatus[d.status] = (doctorStatus[d.status]||0) + 1; });
    const docColors = { 'Available':'#10B981','On Duty':'#3B82F6','On Leave':'#F59E0B','Off Duty':'#64748B' };
    new Chart(document.getElementById('rDoctorChart'), {
      type: 'bar',
      data: {
        labels: Object.keys(doctorStatus),
        datasets: [{ label: 'Doctors', data: Object.values(doctorStatus), backgroundColor: Object.keys(doctorStatus).map(k => docColors[k]||'#64748B'), borderRadius: 8, borderSkipped: false }]
      },
      options: { responsive:true, plugins:{ legend:{display:false} }, scales:{ x:{grid:{color:gridColor},ticks:{color:textColor}}, y:{grid:{color:gridColor},ticks:{color:textColor},beginAtZero:true} } }
    });

    // Revenue chart (last 6 months)
    const monthRevenue = {}, monthOutstanding = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth()-i);
      const key = d.toISOString().slice(0,7);
      monthRevenue[key] = 0; monthOutstanding[key] = 0;
    }
    bills.forEach(b => {
      const m = (b.billDate||'').slice(0,7);
      if (monthRevenue.hasOwnProperty(m)) { monthRevenue[m] += b.paid||0; monthOutstanding[m] += b.balance||0; }
    });
    const revLabels = Object.keys(monthRevenue).map(m => { const [y,mo] = m.split('-'); return new Date(parseInt(y),parseInt(mo)-1,1).toLocaleString('en-US',{month:'short',year:'2-digit'}); });
    new Chart(document.getElementById('rRevenueChart'), {
      type: 'bar',
      data: {
        labels: revLabels,
        datasets: [
          { label: 'Collected', data: Object.values(monthRevenue), backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6, borderSkipped: false },
          { label: 'Outstanding', data: Object.values(monthOutstanding), backgroundColor: 'rgba(244,63,94,0.6)', borderRadius: 6, borderSkipped: false },
        ]
      },
      options: {
        responsive:true,
        plugins: { legend:{ labels:{color:textColor} } },
        scales: { x:{stacked:true,grid:{color:gridColor},ticks:{color:textColor}}, y:{stacked:true,grid:{color:gridColor},ticks:{color:textColor,callback:v=>'$'+(v>=1000?(v/1000).toFixed(0)+'K':v)},beginAtZero:true} }
      }
    });

    // Appointment types
    const apptTypes = {};
    appts.forEach(a => { apptTypes[a.type||'Other'] = (apptTypes[a.type||'Other']||0) + 1; });
    new Chart(document.getElementById('rApptChart'), {
      type: 'polarArea',
      data: {
        labels: Object.keys(apptTypes),
        datasets: [{ data: Object.values(apptTypes), backgroundColor: chartColors.map(c => c+'99'), borderColor: chartColors, borderWidth: 2 }]
      },
      options: { responsive:true, plugins:{ legend:{ position:'right', labels:{color:textColor,font:{size:11}} } }, scales:{ r:{ grid:{color:gridColor}, ticks:{display:false} } } }
    });

    // Department table
    const deptPatients = {}, deptRevenue = {}, deptDoctors = {};
    patients.forEach(p => { deptPatients[p.department] = (deptPatients[p.department]||0)+1; });
    bills.forEach(b => { deptRevenue[b.department] = (deptRevenue[b.department]||0)+(b.paid||0); });
    doctors.forEach(d => { deptDoctors[d.department] = (deptDoctors[d.department]||0)+1; });
    const depts = Object.keys(deptPatients).sort((a,b) => deptPatients[b]-deptPatients[a]).slice(0,10);
    const tbody = document.getElementById('deptTable');
    if (tbody) {
      tbody.innerHTML = depts.map(dept => {
        const pCount = deptPatients[dept]||0;
        const rev = deptRevenue[dept]||0;
        const dc = deptDoctors[dept]||0;
        const avg = pCount > 0 ? rev/pCount : 0;
        return `<tr>
          <td><span class="badge badge-blue">${esc(dept)}</span></td>
          <td>${fmt.number(pCount)}</td>
          <td>${dc}</td>
          <td style="color:var(--emerald);font-weight:600">${fmt.currency(rev)}</td>
          <td class="text-muted">${fmt.currency(avg)}</td>
        </tr>`;
      }).join('');
    }
  };

  return { render };
})();
window.HMS_Reports = HMS_Reports;
