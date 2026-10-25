/* ============================================================
   MedCare HMS – Dashboard Module
   ============================================================ */

const HMS_Dashboard = (() => {
  const { fmt, avatarColor, statusBadge, chartColors, esc } = HMS_Utils;

  const render = () => {
    const content = document.getElementById('pageContent');
    const stats = HMS_DB.analytics.getDashboardStats();
    const now = new Date();
    const settings = HMS_DB.Settings.get();

    content.innerHTML = `
      <!-- Welcome Bar -->
      <div class="welcome-bar">
        <div class="welcome-text">
          <div class="welcome-greeting">Welcome back, <span>${esc(settings.adminName || 'Dr. Admin')}</span> 👋</div>
          <div class="welcome-date">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
            ${now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            &nbsp;·&nbsp;
            <span id="liveClock">${now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}</span>
          </div>
        </div>
        <div class="welcome-actions">
          <button class="btn btn-secondary btn-sm" onclick="HMS_App.navigate('patients')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            New Patient
          </button>
          <button class="btn btn-primary btn-sm" onclick="HMS_App.navigate('appointments')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Schedule
          </button>
        </div>
      </div>

      <!-- KPI Stats -->
      <div class="dashboard-grid">
        ${statCard('Total Patients', fmt.shortNumber(stats.totalPatients), 'blue', 'up', '+4.5%', 'vs last month', patientIcon())}
        ${statCard('Active Admissions', fmt.number(stats.admittedPatients), 'amber', 'up', '+12%', `${stats.criticalPatients} critical`, bedIcon())}
        ${statCard('Today\'s Appointments', fmt.number(stats.todayAppointments), 'emerald', 'up', '+8.1%', 'scheduled today', calIcon())}
        ${statCard('Available Doctors', fmt.number(stats.availableDoctors), 'purple', 'neutral', `of ${stats.totalDoctors}`, 'doctors on duty', docIcon())}
      </div>

      <!-- Revenue + Quick Stats -->
      <div class="quick-stats">
        ${quickStat('Total Revenue', fmt.currency(stats.totalRevenue), 'linear-gradient(135deg,#10B981,#06B6D4)', revenueIcon())}
        ${quickStat('Pending Revenue', fmt.currency(stats.pendingRevenue), 'linear-gradient(135deg,#F59E0B,#EF4444)', pendingIcon())}
        ${quickStat('Total Doctors', fmt.number(stats.totalDoctors), 'linear-gradient(135deg,#8B5CF6,#EC4899)', docIcon())}
        ${quickStat('Total Appointments', fmt.shortNumber(stats.totalAppointments), 'linear-gradient(135deg,#6366F1,#3B82F6)', calIcon())}
      </div>

      <!-- Charts Row 1 -->
      <div class="dashboard-row">
        <!-- Admissions Chart -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Daily Admissions
              </div>
              <div class="chart-subtitle">Last 14 days patient admissions</div>
            </div>
            <div class="chart-filter-pills">
              <button class="chart-pill active" id="pill14">14D</button>
              <button class="chart-pill" id="pill30">30D</button>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="admissionsChart"></canvas>
          </div>
        </div>

        <!-- Department Distribution -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                Departments
              </div>
              <div class="chart-subtitle">Patient distribution by dept.</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="deptChart" style="max-height:220px"></canvas>
          </div>
          <div class="chart-legend" id="deptLegend"></div>
        </div>
      </div>

      <!-- Charts Row 2 -->
      <div class="dashboard-row">
        <!-- Revenue Chart -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Revenue Trends
              </div>
              <div class="chart-subtitle">Monthly billing revenue (last 6 months)</div>
            </div>
            <div class="revenue-summary" style="padding:0;gap:16px">
              <div style="text-align:right">
                <div style="font-size:11px;color:var(--text-muted)">Collected</div>
                <div style="font-size:16px;font-weight:800;color:var(--emerald)">${fmt.currency(stats.totalRevenue)}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:11px;color:var(--text-muted)">Pending</div>
                <div style="font-size:16px;font-weight:800;color:var(--amber)">${fmt.currency(stats.pendingRevenue)}</div>
              </div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="revenueChart"></canvas>
          </div>
        </div>

        <!-- Bill Status -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                Bill Status
              </div>
              <div class="chart-subtitle">Invoice payment breakdown</div>
            </div>
          </div>
          <div class="chart-body">
            <canvas id="billChart" style="max-height:200px"></canvas>
          </div>
          <div class="chart-legend" id="billLegend"></div>
        </div>
      </div>

      <!-- Bottom Row -->
      <div class="dashboard-row-3">
        <!-- Recent Patients -->
        <div class="chart-card" style="grid-column:1/3">
          <div class="chart-header">
            <div class="chart-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              Recent Patients
            </div>
            <button class="btn btn-secondary btn-sm" onclick="HMS_App.navigate('patients')">View All</button>
          </div>
          <div class="table-wrapper">
            <table class="recent-patients-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Admitted</th>
                  <th>Blood</th>
                </tr>
              </thead>
              <tbody>
                ${stats.recentPatients.map(p => `
                  <tr>
                    <td>
                      <div class="avatar-name">
                        <div class="patient-avatar" style="background:${avatarColor(p.fullName)}">${fmt.initials(p.fullName)}</div>
                        <div class="avatar-info">
                          <div class="avatar-name-text">${esc(p.fullName)}</div>
                          <div class="avatar-sub-text">${p.id} · ${p.age}y · ${p.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td><span class="badge badge-blue">${esc(p.department)}</span></td>
                    <td>${statusBadge(p.status)}</td>
                    <td class="text-muted text-sm">${fmt.date(p.admitDate)}</td>
                    <td><span class="badge badge-rose">${p.blood}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Upcoming Appointments -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Upcoming
            </div>
            <button class="btn btn-secondary btn-sm" onclick="HMS_App.navigate('appointments')">View All</button>
          </div>
          <div class="doctor-schedule-list">
            ${stats.upcomingAppointments.length === 0 ? '<p class="text-muted text-sm" style="text-align:center;padding:20px">No upcoming appointments</p>' :
              stats.upcomingAppointments.map(a => `
                <div class="doctor-schedule-item">
                  <div class="doctor-schedule-avatar" style="background:${avatarColor(a.patientName)}">${fmt.initials(a.patientName)}</div>
                  <div class="doctor-schedule-info">
                    <div class="doctor-schedule-name">${esc(a.patientName)}</div>
                    <div class="doctor-schedule-dept">${esc(a.doctorName)} · ${a.time}</div>
                  </div>
                  ${statusBadge(a.status)}
                </div>
              `).join('')
            }
          </div>
        </div>
      </div>
    `;

    // Start clock
    const clock = document.getElementById('liveClock');
    if (clock) {
      const tick = () => { clock.textContent = new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' }); };
      const t = setInterval(tick, 1000);
      // Clean up on navigation
      clock._interval = t;
    }

    initCharts(stats);
  };

  // ── Stat Card HTML ──
  const statCard = (label, value, color, dir, change, footer, icon) => `
    <div class="stat-card ${color}">
      <div class="stat-header">
        <div>
          <div class="stat-label">${label}</div>
          <div class="stat-value">${value}</div>
        </div>
        <div class="stat-icon ${color}">${icon}</div>
      </div>
      <div>
        <span class="stat-change ${dir}">
          ${dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→'} ${change}
        </span>
        <div class="stat-footer">${footer}</div>
      </div>
    </div>
  `;

  const quickStat = (label, value, bg, icon) => `
    <div class="quick-stat">
      <div class="quick-stat-icon" style="background:${bg}">${icon}</div>
      <div class="quick-stat-info">
        <div class="quick-stat-value">${value}</div>
        <div class="quick-stat-label">${label}</div>
      </div>
    </div>
  `;

  // ── SVG Icons ──
  const patientIcon = () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`;
  const bedIcon = () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 19V9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10"/><path d="M2 19h20"/><path d="M6 9V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4"/></svg>`;
  const calIcon = () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
  const docIcon = () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const revenueIcon = () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
  const pendingIcon = () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

  // ── Charts ──
  const initCharts = (stats) => {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded');
      return;
    }
    const isDark = !document.body.classList.contains('light-theme');
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const textColor = isDark ? '#64748B' : '#94A3B8';

    if (Chart.defaults) {
      if (Chart.defaults.font) Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
      Chart.defaults.color = textColor;
    }

    // Admissions Chart
    const admLabels = Object.keys(stats.dailyAdmissions).map(d => {
      const dt = new Date(d);
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const admData = Object.values(stats.dailyAdmissions);

    const admCtx = document.getElementById('admissionsChart');
    if (admCtx) {
      const chart = new Chart(admCtx, {
        type: 'line',
        data: {
          labels: admLabels,
          datasets: [{
            label: 'Admissions',
            data: admData,
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59,130,246,0.1)',
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#3B82F6',
            pointBorderColor: isDark ? '#111827' : '#fff',
            pointBorderWidth: 2,
            fill: true,
            tension: 0.4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { display: false }, tooltip: { backgroundColor: isDark ? '#1E293B' : '#fff', titleColor: isDark ? '#F1F5F9' : '#0F172A', bodyColor: textColor, borderColor: gridColor, borderWidth: 1, padding: 12 } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } }, beginAtZero: true },
          },
        }
      });
      HMS_App.registerChart('admissions', chart);
    }

    // Department Donut Chart
    const deptCtx = document.getElementById('deptChart');
    if (deptCtx) {
      const labels = stats.deptData.map(d => d[0]);
      const values = stats.deptData.map(d => d[1]);
      const chart = new Chart(deptCtx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{ data: values, backgroundColor: chartColors, borderColor: isDark ? '#111827' : '#fff', borderWidth: 3, hoverOffset: 8 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: isDark ? '#1E293B' : '#fff', titleColor: isDark ? '#F1F5F9' : '#0F172A', bodyColor: textColor, borderColor: gridColor, borderWidth: 1, padding: 12 },
          },
          cutout: '65%',
        }
      });
      HMS_App.registerChart('dept', chart);

      // Legend
      const legend = document.getElementById('deptLegend');
      if (legend) {
        legend.innerHTML = labels.map((l, i) => `
          <div class="legend-item">
            <div class="legend-dot" style="background:${chartColors[i]}"></div>
            <span>${l}</span>
          </div>
        `).join('');
      }
    }

    // Revenue Bar Chart
    const revCtx = document.getElementById('revenueChart');
    if (revCtx) {
      const labels = Object.keys(stats.monthRevenue).map(m => {
        const [y, mo] = m.split('-');
        return new Date(parseInt(y), parseInt(mo)-1, 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
      });
      const values = Object.values(stats.monthRevenue);
      const chart = new Chart(revCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Revenue',
            data: values,
            backgroundColor: values.map((_, i) => i === values.length - 1 ? '#3B82F6' : 'rgba(59,130,246,0.5)'),
            borderRadius: 8,
            borderSkipped: false,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDark ? '#1E293B' : '#fff',
              titleColor: isDark ? '#F1F5F9' : '#0F172A',
              bodyColor: textColor,
              borderColor: gridColor, borderWidth: 1, padding: 12,
              callbacks: { label: ctx => ' ' + fmt.currency(ctx.raw) }
            },
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, callback: v => '$' + (v >= 1000 ? (v/1000).toFixed(0)+'K' : v) }, beginAtZero: true },
          },
        }
      });
      HMS_App.registerChart('revenue', chart);
    }

    // Bill Status Polar Chart
    const billCtx = document.getElementById('billChart');
    if (billCtx) {
      const bs = stats.billStatus;
      const labels = Object.keys(bs);
      const values = Object.values(bs);
      const colors = { 'Paid': '#10B981', 'Pending': '#F59E0B', 'Partial': '#3B82F6', 'Overdue': '#F43F5E', 'Cancelled': '#64748B', 'Refunded': '#8B5CF6' };
      const chart = new Chart(billCtx, {
        type: 'polarArea',
        data: {
          labels,
          datasets: [{ data: values, backgroundColor: labels.map(l => (colors[l] || '#64748B') + '99'), borderColor: labels.map(l => colors[l] || '#64748B'), borderWidth: 2 }]
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: isDark ? '#1E293B' : '#fff', titleColor: isDark ? '#F1F5F9' : '#0F172A', bodyColor: textColor, borderColor: gridColor, borderWidth: 1, padding: 12 },
          },
          scales: { r: { grid: { color: gridColor }, ticks: { display: false } } },
        }
      });
      HMS_App.registerChart('bill', chart);

      const legend = document.getElementById('billLegend');
      if (legend) {
        legend.innerHTML = labels.map(l => `
          <div class="legend-item">
            <div class="legend-dot" style="background:${colors[l] || '#64748B'}"></div>
            <span>${l}: ${HMS_Utils.fmt.number(bs[l])}</span>
          </div>
        `).join('');
      }
    }
  };

  return { render };
})();
window.HMS_Dashboard = HMS_Dashboard;
