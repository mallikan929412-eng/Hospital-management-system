/* ============================================================
   MedCare HMS – Inventory Module (CRUD, Stock Tracking, Restock)
   ============================================================ */

const HMS_Inventory = (() => {
  const { fmt, statusBadge, esc, modal, toast, fuzzySearch, debounce, buildPagination } = HMS_Utils;

  let state = {
    page: 1,
    perPage: 12,
    search: '',
    filterCategory: '',
    filterStatus: '',
    sort: { field: 'name', dir: 1 }
  };

  const CATEGORIES = [
    'PPE',
    'Consumables',
    'Fluids',
    'Medicines',
    'Diagnostics',
    'Equipment',
    'Wound Care',
    'Hygiene'
  ];

  const STATUSES = ['In Stock', 'Low Stock', 'Out of Stock'];

  // Helper: compute status from stock numbers
  const calcStatus = (stock, minStock) => {
    const s = Number(stock) || 0;
    const min = Number(minStock) || 0;
    if (s <= 0) return 'Out of Stock';
    if (s <= min) return 'Low Stock';
    return 'In Stock';
  };

  const render = () => {
    const content = document.getElementById('pageContent');
    const all = HMS_DB.Inventory().getAll();

    // Stats calculations
    const totalItems = all.length;
    const lowStockCount = all.filter(i => calcStatus(i.stock, i.minStock) === 'Low Stock').length;
    const outOfStockCount = all.filter(i => (Number(i.stock) || 0) <= 0).length;
    const totalUnits = all.reduce((sum, i) => sum + (Number(i.stock) || 0), 0);
    const totalValue = all.reduce((sum, i) => sum + ((Number(i.stock) || 0) * (Number(i.price) || 0)), 0);

    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="page-breadcrumb">HMS <span>/ Inventory</span></div>
          <h1 class="page-title">Inventory & Supplies</h1>
          <p class="page-subtitle">Track hospital consumables, pharmaceuticals, equipment stock and restock supplies</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="HMS_Inventory.exportCSV()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button class="btn btn-primary" onclick="HMS_Inventory.openAddModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            Add New Item
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="dashboard-grid" style="margin-bottom: 24px;">
        <div class="stat-card blue">
          <div class="stat-header">
            <div>
              <div class="stat-label">Total Items</div>
              <div class="stat-value">${fmt.number(totalItems)}</div>
              <div class="stat-footer">${fmt.number(totalUnits)} units across all depts</div>
            </div>
            <div class="stat-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </div>
          </div>
        </div>

        <div class="stat-card emerald">
          <div class="stat-header">
            <div>
              <div class="stat-label">Stock Valuation</div>
              <div class="stat-value">${fmt.currency(totalValue)}</div>
              <div class="stat-footer">Estimated total inventory value</div>
            </div>
            <div class="stat-icon emerald">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
        </div>

        <div class="stat-card amber">
          <div class="stat-header">
            <div>
              <div class="stat-label">Low Stock Alerts</div>
              <div class="stat-value">${lowStockCount}</div>
              <div class="stat-footer">Items below minimum reorder point</div>
            </div>
            <div class="stat-icon amber">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
          </div>
        </div>

        <div class="stat-card rose">
          <div class="stat-header">
            <div>
              <div class="stat-label">Out of Stock</div>
              <div class="stat-value">${outOfStockCount}</div>
              <div class="stat-footer">${outOfStockCount === 0 ? 'All critical items stocked' : 'Requires immediate procurement'}</div>
            </div>
            <div class="stat-icon rose">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="filter-bar">
        <div class="filter-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="invSearch" placeholder="Search item, category, supplier, batch..." value="${esc(state.search)}" />
        </div>

        <select class="filter-select" id="invFilterCategory">
          <option value="">All Categories</option>
          ${CATEGORIES.map(c => `<option value="${c}" ${state.filterCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>

        <select class="filter-select" id="invFilterStatus">
          <option value="">All Stock Status</option>
          ${STATUSES.map(s => `<option value="${s}" ${state.filterStatus === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>

        <button class="btn btn-secondary btn-sm" onclick="HMS_Inventory.resetFilters()">
          Clear Filters
        </button>
      </div>

      <!-- Inventory Table Card -->
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th onclick="HMS_Inventory.sortBy('name')">Item Details <span class="sort-icon">↕</span></th>
                <th onclick="HMS_Inventory.sortBy('category')">Category <span class="sort-icon">↕</span></th>
                <th onclick="HMS_Inventory.sortBy('stock')">Stock Level <span class="sort-icon">↕</span></th>
                <th>Unit Price</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Location & Supplier</th>
                <th>Expiry</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="inventoryTableBody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
        <div class="pagination" id="inventoryPagination"></div>
      </div>
    `;

    bindEvents();
    renderTable();
  };

  const bindEvents = () => {
    const searchInput = document.getElementById('invSearch');
    searchInput?.addEventListener('input', debounce((e) => {
      state.search = e.target.value;
      state.page = 1;
      renderTable();
    }, 250));

    const catSelect = document.getElementById('invFilterCategory');
    catSelect?.addEventListener('change', (e) => {
      state.filterCategory = e.target.value;
      state.page = 1;
      renderTable();
    });

    const statusSelect = document.getElementById('invFilterStatus');
    statusSelect?.addEventListener('change', (e) => {
      state.filterStatus = e.target.value;
      state.page = 1;
      renderTable();
    });
  };

  const getFilteredData = () => {
    let items = HMS_DB.Inventory().getAll();

    // Ensure status is synced with current stock
    items = items.map(item => ({
      ...item,
      status: calcStatus(item.stock, item.minStock)
    }));

    if (state.search) {
      items = fuzzySearch(items, state.search, ['name', 'category', 'supplier', 'batchNo', 'location']);
    }

    if (state.filterCategory) {
      items = items.filter(i => i.category === state.filterCategory);
    }

    if (state.filterStatus) {
      items = items.filter(i => i.status === state.filterStatus);
    }

    // Sort
    const { field, dir } = state.sort;
    items.sort((a, b) => {
      let va = a[field] ?? '';
      let vb = b[field] ?? '';
      if (typeof va === 'string') {
        return dir * va.localeCompare(vb);
      }
      return dir * (va - vb);
    });

    return items;
  };

  const renderTable = () => {
    const tbody = document.getElementById('inventoryTableBody');
    const paginationEl = document.getElementById('inventoryPagination');
    if (!tbody) return;

    const items = getFilteredData();
    const total = items.length;
    const totalPages = Math.ceil(total / state.perPage) || 1;
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * state.perPage;
    const pageItems = items.slice(start, start + state.perPage);

    if (pageItems.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9">
            <div class="empty-state">
              <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              </div>
              <div class="empty-title">No inventory items found</div>
              <div class="empty-desc">Try clearing filters or search query, or add a new medical item to inventory.</div>
              <button class="btn btn-primary btn-sm" style="margin-top:14px" onclick="HMS_Inventory.openAddModal()">Add Item</button>
            </div>
          </td>
        </tr>
      `;
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    tbody.innerHTML = pageItems.map(item => {
      const stock = Number(item.stock) || 0;
      const minStock = Number(item.minStock) || 0;
      const maxStock = Number(item.maxStock) || Math.max(stock * 2, minStock * 3, 100);
      const percent = Math.min(100, Math.round((stock / maxStock) * 100));
      const val = stock * (Number(item.price) || 0);

      // Color coding for progress bar
      let barColor = 'var(--emerald)';
      if (stock <= 0) barColor = 'var(--rose)';
      else if (stock <= minStock) barColor = 'var(--amber)';

      return `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${esc(item.name)}</div>
            <div style="font-size: 12px; color: var(--text-muted); display:flex; gap:8px; margin-top:2px;">
              <span>Batch: <strong style="color:var(--text-secondary)">${esc(item.batchNo || 'N/A')}</strong></span>
              <span>•</span>
              <span>Unit: ${esc(item.unit || 'unit')}</span>
            </div>
          </td>
          <td>
            <span class="badge badge-purple">${esc(item.category)}</span>
          </td>
          <td style="min-width: 170px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
              <span>${fmt.number(stock)} <span style="font-size:11px; font-weight:normal; color:var(--text-muted);">/ ${fmt.number(maxStock)}</span></span>
              <span style="font-size: 11px; color: var(--text-muted);">Min: ${minStock}</span>
            </div>
            <div style="background: rgba(255,255,255,0.08); height: 6px; border-radius: 999px; overflow: hidden;">
              <div style="background: ${barColor}; width: ${percent}%; height: 100%; border-radius: 999px; transition: width 0.3s ease;"></div>
            </div>
          </td>
          <td style="font-weight: 600;">${fmt.currency(item.price)}</td>
          <td style="font-weight: 700; color: var(--blue-light);">${fmt.currency(val)}</td>
          <td>${statusBadge(item.status)}</td>
          <td>
            <div style="font-size: 13px; color: var(--text-primary);">${esc(item.location || 'General Storage')}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${esc(item.supplier || 'Hospital Direct')}</div>
          </td>
          <td style="font-size: 12px; color: ${item.expiryDate && new Date(item.expiryDate) < new Date() ? 'var(--rose)' : 'var(--text-secondary)'};">
            ${fmt.date(item.expiryDate)}
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <div style="display: inline-flex; gap: 6px;">
              <button class="btn btn-secondary btn-sm" title="Quick Restock" onclick="HMS_Inventory.openRestockModal('${item.id}')" style="padding: 5px 9px; font-size: 12px; color: var(--emerald-light);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                Restock
              </button>
              <button class="btn btn-secondary btn-sm" title="Edit Item" onclick="HMS_Inventory.openEditModal('${item.id}')" style="padding: 5px 8px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-danger btn-sm" title="Delete Item" onclick="HMS_Inventory.deleteItem('${item.id}')" style="padding: 5px 8px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Pagination
    if (paginationEl) {
      paginationEl.innerHTML = buildPagination({
        page: state.page,
        totalPages,
        total,
        perPage: state.perPage,
        onPageChange: (newPage) => {
          state.page = newPage;
          renderTable();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });

      // Bind pagination clicks
      paginationEl.querySelectorAll('.page-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = Number(btn.dataset.page);
          if (p && p !== state.page) {
            state.page = p;
            renderTable();
          }
        });
      });
    }
  };

  const sortBy = (field) => {
    if (state.sort.field === field) {
      state.sort.dir *= -1;
    } else {
      state.sort = { field, dir: 1 };
    }
    renderTable();
  };

  const resetFilters = () => {
    state.search = '';
    state.filterCategory = '';
    state.filterStatus = '';
    state.page = 1;
    const sInput = document.getElementById('invSearch');
    const cSelect = document.getElementById('invFilterCategory');
    const stSelect = document.getElementById('invFilterStatus');
    if (sInput) sInput.value = '';
    if (cSelect) cSelect.value = '';
    if (stSelect) stSelect.value = '';
    renderTable();
    toast('Filters Cleared', 'Showing all inventory items', 'info');
  };

  // ── Add Item Modal ──
  const openAddModal = () => {
    modal.open({
      title: 'Add New Inventory Item',
      size: 'lg',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
      iconBg: 'var(--grad-blue)',
      body: `
        <form id="addInventoryForm" class="form-grid form-grid-2">
          <div class="form-group full">
            <label class="form-label">Item Name <span class="form-required">*</span></label>
            <input type="text" class="form-input" id="item_name" required placeholder="e.g. Sterile Latex Gloves (Size M)" />
          </div>

          <div class="form-group">
            <label class="form-label">Category <span class="form-required">*</span></label>
            <select class="form-select" id="item_category" required>
              ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Unit of Measure <span class="form-required">*</span></label>
            <input type="text" class="form-input" id="item_unit" required placeholder="e.g. box, vial, piece, roll" value="box" />
          </div>

          <div class="form-group">
            <label class="form-label">Unit Price ($) <span class="form-required">*</span></label>
            <input type="number" step="0.01" min="0" class="form-input" id="item_price" required placeholder="0.00" value="15" />
          </div>

          <div class="form-group">
            <label class="form-label">Initial Stock Quantity <span class="form-required">*</span></label>
            <input type="number" min="0" class="form-input" id="item_stock" required placeholder="100" value="100" />
          </div>

          <div class="form-group">
            <label class="form-label">Min Stock Threshold (Alert Point)</label>
            <input type="number" min="0" class="form-input" id="item_minStock" placeholder="20" value="25" />
          </div>

          <div class="form-group">
            <label class="form-label">Max Stock Capacity</label>
            <input type="number" min="0" class="form-input" id="item_maxStock" placeholder="500" value="500" />
          </div>

          <div class="form-group">
            <label class="form-label">Batch Number</label>
            <input type="text" class="form-input" id="item_batchNo" placeholder="e.g. B84920" value="B${Math.floor(10000 + Math.random() * 90000)}" />
          </div>

          <div class="form-group">
            <label class="form-label">Expiry Date</label>
            <input type="date" class="form-input" id="item_expiryDate" value="${(() => { const d = new Date(); d.setFullYear(d.getFullYear() + 2); return d.toISOString().split('T')[0]; })()}" />
          </div>

          <div class="form-group">
            <label class="form-label">Primary Supplier</label>
            <input type="text" class="form-input" id="item_supplier" placeholder="e.g. MedSupply Co" value="HospitalDirect" />
          </div>

          <div class="form-group">
            <label class="form-label">Storage Location / Ward</label>
            <input type="text" class="form-input" id="item_location" placeholder="e.g. Central Pharmacy, Shelf A3" value="Ward A-1" />
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="HMS_Utils.modal.close()">Cancel</button>
        <button class="btn btn-primary" id="saveInventoryBtn">Save Item</button>
      `
    });

    document.getElementById('saveInventoryBtn')?.addEventListener('click', () => {
      const name = document.getElementById('item_name')?.value.trim();
      const category = document.getElementById('item_category')?.value;
      const unit = document.getElementById('item_unit')?.value.trim();
      const price = parseFloat(document.getElementById('item_price')?.value) || 0;
      const stock = parseInt(document.getElementById('item_stock')?.value, 10) || 0;
      const minStock = parseInt(document.getElementById('item_minStock')?.value, 10) || 20;
      const maxStock = parseInt(document.getElementById('item_maxStock')?.value, 10) || Math.max(stock * 2, 100);
      const batchNo = document.getElementById('item_batchNo')?.value.trim();
      const expiryDate = document.getElementById('item_expiryDate')?.value;
      const supplier = document.getElementById('item_supplier')?.value.trim();
      const location = document.getElementById('item_location')?.value.trim();

      if (!name) {
        toast('Validation Error', 'Please enter an item name', 'error');
        return;
      }

      const status = calcStatus(stock, minStock);

      const newItem = HMS_DB.Inventory().create({
        name,
        category,
        unit,
        price,
        stock,
        minStock,
        maxStock,
        batchNo,
        expiryDate,
        supplier,
        location,
        status,
        lastRestocked: new Date().toISOString().split('T')[0]
      });

      modal.close();
      toast('Item Added', `${newItem.name} registered successfully`, 'success');
      render();
    });
  };

  // ── Edit Item Modal ──
  const openEditModal = (id) => {
    const item = HMS_DB.Inventory().getById(id);
    if (!item) {
      toast('Error', 'Item not found', 'error');
      return;
    }

    modal.open({
      title: `Edit Inventory: ${item.name}`,
      size: 'lg',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      iconBg: 'var(--grad-purple)',
      body: `
        <form id="editInventoryForm" class="form-grid form-grid-2">
          <div class="form-group full">
            <label class="form-label">Item Name <span class="form-required">*</span></label>
            <input type="text" class="form-input" id="edit_name" required value="${esc(item.name)}" />
          </div>

          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-select" id="edit_category">
              ${CATEGORIES.map(c => `<option value="${c}" ${item.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Unit of Measure</label>
            <input type="text" class="form-input" id="edit_unit" value="${esc(item.unit || 'unit')}" />
          </div>

          <div class="form-group">
            <label class="form-label">Unit Price ($)</label>
            <input type="number" step="0.01" min="0" class="form-input" id="edit_price" value="${item.price || 0}" />
          </div>

          <div class="form-group">
            <label class="form-label">Current Stock</label>
            <input type="number" min="0" class="form-input" id="edit_stock" value="${item.stock || 0}" />
          </div>

          <div class="form-group">
            <label class="form-label">Min Stock Threshold</label>
            <input type="number" min="0" class="form-input" id="edit_minStock" value="${item.minStock || 20}" />
          </div>

          <div class="form-group">
            <label class="form-label">Max Stock Capacity</label>
            <input type="number" min="0" class="form-input" id="edit_maxStock" value="${item.maxStock || 500}" />
          </div>

          <div class="form-group">
            <label class="form-label">Batch Number</label>
            <input type="text" class="form-input" id="edit_batchNo" value="${esc(item.batchNo || '')}" />
          </div>

          <div class="form-group">
            <label class="form-label">Expiry Date</label>
            <input type="date" class="form-input" id="edit_expiryDate" value="${item.expiryDate ? item.expiryDate.split('T')[0] : ''}" />
          </div>

          <div class="form-group">
            <label class="form-label">Supplier</label>
            <input type="text" class="form-input" id="edit_supplier" value="${esc(item.supplier || '')}" />
          </div>

          <div class="form-group">
            <label class="form-label">Storage Location</label>
            <input type="text" class="form-input" id="edit_location" value="${esc(item.location || '')}" />
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="HMS_Utils.modal.close()">Cancel</button>
        <button class="btn btn-primary" id="updateInventoryBtn">Update Item</button>
      `
    });

    document.getElementById('updateInventoryBtn')?.addEventListener('click', () => {
      const name = document.getElementById('edit_name')?.value.trim();
      if (!name) {
        toast('Validation Error', 'Item name is required', 'error');
        return;
      }

      const stock = parseInt(document.getElementById('edit_stock')?.value, 10) || 0;
      const minStock = parseInt(document.getElementById('edit_minStock')?.value, 10) || 0;
      const status = calcStatus(stock, minStock);

      HMS_DB.Inventory().update(id, {
        name,
        category: document.getElementById('edit_category')?.value,
        unit: document.getElementById('edit_unit')?.value.trim(),
        price: parseFloat(document.getElementById('edit_price')?.value) || 0,
        stock,
        minStock,
        maxStock: parseInt(document.getElementById('edit_maxStock')?.value, 10) || 500,
        batchNo: document.getElementById('edit_batchNo')?.value.trim(),
        expiryDate: document.getElementById('edit_expiryDate')?.value,
        supplier: document.getElementById('edit_supplier')?.value.trim(),
        location: document.getElementById('edit_location')?.value.trim(),
        status
      });

      modal.close();
      toast('Item Updated', `${name} updated successfully`, 'success');
      render();
    });
  };

  // ── Quick Restock Modal ──
  const openRestockModal = (id) => {
    const item = HMS_DB.Inventory().getById(id);
    if (!item) return;

    modal.open({
      title: `Restock Item: ${item.name}`,
      size: 'sm',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
      iconBg: 'var(--grad-emerald)',
      body: `
        <div style="background: var(--glass-bg); padding: 14px; border-radius: var(--radius-md); margin-bottom: 16px; border: 1px solid var(--border);">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span style="font-size:12px; color:var(--text-muted);">Current Stock:</span>
            <strong style="color:var(--text-primary); font-size:14px;">${fmt.number(item.stock || 0)} ${esc(item.unit || 'units')}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="font-size:12px; color:var(--text-muted);">Reorder Threshold:</span>
            <span style="color:var(--amber); font-size:13px; font-weight:600;">${item.minStock || 0}</span>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label">Add Quantity (${esc(item.unit || 'units')}) <span class="form-required">*</span></label>
          <input type="number" min="1" step="1" class="form-input" id="restockQuantity" placeholder="e.g. 50" value="50" autofocus />
        </div>

        <div class="form-group">
          <label class="form-label">Supplier / Order Reference</label>
          <input type="text" class="form-input" id="restockRef" placeholder="Order PO# or Delivery Note" value="${esc(item.supplier || 'Hospital Direct')}" />
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="HMS_Utils.modal.close()">Cancel</button>
        <button class="btn btn-success" id="confirmRestockBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><polyline points="20 6 9 17 4 12"/></svg>
          Confirm Restock
        </button>
      `
    });

    document.getElementById('confirmRestockBtn')?.addEventListener('click', () => {
      const addQty = parseInt(document.getElementById('restockQuantity')?.value, 10);
      if (!addQty || addQty <= 0) {
        toast('Invalid Quantity', 'Please enter a positive quantity to restock', 'error');
        return;
      }

      const newStock = (Number(item.stock) || 0) + addQty;
      const status = calcStatus(newStock, item.minStock);

      HMS_DB.Inventory().update(id, {
        stock: newStock,
        status,
        lastRestocked: new Date().toISOString().split('T')[0]
      });

      modal.close();
      toast('Restocked Successfully', `Added ${addQty} ${item.unit || 'units'} to ${item.name}. New total: ${newStock}`, 'success');
      render();
    });
  };

  // ── Delete Item ──
  const deleteItem = (id) => {
    const item = HMS_DB.Inventory().getById(id);
    if (!item) return;

    modal.confirm({
      title: 'Delete Inventory Item',
      message: `Are you sure you want to remove <strong>${esc(item.name)}</strong> (${item.category}) from hospital inventory? This action cannot be undone.`,
      confirmText: 'Delete Item',
      confirmClass: 'btn-danger',
      onConfirm: () => {
        HMS_DB.Inventory().delete(id);
        toast('Item Deleted', `${item.name} removed from inventory`, 'info');
        render();
      }
    });
  };

  // ── Export CSV ──
  const exportCSV = () => {
    const items = getFilteredData();
    if (items.length === 0) {
      toast('Export Warning', 'No items available to export', 'warning');
      return;
    }

    const headers = ['Item ID', 'Name', 'Category', 'Unit', 'Price', 'Stock', 'Min Stock', 'Max Stock', 'Status', 'Supplier', 'Location', 'Batch No', 'Expiry Date'];
    const rows = items.map(i => [
      i.id,
      `"${(i.name || '').replace(/"/g, '""')}"`,
      `"${i.category || ''}"`,
      `"${i.unit || ''}"`,
      i.price || 0,
      i.stock || 0,
      i.minStock || 0,
      i.maxStock || 0,
      `"${i.status || ''}"`,
      `"${(i.supplier || '').replace(/"/g, '""')}"`,
      `"${(i.location || '').replace(/"/g, '""')}"`,
      `"${i.batchNo || ''}"`,
      `"${i.expiryDate || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `medcare_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast('CSV Exported', `Exported ${items.length} inventory records`, 'success');
  };

  return {
    render,
    openAddModal,
    openEditModal,
    openRestockModal,
    deleteItem,
    sortBy,
    resetFilters,
    exportCSV
  };
})();
window.HMS_Inventory = HMS_Inventory;
