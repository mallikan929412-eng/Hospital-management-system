/* ============================================================
   MedCare HMS – Appointments Module
   ============================================================ */

const HMS_Appointments = (() => {
  const { fmt, avatarColor, statusBadge, esc, modal, toast, fuzzySearch, debounce, buildPagination } = HMS_Utils;

  let state = { page: 1, perPage: 15, search: '', filterStatus: '', filterDept: '', filterDate: '' };
  const STATUSES = ['Scheduled','Confirmed','Completed','Cancelled','No Show'];
  const TYPES = ['Consultation','Follow-up','Emergency','Routine Check','Lab Review','Procedure'];

  const render = () => {
    const content = document.getElementById('pageContent');
    const all = HMS_DB.Appointments().getAll();
    const today = new Date().toISOString().split('T')[0];
    const scheduled = all.filter(a => a.status === 'Scheduled').length;
    const todayCount = all.filter(a => a.date === today).length;
    const completed = all.filter(a => a.status === 'Completed').length;
    const cancelled = all.filter(a => a.status === 'Cancelled').length;

    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="page-breadcrumb">HMS <span>/ Appointments</span></div>
          <h1 class="page-title">Appointments</h1>
          <p class="page-subtitle">Schedule and manage patient-doctor appointments</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="HMS_Appointments.openAddModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            Schedule Appointment
          </button>
        </div>
      </div>

      <div class="dashboard-grid" style="margin-bottom:24px">
        <div class="stat-card blue"><div class="stat-header"><div><div class="stat-label">Today's Appointments</div><div class="stat-value">${todayCount}</div></div><div class="stat-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div></div></div>
        <div class="stat-card amber"><div class="stat-header"><div><div class="stat-label">Scheduled</div><div class="stat-value">${fmt.number(scheduled)}</div></div><div class="stat-icon amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div></div></div>
        <div class="stat-card emerald"><div class="stat-header"><div><div class="stat-label">Completed</div><div class="stat-value">${fmt.number(completed)}</div></div><div class="stat-icon emerald"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div></div></div>
        <div class="stat-card rose"><div class="stat-header"><div><div class="stat-label">Cancelled</div><div class="stat-value">${fmt.number(cancelled)}</div></div><div class="stat-icon rose"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div></div></div>
      </div>

      <div class="filter-bar">
        <div class="filter-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="apptSearch" placeholder="Search patient, doctor..." value="${esc(state.search)}" />
        </div>
        <select class="filter-select" id="filterApptStatus">
          <option value="">All Statuses</option>
          ${STATUSES.map(s => `<option value="${s}" ${state.filterStatus===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <input type="date" class="filter-select" id="filterApptDate" value="${state.filterDate}" style="min-width:160px" />
        <button class="btn btn-secondary btn-sm" onclick="HMS_Appointments.resetFilters()">Clear</button>
      </div>

      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead><tr>
              <th>Appointment ID</th><th>Patient</th><th>Doctor</th><th>Department</th><th>Date & Time</th><th>Type</th><th>Status</th><th>Fee</th><th>Actions</th>
            </tr></thead>
            <tbody id="apptTableBody"></tbody>
          </table>
        </div>
        <div class="pagination" id="apptPagination"></div>
      </div>
    `;

    bindEvents();
    renderTable();
  };

  const getFiltered = () => {
    let all = HMS_DB.Appointments().getAll();
    if (state.search) all = fuzzySearch(all, state.search, ['patientName','doctorName','department','id']);
    if (state.filterStatus) all = all.filter(a => a.status === state.filterStatus);
    if (state.filterDate) all = all.filter(a => a.date === state.filterDate);
    all.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
    return all;
  };

  const renderTable = () => {
    const all = getFiltered();
    const total = all.length;
    const totalPages = Math.ceil(total / state.perPage);
    state.page = Math.min(state.page, Math.max(1, totalPages));
    const items = all.slice((state.page-1)*state.perPage, state.page*state.perPage);

    const tbody = document.getElementById('apptTableBody');
    if (!tbody) return;

    tbody.innerHTML = items.length === 0 ? `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="empty-title">No appointments found</div></div></td></tr>` :
      items.map(a => `
        <tr>
          <td class="text-muted text-sm">${a.id}</td>
          <td>
            <div class="avatar-name">
              <div class="patient-avatar" style="background:${avatarColor(a.patientName)};width:32px;height:32px;font-size:11px">${fmt.initials(a.patientName)}</div>
              <span class="avatar-name-text" style="font-size:13px">${esc(a.patientName)}</span>
            </div>
          </td>
          <td class="text-sm">${esc(a.doctorName)}</td>
          <td><span class="badge badge-blue" style="font-size:11px">${esc(a.department)}</span></td>
          <td class="text-sm">${fmt.date(a.date)} <span class="text-muted">${a.time}</span></td>
          <td><span class="badge badge-purple" style="font-size:11px">${a.type}</span></td>
          <td>${statusBadge(a.status)}</td>
          <td>${fmt.currency(a.fee)}</td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn btn-secondary btn-sm btn-icon" title="Edit" onclick="HMS_Appointments.openEditModal('${a.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-danger btn-sm btn-icon" title="Cancel" onclick="HMS_Appointments.cancelAppt('${a.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `).join('');

    const pag = document.getElementById('apptPagination');
    if (pag) {
      pag.innerHTML = buildPagination({ page: state.page, totalPages, total, perPage: state.perPage });
      pag.querySelectorAll('.page-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => { state.page = parseInt(btn.dataset.page); renderTable(); });
      });
    }
  };

  const bindEvents = () => {
    document.getElementById('apptSearch')?.addEventListener('input', debounce(e => { state.search = e.target.value; state.page = 1; renderTable(); }, 300));
    document.getElementById('filterApptStatus')?.addEventListener('change', e => { state.filterStatus = e.target.value; state.page = 1; renderTable(); });
    document.getElementById('filterApptDate')?.addEventListener('change', e => { state.filterDate = e.target.value; state.page = 1; renderTable(); });
  };

  const resetFilters = () => { state = { ...state, search:'', filterStatus:'', filterDate:'', page:1 }; render(); };

  const apptFormHTML = (a = {}) => {
    const patients = HMS_DB.Patients().getAll().slice(0, 500);
    const doctors = HMS_DB.Doctors().getAll();
    const today = new Date().toISOString().split('T')[0];
    return `
      <div class="form-grid form-grid-2">
        <div class="form-group">
          <label class="form-label">Patient <span class="form-required">*</span></label>
          <select class="form-select" id="af_patient">
            <option value="">Select Patient</option>
            ${patients.map(p => `<option value="${p.id}|${esc(p.fullName)}" ${a.patientId===p.id?'selected':''}>${esc(p.fullName)} (${p.id})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Doctor <span class="form-required">*</span></label>
          <select class="form-select" id="af_doctor">
            <option value="">Select Doctor</option>
            ${doctors.map(d => `<option value="${d.id}|${esc(d.fullName)}|${esc(d.department)}|${d.consultationFee}" ${a.doctorId===d.id?'selected':''}>${esc(d.fullName)} — ${esc(d.department)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Date <span class="form-required">*</span></label>
          <input class="form-input" type="date" id="af_date" value="${a.date||today}" min="${today}" />
        </div>
        <div class="form-group">
          <label class="form-label">Time <span class="form-required">*</span></label>
          <input class="form-input" type="time" id="af_time" value="${a.time||'09:00'}" />
        </div>
        <div class="form-group">
          <label class="form-label">Type</label>
          <select class="form-select" id="af_type">
            ${TYPES.map(t => `<option value="${t}" ${(a.type||'Consultation')===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="af_status">
            ${STATUSES.map(s => `<option value="${s}" ${(a.status||'Scheduled')===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group full">
          <label class="form-label">Reason / Chief Complaint</label>
          <textarea class="form-textarea" id="af_reason" style="min-height:80px">${esc(a.reason||'')}</textarea>
        </div>
        <div class="form-group full">
          <label class="form-label">Notes</label>
          <textarea class="form-textarea" id="af_notes" style="min-height:60px">${esc(a.notes||'')}</textarea>
        </div>
      </div>
    `;
  };

  const collectApptForm = () => {
    const v = (id) => document.getElementById(id)?.value?.trim() || '';
    const patientRaw = v('af_patient');
    const doctorRaw = v('af_doctor');
    if (!patientRaw || !doctorRaw) { toast('Validation', 'Patient and Doctor are required', 'error'); return null; }
    const [patientId, patientName] = patientRaw.split('|');
    const [doctorId, doctorName, department, fee] = doctorRaw.split('|');
    return {
      patientId, patientName: patientName || '',
      doctorId, doctorName: doctorName || '',
      department: department || '',
      fee: parseFloat(fee) || 0,
      date: v('af_date'),
      time: v('af_time'),
      type: v('af_type') || 'Consultation',
      status: v('af_status') || 'Scheduled',
      reason: v('af_reason'),
      notes: v('af_notes'),
    };
  };

  const openAddModal = () => {
    modal.open({
      title: 'Schedule Appointment',
      size: 'lg',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      body: apptFormHTML(),
      footer: `
        <button class="btn btn-secondary" onclick="HMS_Utils.modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="HMS_Appointments._saveNew()">Schedule</button>
      `,
    });
  };

  const _saveNew = () => {
    const data = collectApptForm();
    if (!data) return;
    const existing = HMS_DB.Appointments().getAll();
    data.id = 'A' + String(existing.length + 1).padStart(6, '0');
    HMS_DB.Appointments().create(data);
    modal.close();
    toast('Appointment Scheduled', `${data.patientName} with ${data.doctorName} on ${fmt.date(data.date)}`, 'success');
    HMS_App.updateBadges();
    renderTable();
  };

  const openEditModal = (id) => {
    const a = HMS_DB.Appointments().getById(id);
    if (!a) return;
    modal.open({
      title: 'Edit Appointment',
      size: 'lg',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      body: apptFormHTML(a),
      footer: `
        <button class="btn btn-secondary" onclick="HMS_Utils.modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="HMS_Appointments._saveEdit('${id}')">Save</button>
      `,
    });
  };

  const _saveEdit = (id) => {
    const data = collectApptForm();
    if (!data) return;
    HMS_DB.Appointments().update(id, data);
    modal.close();
    toast('Appointment Updated', 'Changes saved successfully', 'success');
    HMS_App.updateBadges();
    renderTable();
  };

  const cancelAppt = (id) => {
    modal.confirm({
      title: 'Cancel Appointment',
      message: 'Are you sure you want to cancel this appointment?',
      confirmText: 'Cancel Appointment',
      onConfirm: () => {
        HMS_DB.Appointments().update(id, { status: 'Cancelled' });
        toast('Appointment Cancelled', '', 'warning');
        HMS_App.updateBadges();
        renderTable();
      },
    });
  };

  return { render, resetFilters, openAddModal, _saveNew, openEditModal, _saveEdit, cancelAppt };
})();
window.HMS_Appointments = HMS_Appointments;
