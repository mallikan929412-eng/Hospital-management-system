/* ============================================================
   MedCare HMS – Doctors Module (Card View + Table + CRUD)
   ============================================================ */

const HMS_Doctors = (() => {
  const { fmt, avatarColor, statusBadge, esc, modal, toast, loading, fuzzySearch, debounce, buildPagination, genId } = HMS_Utils;

  let state = { page: 1, perPage: 12, search: '', filterDept: '', filterStatus: '', viewMode: 'cards', sort: { field: 'fullName', dir: 1 } };

  const DEPARTMENTS = ['Cardiology','Neurology','Orthopedics','Pediatrics','Oncology','Emergency','Radiology',
    'Psychiatry','Dermatology','Ophthalmology','ENT','Nephrology','Gastroenterology','Pulmonology','Endocrinology',
    'Rheumatology','Urology','Gynecology','Hematology','General Surgery'];

  const STATUSES = ['Available','On Duty','On Leave','Off Duty'];

  const STATUS_DOT_COLORS = { 'Available': '#10B981', 'On Duty': '#3B82F6', 'On Leave': '#F59E0B', 'Off Duty': '#64748B' };

  const CARD_COLORS = { 'Available': '#10B981', 'On Duty': '#3B82F6', 'On Leave': '#F59E0B', 'Off Duty': '#64748B' };

  const render = () => {
    const content = document.getElementById('pageContent');
    const stats = calcStats();
    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="page-breadcrumb">HMS <span>/ Doctors</span></div>
          <h1 class="page-title">Doctor Management</h1>
          <p class="page-subtitle">Manage medical staff, specializations & schedules</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" id="viewToggleBtn" onclick="HMS_Doctors.toggleView()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            ${state.viewMode === 'cards' ? 'Table View' : 'Card View'}
          </button>
          <button class="btn btn-primary" onclick="HMS_Doctors.openAddModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            Add Doctor
          </button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="dashboard-grid" style="margin-bottom:24px">
        ${miniStat('Total Doctors', fmt.number(stats.total), 'badge-blue')}
        ${miniStat('Available', fmt.number(stats.available), 'badge-emerald')}
        ${miniStat('On Duty', fmt.number(stats.onDuty), 'badge-blue')}
        ${miniStat('On Leave', fmt.number(stats.onLeave), 'badge-amber')}
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="filter-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="doctorSearch" placeholder="Search name, department, license..." value="${esc(state.search)}" />
        </div>
        <select class="filter-select" id="filterDoctorDept">
          <option value="">All Departments</option>
          ${DEPARTMENTS.map(d => `<option value="${d}" ${state.filterDept===d?'selected':''}>${d}</option>`).join('')}
        </select>
        <select class="filter-select" id="filterDoctorStatus">
          <option value="">All Statuses</option>
          ${STATUSES.map(s => `<option value="${s}" ${state.filterStatus===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <button class="btn btn-secondary btn-sm" onclick="HMS_Doctors.resetFilters()">Clear</button>
      </div>

      <!-- Content -->
      <div id="doctorsContent"></div>
    `;

    bindEvents();
    renderContent();
  };

  const calcStats = () => {
    const all = HMS_DB.Doctors().getAll();
    return {
      total: all.length,
      available: all.filter(d => d.status === 'Available').length,
      onDuty: all.filter(d => d.status === 'On Duty').length,
      onLeave: all.filter(d => d.status === 'On Leave').length,
    };
  };

  const miniStat = (label, value, cls) => `
    <div class="stat-card" style="padding:18px">
      <div class="stat-label">${label}</div>
      <div class="stat-value" style="font-size:28px">${value}</div>
    </div>
  `;

  const getFiltered = () => {
    let all = HMS_DB.Doctors().getAll();
    if (state.search) all = fuzzySearch(all, state.search, ['fullName','department','specialization','licenseNo','email']);
    if (state.filterDept) all = all.filter(d => d.department === state.filterDept);
    if (state.filterStatus) all = all.filter(d => d.status === state.filterStatus);
    const { field, dir } = state.sort;
    all.sort((a, b) => dir * (String(a[field]||'') < String(b[field]||'') ? -1 : 1));
    return all;
  };

  const renderContent = () => {
    const container = document.getElementById('doctorsContent');
    if (!container) return;
    if (state.viewMode === 'cards') renderCards(container);
    else renderTable(container);
  };

  const renderCards = (container) => {
    const all = getFiltered();
    const total = all.length;
    const totalPages = Math.ceil(total / state.perPage);
    state.page = Math.min(state.page, Math.max(1, totalPages));
    const items = all.slice((state.page-1)*state.perPage, state.page*state.perPage);

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div class="empty-title">No doctors found</div><div class="empty-desc">Try adjusting your search or filters</div></div>`;
      return;
    }

    container.innerHTML = `
      <div class="doctors-grid">
        ${items.map(d => doctorCard(d)).join('')}
      </div>
      <div class="pagination card" id="doctorsPagination"></div>
    `;

    const pag = document.getElementById('doctorsPagination');
    if (pag) {
      pag.innerHTML = buildPagination({ page: state.page, totalPages, total, perPage: state.perPage });
      pag.querySelectorAll('.page-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => { state.page = parseInt(btn.dataset.page); renderContent(); });
      });
    }
  };

  const doctorCard = (d) => {
    const color = avatarColor(d.fullName);
    const statusColor = CARD_COLORS[d.status] || '#64748B';
    const stars = '★'.repeat(Math.round(d.rating || 4)) + '☆'.repeat(5 - Math.round(d.rating || 4));
    return `
      <div class="doctor-card" style="--card-accent:${statusColor}">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${statusColor}"></div>
        <div class="doctor-card-header">
          <div class="doctor-avatar-wrap">
            <div class="doctor-avatar" style="width:52px;height:52px;font-size:18px;background:${color}">${fmt.initials(d.fullName)}</div>
            <div class="doctor-status-dot" style="background:${statusColor}"></div>
          </div>
          <div class="doctor-card-info">
            <div class="doctor-card-name">${esc(d.fullName)}</div>
            <div class="doctor-card-title">${esc(d.specialization)}</div>
            <div class="doctor-card-dept"><span class="badge badge-blue" style="font-size:11px">${esc(d.department)}</span></div>
          </div>
          ${statusBadge(d.status)}
        </div>

        <div class="doctor-card-meta">
          <div class="doctor-meta-item">
            <div class="doctor-meta-label">Experience</div>
            <div class="doctor-meta-value">${d.experience} yrs</div>
          </div>
          <div class="doctor-meta-item">
            <div class="doctor-meta-label">Fee</div>
            <div class="doctor-meta-value">${fmt.currency(d.consultationFee)}</div>
          </div>
          <div class="doctor-meta-item">
            <div class="doctor-meta-label">Rating</div>
            <div class="doctor-meta-value doctor-rating"><span class="star">${stars.slice(0,1)}</span> ${d.rating}</div>
          </div>
          <div class="doctor-meta-item">
            <div class="doctor-meta-label">Patients</div>
            <div class="doctor-meta-value">${fmt.number(d.patientsCount)}</div>
          </div>
        </div>

        <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px">
          📍 ${esc(d.room)} &nbsp;·&nbsp; 🕐 ${esc(d.availableHours)}
        </div>

        <div class="doctor-card-footer">
          <button class="btn btn-secondary btn-sm" style="flex:1" onclick="HMS_Doctors.viewDoctor('${d.id}')">View Profile</button>
          <button class="btn btn-secondary btn-sm btn-icon" title="Edit" onclick="HMS_Doctors.openEditModal('${d.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-danger btn-sm btn-icon" title="Delete" onclick="HMS_Doctors.deleteDoctor('${d.id}', '${esc(d.fullName)}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
    `;
  };

  const renderTable = (container) => {
    const all = getFiltered();
    const total = all.length;
    const totalPages = Math.ceil(total / state.perPage);
    state.page = Math.min(state.page, Math.max(1, totalPages));
    const items = all.slice((state.page-1)*state.perPage, state.page*state.perPage);

    container.innerHTML = `
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead><tr>
              <th>Doctor</th><th>Department</th><th>Specialization</th><th>Experience</th><th>Fee</th><th>Status</th><th>Rating</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${items.map(d => `
                <tr>
                  <td>
                    <div class="avatar-name">
                      <div class="doctor-avatar" style="background:${avatarColor(d.fullName)}">${fmt.initials(d.fullName)}</div>
                      <div class="avatar-info">
                        <div class="avatar-name-text">${esc(d.fullName)}</div>
                        <div class="avatar-sub-text">${d.id} · ${esc(d.licenseNo)}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="badge badge-blue">${esc(d.department)}</span></td>
                  <td class="text-sm text-muted">${esc(d.specialization)}</td>
                  <td>${d.experience} yrs</td>
                  <td>${fmt.currency(d.consultationFee)}</td>
                  <td>${statusBadge(d.status)}</td>
                  <td>⭐ ${d.rating}</td>
                  <td>
                    <div style="display:flex;gap:6px">
                      <button class="btn btn-secondary btn-sm btn-icon" onclick="HMS_Doctors.viewDoctor('${d.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button class="btn btn-secondary btn-sm btn-icon" onclick="HMS_Doctors.openEditModal('${d.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button class="btn btn-danger btn-sm btn-icon" onclick="HMS_Doctors.deleteDoctor('${d.id}', '${esc(d.fullName)}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="pagination" id="doctorsPagination"></div>
      </div>
    `;

    const pag = document.getElementById('doctorsPagination');
    if (pag) {
      pag.innerHTML = buildPagination({ page: state.page, totalPages, total, perPage: state.perPage });
      pag.querySelectorAll('.page-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => { state.page = parseInt(btn.dataset.page); renderContent(); });
      });
    }
  };

  const bindEvents = () => {
    document.getElementById('doctorSearch')?.addEventListener('input', debounce(e => { state.search = e.target.value; state.page = 1; renderContent(); }, 300));
    document.getElementById('filterDoctorDept')?.addEventListener('change', e => { state.filterDept = e.target.value; state.page = 1; renderContent(); });
    document.getElementById('filterDoctorStatus')?.addEventListener('change', e => { state.filterStatus = e.target.value; state.page = 1; renderContent(); });
  };

  const toggleView = () => {
    state.viewMode = state.viewMode === 'cards' ? 'table' : 'cards';
    state.perPage = state.viewMode === 'cards' ? 12 : 15;
    renderContent();
    const btn = document.getElementById('viewToggleBtn');
    if (btn) btn.innerHTML = state.viewMode === 'cards' ?
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> Table View` :
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> Card View`;
  };

  const resetFilters = () => { state = { ...state, search:'', filterDept:'', filterStatus:'', page:1 }; render(); };

  // ── Doctor Form ──
  const doctorFormHTML = (d = {}) => `
    <div class="form-grid form-grid-2">
      <div class="form-group">
        <label class="form-label">First Name <span class="form-required">*</span></label>
        <input class="form-input" id="df_firstName" value="${esc(d.firstName||'')}" placeholder="John" />
      </div>
      <div class="form-group">
        <label class="form-label">Last Name <span class="form-required">*</span></label>
        <input class="form-input" id="df_lastName" value="${esc(d.lastName||'')}" placeholder="Smith" />
      </div>
      <div class="form-group">
        <label class="form-label">Gender</label>
        <select class="form-select" id="df_gender">
          ${['Male','Female'].map(g => `<option value="${g}" ${d.gender===g?'selected':''}>${g}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Department <span class="form-required">*</span></label>
        <select class="form-select" id="df_dept">
          <option value="">Select Department</option>
          ${DEPARTMENTS.map(dept => `<option value="${dept}" ${d.department===dept?'selected':''}>${dept}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Specialization</label>
        <input class="form-input" id="df_spec" value="${esc(d.specialization||'')}" placeholder="e.g. Interventional Cardiology" />
      </div>
      <div class="form-group">
        <label class="form-label">Qualification</label>
        <input class="form-input" id="df_qual" value="${esc(d.qualification||'')}" placeholder="MBBS, MD, etc." />
      </div>
      <div class="form-group">
        <label class="form-label">Phone <span class="form-required">*</span></label>
        <input class="form-input" id="df_phone" value="${esc(d.phone||'')}" placeholder="+1-555-000-0000" />
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input class="form-input" type="email" id="df_email" value="${esc(d.email||'')}" placeholder="dr.smith@medcare.hospital" />
      </div>
      <div class="form-group">
        <label class="form-label">License No. <span class="form-required">*</span></label>
        <input class="form-input" id="df_license" value="${esc(d.licenseNo||'')}" placeholder="LIC000000" />
      </div>
      <div class="form-group">
        <label class="form-label">Experience (years)</label>
        <input class="form-input" type="number" id="df_exp" value="${d.experience||''}" min="0" max="50" />
      </div>
      <div class="form-group">
        <label class="form-label">Consultation Fee ($)</label>
        <input class="form-input" type="number" id="df_fee" value="${d.consultationFee||''}" min="0" />
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="df_status">
          ${STATUSES.map(s => `<option value="${s}" ${(d.status||'Available')===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Room</label>
        <input class="form-input" id="df_room" value="${esc(d.room||'')}" placeholder="Room 101" />
      </div>
      <div class="form-group">
        <label class="form-label">Available Hours</label>
        <input class="form-input" id="df_hours" value="${esc(d.availableHours||'9:00 AM - 5:00 PM')}" />
      </div>
      <div class="form-group full">
        <label class="form-label">Bio</label>
        <textarea class="form-textarea" id="df_bio" style="min-height:80px">${esc(d.bio||'')}</textarea>
      </div>
    </div>
  `;

  const collectForm = () => {
    const v = (id) => document.getElementById(id)?.value?.trim() || '';
    const firstName = v('df_firstName'), lastName = v('df_lastName');
    if (!firstName || !lastName) { toast('Validation', 'First & Last name required', 'error'); return null; }
    if (!v('df_license')) { toast('Validation', 'License number required', 'error'); return null; }
    return {
      firstName, lastName,
      fullName: `Dr. ${firstName} ${lastName}`,
      gender: v('df_gender'),
      department: v('df_dept'),
      specialization: v('df_spec'),
      qualification: v('df_qual'),
      phone: v('df_phone'),
      email: v('df_email'),
      licenseNo: v('df_license'),
      experience: parseInt(v('df_exp')) || 0,
      consultationFee: parseFloat(v('df_fee')) || 0,
      status: v('df_status') || 'Available',
      room: v('df_room'),
      availableHours: v('df_hours'),
      bio: v('df_bio'),
      rating: 4.0,
      patientsCount: 0,
      joinDate: new Date().toISOString().split('T')[0],
    };
  };

  const openAddModal = () => {
    modal.open({
      title: 'Add New Doctor',
      size: 'lg',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 11v4m-2-2h4"/></svg>',
      body: doctorFormHTML(),
      footer: `
        <button class="btn btn-secondary" onclick="HMS_Utils.modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="HMS_Doctors._saveNew()">Add Doctor</button>
      `,
    });
  };

  const _saveNew = () => {
    const data = collectForm();
    if (!data) return;
    const existing = HMS_DB.Doctors().getAll().map(d => d.id);
    data.id = genId('D', existing);
    HMS_DB.Doctors().create(data);
    modal.close();
    toast('Doctor Added', `${data.fullName} registered`, 'success');
    renderContent();
  };

  const openEditModal = (id) => {
    const d = HMS_DB.Doctors().getById(id);
    if (!d) return;
    modal.open({
      title: `Edit: ${d.fullName}`,
      size: 'lg',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      body: doctorFormHTML(d),
      footer: `
        <button class="btn btn-secondary" onclick="HMS_Utils.modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="HMS_Doctors._saveEdit('${id}')">Save Changes</button>
      `,
    });
  };

  const _saveEdit = (id) => {
    const data = collectForm();
    if (!data) return;
    HMS_DB.Doctors().update(id, data);
    modal.close();
    toast('Doctor Updated', 'Profile saved successfully', 'success');
    renderContent();
  };

  const deleteDoctor = (id, name) => {
    modal.confirm({
      title: 'Remove Doctor',
      message: `Are you sure you want to remove <strong>${esc(name)}</strong>? Associated appointments will remain in the system.`,
      confirmText: 'Remove',
      onConfirm: () => { HMS_DB.Doctors().delete(id); toast('Doctor Removed', `${name} removed`, 'warning'); renderContent(); },
    });
  };

  const viewDoctor = (id) => {
    const d = HMS_DB.Doctors().getById(id);
    if (!d) return;
    const color = avatarColor(d.fullName);
    const days = (d.availableDays || []).join(', ');
    modal.open({
      title: 'Doctor Profile',
      size: 'lg',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      body: `
        <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">
          <div style="text-align:center;min-width:160px">
            <div class="doctor-avatar" style="width:80px;height:80px;font-size:28px;background:${color};margin:0 auto 12px">${fmt.initials(d.fullName)}</div>
            <div style="font-size:20px;font-weight:700">${esc(d.fullName)}</div>
            <div style="font-size:13px;color:var(--text-muted)">${esc(d.specialization)}</div>
            <div style="margin:10px 0">${statusBadge(d.status)}</div>
            <div style="font-size:20px;color:var(--amber)">
              ${'★'.repeat(Math.round(d.rating))}${'☆'.repeat(5-Math.round(d.rating))} <span style="font-size:14px;color:var(--text-muted)">${d.rating}</span>
            </div>
          </div>
          <div style="flex:1;min-width:240px">
            <div class="doctors-grid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
              ${[
                ['Department', d.department],
                ['Qualification', d.qualification],
                ['Experience', `${d.experience} years`],
                ['Consultation Fee', fmt.currency(d.consultationFee)],
                ['License No.', d.licenseNo],
                ['Room', d.room],
                ['Hours', d.availableHours],
                ['Available Days', days || 'Mon-Fri'],
                ['Phone', d.phone],
                ['Email', d.email],
                ['Patients Seen', fmt.number(d.patientsCount)],
                ['Joined', fmt.date(d.joinDate)],
              ].map(([label, value]) => `
                <div style="background:var(--glass-bg);border:1px solid var(--border);border-radius:var(--radius-md);padding:10px">
                  <div style="font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">${label}</div>
                  <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-top:3px">${esc(value)}</div>
                </div>
              `).join('')}
            </div>
            ${d.bio ? `<div style="font-size:13px;color:var(--text-secondary);line-height:1.6;padding:12px;background:var(--glass-bg);border:1px solid var(--border);border-radius:var(--radius-md)">${esc(d.bio)}</div>` : ''}
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="HMS_Utils.modal.close()">Close</button>
        <button class="btn btn-primary" onclick="HMS_Utils.modal.close();HMS_Doctors.openEditModal('${id}')">Edit Profile</button>
      `,
    });
  };

  return { render, toggleView, resetFilters, openAddModal, _saveNew, openEditModal, _saveEdit, deleteDoctor, viewDoctor };
})();
window.HMS_Doctors = HMS_Doctors;
