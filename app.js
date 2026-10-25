/* ============================================================
   MedCare HMS – Main App Controller
   ============================================================ */

const HMS_App = (() => {
  let currentPage = 'dashboard';
  let charts = {};

  // ── Page Registry ──
  const pages = {
    dashboard:    { label: 'Dashboard',    render: () => HMS_Dashboard.render() },
    patients:     { label: 'Patients',     render: () => HMS_Patients.render() },
    doctors:      { label: 'Doctors',      render: () => HMS_Doctors.render() },
    appointments: { label: 'Appointments', render: () => HMS_Appointments.render() },
    billing:      { label: 'Billing',      render: () => HMS_Billing.render() },
    reports:      { label: 'Reports',      render: () => HMS_Reports.render() },
    inventory:    { label: 'Inventory',    render: () => HMS_Inventory.render() },
    settings:     { label: 'Settings',     render: () => HMS_Settings.render() },
  };

  // ── Navigation ──
  const navigate = (page) => {
    if (!pages[page]) return;
    currentPage = page;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${page}`)?.classList.add('active');

    // Destroy charts to prevent memory leaks
    Object.values(charts).forEach(c => { try { c.destroy(); } catch {} });
    charts = {};

    // Render
    const content = document.getElementById('pageContent');
    if (content) {
      content.style.animation = 'none';
      content.offsetHeight; // Reflow
      content.style.animation = '';
      pages[page].render();
    }

    // Update appointment badge
    updateBadges();
  };

  // ── Badges ──
  const updateBadges = () => {
    const appts = HMS_DB.Appointments().getAll(a => a.status === 'Scheduled');
    const badge = document.getElementById('badge-appointments');
    if (badge) badge.textContent = appts.length > 0 ? appts.length : '';
  };

  // ── Register Chart ──
  const registerChart = (id, instance) => { charts[id] = instance; };
  const getChart = (id) => charts[id];

  // ── Sidebar Toggle ──
  const initSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');

    toggle?.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('hms_sidebar_collapsed', sidebar.classList.contains('collapsed'));
    });

    // Restore state
    if (localStorage.getItem('hms_sidebar_collapsed') === 'true') {
      sidebar.classList.add('collapsed');
    }

    // Mobile overlay
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !toggle?.contains(e.target)) {
          sidebar.classList.remove('mobile-open');
        }
      }
    });

    toggle?.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.toggle('mobile-open');
      }
    });
  };

  // ── Nav Links ──
  const initNav = () => {
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(el.dataset.page);
        if (window.innerWidth <= 768) {
          document.getElementById('sidebar')?.classList.remove('mobile-open');
        }
      });
    });
  };

  // ── Global Search ──
  const initSearch = () => {
    const input = document.getElementById('globalSearch');
    if (!input) return;

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
      }
      if (e.key === 'Escape' && document.activeElement === input) {
        input.blur();
      }
    });

    input.addEventListener('input', HMS_Utils.debounce((e) => {
      const q = e.target.value.trim();
      if (!q) return;
      // Auto-navigate to relevant page and search
      if (q.startsWith('P') || q.startsWith('p')) {
        navigate('patients');
        // Signal to patients page to search
        setTimeout(() => {
          const pSearch = document.getElementById('patientSearch');
          if (pSearch) { pSearch.value = q; pSearch.dispatchEvent(new Event('input')); }
        }, 100);
      } else if (q.startsWith('D') || q.startsWith('d')) {
        navigate('doctors');
      } else if (q.startsWith('INV') || q.startsWith('inv')) {
        navigate('billing');
      }
    }, 400));
  };

  // ── Notifications ──
  const initNotifications = () => {
    const btn = document.getElementById('notifBtn');
    const panel = document.getElementById('notifPanel');
    const dot = document.getElementById('notifDot');
    const list = document.getElementById('notifList');
    const markAll = document.getElementById('markAllRead');

    const renderNotifs = () => {
      const notifs = HMS_DB.Notifications().getAll();
      const unread = notifs.filter(n => n.unread).length;
      if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
      if (!list) return;
      if (notifs.length === 0) {
        list.innerHTML = '<div class="empty-state" style="padding:32px"><p class="text-muted">No notifications</p></div>';
        return;
      }
      list.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.unread ? 'unread' : ''}" data-id="${n.id}">
          <div class="notif-dot-item"></div>
          <div class="notif-text">
            <div class="notif-title">${HMS_Utils.esc(n.title)}</div>
            <div class="notif-desc">${HMS_Utils.esc(n.desc)}</div>
            <div class="notif-time">${n.time}</div>
          </div>
        </div>
      `).join('');

      // Click to mark read
      list.querySelectorAll('.notif-item').forEach(el => {
        el.addEventListener('click', () => {
          HMS_DB.Notifications().update(el.dataset.id, { unread: false });
          el.classList.remove('unread');
          const remaining = list.querySelectorAll('.notif-item.unread').length;
          if (dot) dot.style.display = remaining > 0 ? 'block' : 'none';
        });
      });
    };

    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      panel?.classList.toggle('open');
      if (panel?.classList.contains('open')) renderNotifs();
    });

    markAll?.addEventListener('click', () => {
      HMS_DB.Notifications().getAll().forEach(n => HMS_DB.Notifications().update(n.id, { unread: false }));
      renderNotifs();
    });

    document.addEventListener('click', (e) => {
      if (!panel?.contains(e.target) && !btn?.contains(e.target)) {
        panel?.classList.remove('open');
      }
    });

    renderNotifs();
  };

  // ── Theme Toggle ──
  const initTheme = () => {
    const btn = document.getElementById('themeToggle');
    const saved = HMS_DB.Settings.get().theme || 'dark';
    if (saved === 'light') document.body.classList.add('light-theme');

    btn?.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
      HMS_DB.Settings.set({ theme });
      HMS_Utils.toast(`${theme === 'light' ? '☀️' : '🌙'} ${theme.charAt(0).toUpperCase() + theme.slice(1)} mode enabled`);
    });
  };

  // ── User Info ──
  const initUserInfo = () => {
    const settings = HMS_DB.Settings.get();
    const name = settings.adminName || 'Dr. Admin';
    const initials = HMS_Utils.fmt.initials(name);
    ['topbarAvatar', 'userAvatarSidebar'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = initials;
    });
    ['topbarUserName', 'sidebarUserName'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = name;
    });
  };

  // ── Init ──
  const init = async () => {
    HMS_Utils.loading.show('Initializing MedCare HMS...');

    try {
      await HMS_DB.init();
      initSidebar();
      initNav();
      initSearch();
      initNotifications();
      initTheme();
      initUserInfo();
      navigate('dashboard');
      HMS_Utils.toast('Welcome to MedCare HMS', 'System ready · 15,000 records loaded', 'success');
    } catch (err) {
      console.error('HMS Init error:', err);
      HMS_Utils.toast('Initialization Error', err.message, 'error');
    } finally {
      HMS_Utils.loading.hide();
    }
  };

  return { init, navigate, registerChart, getChart, updateBadges };
})();
window.HMS_App = HMS_App;

// ── Bootstrap ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', HMS_App.init);
} else {
  HMS_App.init();
}
