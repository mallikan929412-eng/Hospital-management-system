/* ============================================================
   MedCare HMS – Database Layer (localStorage + 15,000 record seed)
   ============================================================ */

const HMS_DB = (() => {
  const KEYS = {
    patients: 'hms_patients',
    doctors: 'hms_doctors',
    appointments: 'hms_appointments',
    billing: 'hms_billing',
    inventory: 'hms_inventory',
    settings: 'hms_settings',
    notifications: 'hms_notifications',
    seeded: 'hms_seeded_v4',
  };

  // ── Utilities ──
  const uid = () => 'HMS' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,6).toUpperCase();
  const now = () => new Date().toISOString();
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const randDate = (daysBack = 365, daysForward = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - randInt(daysForward, daysBack));
    return d.toISOString().split('T')[0];
  };
  const randFloat = (min, max, dec = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(dec));

  // ── Seed Data Generators ──
  const FIRST_NAMES_M = ['James','John','Robert','Michael','William','David','Richard','Joseph','Thomas','Charles',
    'Christopher','Daniel','Matthew','Anthony','Donald','Mark','Paul','Steven','George','Kenneth','Andrew','Joshua',
    'Kevin','Brian','Edward','Ronald','Timothy','Jason','Jeffrey','Ryan','Jacob','Gary','Nicholas','Eric','Jonathan',
    'Stephen','Larry','Justin','Scott','Brandon','Benjamin','Samuel','Frank','Gregory','Raymond','Alexander','Patrick',
    'Jack','Dennis','Jerry','Tyler','Aaron','Henry','Douglas','Peter','Adam','Walter','Harold','Zachary','Jose','Arthur',
    'Ethan','Carl','Randy','Bobby','Dylan','Roy','Kyle','Eugene','Lawrence','Joe','Albert','Nathan','Billy','Wayne'];

  const FIRST_NAMES_F = ['Mary','Patricia','Linda','Barbara','Elizabeth','Jennifer','Maria','Susan','Margaret','Dorothy',
    'Lisa','Nancy','Karen','Betty','Helen','Sandra','Donna','Carol','Ruth','Sharon','Michelle','Laura','Sarah','Kimberly',
    'Deborah','Jessica','Shirley','Cynthia','Angela','Melissa','Brenda','Amy','Anna','Rebecca','Virginia','Kathleen',
    'Pamela','Martha','Debra','Amanda','Stephanie','Carolyn','Christine','Marie','Janet','Catherine','Frances','Ann',
    'Joyce','Diane','Alice','Julie','Heather','Teresa','Doris','Gloria','Evelyn','Jean','Cheryl','Mildred','Katherine',
    'Joan','Ashley','Judith','Rose','Janice','Kelly','Nicole','Judy','Christina','Kathy','Theresa','Beverly'];

  const LAST_NAMES = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
    'Hernandez','Lopez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson',
    'White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott',
    'Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter',
    'Roberts','Gomez','Phillips','Evans','Turner','Diaz','Parker','Cruz','Edwards','Collins','Reyes','Stewart','Morris',
    'Morales','Murphy','Cook','Rogers','Gutierrez','Ortiz','Morgan','Cooper','Peterson','Bailey','Reed','Kelly','Howard'];

  const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
  const GENDERS = ['Male','Female'];

  const DEPARTMENTS = ['Cardiology','Neurology','Orthopedics','Pediatrics','Oncology','Emergency','Radiology',
    'Psychiatry','Dermatology','Ophthalmology','ENT','Nephrology','Gastroenterology','Pulmonology','Endocrinology',
    'Rheumatology','Urology','Gynecology','Hematology','General Surgery'];

  const SPECIALIZATIONS = {
    'Cardiology': ['Interventional Cardiology','Heart Failure','Electrophysiology'],
    'Neurology': ['Stroke Medicine','Epilepsy','Neuro-oncology'],
    'Orthopedics': ['Joint Replacement','Sports Medicine','Spine Surgery'],
    'Pediatrics': ['Neonatology','Pediatric Surgery','Adolescent Medicine'],
    'Oncology': ['Medical Oncology','Radiation Oncology','Surgical Oncology'],
    'Emergency': ['Trauma Surgery','Critical Care','Emergency Medicine'],
    'Radiology': ['Interventional Radiology','Nuclear Medicine','Neuroradiology'],
    'Psychiatry': ['Child Psychiatry','Addiction Medicine','Neuropsychiatry'],
    'Dermatology': ['Cosmetic Dermatology','Pediatric Dermatology','Dermato-oncology'],
    'Ophthalmology': ['Retina Specialist','Cataract Surgery','Glaucoma'],
    'ENT': ['Rhinology','Otology','Head & Neck Surgery'],
    'Nephrology': ['Transplant Nephrology','Dialysis','Glomerular Disease'],
    'Gastroenterology': ['Hepatology','Inflammatory Bowel Disease','Endoscopy'],
    'Pulmonology': ['Sleep Medicine','Interventional Pulmonology','COPD Management'],
    'Endocrinology': ['Diabetes','Thyroid Disorders','Adrenal Disorders'],
    'Rheumatology': ['Autoimmune Disease','Osteoporosis','Vasculitis'],
    'Urology': ['Robotic Surgery','Kidney Stones','Male Infertility'],
    'Gynecology': ['Maternal-Fetal Medicine','Reproductive Endocrinology','Gynecologic Oncology'],
    'Hematology': ['Bone Marrow Transplant','Hemophilia','Leukemia'],
    'General Surgery': ['Laparoscopic Surgery','Colorectal Surgery','Trauma']
  };

  const QUALIFICATIONS = ['MBBS','MD','MS','DM','MCh','FRCS','MRCP','PhD','DNB','FACS'];
  const STATUSES_P = ['Active','Admitted','Discharged','Critical','Under Observation','Outpatient'];
  const STATUSES_D = ['Available','On Duty','On Leave','Off Duty'];
  const STATUSES_A = ['Scheduled','Confirmed','Completed','Cancelled','No Show'];
  const STATUSES_B = ['Paid','Pending','Partial','Overdue','Cancelled','Refunded'];

  const CITIES = ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego',
    'Dallas','San Jose','Austin','Jacksonville','San Francisco','Columbus','Charlotte','Indianapolis','Seattle',
    'Denver','Boston','Nashville','Memphis','Portland','Oklahoma City','Las Vegas','Baltimore','Louisville',
    'Milwaukee','Albuquerque','Tucson','Fresno','Sacramento','Mesa','Kansas City','Atlanta','Omaha','Colorado Springs',
    'Raleigh','Long Beach','Virginia Beach','Minneapolis','Tampa','New Orleans','Arlington','Bakersfield','Honolulu'];

  const STATES = ['NY','CA','IL','TX','AZ','PA','FL','OH','NC','WA','CO','MA','TN','OR','NV','MD','KY','WI','NM','KS'];

  const DIAGNOSES = ['Hypertension','Type 2 Diabetes','Acute MI','Stroke','Pneumonia','COVID-19','Appendicitis',
    'Fracture - Femur','Knee Replacement','Cataract','Chronic Kidney Disease','Liver Cirrhosis','Anemia',
    'Depression','Anxiety Disorder','Migraine','Hypothyroidism','COPD','Asthma','Arthritis','Obesity',
    'Heart Failure','Atrial Fibrillation','DVT','Pulmonary Embolism','Sepsis','UTI','Dengue Fever','Malaria',
    'Tuberculosis','Celiac Disease','Crohn\'s Disease','Multiple Sclerosis','Parkinson\'s Disease','Epilepsy',
    'Schizophrenia','Bipolar Disorder','ADHD','Autism Spectrum','Lupus','Psoriasis','Eczema','Glaucoma',
    'Macular Degeneration','Retinal Detachment','Cataracts','Kidney Stones','BPH','Ovarian Cyst'];

  const SERVICES = [
    { name: 'Consultation Fee', base: 150, range: 350 },
    { name: 'X-Ray', base: 200, range: 150 },
    { name: 'MRI Scan', base: 800, range: 1200 },
    { name: 'CT Scan', base: 600, range: 800 },
    { name: 'Blood Panel', base: 80, range: 220 },
    { name: 'ECG', base: 120, range: 80 },
    { name: 'Echocardiogram', base: 400, range: 300 },
    { name: 'Ultrasound', base: 250, range: 150 },
    { name: 'Surgery (Major)', base: 5000, range: 20000 },
    { name: 'Surgery (Minor)', base: 1500, range: 3500 },
    { name: 'ICU per Day', base: 1200, range: 800 },
    { name: 'General Ward per Day', base: 300, range: 200 },
    { name: 'Private Room per Day', base: 600, range: 400 },
    { name: 'Physiotherapy Session', base: 80, range: 120 },
    { name: 'Dialysis', base: 500, range: 300 },
    { name: 'Chemotherapy', base: 2000, range: 5000 },
    { name: 'Endoscopy', base: 700, range: 500 },
    { name: 'Angiography', base: 1500, range: 1500 },
    { name: 'Lab Tests', base: 50, range: 200 },
    { name: 'Medication Charges', base: 100, range: 900 },
  ];

  const INSURANCE = ['Blue Cross Blue Shield','Aetna','UnitedHealthcare','Cigna','Humana','Kaiser Permanente',
    'Anthem','Molina Healthcare','Centene','Self Pay','Medicare','Medicaid'];

  const INVENTORY_ITEMS = [
    { name: 'Surgical Gloves (Box)', category: 'PPE', unit: 'box', price: 15 },
    { name: 'N95 Masks', category: 'PPE', unit: 'box', price: 45 },
    { name: 'Surgical Masks', category: 'PPE', unit: 'box', price: 20 },
    { name: 'Disposable Syringes 5ml', category: 'Consumables', unit: 'box', price: 12 },
    { name: 'IV Cannula 22G', category: 'Consumables', unit: 'box', price: 18 },
    { name: 'Normal Saline 500ml', category: 'Fluids', unit: 'piece', price: 4 },
    { name: 'Dextrose 5% 500ml', category: 'Fluids', unit: 'piece', price: 5 },
    { name: 'Amoxicillin 500mg', category: 'Medicines', unit: 'strip', price: 8 },
    { name: 'Paracetamol 500mg', category: 'Medicines', unit: 'strip', price: 3 },
    { name: 'Omeprazole 20mg', category: 'Medicines', unit: 'strip', price: 6 },
    { name: 'Metformin 500mg', category: 'Medicines', unit: 'strip', price: 5 },
    { name: 'Atorvastatin 10mg', category: 'Medicines', unit: 'strip', price: 12 },
    { name: 'Blood Glucose Test Strips', category: 'Diagnostics', unit: 'box', price: 25 },
    { name: 'Urinary Catheter 16Fr', category: 'Consumables', unit: 'piece', price: 8 },
    { name: 'Nasogastric Tube 16Fr', category: 'Consumables', unit: 'piece', price: 6 },
    { name: 'Oxygen Mask (Adult)', category: 'Equipment', unit: 'piece', price: 4 },
    { name: 'Bandage 4"', category: 'Wound Care', unit: 'roll', price: 2 },
    { name: 'Suture Thread 2-0', category: 'Wound Care', unit: 'box', price: 35 },
    { name: 'Sterile Gauze Pads', category: 'Wound Care', unit: 'box', price: 10 },
    { name: 'Hand Sanitizer 500ml', category: 'Hygiene', unit: 'bottle', price: 8 },
  ];

  // ── Generate Patients ──
  const generatePatients = (count = 15000) => {
    const patients = [];
    let patientNum = 1;
    for (let i = 0; i < count; i++) {
      const gender = pick(GENDERS);
      const firstName = gender === 'Male' ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
      const lastName = pick(LAST_NAMES);
      const age = randInt(1, 95);
      const dob = (() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() - age);
        d.setMonth(randInt(0, 11));
        d.setDate(randInt(1, 28));
        return d.toISOString().split('T')[0];
      })();
      const admitDate = randDate(730, 0);
      const status = pick(STATUSES_P);
      const diagnosis = pick(DIAGNOSES);
      const dept = pick(DEPARTMENTS);

      patients.push({
        id: 'P' + String(patientNum++).padStart(6, '0'),
        firstName, lastName,
        fullName: `${firstName} ${lastName}`,
        gender, dob, age,
        blood: pick(BLOOD_GROUPS),
        phone: `+1-${randInt(200,999)}-${randInt(100,999)}-${randInt(1000,9999)}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randInt(10,99)}@email.com`,
        address: `${randInt(1,9999)} ${pick(['Main','Oak','Maple','Pine','Cedar','Elm'])} ${pick(['St','Ave','Rd','Blvd','Dr','Ln'])}`,
        city: pick(CITIES),
        state: pick(STATES),
        zipCode: String(randInt(10000, 99999)),
        emergencyContact: `${pick(FIRST_NAMES_M)} ${pick(LAST_NAMES)}`,
        emergencyPhone: `+1-${randInt(200,999)}-${randInt(100,999)}-${randInt(1000,9999)}`,
        insurance: pick(INSURANCE),
        insuranceId: `INS${randInt(100000, 999999)}`,
        department: dept,
        diagnosis,
        status,
        admitDate,
        dischargeDate: status === 'Discharged' ? randDate(0, 30) : null,
        weight: randFloat(40, 130, 1),
        height: randFloat(140, 200, 1),
        allergies: Math.random() > 0.7 ? pick(['Penicillin','Sulfa','Aspirin','Latex','Nuts','Shellfish']) : 'NKDA',
        notes: '',
        createdAt: new Date(admitDate).toISOString(),
        updatedAt: now(),
      });
    }
    return patients;
  };

  // ── Generate Doctors ──
  const generateDoctors = (count = 200) => {
    const doctors = [];
    let docNum = 1;
    for (let i = 0; i < count; i++) {
      const gender = pick(GENDERS);
      const firstName = gender === 'Male' ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
      const lastName = pick(LAST_NAMES);
      const dept = pick(DEPARTMENTS);
      const specs = SPECIALIZATIONS[dept] || ['General'];
      const joinDate = randDate(3650, 30);
      const exp = randInt(2, 35);
      const fee = randInt(150, 800) * (Math.random() > 0.5 ? 1 : 0.5 + Math.random() * 0.5);

      doctors.push({
        id: 'D' + String(docNum++).padStart(4, '0'),
        firstName, lastName,
        fullName: `Dr. ${firstName} ${lastName}`,
        gender,
        department: dept,
        specialization: pick(specs),
        qualification: pick(QUALIFICATIONS) + (Math.random() > 0.5 ? ', ' + pick(QUALIFICATIONS) : ''),
        phone: `+1-${randInt(200,999)}-${randInt(100,999)}-${randInt(1000,9999)}`,
        email: `dr.${firstName.toLowerCase()}.${lastName.toLowerCase()}@medcare.hospital`,
        licenseNo: `LIC${randInt(100000, 999999)}`,
        experience: exp,
        consultationFee: Math.round(fee / 10) * 10,
        status: pick(STATUSES_D),
        joinDate,
        rating: randFloat(3.5, 5.0, 1),
        patientsCount: randInt(50, 800),
        availableDays: pick([
          ['Mon','Tue','Wed','Thu','Fri'],
          ['Mon','Wed','Fri'],
          ['Tue','Thu','Sat'],
          ['Mon','Tue','Thu','Fri','Sat'],
        ]),
        availableHours: `${randInt(8,10)}:00 AM - ${randInt(4,7)}:00 PM`,
        room: `Room ${randInt(100, 550)}`,
        bio: `Experienced ${dept} specialist with ${exp} years of clinical practice.`,
        createdAt: new Date(joinDate).toISOString(),
        updatedAt: now(),
      });
    }
    return doctors;
  };

  // ── Generate Appointments ──
  const generateAppointments = (patients, doctors, count = 8000) => {
    const appts = [];
    for (let i = 0; i < count; i++) {
      const patient = pick(patients);
      const doctor = pick(doctors);
      const date = randDate(60, -30);
      const hour = randInt(8, 17);
      const minute = pick(['00','15','30','45']);
      const status = pick(STATUSES_A);

      appts.push({
        id: 'A' + String(i + 1).padStart(6, '0'),
        patientId: patient.id,
        patientName: patient.fullName,
        doctorId: doctor.id,
        doctorName: doctor.fullName,
        department: doctor.department,
        date,
        time: `${String(hour).padStart(2,'0')}:${minute}`,
        type: pick(['Consultation','Follow-up','Emergency','Routine Check','Lab Review','Procedure']),
        status,
        reason: pick(['Regular checkup','Chest pain','Fever','Back pain','Headache','Follow-up on medication',
          'Lab results review','Pre-op assessment','Post-op check','Routine screening']),
        notes: status === 'Completed' ? 'Patient examined, treatment plan updated.' : '',
        fee: doctor.consultationFee,
        createdAt: now(),
        updatedAt: now(),
      });
    }
    return appts;
  };

  // ── Generate Bills ──
  const generateBills = (patients, doctors, count = 12000) => {
    const bills = [];
    for (let i = 0; i < count; i++) {
      const patient = pick(patients);
      const doctor = pick(doctors);
      const numServices = randInt(1, 6);
      const selectedServices = [];
      for (let s = 0; s < numServices; s++) {
        const svc = pick(SERVICES);
        const qty = randInt(1, 5);
        const price = svc.base + randInt(0, svc.range);
        selectedServices.push({ name: svc.name, qty, unitPrice: price, total: qty * price });
      }
      const subtotal = selectedServices.reduce((s, x) => s + x.total, 0);
      const tax = Math.round(subtotal * 0.08);
      const discount = Math.random() > 0.7 ? Math.round(subtotal * randFloat(0.05, 0.2, 2)) : 0;
      const total = subtotal + tax - discount;
      const paid = pick(STATUSES_B) === 'Paid' ? total : (Math.random() > 0.5 ? Math.round(total * randFloat(0.3, 0.9, 2)) : 0);
      const status = paid >= total ? 'Paid' : paid > 0 ? 'Partial' : (Math.random() > 0.7 ? 'Overdue' : 'Pending');
      const billDate = randDate(365, 0);

      bills.push({
        id: 'INV' + String(i + 1).padStart(6, '0'),
        patientId: patient.id,
        patientName: patient.fullName,
        doctorId: doctor.id,
        doctorName: doctor.fullName,
        department: doctor.department,
        services: selectedServices,
        subtotal,
        tax,
        discount,
        total,
        paid,
        balance: total - paid,
        status,
        insurance: patient.insurance,
        insuranceId: patient.insuranceId,
        billDate,
        dueDate: (() => { const d = new Date(billDate); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })(),
        paymentMethod: paid > 0 ? pick(['Cash','Credit Card','Insurance','Bank Transfer','Cheque']) : '',
        notes: '',
        createdAt: new Date(billDate).toISOString(),
        updatedAt: now(),
      });
    }
    return bills;
  };

  // ── Generate Inventory ──
  const generateInventory = () => {
    return INVENTORY_ITEMS.map((item, idx) => ({
      id: 'INV_ITEM_' + String(idx + 1).padStart(4, '0'),
      ...item,
      stock: randInt(10, 1000),
      minStock: randInt(20, 100),
      maxStock: randInt(500, 2000),
      supplier: pick(['MedSupply Co','PharmaCorp','HospitalDirect','HealthEquip','MediSource']),
      lastRestocked: randDate(60, 0),
      expiryDate: randDate(-30, -365),
      batchNo: 'B' + randInt(10000, 99999),
      location: `Ward ${pick(['A','B','C','D'])}-${randInt(1,5)}`,
      status: 'In Stock',
    })).map(i => ({ ...i, status: i.stock < i.minStock ? 'Low Stock' : i.stock === 0 ? 'Out of Stock' : 'In Stock' }));
  };

  // ── Generate Notifications ──
  const generateNotifications = () => [
    { id: uid(), title: 'New Patient Admitted', desc: 'Patient John Smith admitted to Cardiology Ward', time: '2 min ago', unread: true, type: 'info' },
    { id: uid(), title: 'Critical Alert', desc: 'Patient in ICU requires immediate attention', time: '5 min ago', unread: true, type: 'error' },
    { id: uid(), title: 'Appointment Reminder', desc: '15 appointments scheduled for today', time: '30 min ago', unread: true, type: 'warning' },
    { id: uid(), title: 'Invoice Overdue', desc: '12 invoices are past due date', time: '1 hour ago', unread: true, type: 'warning' },
    { id: uid(), title: 'Low Inventory Alert', desc: 'Surgical Gloves running low (15 units)', time: '2 hours ago', unread: false, type: 'warning' },
    { id: uid(), title: 'Doctor On Leave', desc: 'Dr. Emily Johnson on leave tomorrow', time: '3 hours ago', unread: false, type: 'info' },
    { id: uid(), title: 'Lab Results Ready', desc: 'Blood panel results for patient P-000234 ready', time: '4 hours ago', unread: false, type: 'success' },
    { id: uid(), title: 'Shift Change', desc: 'Night shift begins at 10:00 PM', time: '5 hours ago', unread: false, type: 'info' },
  ];

  // ── Settings ──
  const defaultSettings = {
    hospitalName: 'MedCare General Hospital',
    address: '123 Medical Center Drive, New York, NY 10001',
    phone: '+1-800-MEDCARE',
    email: 'info@medcare.hospital',
    website: 'www.medcare.hospital',
    taxRate: 8,
    currency: 'USD',
    theme: 'dark',
    dateFormat: 'MM/DD/YYYY',
    adminName: 'Dr. Admin',
    adminEmail: 'admin@medcare.hospital',
  };

  // ── Memory Cache Layer for High-Performance (15,000+ records) ──
  const memCache = {};

  // ── Storage API ──
  const get = (key) => {
    if (memCache[key]) return memCache[key];
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        memCache[key] = JSON.parse(stored);
        return memCache[key];
      }
    } catch (e) {}
    return null;
  };

  const set = (key, data) => {
    memCache[key] = data;
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      // LocalStorage quota fallback: persist subset while memCache keeps full 15,000+
      try {
        if (Array.isArray(data)) {
          localStorage.setItem(key, JSON.stringify(data.slice(0, 1500)));
        }
      } catch (_) {}
      return true;
    }
  };

  // ── Initialize / Seed ──
  const init = async () => {
    if (memCache[KEYS.patients] && memCache[KEYS.patients].length >= 1000) return;
    const existing = get(KEYS.patients);
    if (existing && existing.length >= 15000) return;

    console.time('HMS: seeding database');
    const CHUNK = 1000;

    // Patients - seed in chunks to avoid stack overflow
    let patients = [];
    for (let i = 0; i < 15; i++) {
      patients = patients.concat(generatePatients(CHUNK));
    }

    const doctors = generateDoctors(200);
    const appointments = generateAppointments(patients.slice(0, 2000), doctors, 8000);
    const bills = generateBills(patients.slice(0, 3000), doctors, 12000);
    const inventory = generateInventory();
    const notifications = generateNotifications();

    set(KEYS.patients, patients);
    set(KEYS.doctors, doctors);
    set(KEYS.appointments, appointments);
    set(KEYS.billing, bills);
    set(KEYS.inventory, inventory);
    set(KEYS.notifications, notifications);
    set(KEYS.settings, defaultSettings);
    set(KEYS.seeded, true);

    console.timeEnd('HMS: seeding database');
    console.log(`✅ HMS seeded: ${patients.length} patients, ${doctors.length} doctors, ${appointments.length} appointments, ${bills.length} bills`);
  };

  // ── CRUD Operations ──
  const CRUD = (key) => ({
    getAll: (filter) => {
      const data = get(key) || [];
      if (!filter) return data;
      return data.filter(filter);
    },
    getById: (id) => (get(key) || []).find(item => item.id === id) || null,
    create: (data) => {
      const all = get(key) || [];
      const item = { ...data, id: data.id || uid(), createdAt: now(), updatedAt: now() };
      all.unshift(item);
      set(key, all);
      return item;
    },
    update: (id, data) => {
      const all = get(key) || [];
      const idx = all.findIndex(i => i.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx], ...data, updatedAt: now() };
      set(key, all);
      return all[idx];
    },
    delete: (id) => {
      const all = get(key) || [];
      const filtered = all.filter(i => i.id !== id);
      set(key, filtered);
      return filtered.length < all.length;
    },
    count: (filter) => {
      const data = get(key) || [];
      return filter ? data.filter(filter).length : data.length;
    },
    paginate: (page, perPage, filter, sort) => {
      let data = get(key) || [];
      if (filter) data = data.filter(filter);
      if (sort) data = data.sort(sort);
      const total = data.length;
      const totalPages = Math.ceil(total / perPage);
      const start = (page - 1) * perPage;
      const items = data.slice(start, start + perPage);
      return { items, total, totalPages, page, perPage };
    },
  });

  // ── Analytics ──
  const analytics = {
    getDashboardStats: () => {
      const patients = get(KEYS.patients) || [];
      const doctors = get(KEYS.doctors) || [];
      const appointments = get(KEYS.appointments) || [];
      const bills = get(KEYS.billing) || [];
      const today = new Date().toISOString().split('T')[0];
      const thisMonth = new Date().toISOString().slice(0, 7);

      const totalRevenue = bills.reduce((s, b) => s + (b.paid || 0), 0);
      const pendingRevenue = bills.reduce((s, b) => s + (b.balance || 0), 0);
      const todayAppts = appointments.filter(a => a.date === today);
      const admittedPatients = patients.filter(p => p.status === 'Admitted').length;
      const criticalPatients = patients.filter(p => p.status === 'Critical').length;
      const availableDoctors = doctors.filter(d => d.status === 'Available').length;

      // Department distribution
      const deptCounts = {};
      patients.forEach(p => { deptCounts[p.department] = (deptCounts[p.department] || 0) + 1; });
      const deptData = Object.entries(deptCounts).sort((a,b) => b[1]-a[1]).slice(0, 8);

      // Revenue by month (last 6)
      const monthRevenue = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const key = d.toISOString().slice(0, 7);
        monthRevenue[key] = 0;
      }
      bills.forEach(b => {
        const m = b.billDate ? b.billDate.slice(0, 7) : '';
        if (monthRevenue.hasOwnProperty(m)) monthRevenue[m] += b.paid || 0;
      });

      // Daily admissions (last 14 days)
      const dailyAdmissions = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dailyAdmissions[d.toISOString().split('T')[0]] = 0;
      }
      patients.forEach(p => {
        if (dailyAdmissions.hasOwnProperty(p.admitDate)) dailyAdmissions[p.admitDate]++;
      });

      // Status breakdown
      const statusBreakdown = {};
      patients.forEach(p => { statusBreakdown[p.status] = (statusBreakdown[p.status] || 0) + 1; });

      // Bill status
      const billStatus = {};
      bills.forEach(b => { billStatus[b.status] = (billStatus[b.status] || 0) + 1; });

      return {
        totalPatients: patients.length,
        totalDoctors: doctors.length,
        totalAppointments: appointments.length,
        todayAppointments: todayAppts.length,
        admittedPatients,
        criticalPatients,
        availableDoctors,
        totalRevenue,
        pendingRevenue,
        deptData,
        monthRevenue,
        dailyAdmissions,
        statusBreakdown,
        billStatus,
        recentPatients: patients.slice(0, 8),
        upcomingAppointments: appointments.filter(a => a.status === 'Scheduled').slice(0, 5),
      };
    },
  };

  return {
    init,
    uid,
    Patients: () => CRUD(KEYS.patients),
    Doctors: () => CRUD(KEYS.doctors),
    Appointments: () => CRUD(KEYS.appointments),
    Billing: () => CRUD(KEYS.billing),
    Inventory: () => CRUD(KEYS.inventory),
    Notifications: () => CRUD(KEYS.notifications),
    Settings: {
      get: () => get(KEYS.settings) || defaultSettings,
      set: (data) => set(KEYS.settings, { ...get(KEYS.settings), ...data }),
    },
    analytics,
  };
})();
window.HMS_DB = HMS_DB;
