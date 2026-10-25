/* ============================================================
   MedCare HMS – Patients Module (Full CRUD, Pagination, Search)
   ============================================================ */

const HMS_Patients = (() => {
  const { fmt, avatarColor, statusBadge, esc, modal, toast, loading, fuzzySearch, debounce, buildPagination, genId } = HMS_Utils;

  let state = {
    page: 1,
    perPage: 15,
    search: '',
    filterStatus: '',
    filterDept: '',
    filterGender: '',
    sort: { field: 'createdAt', dir: -1 },
  };

  const DEPARTMENTS = ['Cardiology','Neurology','Orthopedics','Pediatrics','Oncology','Emergency','Radiology',
    'Psychiatry','Dermatology','Ophthalmology','ENT','Nephrology','Gastroenterology','Pulmonology','Endocrinology',
    'Rheumatology','Urology','Gynecology','Hematology','General Surgery'];
  const STATUSES = ['Active','Admitted','Discharged','Critical','Under Observation','Outpatient'];
  const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
  const GENDERS = ['Male','Female'];

  const render = () => {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="page-breadcrumb">HMS <span>/ Patients</span></div>
          <h1 class="page-title">Patient Management</h1>
          <p class="page-subtitle">Register, manage and track all hospital patients</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="HMS_Patients.exportCSV()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button class="btn btn-primary" onclick="HMS_Patients.openAddModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            Add Patient
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="filter-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="patientSearch" placeholder="Search name, ID, diagnosis..." value="${esc(state.search)}" />
        </div>
        <select class="filter-select" id="filterStatus">
          <option value="">All Statuses</option>
          ${STATUSES.map(s => `<option value="${s}" ${state.filterStatus===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <select class="filter-select" id="filterDept">
          <option value="">All Departments</option>
          ${DEPARTMENTS.map(d => `<option value="${d}" ${state.filterDept===d?'selected':''}>${d}</option>`).join('')}
        </select>
        <select class="filter-select" id="filterGender">
          <option value="">All Genders</option>
          ${GENDERS.map(g => `<option value="${g}" ${state.filterGender===g?'selected':''}>${g}</option>`).join('')}
        </select>
        <select class="filter-select" id="perPageSelect" style="min-width:80px">
          ${[10,15,25,50,100].map(n => `<option value="${n}" ${state.perPage===n?'selected':''}>${n}/pg</option>`).join('')}
        </select>
        <button class="btn btn-secondary btn-sm" onclick="HMS_Patients.resetFilters()">Clear</button>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="table-wrapper" id="patientsTableWrapper">
          <table>
            <thead>
              <tr>
                <th class="${state.sort.field==='fullName'?'sorted':''}" onclick="HMS_Patients.sortBy('fullName')">Patient <span class="sort-icon">↕</span></th>
                <th>Age/Gender</th>
                <th class="${state.sort.field==='department'?'sorted':''}" onclick="HMS_Patients.sortBy('department')">Department <span class="sort-icon">↕</span></th>
                <th>Diagnosis</th>
                <th class="${state.sort.field==='status'?'sorted':''}" onclick="HMS_Patients.sortBy('status')">Status <span class="sort-icon">↕</span></th>
                <th class="${state.sort.field==='admitDate'?'sorted':''}" onclick="HMS_Patients.sortBy('admitDate')">Admitted <span class="sort-icon">↕</span></th>
                <th>Blood</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="patientsTableBody"></tbody>
          </table>
        </div>
        <div class="pagination" id="patientsPagination"></div>
      </div>
    `;

    bindEvents();
    renderTable();
  };

  const getFilteredPatients = () => {
    const DB = HMS_DB.Patients();
    let all = DB.getAll();

    // Search
    if (state.search) {
      all = fuzzySearch(all, state.search, ['fullName','id','diagnosis','phone','email','insurance']);
    }
    // Filters
    if (state.filterStatus) all = all.filter(p => p.status === state.filterStatus);
    if (state.filterDept) all = all.filter(p => p.department === state.filterDept);
    if (state.filterGender) all = all.filter(p => p.gender === state.filterGender);

    // Sort
    const { field, dir } = state.sort;
    all.sort((a, b) => {
      const av = a[field] || '';
      const bv = b[field] || '';
      return dir * (av < bv ? -1 : av > bv ? 1 : 0);
    });

    return all;
  };

  const renderTable = () => {
    const all = getFilteredPatients();
    const total = all.length;
    const totalPages = Math.ceil(total / state.perPage);
    state.page = Math.min(state.page, Math.max(1, totalPages));

    const start = (state.page - 1) * state.perPage;
    const items = all.slice(start, start + state.perPage);

    const tbody = document.getElementById('patientsTableBody');
    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="8">
          <div class="empty-state">
            <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
            <div class="empty-title">No patients found</div>
            <div class="empty-desc">Try adjusting your search or filters</div>
          </div>
        </td></tr>
      `;
    } else {
      tbody.innerHTML = items.map(p => `
        <tr>
          <td>
            <div class="avatar-name">
              <div class="patient-avatar" style="background:${avatarColor(p.fullName)}">${fmt.initials(p.fullName)}</div>
              <div class="avatar-info">
                <div class="avatar-name-text">${esc(p.fullName)}</div>
                <div class="avatar-sub-text">${p.id} · ${esc(p.phone)}</div>
              </div>
            </div>
          </td>
          <td>${p.age}y · ${p.gender}</td>
          <td><span class="badge badge-blue">${esc(p.department)}</span></td>
          <td class="truncate" style="max-width:160px" title="${esc(p.diagnosis)}">${esc(p.diagnosis)}</td>
          <td>${statusBadge(p.status)}</td>
          <td class="text-muted text-sm">${fmt.date(p.admitDate)}</td>
          <td><span class="badge badge-rose">${p.blood}</span></td>
          <td>
            <div style="display:flex;gap:6px">
              <button class="btn btn-secondary btn-sm btn-icon" title="View" onclick="HMS_Patients.viewPatient('${p.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button class="btn btn-secondary btn-sm btn-icon" title="Edit" onclick="HMS_Patients.openEditModal('${p.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-danger btn-sm btn-icon" title="Delete" onclick="HMS_Patients.deletePatient('${p.id}', '${esc(p.fullName)}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    // Pagination
    const pag = document.getElementById('patientsPagination');
    if (pag) {
      pag.innerHTML = buildPagination({ page: state.page, totalPages, total, perPage: state.perPage, onPageChange: (p) => { state.page = p; renderTable(); } });
      pag.querySelectorAll('.page-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = parseInt(btn.dataset.page);
          if (p >= 1 && p <= totalPages) { state.page = p; renderTable(); }
        });
      });
    }
  };

  const bindEvents = () => {
    // Search
    const search = document.getElementById('patientSearch');
    search?.addEventListener('input', debounce(e => { state.search = e.target.value; state.page = 1; renderTable(); }, 300));

    // Filters
    ['filterStatus','filterDept','filterGender'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', (e) => {
        state[id.replace('filter','filter')] = e.target.value;
        if (id === 'filterStatus') state.filterStatus = e.target.value;
        if (id === 'filterDept') state.filterDept = e.target.value;
        if (id === 'filterGender') state.filterGender = e.target.value;
        state.page = 1; renderTable();
      });
    });

    // Per page
    document.getElementById('perPageSelect')?.addEventListener('change', (e) => {
      state.perPage = parseInt(e.target.value); state.page = 1; renderTable();
    });
  };

  const sortBy = (field) => {
    if (state.sort.field === field) state.sort.dir *= -1;
    else { state.sort.field = field; state.sort.dir = 1; }
    renderTable();
    // Update headers
    document.querySelectorAll('thead th').forEach(th => th.classList.remove('sorted'));
  };

  const resetFilters = () => {
    state = { ...state, search: '', filterStatus: '', filterDept: '', filterGender: '', page: 1 };
    render();
  };

  // ── Patient Form HTML ──
  const patientFormHTML = (p = {}) => `
    <div class="form-grid form-grid-2">
      <div class="form-group">
        <label class="form-label">First Name <span class="form-required">*</span></label>
        <input class="form-input" id="f_firstName" value="${esc(p.firstName || '')}" placeholder="John" required />
      </div>
      <div class="form-group">
        <label class="form-label">Last Name <span class="form-required">*</span></label>
        <input class="form-input" id="f_lastName" value="${esc(p.lastName || '')}" placeholder="Smith" required />
      </div>
      <div class="form-group">
        <label class="form-label">Date of Birth <span class="form-required">*</span></label>
        <input class="form-input" type="date" id="f_dob" value="${esc(p.dob || '')}" required />
      </div>
      <div class="form-group">
        <label class="form-label">Gender <span class="form-required">*</span></label>
        <select class="form-select" id="f_gender">
          <option value="">Select Gender</option>
          ${GENDERS.map(g => `<option value="${g}" ${p.gender===g?'selected':''}>${g}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Blood Group</label>
        <select class="form-select" id="f_blood">
          <option value="">Unknown</option>
          ${BLOOD_GROUPS.map(b => `<option value="${b}" ${p.blood===b?'selected':''}>${b}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Phone <span class="form-required">*</span></label>
        <input class="form-input" id="f_phone" value="${esc(p.phone || '')}" placeholder="+1-555-000-0000" required />
      </div>
      <div class="form-group full">
        <label class="form-label">Email</label>
        <input class="form-input" type="email" id="f_email" value="${esc(p.email || '')}" placeholder="patient@email.com" />
      </div>
      <div class="form-group full">
        <label class="form-label">Address</label>
        <input class="form-input" id="f_address" value="${esc(p.address || '')}" placeholder="Street address" />
      </div>
      <div class="form-group">
        <label class="form-label">City</label>
        <input class="form-input" id="f_city" value="${esc(p.city || '')}" placeholder="New York" />
      </div>
      <div class="form-group">
        <label class="form-label">State</label>
        <input class="form-input" id="f_state" value="${esc(p.state || '')}" placeholder="NY" />
      </div>
      <div class="form-group">
        <label class="form-label">Department <span class="form-required">*</span></label>
        <select class="form-select" id="f_dept">
          <option value="">Select Department</option>
          ${DEPARTMENTS.map(d => `<option value="${d}" ${p.department===d?'selected':''}>${d}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="f_status">
          ${STATUSES.map(s => `<option value="${s}" ${(p.status||'Active')===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full">
        <label class="form-label">Diagnosis</label>
        <input class="form-input" id="f_diagnosis" value="${esc(p.diagnosis || '')}" placeholder="Primary diagnosis" />
      </div>
      <div class="form-group">
        <label class="form-label">Weight (kg)</label>
        <input class="form-input" type="number" id="f_weight" value="${esc(p.weight || '')}" placeholder="70.0" step="0.1" />
      </div>
      <div class="form-group">
        <label class="form-label">Height (cm)</label>
        <input class="form-input" type="number" id="f_height" value="${esc(p.height || '')}" placeholder="170" step="0.1" />
      </div>
      <div class="form-group full">
        <label class="form-label">Allergies</label>
        <input class="form-input" id="f_allergies" value="${esc(p.allergies || 'NKDA')}" placeholder="NKDA or list allergies" />
      </div>
      <div class="form-group">
        <label class="form-label">Insurance Provider</label>
        <input class="form-input" id="f_insurance" value="${esc(p.insurance || '')}" placeholder="Insurance name" />
      </div>
      <div class="form-group">
        <label class="form-label">Insurance ID</label>
        <input class="form-input" id="f_insuranceId" value="${esc(p.insuranceId || '')}" placeholder="INS000000" />
      </div>
      <div class="form-group">
        <label class="form-label">Emergency Contact</label>
        <input class="form-input" id="f_emergencyContact" value="${esc(p.emergencyContact || '')}" placeholder="Contact name" />
      </div>
      <div class="form-group">
        <label class="form-label">Emergency Phone</label>
        <input class="form-input" id="f_emergencyPhone" value="${esc(p.emergencyPhone || '')}" placeholder="+1-555-000-0000" />
      </div>
      <div class="form-group full">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" id="f_notes" placeholder="Additional clinical notes...">${esc(p.notes || '')}</textarea>
      </div>
    </div>
  `;

  const collectForm = () => {
    const v = (id) => document.getElementById(id)?.value?.trim() || '';
    const firstName = v('f_firstName'), lastName = v('f_lastName');
    if (!firstName || !lastName) { toast('Validation Error', 'First and last name are required', 'error'); return null; }
    if (!v('f_phone')) { toast('Validation Error', 'Phone number is required', 'error'); return null; }
    if (!v('f_dept')) { toast('Validation Error', 'Department is required', 'error'); return null; }

    const dob = v('f_dob');
    const age = dob ? fmt.age(dob) : 0;
    return {
      firstName, lastName,
      fullName: `${firstName} ${lastName}`,
      dob, age,
      gender: v('f_gender'),
      blood: v('f_blood'),
      phone: v('f_phone'),
      email: v('f_email'),
      address: v('f_address'),
      city: v('f_city'),
      state: v('f_state'),
      department: v('f_dept'),
      status: v('f_status') || 'Active',
      diagnosis: v('f_diagnosis'),
      weight: parseFloat(v('f_weight')) || null,
      height: parseFloat(v('f_height')) || null,
      allergies: v('f_allergies') || 'NKDA',
      insurance: v('f_insurance'),
      insuranceId: v('f_insuranceId'),
      emergencyContact: v('f_emergencyContact'),
      emergencyPhone: v('f_emergencyPhone'),
      notes: v('f_notes'),
      admitDate: new Date().toISOString().split('T')[0],
    };
  };

  // ── CRUD ──
  const openAddModal = () => {
    modal.open({
      title: 'Register New Patient',
      size: 'lg',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      body: patientFormHTML(),
      footer: `
        <button class="btn btn-secondary" onclick="HMS_Utils.modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="HMS_Patients._saveNew()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          Register Patient
        </button>
      `,
    });
  };

  const _saveNew = () => {
    const data = collectForm();
    if (!data) return;
    const all = HMS_DB.Patients().getAll();
    const existingIds = all.map(p => p.id);
    data.id = genId('P', existingIds);
    HMS_DB.Patients().create(data);
    modal.close();
    toast('Patient Registered', `${data.fullName} added successfully`, 'success');
    HMS_App.updateBadges();
    renderTable();
  };

  const openEditModal = (id) => {
    const p = HMS_DB.Patients().getById(id);
    if (!p) return;
    modal.open({
      title: `Edit Patient: ${p.fullName}`,
      size: 'lg',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      body: patientFormHTML(p),
      footer: `
        <button class="btn btn-secondary" onclick="HMS_Utils.modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="HMS_Patients._saveEdit('${id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Save Changes
        </button>
      `,
    });
  };

  const _saveEdit = (id) => {
    const data = collectForm();
    if (!data) return;
    HMS_DB.Patients().update(id, data);
    modal.close();
    toast('Patient Updated', 'Patient record saved successfully', 'success');
    renderTable();
  };

  const deletePatient = (id, name) => {
    modal.confirm({
      title: 'Delete Patient',
      message: `Are you sure you want to permanently delete <strong>${esc(name)}</strong>? This action cannot be undone.`,
      confirmText: 'Delete Patient',
      onConfirm: () => {
        HMS_DB.Patients().delete(id);
        toast('Patient Deleted', `${name} has been removed`, 'warning');
        HMS_App.updateBadges();
        renderTable();
      },
    });
  };

  const viewPatient = (id) => {
    const p = HMS_DB.Patients().getById(id);
    if (!p) return;
    const bmi = p.weight && p.height ? (p.weight / Math.pow(p.height / 100, 2)).toFixed(1) : '—';

    modal.open({
      title: `Patient Profile`,
      size: 'lg',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
      body: `
        <div style="display:flex;gap:20px;flex-wrap:wrap">
          <div style="text-align:center;min-width:160px">
            <div class="patient-avatar" style="width:72px;height:72px;font-size:24px;background:${avatarColor(p.fullName)};margin:0 auto 12px">${fmt.initials(p.fullName)}</div>
            <div style="font-size:18px;font-weight:700">${esc(p.fullName)}</div>
            <div style="font-size:12px;color:var(--text-muted);margin:4px 0">${p.id}</div>
            ${statusBadge(p.status)}
            <div style="margin-top:12px">${p.blood ? `<span class="badge badge-rose" style="font-size:14px">${p.blood}</span>` : ''}</div>
          </div>
          <div style="flex:1;min-width:240px">
            <div class="vitals-grid">
              <div class="vital-card"><div class="vital-icon">🎂</div><div class="vital-value">${p.age}</div><div class="vital-unit">years</div><div class="vital-label">Age</div></div>
              <div class="vital-card"><div class="vital-icon">⚖️</div><div class="vital-value">${p.weight || '—'}</div><div class="vital-unit">kg</div><div class="vital-label">Weight</div></div>
              <div class="vital-card"><div class="vital-icon">📏</div><div class="vital-value">${p.height || '—'}</div><div class="vital-unit">cm</div><div class="vital-label">Height</div></div>
              <div class="vital-card"><div class="vital-icon">📊</div><div class="vital-value">${bmi}</div><div class="vital-unit">BMI</div><div class="vital-label">Index</div></div>
              <div class="vital-card"><div class="vital-icon">♂</div><div class="vital-value" style="font-size:14px">${p.gender}</div><div class="vital-label">Gender</div></div>
              <div class="vital-card"><div class="vital-icon">🏥</div><div class="vital-value" style="font-size:11px">${esc(p.department)}</div><div class="vital-label">Dept.</div></div>
            </div>
            <div class="divider"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
              <div><span style="color:var(--text-muted)">Phone:</span> ${esc(p.phone)}</div>
              <div><span style="color:var(--text-muted)">Email:</span> ${esc(p.email)}</div>
              <div><span style="color:var(--text-muted)">Diagnosis:</span> ${esc(p.diagnosis)}</div>
              <div><span style="color:var(--text-muted)">Allergies:</span> ${esc(p.allergies)}</div>
              <div><span style="color:var(--text-muted)">Insurance:</span> ${esc(p.insurance)}</div>
              <div><span style="color:var(--text-muted)">Admitted:</span> ${fmt.date(p.admitDate)}</div>
              <div><span style="color:var(--text-muted)">Emergency:</span> ${esc(p.emergencyContact)}</div>
              <div><span style="color:var(--text-muted)">Emerg. Ph:</span> ${esc(p.emergencyPhone)}</div>
              <div style="grid-column:1/-1"><span style="color:var(--text-muted)">Address:</span> ${esc(p.address)}, ${esc(p.city)}, ${esc(p.state)}</div>
              ${p.notes ? `<div style="grid-column:1/-1"><span style="color:var(--text-muted)">Notes:</span> ${esc(p.notes)}</div>` : ''}
            </div>
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="HMS_Utils.modal.close()">Close</button>
        <button class="btn btn-primary" onclick="HMS_Utils.modal.close();HMS_Patients.openEditModal('${id}')">Edit Patient</button>
      `,
    });
  };

  // ── Export CSV ──
  const exportCSV = () => {
    const patients = getFilteredPatients();
    const headers = ['ID','Full Name','Age','Gender','Blood','Phone','Email','Department','Status','Diagnosis','Admitted','Insurance'];
    const rows = patients.map(p => [
      p.id, p.fullName, p.age, p.gender, p.blood, p.phone, p.email,
      p.department, p.status, p.diagnosis, p.admitDate, p.insurance
    ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `patients_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Export Complete', `${patients.length} patients exported`, 'success');
  };

  return { render, sortBy, resetFilters, openAddModal, _saveNew, openEditModal, _saveEdit, deletePatient, viewPatient, exportCSV };
})();
window.HMS_Patients = HMS_Patients;
