/* ============================================================
   MedCare HMS – Billing Module (Invoices + Payment Tracking)
   ============================================================ */

const HMS_Billing = (() => {
  const { fmt, avatarColor, statusBadge, esc, modal, toast, fuzzySearch, debounce, buildPagination, genId } = HMS_Utils;

  let state = { page: 1, perPage: 15, search: '', filterStatus: '', filterDept: '', sort: { field: 'billDate', dir: -1 } };
  const STATUSES = ['Paid','Pending','Partial','Overdue','Cancelled','Refunded'];
  const PAYMENT_METHODS = ['Cash','Credit Card','Debit Card','Insurance','Bank Transfer','Cheque','Online Payment'];

  const SERVICES = [
    { name: 'Consultation Fee', price: 200 },
    { name: 'X-Ray', price: 300 },
    { name: 'MRI Scan', price: 1500 },
    { name: 'CT Scan', price: 1200 },
    { name: 'Blood Panel', price: 150 },
    { name: 'ECG', price: 180 },
    { name: 'Echocardiogram', price: 600 },
    { name: 'Ultrasound', price: 350 },
    { name: 'Surgery (Minor)', price: 3000 },
    { name: 'Surgery (Major)', price: 15000 },
    { name: 'ICU per Day', price: 1500 },
    { name: 'General Ward per Day', price: 400 },
    { name: 'Private Room per Day', price: 800 },
    { name: 'Physiotherapy Session', price: 150 },
    { name: 'Dialysis', price: 700 },
    { name: 'Chemotherapy', price: 5000 },
    { name: 'Lab Tests', price: 200 },
    { name: 'Medication Charges', price: 500 },
    { name: 'Endoscopy', price: 1000 },
    { name: 'Angiography', price: 2500 },
  ];

  const render = () => {
    const content = document.getElementById('pageContent');
    const bills = HMS_DB.Billing().getAll();
    const totalRevenue = bills.reduce((s, b) => s + (b.total || 0), 0);
    const collected = bills.reduce((s, b) => s + (b.paid || 0), 0);
    const pending = bills.reduce((s, b) => s + (b.balance || 0), 0);
    const overdue = bills.filter(b => b.status === 'Overdue').length;

    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="page-breadcrumb">HMS <span>/ Billing</span></div>
          <h1 class="page-title">Billing & Invoices</h1>
          <p class="page-subtitle">Manage invoices, track payments, and generate bills</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="HMS_Billing.exportCSV()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
          <button class="btn btn-primary" onclick="HMS_Billing.openAddModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            New Invoice
          </button>
        </div>
      </div>

      <!-- Revenue Stats -->
      <div class="dashboard-grid" style="margin-bottom:24px">
        <div class="stat-card emerald">
          <div class="stat-header">
            <div><div class="stat-label">Total Billed</div><div class="stat-value">${fmt.shortNumber(totalRevenue)}</div></div>
            <div class="stat-icon emerald"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          </div>
          <span class="stat-change up">↑ +8.2% vs last month</span>
        </div>
        <div class="stat-card blue">
          <div class="stat-header">
            <div><div class="stat-label">Collected</div><div class="stat-value">${fmt.shortNumber(collected)}</div></div>
            <div class="stat-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
          </div>
          <span class="stat-change up">↑ ${fmt.percent(collected, totalRevenue)} collection rate</span>
        </div>
        <div class="stat-card amber">
          <div class="stat-header">
            <div><div class="stat-label">Outstanding</div><div class="stat-value">${fmt.shortNumber(pending)}</div></div>
            <div class="stat-icon amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
          </div>
          <span class="stat-change down">↓ ${fmt.percent(pending, totalRevenue)} unpaid</span>
        </div>
        <div class="stat-card rose">
          <div class="stat-header">
            <div><div class="stat-label">Overdue Invoices</div><div class="stat-value">${fmt.number(overdue)}</div></div>
            <div class="stat-icon rose"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          </div>
          <span class="stat-change down">Need immediate attention</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <div class="filter-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="billSearch" placeholder="Search invoice ID, patient, doctor..." value="${esc(state.search)}" />
        </div>
        <select class="filter-select" id="filterBillStatus">
          <option value="">All Statuses</option>
          ${STATUSES.map(s => `<option value="${s}" ${state.filterStatus===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <select class="filter-select" id="perPageBill">
          ${[10,15,25,50].map(n => `<option value="${n}" ${state.perPage===n?'selected':''}>${n}/page</option>`).join('')}
        </select>
        <button class="btn btn-secondary btn-sm" onclick="HMS_Billing.resetFilters()">Clear</button>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead><tr>
              <th>Invoice</th><th>Patient</th><th>Doctor</th><th>Department</th><th>Date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody id="billTableBody"></tbody>
          </table>
        </div>
        <div class="pagination" id="billPagination"></div>
      </div>
    `;

    bindEvents();
    renderTable();
  };

  const getFiltered = () => {
    let all = HMS_DB.Billing().getAll();
    if (state.search) all = fuzzySearch(all, state.search, ['id','patientName','doctorName','department','insurance']);
    if (state.filterStatus) all = all.filter(b => b.status === state.filterStatus);
    const { field, dir } = state.sort;
    all.sort((a, b) => dir * (String(a[field]||'') < String(b[field]||'') ? -1 : 1));
    return all;
  };

  const renderTable = () => {
    const all = getFiltered();
    const total = all.length;
    const totalPages = Math.ceil(total / state.perPage);
    state.page = Math.min(state.page, Math.max(1, totalPages));
    const items = all.slice((state.page-1)*state.perPage, state.page*state.perPage);

    const tbody = document.getElementById('billTableBody');
    if (!tbody) return;

    tbody.innerHTML = items.length === 0 ? `<tr><td colspan="10"><div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div><div class="empty-title">No invoices found</div></div></td></tr>` :
      items.map(b => `
        <tr>
          <td class="text-sm font-bold" style="color:var(--blue-light)">${b.id}</td>
          <td>
            <div class="avatar-name">
              <div class="patient-avatar" style="background:${avatarColor(b.patientName)};width:30px;height:30px;font-size:10px">${fmt.initials(b.patientName)}</div>
              <span style="font-size:13px;font-weight:600">${esc(b.patientName)}</span>
            </div>
          </td>
          <td class="text-sm">${esc(b.doctorName)}</td>
          <td><span class="badge badge-blue" style="font-size:11px">${esc(b.department)}</span></td>
          <td class="text-sm text-muted">${fmt.date(b.billDate)}</td>
          <td class="font-bold">${fmt.currency(b.total)}</td>
          <td style="color:var(--emerald)">${fmt.currency(b.paid)}</td>
          <td style="color:${b.balance > 0 ? 'var(--rose)' : 'var(--emerald)'}">${fmt.currency(b.balance)}</td>
          <td>${statusBadge(b.status)}</td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn btn-secondary btn-sm btn-icon" title="View Invoice" onclick="HMS_Billing.viewInvoice('${b.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button class="btn btn-success btn-sm btn-icon" title="Record Payment" onclick="HMS_Billing.recordPayment('${b.id}')" ${b.balance <= 0 ? 'disabled style="opacity:0.3"' : ''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </button>
              <button class="btn btn-danger btn-sm btn-icon" title="Delete" onclick="HMS_Billing.deleteBill('${b.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `).join('');

    const pag = document.getElementById('billPagination');
    if (pag) {
      pag.innerHTML = buildPagination({ page: state.page, totalPages, total, perPage: state.perPage });
      pag.querySelectorAll('.page-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => { state.page = parseInt(btn.dataset.page); renderTable(); });
      });
    }
  };

  const bindEvents = () => {
    document.getElementById('billSearch')?.addEventListener('input', debounce(e => { state.search = e.target.value; state.page = 1; renderTable(); }, 300));
    document.getElementById('filterBillStatus')?.addEventListener('change', e => { state.filterStatus = e.target.value; state.page = 1; renderTable(); });
    document.getElementById('perPageBill')?.addEventListener('change', e => { state.perPage = parseInt(e.target.value); state.page = 1; renderTable(); });
  };

  const resetFilters = () => { state = { ...state, search:'', filterStatus:'', page:1 }; render(); };

  // ── Invoice View (Beautiful Print-Ready) ──
  const viewInvoice = (id) => {
    const b = HMS_DB.Billing().getById(id);
    if (!b) return;
    const settings = HMS_DB.Settings.get();
    const stampClass = { 'Paid': 'paid', 'Pending': 'pending', 'Overdue': 'overdue', 'Partial': 'partial' }[b.status] || 'pending';

    modal.open({
      title: `Invoice ${b.id}`,
      size: 'xl',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
      body: `
        <div id="invoicePrintArea" class="invoice-preview">
          <!-- Header -->
          <div class="invoice-header">
            <div class="invoice-logo">
              <div class="invoice-logo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 4v16M4 12h16"/></svg>
              </div>
              <div class="invoice-logo-text">
                <div class="name">${esc(settings.hospitalName || 'MedCare Hospital')}</div>
                <div class="sub">${esc(settings.address || '')}</div>
              </div>
            </div>
            <div class="invoice-meta">
              <div class="inv-number">INVOICE</div>
              <div class="inv-date"># ${b.id}</div>
              <div class="inv-date" style="margin-top:4px">Date: ${fmt.date(b.billDate)}</div>
              <div class="inv-date">Due: ${fmt.date(b.dueDate)}</div>
            </div>
          </div>

          <!-- Parties -->
          <div class="invoice-parties">
            <div>
              <div class="invoice-party-label">Bill To</div>
              <div class="invoice-party-name">${esc(b.patientName)}</div>
              <div class="invoice-party-detail">Patient ID: ${b.patientId}</div>
              <div class="invoice-party-detail">Insurance: ${esc(b.insurance || 'Self Pay')}</div>
              <div class="invoice-party-detail">Insurance ID: ${esc(b.insuranceId || '—')}</div>
            </div>
            <div>
              <div class="invoice-party-label">Attending Physician</div>
              <div class="invoice-party-name">${esc(b.doctorName)}</div>
              <div class="invoice-party-detail">Department: ${esc(b.department)}</div>
              <div class="invoice-party-detail">${esc(settings.hospitalName || 'MedCare Hospital')}</div>
              <div class="invoice-party-detail">${esc(settings.phone || '')}</div>
            </div>
          </div>

          <!-- Services Table -->
          <table class="invoice-table">
            <thead>
              <tr>
                <th style="width:40px">#</th>
                <th>Service Description</th>
                <th style="text-align:center">Qty</th>
                <th style="text-align:right">Unit Price</th>
                <th style="text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(b.services || []).map((s, i) => `
                <tr>
                  <td>${i+1}</td>
                  <td>${esc(s.name)}</td>
                  <td style="text-align:center">${s.qty}</td>
                  <td style="text-align:right">${fmt.currency(s.unitPrice)}</td>
                  <td style="text-align:right;font-weight:600">${fmt.currency(s.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Totals -->
          <div class="invoice-totals">
            <div class="invoice-totals-grid">
              <div class="invoice-total-row"><span>Subtotal</span><span>${fmt.currency(b.subtotal)}</span></div>
              <div class="invoice-total-row"><span>Tax (${settings.taxRate || 8}%)</span><span>${fmt.currency(b.tax)}</span></div>
              ${b.discount > 0 ? `<div class="invoice-total-row"><span>Discount</span><span>-${fmt.currency(b.discount)}</span></div>` : ''}
              <div class="invoice-total-row total"><span>Total</span><span>${fmt.currency(b.total)}</span></div>
              <div class="invoice-total-row paid"><span>Amount Paid</span><span>${fmt.currency(b.paid)}</span></div>
              <div class="invoice-total-row balance"><span>Balance Due</span><span>${fmt.currency(b.balance)}</span></div>
            </div>
          </div>

          <!-- Footer -->
          <div class="invoice-footer">
            <div>
              <div class="invoice-footer-note">Thank you for choosing ${esc(settings.hospitalName || 'MedCare Hospital')}</div>
              <div class="invoice-footer-note" style="margin-top:4px">Payment Method: ${esc(b.paymentMethod || 'Pending')}</div>
            </div>
            <div class="invoice-status-stamp ${stampClass}">${b.status}</div>
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="HMS_Utils.modal.close()">Close</button>
        <button class="btn btn-secondary" onclick="HMS_Billing.printInvoice()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Print Invoice
        </button>
        ${b.balance > 0 ? `<button class="btn btn-primary" onclick="HMS_Utils.modal.close();HMS_Billing.recordPayment('${id}')">Record Payment</button>` : ''}
      `,
    });
  };

  const printInvoice = () => {
    const el = document.getElementById('invoicePrintArea');
    if (!el) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Invoice</title>
      <style>
        body { font-family: Inter, sans-serif; margin: 0; padding: 40px; background: white; color: #1a1a2e; }
        .invoice-preview { max-width: 700px; margin: 0 auto; }
        ${document.querySelector('style')?.textContent || ''}
      </style></head>
      <body>${el.outerHTML}</body></html>
    `);
    win.document.close();
    win.print();
  };

  // ── Record Payment ──
  const recordPayment = (id) => {
    const b = HMS_DB.Billing().getById(id);
    if (!b) return;
    modal.open({
      title: 'Record Payment',
      size: 'sm',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      iconBg: 'var(--grad-emerald)',
      body: `
        <div style="margin-bottom:16px;padding:14px;background:var(--glass-bg);border:1px solid var(--border);border-radius:var(--radius-md)">
          <div style="font-size:12px;color:var(--text-muted)">Invoice: ${b.id} · Patient: ${esc(b.patientName)}</div>
          <div style="display:flex;justify-content:space-between;margin-top:8px">
            <div><span style="font-size:12px;color:var(--text-muted)">Total</span><div style="font-weight:700">${fmt.currency(b.total)}</div></div>
            <div><span style="font-size:12px;color:var(--text-muted)">Paid</span><div style="font-weight:700;color:var(--emerald)">${fmt.currency(b.paid)}</div></div>
            <div><span style="font-size:12px;color:var(--text-muted)">Balance</span><div style="font-weight:700;color:var(--rose)">${fmt.currency(b.balance)}</div></div>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Amount to Pay ($)</label>
            <input class="form-input" type="number" id="pay_amount" value="${b.balance}" min="0" max="${b.balance}" step="0.01" />
          </div>
          <div class="form-group">
            <label class="form-label">Payment Method</label>
            <select class="form-select" id="pay_method">
              ${PAYMENT_METHODS.map(m => `<option>${m}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Notes</label>
            <input class="form-input" id="pay_notes" placeholder="Payment reference, notes..." />
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="HMS_Utils.modal.close()">Cancel</button>
        <button class="btn btn-success" onclick="HMS_Billing._processPayment('${id}')">Process Payment</button>
      `,
    });
  };

  const _processPayment = (id) => {
    const b = HMS_DB.Billing().getById(id);
    if (!b) return;
    const amount = parseFloat(document.getElementById('pay_amount')?.value) || 0;
    const method = document.getElementById('pay_method')?.value || 'Cash';
    if (amount <= 0) { toast('Invalid Amount', 'Please enter a valid payment amount', 'error'); return; }
    if (amount > b.balance) { toast('Overpayment', 'Amount exceeds balance due', 'error'); return; }
    const newPaid = b.paid + amount;
    const newBalance = b.total - newPaid;
    const newStatus = newBalance <= 0 ? 'Paid' : 'Partial';
    HMS_DB.Billing().update(id, { paid: newPaid, balance: newBalance, status: newStatus, paymentMethod: method });
    modal.close();
    toast('Payment Recorded', `${fmt.currency(amount)} received · ${newStatus === 'Paid' ? 'Invoice fully paid! ✅' : fmt.currency(newBalance) + ' remaining'}`, 'success');
    renderTable();
  };

  // ── New Invoice ──
  const invoiceFormHTML = () => {
    const patients = HMS_DB.Patients().getAll().slice(0, 500);
    const doctors = HMS_DB.Doctors().getAll();
    return `
      <div class="form-grid form-grid-2" style="margin-bottom:20px">
        <div class="form-group">
          <label class="form-label">Patient <span class="form-required">*</span></label>
          <select class="form-select" id="inv_patient">
            <option value="">Select Patient</option>
            ${patients.map(p => `<option value="${p.id}|${esc(p.fullName)}|${esc(p.insurance)}|${esc(p.insuranceId)}">${esc(p.fullName)} (${p.id})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Doctor</label>
          <select class="form-select" id="inv_doctor">
            <option value="">Select Doctor</option>
            ${doctors.map(d => `<option value="${d.id}|${esc(d.fullName)}|${esc(d.department)}">${esc(d.fullName)} — ${esc(d.department)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Bill Date</label>
          <input class="form-input" type="date" id="inv_date" value="${new Date().toISOString().split('T')[0]}" />
        </div>
        <div class="form-group">
          <label class="form-label">Discount ($)</label>
          <input class="form-input" type="number" id="inv_discount" value="0" min="0" step="0.01" />
        </div>
      </div>

      <!-- Service Lines -->
      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Services</div>
        <div id="serviceLines"></div>
        <button class="btn btn-secondary btn-sm" onclick="HMS_Billing._addServiceLine()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 5v14M5 12h14"/></svg>
          Add Service
        </button>
      </div>

      <!-- Totals -->
      <div style="background:var(--glass-bg);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;margin-top:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
          <div>Subtotal: <strong id="inv_subtotal">$0.00</strong></div>
          <div>Tax (8%): <strong id="inv_tax">$0.00</strong></div>
          <div>Discount: <strong id="inv_discountDisplay">$0.00</strong></div>
          <div style="font-size:15px;font-weight:800">Total: <strong id="inv_total" style="color:var(--blue-light)">$0.00</strong></div>
        </div>
      </div>
    `;
  };

  let serviceLineCount = 0;
  const _addServiceLine = () => {
    const container = document.getElementById('serviceLines');
    if (!container) return;
    const idx = serviceLineCount++;
    const div = document.createElement('div');
    div.id = `sline_${idx}`;
    div.style.cssText = 'display:grid;grid-template-columns:2fr 80px 100px 30px;gap:8px;margin-bottom:8px;align-items:center';
    div.innerHTML = `
      <select class="form-select" id="sl_name_${idx}" onchange="HMS_Billing._updateTotals()">
        <option value="">Select Service</option>
        ${SERVICES.map(s => `<option value="${s.name}|${s.price}">${s.name} — $${s.price}</option>`).join('')}
      </select>
      <input class="form-input" type="number" id="sl_qty_${idx}" value="1" min="1" style="text-align:center" onchange="HMS_Billing._updateTotals()" />
      <input class="form-input" type="number" id="sl_price_${idx}" value="" min="0" placeholder="Price" onchange="HMS_Billing._updateTotals()" />
      <button class="btn btn-danger btn-sm btn-icon" onclick="document.getElementById('sline_${idx}').remove();HMS_Billing._updateTotals()" title="Remove">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    container.appendChild(div);

    // Auto-fill price on service select
    document.getElementById(`sl_name_${idx}`)?.addEventListener('change', (e) => {
      const [,price] = e.target.value.split('|');
      const priceInput = document.getElementById(`sl_price_${idx}`);
      if (priceInput && price) priceInput.value = price;
      _updateTotals();
    });
  };

  const _updateTotals = () => {
    let subtotal = 0;
    const lines = document.querySelectorAll('[id^="sline_"]');
    lines.forEach(line => {
      const idx = line.id.replace('sline_', '');
      const qty = parseFloat(document.getElementById(`sl_qty_${idx}`)?.value) || 1;
      const price = parseFloat(document.getElementById(`sl_price_${idx}`)?.value) || 0;
      subtotal += qty * price;
    });
    const tax = subtotal * 0.08;
    const discount = parseFloat(document.getElementById('inv_discount')?.value) || 0;
    const total = subtotal + tax - discount;
    const f = fmt.currency;
    ['inv_subtotal','inv_tax','inv_discountDisplay','inv_total'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.textContent = f([subtotal, tax, discount, total][i]);
    });
  };

  const openAddModal = () => {
    serviceLineCount = 0;
    modal.open({
      title: 'Create Invoice',
      size: 'xl',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
      body: invoiceFormHTML(),
      footer: `
        <button class="btn btn-secondary" onclick="HMS_Utils.modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="HMS_Billing._saveNewInvoice()">Create Invoice</button>
      `,
    });
    // Auto add one service line
    setTimeout(() => _addServiceLine(), 50);
    // Watch discount changes
    setTimeout(() => {
      document.getElementById('inv_discount')?.addEventListener('input', _updateTotals);
    }, 100);
  };

  const _saveNewInvoice = () => {
    const v = (id) => document.getElementById(id)?.value?.trim() || '';
    const patientRaw = v('inv_patient');
    if (!patientRaw) { toast('Validation', 'Please select a patient', 'error'); return; }
    const [patientId, patientName, insurance, insuranceId] = patientRaw.split('|');
    const doctorRaw = v('inv_doctor');
    const [doctorId, doctorName, department] = (doctorRaw || '||').split('|');

    const services = [];
    const lines = document.querySelectorAll('[id^="sline_"]');
    lines.forEach(line => {
      const idx = line.id.replace('sline_', '');
      const nameRaw = document.getElementById(`sl_name_${idx}`)?.value || '';
      const [name] = nameRaw.split('|');
      const qty = parseFloat(document.getElementById(`sl_qty_${idx}`)?.value) || 1;
      const unitPrice = parseFloat(document.getElementById(`sl_price_${idx}`)?.value) || 0;
      if (name && unitPrice > 0) services.push({ name, qty, unitPrice, total: qty * unitPrice });
    });

    if (services.length === 0) { toast('Validation', 'Please add at least one service', 'error'); return; }

    const subtotal = services.reduce((s, x) => s + x.total, 0);
    const tax = Math.round(subtotal * 0.08);
    const discount = parseFloat(v('inv_discount')) || 0;
    const total = subtotal + tax - discount;
    const billDate = v('inv_date') || new Date().toISOString().split('T')[0];
    const dueDate = (() => { const d = new Date(billDate); d.setDate(d.getDate()+30); return d.toISOString().split('T')[0]; })();

    const existing = HMS_DB.Billing().getAll();
    const id = 'INV' + String(existing.length + 1).padStart(6, '0');

    HMS_DB.Billing().create({
      id, patientId, patientName: patientName||'', doctorId, doctorName: doctorName||'', department: department||'',
      services, subtotal, tax, discount, total, paid: 0, balance: total,
      status: 'Pending', insurance: insurance||'', insuranceId: insuranceId||'',
      billDate, dueDate, paymentMethod: '', notes: '',
    });

    modal.close();
    toast('Invoice Created', `${id} · Total: ${fmt.currency(total)}`, 'success');
    renderTable();
  };

  const deleteBill = (id) => {
    modal.confirm({
      title: 'Delete Invoice',
      message: 'Are you sure you want to delete this invoice? This cannot be undone.',
      confirmText: 'Delete',
      onConfirm: () => { HMS_DB.Billing().delete(id); toast('Invoice Deleted', '', 'warning'); renderTable(); },
    });
  };

  const exportCSV = () => {
    const bills = getFiltered();
    const headers = ['Invoice ID','Patient','Doctor','Department','Date','Total','Paid','Balance','Status','Insurance'];
    const rows = bills.map(b => [b.id, b.patientName, b.doctorName, b.department, b.billDate, b.total, b.paid, b.balance, b.status, b.insurance]
      .map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `invoices_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Export Complete', `${bills.length} invoices exported`, 'success');
  };

  return { render, resetFilters, openAddModal, _saveNewInvoice, _addServiceLine, _updateTotals, viewInvoice, printInvoice, recordPayment, _processPayment, deleteBill, exportCSV };
})();
window.HMS_Billing = HMS_Billing;
