/* ============================================================
   MedCare HMS – Voice AI Copilot & Interactive Guide Engine
   ============================================================ */

const HMS_AI = (() => {
  let isListening = false;
  let isSpeaking = false;
  let voiceEnabled = true;
  let recognition = null;
  let currentTourStep = 0;
  let tourActive = false;

  // ── Pre-configured Voice Guided Tour Steps ──
  const TOUR_STEPS = [
    {
      title: 'Welcome to MedCare HMS',
      page: 'dashboard',
      speech: "Welcome to MedCare Hospital Management System. I am Dr. Nova, your AI assistant. You can speak to me at any time to navigate or perform hospital tasks. Let me give you a quick tour of our features.",
      desc: "MedCare HMS is a full-featured hospital management suite running with a 15,000-record database. You can speak commands like 'Add Patient' or 'Check Inventory' anytime!"
    },
    {
      title: 'Live Hospital Dashboard',
      page: 'dashboard',
      speech: "Here on the Dashboard, you can monitor live patient admissions, emergency and critical room counts, department bed occupancy, and monthly hospital revenues in real time.",
      desc: "Live KPI metrics, admission trend charts, revenue targets, and quick access to recent admissions and upcoming appointments."
    },
    {
      title: 'Patient Management (15,000 Records)',
      page: 'patients',
      speech: "This is the Patients module. We have loaded fifteen thousand patient records. You can search any name, filter by department or critical status, and register new patients in seconds.",
      desc: "Instant sub-millisecond search across 15,000 patients, full registration CRUD modal, status badges, and CSV export."
    },
    {
      title: 'Doctor Roster & Assignments',
      page: 'doctors',
      speech: "Here you can oversee all two hundred physicians, view their specializations, check on-duty status, consultation fees, and assign them to clinical wards.",
      desc: "View doctors in rich card or table formats, check ratings, department schedules, and assign appointments."
    },
    {
      title: 'Billing & Print-Ready Invoices',
      page: 'billing',
      speech: "In Billing, you can generate comprehensive patient invoices with laboratory, imaging, and medication lines, record payments, and print official hospital bills.",
      desc: "Itemized billing, tax & insurance calculations, payment tracking, and formal print-ready invoice previews."
    },
    {
      title: 'Medical Inventory & Supplies',
      page: 'inventory',
      speech: "The Inventory module monitors clinical supplies, PPE, and medications. It automatically flags items below reorder thresholds so you never run out of vital stock.",
      desc: "Stock level progress meters, low stock warnings, single-click restock modal, and batch expiry tracking."
    },
    {
      title: 'Ready to Help You by Voice',
      page: 'dashboard',
      speech: "Our tour is complete! Try saying 'Add a new patient', 'Check low stock', or 'Switch to light mode' to see me in action.",
      desc: "Click the glowing microphone or press Ctrl + Space to speak commands anytime!"
    }
  ];

  // ── Speech Synthesis (AI Speaks Back) ──
  const speak = (text, onEnd) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Select natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.lang === 'en-US'));
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => {
        isSpeaking = true;
        updateSoundwaves(true);
      };

      utterance.onend = () => {
        isSpeaking = false;
        updateSoundwaves(false);
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        isSpeaking = false;
        updateSoundwaves(false);
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
      if (onEnd) onEnd();
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
      updateSoundwaves(false);
    }
  };

  // ── Speech Recognition (Listening to User's Voice) ──
  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.info('Web Speech Recognition API not available in this browser environment. Text input active.');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      setListeningUI(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('AI Heard:', transcript);
      handleUserInput(transcript, true);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setListeningUI(false);
      isListening = false;
      if (event.error === 'not-allowed') {
        HMS_Utils.toast('Microphone Blocked', 'Please allow microphone access or type in the chat box', 'warning');
      }
    };

    recognition.onend = () => {
      isListening = false;
      setListeningUI(false);
    };
  };

  const toggleListening = () => {
    if (!recognition) {
      initSpeechRecognition();
    }

    if (!recognition) {
      HMS_Utils.toast('Voice Recognition', 'Speech recognition is not supported in this browser. Please type your message below.', 'info');
      document.getElementById('aiTextInput')?.focus();
      return;
    }

    if (isListening) {
      recognition.stop();
      isListening = false;
      setListeningUI(false);
    } else {
      stopSpeaking();
      try {
        recognition.start();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  // ── Intent Parser & Action Executor ──
  const processCommand = (query) => {
    const q = query.toLowerCase().trim();

    // 1. Guided Tour / Help
    if (q.includes('tour') || q.includes('guide me') || q.includes('how to use') || q.includes('what to do') || q.includes('how does this work') || q.includes('help me') || q.includes('what can you do')) {
      startTour();
      return {
        reply: "Starting the interactive voice tour! I will guide you through all major modules of MedCare HMS.",
        action: null
      };
    }

    // 2. Add / Register Patient
    if (q.includes('add patient') || q.includes('register patient') || q.includes('new patient') || q.includes('create patient')) {
      HMS_App.navigate('patients');
      setTimeout(() => HMS_Patients.openAddModal(), 350);
      return {
        reply: "Opening the Patient Registration form for you now.",
        action: { label: 'Register Patient Form', fn: () => HMS_Patients.openAddModal() }
      };
    }

    // 3. View Patients / Search Patients
    if (q.includes('patient') || q.includes('patients')) {
      HMS_App.navigate('patients');
      if (q.includes('critical')) {
        setTimeout(() => {
          const filter = document.getElementById('filterStatus');
          if (filter) { filter.value = 'Critical'; filter.dispatchEvent(new Event('change')); }
        }, 300);
        return { reply: "Navigated to Patients and filtered by Critical status." };
      }
      return { reply: "Navigating to Patient Management. You can search across 15,000 records." };
    }

    // 4. Add Doctor / Register Doctor
    if (q.includes('add doctor') || q.includes('register doctor') || q.includes('new doctor') || q.includes('hire doctor')) {
      HMS_App.navigate('doctors');
      setTimeout(() => HMS_Doctors.openAddModal(), 350);
      return {
        reply: "Opening the Physician Registration modal to add a new doctor.",
        action: { label: 'Add Doctor Form', fn: () => HMS_Doctors.openAddModal() }
      };
    }

    // 5. View Doctors / Find Doctor
    if (q.includes('doctor') || q.includes('physician') || q.includes('surgeon')) {
      HMS_App.navigate('doctors');
      if (q.includes('cardiology')) {
        setTimeout(() => {
          const dFilter = document.getElementById('filterDocDept');
          if (dFilter) { dFilter.value = 'Cardiology'; dFilter.dispatchEvent(new Event('change')); }
        }, 300);
        return { reply: "Showing all Cardiology specialists and surgeons." };
      }
      return { reply: "Opening Doctors directory. You can toggle between card and table view." };
    }

    // 6. Schedule Appointment
    if (q.includes('schedule appointment') || q.includes('book appointment') || q.includes('new appointment')) {
      HMS_App.navigate('appointments');
      setTimeout(() => HMS_Appointments.openAddModal(), 350);
      return {
        reply: "Opening the Appointment Scheduling modal.",
        action: { label: 'Schedule Appointment', fn: () => HMS_Appointments.openAddModal() }
      };
    }

    // 7. View Appointments
    if (q.includes('appointment') || q.includes('appointments') || q.includes('schedule')) {
      HMS_App.navigate('appointments');
      return { reply: "Opening Appointments calendar and roster." };
    }

    // 8. Create Bill / Invoice
    if (q.includes('create bill') || q.includes('new bill') || q.includes('create invoice') || q.includes('new invoice') || q.includes('charge patient')) {
      HMS_App.navigate('billing');
      setTimeout(() => HMS_Billing.openCreateModal(), 350);
      return {
        reply: "Navigating to Billing and opening the invoice generation form.",
        action: { label: 'Create Invoice', fn: () => HMS_Billing.openCreateModal() }
      };
    }

    // 9. View Billing
    if (q.includes('bill') || q.includes('billing') || q.includes('invoice') || q.includes('revenue') || q.includes('payment')) {
      HMS_App.navigate('billing');
      return { reply: "Navigated to Billing & Invoices. You can view payment statuses and print invoices." };
    }

    // 10. Low Stock / Out of Stock / Inventory
    if (q.includes('low stock') || q.includes('out of stock') || q.includes('shortage')) {
      HMS_App.navigate('inventory');
      setTimeout(() => {
        const sFilter = document.getElementById('invFilterStatus');
        if (sFilter) { sFilter.value = 'Low Stock'; sFilter.dispatchEvent(new Event('change')); }
      }, 300);
      return {
        reply: "Checking inventory for supplies that need immediate reordering.",
        action: { label: 'View Low Stock Items', fn: () => HMS_App.navigate('inventory') }
      };
    }

    if (q.includes('inventory') || q.includes('stock') || q.includes('medicines') || q.includes('supplies')) {
      HMS_App.navigate('inventory');
      return { reply: "Opening Hospital Inventory & Medical Supplies." };
    }

    // 11. Reports & Analytics
    if (q.includes('report') || q.includes('reports') || q.includes('analytics') || q.includes('chart') || q.includes('performance')) {
      HMS_App.navigate('reports');
      return { reply: "Displaying hospital analytics, bed capacity, and department performance reports." };
    }

    // 12. Switch Theme (Light / Dark)
    if (q.includes('light theme') || q.includes('light mode') || q.includes('day mode')) {
      document.body.classList.add('light-theme');
      HMS_DB.Settings.set({ theme: 'light' });
      return { reply: "Switched to clean modern light theme." };
    }

    if (q.includes('dark theme') || q.includes('dark mode') || q.includes('night mode')) {
      document.body.classList.remove('light-theme');
      HMS_DB.Settings.set({ theme: 'dark' });
      return { reply: "Switched to sleek dark mode." };
    }

    // 13. Backup / Export Data
    if (q.includes('backup') || q.includes('export data') || q.includes('download data')) {
      HMS_Settings.exportAllData();
      return { reply: "Preparing full database backup download for you now." };
    }

    // 14. Settings
    if (q.includes('setting') || q.includes('settings') || q.includes('admin') || q.includes('profile')) {
      HMS_App.navigate('settings');
      return { reply: "Opening System Settings and hospital configuration." };
    }

    // 15. Dashboard
    if (q.includes('home') || q.includes('dashboard') || q.includes('main')) {
      HMS_App.navigate('dashboard');
      return { reply: "Returned to the main hospital dashboard." };
    }

    // General fallback
    return {
      reply: `I heard: "${query}". You can ask me to "Add Patient", "Show low stock medicines", "Create Invoice", "Show Doctors", or say "Guide me" for an interactive voice tour!`,
      action: { label: 'Start Interactive Tour', fn: () => startTour() }
    };
  };

  // ── Handle User Input (Spoken or Typed) ──
  const handleUserInput = (text, isVoice = false) => {
    if (!text || !text.trim()) return;

    // Append user message to panel
    appendMessage(text, 'user');

    // Process intent & execute
    const result = processCommand(text);

    // Append AI response
    setTimeout(() => {
      appendMessage(result.reply, 'bot', result.action);
      speak(result.reply);
    }, 200);

    // Clear input
    const input = document.getElementById('aiTextInput');
    if (input) input.value = '';
  };

  // ── Append Chat Bubble ──
  const appendMessage = (text, sender = 'bot', action = null) => {
    const chatBody = document.getElementById('aiChatBody');
    if (!chatBody) return;

    const msgEl = document.createElement('div');
    msgEl.className = `ai-msg ${sender}`;

    const avatar = sender === 'bot'
      ? `<div class="ai-msg-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/></svg></div>`
      : `<div class="ai-msg-avatar">YOU</div>`;

    let actionHtml = '';
    if (action) {
      actionHtml = `
        <div class="ai-msg-action-card" id="actionBtn_${Date.now()}">
          <span>⚡ ${HMS_Utils.esc(action.label)}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      `;
    }

    msgEl.innerHTML = `
      ${avatar}
      <div class="ai-msg-bubble">
        ${HMS_Utils.esc(text)}
        ${actionHtml}
      </div>
    `;

    chatBody.appendChild(msgEl);
    chatBody.scrollTop = chatBody.scrollHeight;

    if (action) {
      const card = msgEl.querySelector('.ai-msg-action-card');
      card?.addEventListener('click', () => {
        action.fn();
      });
    }
  };

  // ── Interactive Guided Voice Tour ──
  const startTour = () => {
    currentTourStep = 0;
    tourActive = true;
    closePanel();
    showTourStep(0);
  };

  const showTourStep = (index) => {
    if (index >= TOUR_STEPS.length) {
      endTour();
      return;
    }

    currentTourStep = index;
    const step = TOUR_STEPS[index];

    // Navigate to step's page
    HMS_App.navigate(step.page);

    const overlay = document.getElementById('tourOverlay');
    const card = document.getElementById('tourCard');

    if (overlay && card) {
      overlay.style.display = 'block';
      card.style.display = 'block';
      overlay.classList.add('active');
      card.classList.add('active');

      card.innerHTML = `
        <div class="tour-step-badge">Step ${index + 1} of ${TOUR_STEPS.length} · Voice Guide</div>
        <div class="tour-title">${step.title}</div>
        <div class="tour-desc">${step.desc}</div>
        <div class="tour-footer">
          <div class="tour-progress">
            ${TOUR_STEPS.map((_, i) => `<span class="tour-dot ${i === index ? 'active' : ''}"></span>`).join('')}
          </div>
          <div class="tour-actions">
            <button class="btn btn-secondary btn-sm" onclick="HMS_AI.endTour()">Skip Tour</button>
            <button class="btn btn-primary btn-sm" id="tourNextBtn">
              ${index === TOUR_STEPS.length - 1 ? 'Finish' : 'Next Step →'}
            </button>
          </div>
        </div>
      `;

      document.getElementById('tourNextBtn')?.addEventListener('click', () => {
        stopSpeaking();
        showTourStep(index + 1);
      });
    }

    // Speak instructions
    speak(step.speech);
  };

  const endTour = () => {
    tourActive = false;
    stopSpeaking();
    const overlay = document.getElementById('tourOverlay');
    const card = document.getElementById('tourCard');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.style.display = 'none';
    }
    if (card) {
      card.classList.remove('active');
      card.style.display = 'none';
    }
    HMS_Utils.toast('Tour Finished', "You're all set! Speak or type to Dr. Nova anytime.", 'success');
  };

  // ── UI Control & State ──
  const togglePanel = () => {
    const panel = document.getElementById('aiPanel');
    if (panel) {
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) {
        document.getElementById('aiTextInput')?.focus();
      }
    }
  };

  const closePanel = () => {
    document.getElementById('aiPanel')?.classList.remove('open');
  };

  const setListeningUI = (listening) => {
    const micBtn = document.getElementById('aiMicBtn');
    const voiceBar = document.getElementById('aiVoiceActiveBar');
    const waveEl = document.getElementById('orbSoundWave');

    if (listening) {
      micBtn?.classList.add('listening');
      voiceBar?.classList.add('active');
      waveEl?.classList.add('active');
    } else {
      micBtn?.classList.remove('listening');
      voiceBar?.classList.remove('active');
      if (!isSpeaking) waveEl?.classList.remove('active');
    }
  };

  const updateSoundwaves = (active) => {
    const waveEl = document.getElementById('orbSoundWave');
    if (active) {
      waveEl?.classList.add('active');
    } else if (!isListening) {
      waveEl?.classList.remove('active');
    }
  };

  // ── Mount Floating Widget & Modals into DOM ──
  const injectUI = () => {
    // 1. Floating AI Launcher Orb
    const trigger = document.createElement('div');
    trigger.className = 'ai-copilot-trigger';
    trigger.id = 'aiCopilotTrigger';
    trigger.setAttribute('title', 'MedCare Voice AI Assistant (Click or press Ctrl+Space)');
    trigger.innerHTML = `
      <div class="ai-orb-label">
        <div class="ai-live-dot"></div>
        <div>
          <div class="ai-orb-label-text">
            <span>Voice Copilot</span>
            <div class="sound-wave" id="orbSoundWave">
              <span class="bar"></span>
              <span class="bar"></span>
              <span class="bar"></span>
              <span class="bar"></span>
              <span class="bar"></span>
            </div>
          </div>
          <div class="ai-orb-label-sub">Speak or Click to Guide</div>
        </div>
      </div>
      <div class="ai-orb-btn" id="aiOrbBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </div>
    `;
    document.body.appendChild(trigger);

    // 2. Sliding Flyout AI Panel
    const panel = document.createElement('div');
    panel.className = 'ai-panel';
    panel.id = 'aiPanel';
    panel.innerHTML = `
      <div class="ai-panel-header">
        <div class="ai-header-left">
          <div class="ai-header-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div>
            <div class="ai-header-title">Dr. Nova · AI Copilot</div>
            <div class="ai-header-status">
              <span class="ai-live-dot" style="width:6px;height:6px;"></span>
              Voice & Navigation Ready
            </div>
          </div>
        </div>
        <div class="ai-header-actions">
          <button class="ai-header-btn ${voiceEnabled ? 'active' : ''}" id="aiVoiceToggleBtn" title="Toggle Voice Speech Audio">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          </button>
          <button class="ai-header-btn" id="aiTourBtn" title="Start Guided Hospital Tour">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
          </button>
          <button class="ai-header-btn" id="aiCloseBtn" title="Close Panel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div class="ai-voice-active-bar" id="aiVoiceActiveBar">
        <div class="ai-voice-indicator">
          <div class="ai-wave-bars">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
          <span>Listening to your voice... Speak now</span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="HMS_AI.toggleListening()" style="padding:2px 8px; font-size:11px;">Cancel</button>
      </div>

      <div class="ai-chat-body" id="aiChatBody">
        <div class="ai-msg bot">
          <div class="ai-msg-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/></svg>
          </div>
          <div class="ai-msg-bubble">
            Hello! I am <strong>Dr. Nova</strong>, your Hospital AI Copilot. Speak or type to me anytime. I can guide you through any part of the system or perform tasks automatically.
          </div>
        </div>
      </div>

      <!-- Quick Suggestion Chips -->
      <div class="ai-chips-wrapper">
        <button class="ai-chip" onclick="HMS_AI.handleUserInput('Start guided tour')">🗺️ Guide Me</button>
        <button class="ai-chip" onclick="HMS_AI.handleUserInput('Add a new patient')">➕ Register Patient</button>
        <button class="ai-chip" onclick="HMS_AI.handleUserInput('Check low stock inventory')">⚠️ Check Low Stock</button>
        <button class="ai-chip" onclick="HMS_AI.handleUserInput('Create a new invoice')">💳 Create Bill</button>
        <button class="ai-chip" onclick="HMS_AI.handleUserInput('Switch to light theme')">☀️ Light Theme</button>
        <button class="ai-chip" onclick="HMS_AI.handleUserInput('Show all doctors in Cardiology')">🩺 Cardiologists</button>
      </div>

      <!-- Input Bar -->
      <div class="ai-input-bar">
        <button class="ai-mic-btn" id="aiMicBtn" title="Click to Speak (Microphone)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
        <input type="text" class="ai-text-input" id="aiTextInput" placeholder="Ask or speak anything... (e.g. 'Register Patient')" />
        <button class="ai-send-btn" id="aiSendBtn" title="Send Command">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    `;
    document.body.appendChild(panel);

    // 3. Tour Overlay & Floating Card
    const tourOverlay = document.createElement('div');
    tourOverlay.className = 'tour-overlay';
    tourOverlay.id = 'tourOverlay';
    tourOverlay.style.display = 'none';
    document.body.appendChild(tourOverlay);

    const tourCard = document.createElement('div');
    tourCard.className = 'tour-card';
    tourCard.id = 'tourCard';
    tourCard.style.display = 'none';
    document.body.appendChild(tourCard);

    // Bind event listeners
    trigger.addEventListener('click', togglePanel);
    document.getElementById('aiCloseBtn')?.addEventListener('click', closePanel);

    document.getElementById('aiTourBtn')?.addEventListener('click', () => {
      startTour();
    });

    document.getElementById('aiVoiceToggleBtn')?.addEventListener('click', (e) => {
      voiceEnabled = !voiceEnabled;
      const btn = e.currentTarget;
      if (voiceEnabled) {
        btn.classList.add('active');
        HMS_Utils.toast('Voice Speech Enabled', 'Dr. Nova will speak answers aloud', 'info');
      } else {
        btn.classList.remove('active');
        stopSpeaking();
        HMS_Utils.toast('Voice Speech Muted', 'Audio responses muted', 'info');
      }
    });

    document.getElementById('aiMicBtn')?.addEventListener('click', toggleListening);

    const textInput = document.getElementById('aiTextInput');
    document.getElementById('aiSendBtn')?.addEventListener('click', () => {
      handleUserInput(textInput?.value);
    });

    textInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleUserInput(textInput.value);
      }
    });

    // Global shortcut Ctrl + Space to trigger voice / panel
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        togglePanel();
      }
    });

    initSpeechRecognition();
  };

  const init = () => {
    injectUI();
    console.log('🤖 HMS Voice AI Copilot (Dr. Nova) initialized');
  };

  return {
    init,
    togglePanel,
    toggleListening,
    handleUserInput,
    startTour,
    endTour,
    speak
  };
})();
window.HMS_AI = HMS_AI;

// Auto-initialize when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', HMS_AI.init);
} else {
  HMS_AI.init();
}
