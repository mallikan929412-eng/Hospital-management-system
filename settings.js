/* ============================================================
   MedCare HMS – System Settings Module
   ============================================================ */

const HMS_Settings = (() => {
  const { fmt, esc, modal, toast, loading } = HMS_Utils;

  let activeTab = 'hospital';

  const render = () => {
    const content = document.getElementById('pageContent');
    const settings = HMS_DB.Settings.get();

    // Data stats
    const patientCount = HMS_DB.Patients().count();
    const docCount = HMS_DB.Doctors().count();
    const apptCount = HMS_DB.Appointments().count();
    const billCount = HMS_DB.Billing().count();
    const invCount = HMS_DB.Inventory().count();

    // Calculate approximate storage usage
    let storageBytes = 0;
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          storageBytes += (localStorage[key].length + key.length) * 2;
        }
      }
    } catch (e) {}
    const storageMB = (storageBytes / (1024 * 1024)).toFixed(2);

    content.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <div class="page-breadcrumb">HMS <span>/ Settings</span></div>
          <h1 class="page-title">System Settings</h1>
          <p class="page-subtitle">Configure hospital profile, admin credentials, system preferences and data storage</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="HMS_Settings.exportAllData()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export All Data (JSON)
          </button>
        </div>
      </div>

      <!-- Settings Navigation Tabs -->
      <div class="modal-tabs" style="max-width: 650px; margin-bottom: 24px;">
        <button class="modal-tab-btn ${activeTab === 'hospital' ? 'active' : ''}" onclick="HMS_Settings.switchTab('hospital')">
          🏥 Hospital Info
        </button>
        <button class="modal-tab-btn ${activeTab === 'admin' ? 'active' : ''}" onclick="HMS_Settings.switchTab('admin')">
          👤 Admin Profile
        </button>
        <button class="modal-tab-btn ${activeTab === 'appearance' ? 'active' : ''}" onclick="HMS_Settings.switchTab('appearance')">
          🎨 Appearance
        </button>
        <button class="modal-tab-btn ${activeTab === 'database' ? 'active' : ''}" onclick="HMS_Settings.switchTab('database')">
          💾 Database & Maintenance
        </button>
      </div>

      <!-- Tab Contents -->
      <div id="settingsTabContent">
        ${renderTabContent(settings, { patientCount, docCount, apptCount, billCount, invCount, storageMB })}
      </div>
    `;

    bindTabEvents();
  };

  const switchTab = (tab) => {
    activeTab = tab;
    render();
  };

  const renderTabContent = (settings, stats) => {
    if (activeTab === 'hospital') {
      return `
        <div class="card" style="max-width: 860px;">
          <div class="card-header">
            <div class="card-title">
              <div class="card-icon" style="background: var(--grad-blue);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="12" y1="6" x2="12" y2="12"/></svg>
              </div>
              Hospital Identity & Contact Details
            </div>
          </div>
          <div class="card-body">
            <form id="hospitalSettingsForm" class="form-grid form-grid-2">
              <div class="form-group full">
                <label class="form-label">Hospital Name <span class="form-required">*</span></label>
                <input type="text" class="form-input" id="set_hospitalName" value="${esc(settings.hospitalName || 'MedCare General Hospital')}" required />
              </div>

              <div class="form-group full">
                <label class="form-label">Hospital Address</label>
                <input type="text" class="form-input" id="set_address" value="${esc(settings.address || '123 Medical Center Drive, New York, NY 10001')}" />
              </div>

              <div class="form-group">
                <label class="form-label">Primary Phone</label>
                <input type="text" class="form-input" id="set_phone" value="${esc(settings.phone || '+1-800-MEDCARE')}" />
              </div>

              <div class="form-group">
                <label class="form-label">Official Email</label>
                <input type="email" class="form-input" id="set_email" value="${esc(settings.email || 'info@medcare.hospital')}" />
              </div>

              <div class="form-group">
                <label class="form-label">Hospital Website</label>
                <input type="text" class="form-input" id="set_website" value="${esc(settings.website || 'www.medcare.hospital')}" />
              </div>

              <div class="form-group">
                <label class="form-label">Tax Rate (%)</label>
                <input type="number" step="0.1" min="0" max="100" class="form-input" id="set_taxRate" value="${settings.taxRate ?? 8}" />
              </div>

              <div class="form-group">
                <label class="form-label">Billing Currency</label>
                <select class="form-select" id="set_currency">
                  <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>USD ($ - US Dollar)</option>
                  <option value="EUR" ${settings.currency === 'EUR' ? 'selected' : ''}>EUR (€ - Euro)</option>
                  <option value="GBP" ${settings.currency === 'GBP' ? 'selected' : ''}>GBP (£ - British Pound)</option>
                  <option value="INR" ${settings.currency === 'INR' ? 'selected' : ''}>INR (₹ - Indian Rupee)</option>
                  <option value="CAD" ${settings.currency === 'CAD' ? 'selected' : ''}>CAD ($ - Canadian Dollar)</option>
                  <option value="AUD" ${settings.currency === 'AUD' ? 'selected' : ''}>AUD ($ - Australian Dollar)</option>
                </select>
              </div>

              <div class="form-group full" style="margin-top: 12px; display: flex; justify-content: flex-end;">
                <button type="button" class="btn btn-primary" onclick="HMS_Settings.saveHospitalInfo()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                  Save Hospital Info
                </button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    if (activeTab === 'admin') {
      const name = settings.adminName || 'Dr. Admin';
      const initials = HMS_Utils.fmt.initials(name);

      return `
        <div class="card" style="max-width: 860px;">
          <div class="card-header">
            <div class="card-title">
              <div class="card-icon" style="background: var(--grad-purple);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              Administrator Profile
            </div>
          </div>
          <div class="card-body">
            <!-- Profile Preview Banner -->
            <div style="display: flex; align-items: center; gap: 20px; background: var(--glass-bg); padding: 20px; border-radius: var(--radius-lg); border: 1px solid var(--border); margin-bottom: 24px;">
              <div style="width: 64px; height: 64px; border-radius: var(--radius-full); background: var(--grad-blue); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: white;">
                ${initials}
              </div>
              <div>
                <h3 style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px;">${esc(name)}</h3>
                <p style="font-size: 13px; color: var(--text-muted); margin: 0;">Chief Medical Administrator · MedCare HMS</p>
                <div style="font-size: 12px; color: var(--blue-light); margin-top: 4px;">${esc(settings.adminEmail || 'admin@medcare.hospital')}</div>
              </div>
            </div>

            <form id="adminSettingsForm" class="form-grid form-grid-2">
              <div class="form-group">
                <label class="form-label">Full Name <span class="form-required">*</span></label>
                <input type="text" class="form-input" id="set_adminName" value="${esc(settings.adminName || 'Dr. Admin')}" required />
              </div>

              <div class="form-group">
                <label class="form-label">Email Address <span class="form-required">*</span></label>
                <input type="email" class="form-input" id="set_adminEmail" value="${esc(settings.adminEmail || 'admin@medcare.hospital')}" required />
              </div>

              <div class="form-group">
                <label class="form-label">Contact Number</label>
                <input type="text" class="form-input" id="set_adminPhone" value="${esc(settings.adminPhone || '+1-800-MEDCARE-01')}" />
              </div>

              <div class="form-group">
                <label class="form-label">Designation / Role</label>
                <input type="text" class="form-input" id="set_adminRole" value="${esc(settings.adminRole || 'Chief Medical Administrator')}" />
              </div>

              <div class="form-group full" style="margin-top: 12px; display: flex; justify-content: flex-end;">
                <button type="button" class="btn btn-primary" onclick="HMS_Settings.saveAdminProfile()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                  Update Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    if (activeTab === 'appearance') {
      const isLight = document.body.classList.contains('light-theme') || settings.theme === 'light';

      return `
        <div class="card" style="max-width: 860px;">
          <div class="card-header">
            <div class="card-title">
              <div class="card-icon" style="background: var(--grad-emerald);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              </div>
              Appearance & Display Preferences
            </div>
          </div>
          <div class="card-body">
            <div class="form-grid form-grid-2">
              <!-- Theme Option -->
              <div class="form-group full" style="margin-bottom: 12px;">
                <label class="form-label">Theme Mode</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px;">
                  <div onclick="HMS_Settings.applyTheme('dark')" style="background: #080C1A; border: 2px solid ${!isLight ? 'var(--blue)' : 'var(--border)'}; border-radius: var(--radius-lg); padding: 18px; cursor: pointer; display: flex; align-items: center; gap: 14px;">
                    <div style="width: 38px; height: 38px; border-radius: var(--radius-full); background: rgba(59,130,246,0.2); display: flex; align-items: center; justify-content: center; color: var(--blue-light); font-size: 18px;">
                      🌙
                    </div>
                    <div>
                      <div style="font-weight: 700; color: #F1F5F9; font-size: 15px;">Dark Mode (Recommended)</div>
                      <div style="font-size: 12px; color: #94A3B8;">Sleek deep navy with glassmorphic accents</div>
                    </div>
                  </div>

                  <div onclick="HMS_Settings.applyTheme('light')" style="background: #FFFFFF; border: 2px solid ${isLight ? 'var(--blue)' : 'var(--border)'}; border-radius: var(--radius-lg); padding: 18px; cursor: pointer; display: flex; align-items: center; gap: 14px;">
                    <div style="width: 38px; height: 38px; border-radius: var(--radius-full); background: rgba(245,158,11,0.2); display: flex; align-items: center; justify-content: center; color: #D97706; font-size: 18px;">
                      ☀️
                    </div>
                    <div>
                      <div style="font-weight: 700; color: #1E293B; font-size: 15px;">Light Mode</div>
                      <div style="font-size: 12px; color: #64748B;">Crisp slate background with high contrast</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Date Format</label>
                <select class="form-select" id="set_dateFormat">
                  <option value="MM/DD/YYYY" ${settings.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY (e.g. 10/25/2026)</option>
                  <option value="DD/MM/YYYY" ${settings.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY (e.g. 25/10/2026)</option>
                  <option value="YYYY-MM-DD" ${settings.dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD (e.g. 2026-10-25)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Default Table Rows Per Page</label>
                <select class="form-select" id="set_perPage">
                  <option value="10" ${settings.perPage === 10 ? 'selected' : ''}>10 rows</option>
                  <option value="15" ${settings.perPage === 15 || !settings.perPage ? 'selected' : ''}>15 rows (Standard)</option>
                  <option value="25" ${settings.perPage === 25 ? 'selected' : ''}>25 rows</option>
                  <option value="50" ${settings.perPage === 50 ? 'selected' : ''}>50 rows</option>
                </select>
              </div>

              <div class="form-group full" style="margin-top: 12px; display: flex; justify-content: flex-end;">
                <button type="button" class="btn btn-primary" onclick="HMS_Settings.saveAppearance()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (activeTab === 'database') {
      return `
        <div class="card" style="max-width: 860px;">
          <div class="card-header">
            <div class="card-title">
              <div class="card-icon" style="background: var(--grad-rose);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
              </div>
              Database Status & System Maintenance
            </div>
          </div>
          <div class="card-body">
            <!-- Stats overview -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; margin-bottom: 24px;">
              <div style="background: var(--glass-bg); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border); text-align: center;">
                <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Patients</div>
                <div style="font-size: 22px; font-weight: 800; color: var(--blue-light); margin-top: 4px;">${fmt.number(stats.patientCount)}</div>
              </div>

              <div style="background: var(--glass-bg); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border); text-align: center;">
                <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Doctors</div>
                <div style="font-size: 22px; font-weight: 800; color: var(--emerald-light); margin-top: 4px;">${fmt.number(stats.docCount)}</div>
              </div>

              <div style="background: var(--glass-bg); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border); text-align: center;">
                <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Appointments</div>
                <div style="font-size: 22px; font-weight: 800; color: var(--amber-light); margin-top: 4px;">${fmt.number(stats.apptCount)}</div>
              </div>

              <div style="background: var(--glass-bg); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border); text-align: center;">
                <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Invoices</div>
                <div style="font-size: 22px; font-weight: 800; color: var(--purple-light); margin-top: 4px;">${fmt.number(stats.billCount)}</div>
              </div>

              <div style="background: var(--glass-bg); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border); text-align: center;">
                <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Inventory</div>
                <div style="font-size: 22px; font-weight: 800; color: var(--cyan); margin-top: 4px;">${fmt.number(stats.invCount)}</div>
              </div>

              <div style="background: var(--glass-bg); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border); text-align: center;">
                <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Storage Used</div>
                <div style="font-size: 22px; font-weight: 800; color: var(--rose-light); margin-top: 4px;">~${stats.storageMB} MB</div>
              </div>
            </div>

            <!-- Maintenance Actions -->
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--glass-bg); border-radius: var(--radius-lg); border: 1px solid var(--border);">
                <div>
                  <div style="font-weight: 700; color: var(--text-primary);">Backup Hospital Data</div>
                  <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">Export all patients, doctors, appointments, invoices and inventory as JSON</div>
                </div>
                <button class="btn btn-secondary" onclick="HMS_Settings.exportAllData()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export JSON
                </button>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(244,63,94,0.05); border-radius: var(--radius-lg); border: 1px solid rgba(244,63,94,0.2);">
                <div>
                  <div style="font-weight: 700; color: var(--rose);">Reset & Re-Seed 15,000 Records</div>
                  <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">Resets database and regenerates 15,000 fresh patients, 200 doctors, 8,000 appointments and 12,000 invoices</div>
                </div>
                <button class="btn btn-danger" onclick="HMS_Settings.confirmReseed()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                  Re-Seed Database
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return '';
  };

  const bindTabEvents = () => {
    // Future interactive tab bindings if needed
  };

  // ── Save Hospital Info ──
  const saveHospitalInfo = () => {
    const hospitalName = document.getElementById('set_hospitalName')?.value.trim();
    const address = document.getElementById('set_address')?.value.trim();
    const phone = document.getElementById('set_phone')?.value.trim();
    const email = document.getElementById('set_email')?.value.trim();
    const website = document.getElementById('set_website')?.value.trim();
    const taxRate = parseFloat(document.getElementById('set_taxRate')?.value) || 8;
    const currency = document.getElementById('set_currency')?.value || 'USD';

    if (!hospitalName) {
      toast('Validation Error', 'Hospital name cannot be empty', 'error');
      return;
    }

    HMS_DB.Settings.set({
      hospitalName,
      address,
      phone,
      email,
      website,
      taxRate,
      currency
    });

    toast('Settings Saved', 'Hospital details updated successfully', 'success');
  };

  // ── Save Admin Profile ──
  const saveAdminProfile = () => {
    const adminName = document.getElementById('set_adminName')?.value.trim();
    const adminEmail = document.getElementById('set_adminEmail')?.value.trim();
    const adminPhone = document.getElementById('set_adminPhone')?.value.trim();
    const adminRole = document.getElementById('set_adminRole')?.value.trim();

    if (!adminName) {
      toast('Validation Error', 'Admin name cannot be empty', 'error');
      return;
    }

    HMS_DB.Settings.set({
      adminName,
      adminEmail,
      adminPhone,
      adminRole
    });

    // Update UI elements in sidebar & topbar
    const initials = fmt.initials(adminName);
    ['topbarAvatar', 'userAvatarSidebar'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = initials;
    });
    ['topbarUserName', 'sidebarUserName'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = adminName;
    });

    toast('Profile Updated', 'Administrator profile updated', 'success');
    render();
  };

  // ── Save Appearance ──
  const saveAppearance = () => {
    const dateFormat = document.getElementById('set_dateFormat')?.value;
    const perPage = parseInt(document.getElementById('set_perPage')?.value, 10) || 15;

    HMS_DB.Settings.set({ dateFormat, perPage });
    toast('Preferences Saved', 'Appearance settings updated', 'success');
  };

  // ── Apply Theme ──
  const applyTheme = (theme) => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    HMS_DB.Settings.set({ theme });
    toast(`${theme === 'light' ? '☀️ Light' : '🌙 Dark'} Theme Applied`, '', 'info');
    render();
  };

  // ── Export Full Data ──
  const exportAllData = () => {
    loading.show('Generating full database export...');
    setTimeout(() => {
      try {
        const fullBackup = {
          exportDate: new Date().toISOString(),
          settings: HMS_DB.Settings.get(),
          patients: HMS_DB.Patients().getAll(),
          doctors: HMS_DB.Doctors().getAll(),
          appointments: HMS_DB.Appointments().getAll(),
          billing: HMS_DB.Billing().getAll(),
          inventory: HMS_DB.Inventory().getAll()
        };

        const jsonString = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', `medcare_hms_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        toast('Export Successful', `Backup downloaded (${fullBackup.patients.length} patients, ${fullBackup.doctors.length} doctors)`, 'success');
      } catch (err) {
        toast('Export Failed', err.message, 'error');
      } finally {
        loading.hide();
      }
    }, 400);
  };

  // ── Confirm Re-Seed ──
  const confirmReseed = () => {
    modal.confirm({
      title: 'Reset & Re-Seed Database',
      message: 'This will reset all current records and regenerate 15,000 fresh patients, 200 doctors, 8,000 appointments, and 12,000 invoices into local storage. Are you sure you want to proceed?',
      confirmText: 'Yes, Re-Seed Now',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        loading.show('Generating 15,000 records... Please wait');
        setTimeout(async () => {
          try {
            // Remove seeded flag
            localStorage.removeItem('hms_seeded_v4');
            localStorage.removeItem('hms_patients');
            localStorage.removeItem('hms_doctors');
            localStorage.removeItem('hms_appointments');
            localStorage.removeItem('hms_billing');
            localStorage.removeItem('hms_inventory');
            localStorage.removeItem('hms_notifications');

            await HMS_DB.init();
            toast('Database Re-seeded', 'Successfully loaded 15,000 patients and relational data', 'success');
            render();
          } catch (e) {
            toast('Re-seed Error', e.message, 'error');
          } finally {
            loading.hide();
          }
        }, 500);
      }
    });
  };

  return {
    render,
    switchTab,
    saveHospitalInfo,
    saveAdminProfile,
    saveAppearance,
    applyTheme,
    exportAllData,
    confirmReseed
  };
})();
window.HMS_Settings = HMS_Settings;
