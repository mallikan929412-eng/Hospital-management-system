/* ============================================================
   MedCare HMS – Utilities
   ============================================================ */

const HMS_Utils = (() => {
  // ── Format ──
  const fmt = {
    currency: (val, currency = 'USD') =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(val || 0),
    number: (val) => new Intl.NumberFormat('en-US').format(val || 0),
    date: (val) => {
      if (!val) return '—';
      const d = new Date(val);
      return isNaN(d) ? val : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },
    dateInput: (val) => {
      if (!val) return '';
      return val.split('T')[0];
    },
    dateTime: (val) => {
      if (!val) return '—';
      const d = new Date(val);
      return isNaN(d) ? val : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    },
    timeAgo: (val) => {
      if (!val) return '—';
      const diff = Date.now() - new Date(val).getTime();
      const m = Math.floor(diff / 60000);
      if (m < 1) return 'Just now';
      if (m < 60) return `${m}m ago`;
      if (m < 1440) return `${Math.floor(m/60)}h ago`;
      return `${Math.floor(m/1440)}d ago`;
    },
    percent: (val, total) => total ? `${((val/total)*100).toFixed(1)}%` : '0%',
    age: (dob) => {
      if (!dob) return '—';
      const d = new Date(dob);
      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
      return age;
    },
    initials: (name) => {
      if (!name) return '??';
      const parts = name.replace(/^Dr\.?\s*/i, '').trim().split(' ');
      return (parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '');
    },
    shortNumber: (val) => {
      if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
      if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
      return String(val);
    },
  };

  // ── Avatar Colors ──
  const AVATAR_COLORS = [
    'linear-gradient(135deg,#3B82F6,#8B5CF6)',
    'linear-gradient(135deg,#10B981,#06B6D4)',
    'linear-gradient(135deg,#F43F5E,#F97316)',
    'linear-gradient(135deg,#F59E0B,#EF4444)',
    'linear-gradient(135deg,#8B5CF6,#EC4899)',
    'linear-gradient(135deg,#6366F1,#3B82F6)',
    'linear-gradient(135deg,#14B8A6,#10B981)',
    'linear-gradient(135deg,#F97316,#EAB308)',
  ];

  const avatarColor = (name) => {
    if (!name) return AVATAR_COLORS[0];
    const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
  };

  // ── Status Badge ──
  const statusBadge = (status) => {
    const map = {
      // Patient
      'Active':           { cls: 'badge-blue', dot: '●' },
      'Admitted':         { cls: 'badge-amber', dot: '●' },
      'Discharged':       { cls: 'badge-gray', dot: '●' },
      'Critical':         { cls: 'badge-rose', dot: '●' },
      'Under Observation':{ cls: 'badge-purple', dot: '●' },
      'Outpatient':       { cls: 'badge-cyan', dot: '●' },
      // Doctor
      'Available':        { cls: 'badge-emerald', dot: '●' },
      'On Duty':          { cls: 'badge-blue', dot: '●' },
      'On Leave':         { cls: 'badge-amber', dot: '●' },
      'Off Duty':         { cls: 'badge-gray', dot: '●' },
      // Appointment
      'Scheduled':        { cls: 'badge-blue', dot: '●' },
      'Confirmed':        { cls: 'badge-emerald', dot: '●' },
      'Completed':        { cls: 'badge-gray', dot: '●' },
      'Cancelled':        { cls: 'badge-rose', dot: '●' },
      'No Show':          { cls: 'badge-amber', dot: '●' },
      // Billing
      'Paid':             { cls: 'badge-emerald', dot: '●' },
      'Pending':          { cls: 'badge-amber', dot: '●' },
      'Partial':          { cls: 'badge-blue', dot: '●' },
      'Overdue':          { cls: 'badge-rose', dot: '●' },
      'Refunded':         { cls: 'badge-purple', dot: '●' },
      // Inventory
      'In Stock':         { cls: 'badge-emerald', dot: '●' },
      'Low Stock':        { cls: 'badge-amber', dot: '●' },
      'Out of Stock':     { cls: 'badge-rose', dot: '●' },
    };
    const info = map[status] || { cls: 'badge-gray', dot: '●' };
    return `<span class="badge ${info.cls}">${info.dot} ${status}</span>`;
  };

  // ── Toast ──
  const toast = (title, desc = '', type = 'success', duration = 3500) => {
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    };
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.style.setProperty('--toast-duration', `${duration}ms`);
    el.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <div class="toast-text">
        <div class="toast-title">${title}</div>
        ${desc ? `<div class="toast-desc">${desc}</div>` : ''}
      </div>
    `;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration + 300);
  };

  // ── Modal ──
  let currentModalOnSave = null;

  const modal = {
    open: ({ title, body, footer, size = '', icon = '', iconBg = 'var(--grad-blue)', onSave } = {}) => {
      const overlay = document.getElementById('modalOverlay');
      const container = document.getElementById('modalContainer');
      const titleEl = document.getElementById('modalTitle');
      const bodyEl = document.getElementById('modalBody');
      const footerEl = document.getElementById('modalFooter');

      // Size
      container.className = 'modal-container' + (size ? ` modal-${size}` : '');

      // Title + Icon
      if (icon) {
        titleEl.innerHTML = `<span class="modal-header-icon" style="background:${iconBg}">${icon}</span>${title}`;
      } else {
        titleEl.textContent = title;
      }

      bodyEl.innerHTML = body || '';
      footerEl.innerHTML = footer || '';
      currentModalOnSave = onSave;

      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';

      // Focus first input
      setTimeout(() => {
        const firstInput = bodyEl.querySelector('input,select,textarea');
        if (firstInput) firstInput.focus();
      }, 100);
    },
    close: () => {
      const overlay = document.getElementById('modalOverlay');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      currentModalOnSave = null;
    },
    confirm: ({ title, message, confirmText = 'Confirm', confirmClass = 'btn-danger', onConfirm }) => {
      modal.open({
        title,
        size: 'sm',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        iconBg: 'var(--grad-rose)',
        body: `<p style="color:var(--text-secondary);line-height:1.6;">${message}</p>`,
        footer: `
          <button class="btn btn-secondary" onclick="HMS_Utils.modal.close()">Cancel</button>
          <button class="btn ${confirmClass}" id="confirmBtn">${confirmText}</button>
        `,
      });
      document.getElementById('confirmBtn')?.addEventListener('click', () => {
        modal.close();
        if (onConfirm) onConfirm();
      });
    },
  };

  // Close modal on overlay click / Escape
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.close(); });
  document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) modal.close();
  });
  document.getElementById('modalClose')?.addEventListener('click', modal.close);

  // ── Loading ──
  let loadingTimeout = null;
  const loading = {
    show: (text = 'Loading...') => {
      const el = document.getElementById('loadingOverlay');
      const span = el?.querySelector('span');
      if (span) span.textContent = text;
      el?.classList.add('active');
      if (loadingTimeout) clearTimeout(loadingTimeout);
      loadingTimeout = setTimeout(() => loading.hide(), 3500);
    },
    hide: () => {
      if (loadingTimeout) clearTimeout(loadingTimeout);
      document.getElementById('loadingOverlay')?.classList.remove('active');
    },
  };

  // ── Search / Filter ──
  const fuzzySearch = (items, query, keys) => {
    if (!query || !query.trim()) return items;
    const q = query.toLowerCase().trim();
    return items.filter(item =>
      keys.some(key => {
        const val = key.split('.').reduce((o, k) => o?.[k], item);
        return val && String(val).toLowerCase().includes(q);
      })
    );
  };

  // ── Debounce ──
  const debounce = (fn, delay = 300) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  };

  // ── HTML Escape ──
  const esc = (str) => String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // ── Pagination Builder ──
  const buildPagination = ({ page, totalPages, total, perPage, onPageChange }) => {
    const start = (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, total);
    let pages = '';
    const range = (from, to) => { let r = []; for (let i = from; i <= to; i++) r.push(i); return r; };
    const delta = 2;
    const left = page - delta;
    const right = page + delta + 1;
    const rangeArr = range(1, totalPages).filter(i => i === 1 || i === totalPages || (i >= left && i < right));
    let prev = null;
    for (const i of rangeArr) {
      if (prev && i - prev > 1) pages += `<button class="page-btn" disabled>…</button>`;
      pages += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
      prev = i;
    }
    return `
      <div class="pagination-info">Showing <strong>${start}–${end}</strong> of <strong>${fmt.number(total)}</strong></div>
      <div class="pagination-controls">
        <button class="page-btn" data-page="${page-1}" ${page <= 1 ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        ${pages}
        <button class="page-btn" data-page="${page+1}" ${page >= totalPages ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    `;
  };

  // ── Chart Colors ──
  const chartColors = [
    '#3B82F6','#10B981','#F43F5E','#F59E0B','#8B5CF6','#06B6D4','#EC4899','#6366F1',
    '#14B8A6','#F97316','#84CC16','#A855F7',
  ];

  // ── Generate ID with prefix ──
  const genId = (prefix, existingIds) => {
    let n = (existingIds.length || 0) + 1;
    let id;
    do {
      id = prefix + String(n).padStart(6, '0');
      n++;
    } while (existingIds.includes(id));
    return id;
  };

  return { fmt, avatarColor, statusBadge, toast, modal, loading, fuzzySearch, debounce, esc, buildPagination, chartColors, genId };
})();
window.HMS_Utils = HMS_Utils;
