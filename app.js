/* ── app.js ───────────────────────────────────────────
   Main application logic for LabTrack (Drive edition).
   ───────────────────────────────────────────────────── */

/* ── Reference ranges ─────────────────────────────── */
const RANGES = {
  'Glucose':           { min: 70,   max: 99,   unit: 'mg/dL',  cat: 'Metabolic',    info: 'Fasting blood sugar. Elevated levels may indicate diabetes or prediabetes.' },
  'HbA1c':             { min: 4.0,  max: 5.6,  unit: '%',      cat: 'Metabolic',    info: 'Average blood sugar over ~3 months. Above 6.5% indicates diabetes.' },
  'Insulin':           { min: 2,    max: 25,   unit: 'µIU/mL', cat: 'Metabolic',    info: 'Fasting insulin. Elevated levels may indicate insulin resistance.' },
  'Uric Acid':         { min: 2.4,  max: 7.0,  unit: 'mg/dL',  cat: 'Metabolic',    info: 'Elevated levels cause gout and may indicate metabolic syndrome.' },
  'Total Cholesterol': { min: 0,    max: 200,  unit: 'mg/dL',  cat: 'Lipids',       info: 'Total lipid levels. Under 200 mg/dL is desirable.' },
  'LDL':               { min: 0,    max: 100,  unit: 'mg/dL',  cat: 'Lipids',       info: 'Low-density lipoprotein ("bad" cholesterol). Lower is generally better.' },
  'HDL':               { min: 60,   max: 200,  unit: 'mg/dL',  cat: 'Lipids',       info: 'High-density lipoprotein ("good" cholesterol). Higher is better.' },
  'Triglycerides':     { min: 0,    max: 150,  unit: 'mg/dL',  cat: 'Lipids',       info: 'Blood fats. High levels are linked to heart disease risk.' },
  'TSH':               { min: 0.4,  max: 4.0,  unit: 'mIU/L',  cat: 'Thyroid',      info: 'Thyroid-stimulating hormone. Controls overall thyroid function.' },
  'Free T4':           { min: 0.8,  max: 1.8,  unit: 'ng/dL',  cat: 'Thyroid',      info: 'Active thyroid hormone. Low levels indicate hypothyroidism.' },
  'Free T3':           { min: 2.3,  max: 4.2,  unit: 'pg/mL',  cat: 'Thyroid',      info: 'Active form of thyroid hormone. Low levels cause fatigue, cold intolerance.' },
  'Vitamin D':         { min: 30,   max: 100,  unit: 'ng/mL',  cat: 'Vitamins',     info: 'Bone health and immune function. Most adults are deficient without supplementation.' },
  'Vitamin B12':       { min: 200,  max: 900,  unit: 'pg/mL',  cat: 'Vitamins',     info: 'Nerve function and red blood cell production. Deficiency common in vegans.' },
  'Folate':            { min: 2.7,  max: 17,   unit: 'ng/mL',  cat: 'Vitamins',     info: 'Essential for DNA synthesis and cell division.' },
  'Ferritin':          { min: 12,   max: 150,  unit: 'ng/mL',  cat: 'Blood',        info: 'Iron storage protein. Low levels indicate iron deficiency before anemia develops.' },
  'Hemoglobin':        { min: 12.0, max: 17.5, unit: 'g/dL',   cat: 'Blood',        info: 'Oxygen-carrying protein in red blood cells.' },
  'Hematocrit':        { min: 36,   max: 52,   unit: '%',      cat: 'Blood',        info: 'Percentage of blood volume made up of red blood cells.' },
  'WBC':               { min: 4.5,  max: 11.0, unit: 'K/µL',   cat: 'Blood',        info: 'White blood cell count. High or low may indicate infection or immune issues.' },
  'Platelets':         { min: 150,  max: 400,  unit: 'K/µL',   cat: 'Blood',        info: 'Blood clotting cells. Very low levels risk bleeding.' },
  'RBC':               { min: 4.2,  max: 5.9,  unit: 'M/µL',   cat: 'Blood',        info: 'Red blood cell count. Low levels indicate anemia.' },
  'Creatinine':        { min: 0.6,  max: 1.2,  unit: 'mg/dL',  cat: 'Kidney',       info: 'Kidney waste marker. Elevated levels suggest reduced kidney function.' },
  'eGFR':              { min: 60,   max: 200,  unit: 'mL/min', cat: 'Kidney',       info: 'Estimated glomerular filtration rate — measures how well kidneys filter blood.' },
  'BUN':               { min: 7,    max: 20,   unit: 'mg/dL',  cat: 'Kidney',       info: 'Blood urea nitrogen. Elevated levels may indicate kidney dysfunction.' },
  'ALT':               { min: 7,    max: 40,   unit: 'U/L',    cat: 'Liver',        info: 'Alanine aminotransferase. Elevated levels suggest liver inflammation or damage.' },
  'AST':               { min: 10,   max: 40,   unit: 'U/L',    cat: 'Liver',        info: 'Aspartate aminotransferase. Elevated may indicate liver or muscle damage.' },
  'GGT':               { min: 9,    max: 48,   unit: 'U/L',    cat: 'Liver',        info: 'Gamma-glutamyl transferase. Sensitive marker for liver and bile duct issues.' },
  'Albumin':           { min: 3.5,  max: 5.0,  unit: 'g/dL',   cat: 'Liver',        info: 'Protein made by the liver. Low levels may indicate malnutrition or liver disease.' },
  'Testosterone':      { min: 300,  max: 1000, unit: 'ng/dL',  cat: 'Hormones',     info: 'Male reference range. Lower levels associated with fatigue, low libido, muscle loss.' },
  'Estradiol':         { min: 15,   max: 350,  unit: 'pg/mL',  cat: 'Hormones',     info: 'Primary estrogen. Varies significantly with age and sex.' },
  'Cortisol':          { min: 6,    max: 23,   unit: 'µg/dL',  cat: 'Hormones',     info: 'Morning fasting cortisol. High levels linked to chronic stress.' },
  'DHEA-S':            { min: 80,   max: 560,  unit: 'µg/dL',  cat: 'Hormones',     info: 'Adrenal hormone. Declines with age; linked to energy and immune function.' },
  'PSA':               { min: 0,    max: 4.0,  unit: 'ng/mL',  cat: 'Hormones',     info: 'Prostate-specific antigen. Used to screen for prostate conditions.' },
  'CRP':               { min: 0,    max: 1.0,  unit: 'mg/L',   cat: 'Inflammation', info: 'C-reactive protein. High-sensitivity CRP measures inflammation and cardiovascular risk.' },
  'Homocysteine':      { min: 4,    max: 15,   unit: 'µmol/L', cat: 'Inflammation', info: 'Elevated levels linked to cardiovascular disease and B-vitamin deficiency.' },
  'Magnesium':         { min: 1.7,  max: 2.2,  unit: 'mg/dL',  cat: 'Minerals',     info: 'Involved in 300+ enzyme reactions. Low levels cause muscle cramps and poor sleep.' },
  'Calcium':           { min: 8.5,  max: 10.5, unit: 'mg/dL',  cat: 'Minerals',     info: 'Bone health, nerve function, and muscle contraction.' },
  'Potassium':         { min: 3.5,  max: 5.0,  unit: 'mEq/L',  cat: 'Minerals',     info: 'Critical electrolyte for heart rhythm and muscle function.' },
  'Sodium':            { min: 136,  max: 145,  unit: 'mEq/L',  cat: 'Minerals',     info: 'Main electrolyte controlling fluid balance.' },
  'Iron':              { min: 60,   max: 170,  unit: 'µg/dL',  cat: 'Minerals',     info: 'Serum iron. Used alongside ferritin for full iron status assessment.' },
  'Zinc':              { min: 70,   max: 120,  unit: 'µg/dL',  cat: 'Minerals',     info: 'Immune function, wound healing, and protein synthesis.' },
};

/* ── App state ────────────────────────────────────── */
let db = [];
let activeCategory = 'All';
let trendChartInstance = null;
let currentUser = null;
let isSyncing = false;
let pendingSave = false;

/* ── Boot ─────────────────────────────────────────── */
window.addEventListener('load', async () => {
  showAuth('loading', 'Initializing…');
  await Drive.init();
  showAuth('signIn');
  populateKnownTests();
});

/* ── Auth UI ──────────────────────────────────────── */
function showAuth(panel, msg = '') {
  document.getElementById('authSignIn').style.display  = panel === 'signIn'  ? 'block' : 'none';
  document.getElementById('authLoading').style.display = panel === 'loading' ? 'flex'  : 'none';
  document.getElementById('authError').style.display   = panel === 'error'   ? 'block' : 'none';
  if (msg) {
    if (panel === 'loading') document.getElementById('authLoadingText').textContent = msg;
    if (panel === 'error')   document.getElementById('authErrorMsg').textContent = msg;
  }
}

async function signIn() {
  showAuth('loading', 'Waiting for Google sign-in…');
  try {
    await Drive.signIn();
    showAuth('loading', 'Loading your lab data from Drive…');
    await afterSignIn();
  } catch(e) {
    showAuth('error', 'Sign-in failed. Please try again. (' + (e.message || e) + ')');
  }
}

async function afterSignIn() {
  try {
    await Drive.ensureFolder();
    const data = await Drive.loadDataFile();
    db = (data && Array.isArray(data.records)) ? data.records : [];
    db.sort((a, b) => a.date.localeCompare(b.date));

    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appShell').style.display = 'flex';

    updateSyncStatus('synced');
    renderDashboard();
    populateTrendSelect();

    // Show Drive folder URL
    const url = Drive.getFolderUrl();
    if (url) document.getElementById('driveFolderPath').textContent = 'Drive → ' + CONFIG.DRIVE_FOLDER_NAME;

  } catch(e) {
    showAuth('error', 'Could not load Drive data: ' + (e.message || e));
  }
}

function signOut() {
  Drive.signOut();
  db = [];
  activeCategory = 'All';
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  showAuth('signIn');
}

/* ── Sync status ──────────────────────────────────── */
function updateSyncStatus(state) {
  const dot = document.getElementById('syncDot');
  const label = document.getElementById('syncLabel');
  dot.className = 'sync-dot ' + state;
  const labels = { synced: 'Synced', syncing: 'Syncing…', error: 'Sync error' };
  label.textContent = labels[state] || state;
}

async function syncNow() {
  if (isSyncing) return;
  isSyncing = true;
  updateSyncStatus('syncing');
  try {
    const data = await Drive.loadDataFile();
    if (data && Array.isArray(data.records)) {
      db = data.records;
      db.sort((a, b) => a.date.localeCompare(b.date));
    }
    renderDashboard();
    populateTrendSelect();
    renderHistory();
    updateSyncStatus('synced');
    toast('Data synced from Drive', 'success');
  } catch(e) {
    updateSyncStatus('error');
    toast('Sync failed — check your connection', 'error');
  }
  isSyncing = false;
}

async function saveToDrive() {
  updateSyncStatus('syncing');
  try {
    await Drive.saveDataFile({ records: db, lastUpdated: new Date().toISOString() });
    updateSyncStatus('synced');
  } catch(e) {
    updateSyncStatus('error');
    toast('Could not save to Drive', 'error');
  }
}

/* ── CSV Import ───────────────────────────────────── */
async function handleFileUpload(input) {
  const files = Array.from(input.files);
  if (!files.length) return;
  input.value = '';

  let allLogs = [];
  for (const file of files) {
    const text = await file.text();
    const logs = parseAndMergeCSV(text, file.name);
    allLogs = allLogs.concat(logs);

    // Also upload the raw CSV to the Drive folder
    try {
      await Drive.uploadCSV(file.name, text);
      allLogs.push({ type: 'ok', msg: `${file.name}: saved to Drive folder` });
    } catch(e) {
      allLogs.push({ type: 'warn', msg: `${file.name}: could not save CSV to Drive (data still imported)` });
    }
  }

  renderImportLog(allLogs);
  await saveToDrive();
  renderDashboard();
  populateTrendSelect();
  renderHistory();
  toast(`Imported ${files.length} file${files.length > 1 ? 's' : ''}`, 'success');
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('importZone').classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
  if (!files.length) { toast('Please drop CSV files only', 'error'); return; }
  handleFileUpload({ files, value: '' });
}

/* ── Test name normalizer ─────────────────────────────
   Maps common lab report names to the canonical names
   used by the reference ranges table.
   ───────────────────────────────────────────────────── */
const TEST_NAME_MAP = {
  // Cholesterol / lipids
  'cholesterol':              'Total Cholesterol',
  'total cholesterol':        'Total Cholesterol',
  'hdl cholesterol':          'HDL',
  'hdl-c':                    'HDL',
  'hdl':                      'HDL',
  'ldl cholesterol':          'LDL',
  'ldl cholesterol (calc)':   'LDL',
  'ldl-c':                    'LDL',
  'ldl':                      'LDL',
  'triglycerides':            'Triglycerides',
  'trig':                     'Triglycerides',
  'non-hdl cholesterol':      'Total Cholesterol', // closest mapping
  'chol/hdl ratio':           'Chol/HDL Ratio',   // tracked without range
  // Blood sugar
  'glucose':                  'Glucose',
  'fasting glucose':          'Glucose',
  'hba1c':                    'HbA1c',
  'hemoglobin a1c':           'HbA1c',
  'insulin':                  'Insulin',
  // Thyroid
  'tsh':                      'TSH',
  'free t4':                  'Free T4',
  'free thyroxine':           'Free T4',
  'free t3':                  'Free T3',
  // Blood count
  'hemoglobin':               'Hemoglobin',
  'hgb':                      'Hemoglobin',
  'hematocrit':               'Hematocrit',
  'hct':                      'Hematocrit',
  'wbc':                      'WBC',
  'white blood cell':         'WBC',
  'platelets':                'Platelets',
  'plt':                      'Platelets',
  'rbc':                      'RBC',
  'red blood cell':           'RBC',
  'ferritin':                 'Ferritin',
  // Kidney
  'creatinine':               'Creatinine',
  'egfr':                     'eGFR',
  'estimated gfr':            'eGFR',
  'bun':                      'BUN',
  'blood urea nitrogen':      'BUN',
  // Liver
  'alt':                      'ALT',
  'alanine aminotransferase': 'ALT',
  'ast':                      'AST',
  'aspartate aminotransferase':'AST',
  'ggt':                      'GGT',
  'albumin':                  'Albumin',
  // Vitamins & minerals
  'vitamin d':                'Vitamin D',
  'vitamin d, 25-oh':         'Vitamin D',
  '25-hydroxyvitamin d':      'Vitamin D',
  'vitamin b12':              'Vitamin B12',
  'b12':                      'Vitamin B12',
  'folate':                   'Folate',
  'magnesium':                'Magnesium',
  'calcium':                  'Calcium',
  'potassium':                'Potassium',
  'sodium':                   'Sodium',
  'iron':                     'Iron',
  'zinc':                     'Zinc',
  // Hormones
  'testosterone':             'Testosterone',
  'testosterone, total':      'Testosterone',
  'estradiol':                'Estradiol',
  'cortisol':                 'Cortisol',
  'dhea-s':                   'DHEA-S',
  'dhea sulfate':             'DHEA-S',
  'psa':                      'PSA',
  // Inflammation
  'crp':                      'CRP',
  'c-reactive protein':       'CRP',
  'hs-crp':                   'CRP',
  'homocysteine':             'Homocysteine',
  'uric acid':                'Uric Acid',
};

function normalizeTestName(raw) {
  const key = raw.toLowerCase().trim();
  return TEST_NAME_MAP[key] || raw.trim(); // fall back to original if no match
}

function parseAndMergeCSV(text, filename) {
  const logs = [];
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) { logs.push({ type: 'err', msg: `${filename}: empty or no data rows` }); return logs; }

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));

  // Flexible column detection — handles multiple lab export formats
  const dateIdx = headers.findIndex(h => ['date', 'collection date', 'result date', 'collected', 'drawn date', 'test date'].includes(h));
  const nameIdx = headers.findIndex(h => ['test_name', 'test', 'test name', 'analyte', 'component', 'description'].includes(h));
  const valIdx  = headers.findIndex(h => ['value', 'result', 'result value', 'numeric result'].includes(h));
  const unitIdx = headers.findIndex(h => ['unit', 'units', 'unit of measure', 'uom'].includes(h));

  if (dateIdx < 0 || nameIdx < 0 || valIdx < 0) {
    logs.push({ type: 'err', msg: `${filename}: missing required columns. Found: [${headers.join(', ')}]. Need: date, test name, value.` });
    return logs;
  }

  let added = 0, updated = 0, skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCSVLine(line);
    const rawDate = (cols[dateIdx] || '').trim();
    const rawName = (cols[nameIdx] || '').trim();
    const rawV    = (cols[valIdx]  || '').trim();
    const unit    = unitIdx >= 0 ? (cols[unitIdx] || '').trim() : '';

    if (!rawDate || !rawName || !rawV) { skipped++; continue; }

    // Normalize date to YYYY-MM-DD
    const date = normalizeDate(rawDate);
    if (!date) { skipped++; continue; }

    const value = parseFloat(rawV);
    if (isNaN(value)) { skipped++; continue; }

    const test_name = normalizeTestName(rawName);

    const idx = db.findIndex(r => r.date === date && r.test_name === test_name);
    if (idx >= 0) { db[idx] = { date, test_name, value, unit }; updated++; }
    else          { db.push({ date, test_name, value, unit });   added++;   }
  }

  db.sort((a, b) => a.date.localeCompare(b.date));
  logs.push({ type: 'ok', msg: `${filename}: ${added} rows added, ${updated} updated, ${skipped} skipped` });
  return logs;
}

function normalizeDate(raw) {
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // MM/DD/YYYY
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`;
  // MM-DD-YYYY
  const mdy2 = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mdy2) return `${mdy2[3]}-${mdy2[1].padStart(2,'0')}-${mdy2[2].padStart(2,'0')}`;
  // Try native Date parse as fallback
  const d = new Date(raw);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);
  return null;
}

function parseCSVLine(line) {
  const cols = [];
  let cur = '', inQ = false, i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i+1] === '"') { cur += '"'; i += 2; continue; } // escaped quote
      inQ = !inQ; i++; continue;
    }
    if (c === ',' && !inQ) { cols.push(cur.trim()); cur = ''; i++; continue; }
    cur += c; i++;
  }
  cols.push(cur.trim());
  return cols;
}

function renderImportLog(logs) {
  const el = document.getElementById('importLog');
  el.style.display = 'block';
  el.innerHTML = logs.map(l => `<div class="log-line ${l.type}">${l.msg}</div>`).join('');
}

/* ── Dashboard ────────────────────────────────────── */
function renderDashboard() {
  const hasData = db.length > 0;
  document.getElementById('emptyDash').classList.toggle('visible', !hasData);
  document.getElementById('summaryBar').innerHTML = '';
  document.getElementById('catFilter').innerHTML = '';
  document.getElementById('testGrid').innerHTML = '';
  if (!hasData) return;

  renderSummaryBar();
  renderCatFilter();
  renderTestGrid();
}

function renderSummaryBar() {
  const latest = getLatestByTest();
  const tests = Object.keys(latest);
  let normal = 0, abnormal = 0;
  tests.forEach(name => {
    const s = getStatus(latest[name].value, RANGES[name]);
    if (s === 'ok') normal++;
    else if (s !== 'unknown') abnormal++;
  });
  const lastDate = db.length ? db[db.length - 1].date : '—';
  document.getElementById('summaryBar').innerHTML = `
    <div class="stat-card"><div class="stat-label">Tests tracked</div><div class="stat-value">${tests.length}</div></div>
    <div class="stat-card"><div class="stat-label">In range</div><div class="stat-value ok">${normal}</div></div>
    <div class="stat-card"><div class="stat-label">Out of range</div><div class="stat-value ${abnormal > 0 ? 'danger' : ''}">${abnormal}</div></div>
    <div class="stat-card"><div class="stat-label">Last result</div><div class="stat-value" style="font-size:14px;line-height:1.4">${lastDate}</div></div>
  `;
}

function renderCatFilter() {
  const latest = getLatestByTest();
  const cats = new Set(['All']);
  Object.keys(latest).forEach(name => cats.add(RANGES[name] ? RANGES[name].cat : 'Other'));
  document.getElementById('catFilter').innerHTML = Array.from(cats).map(c =>
    `<button class="cat-pill ${c === activeCategory ? 'active' : ''}" onclick="setCategory('${c}')">${c}</button>`
  ).join('');
}

function setCategory(cat) {
  activeCategory = cat;
  renderCatFilter();
  renderTestGrid();
}

function renderTestGrid() {
  const latest = getLatestByTest();
  const grid = document.getElementById('testGrid');
  const tests = Object.keys(latest).filter(name => {
    if (activeCategory === 'All') return true;
    return (RANGES[name] ? RANGES[name].cat : 'Other') === activeCategory;
  }).sort();

  if (!tests.length) { grid.innerHTML = '<p style="color:var(--text-3);font-size:13px">No tests in this category.</p>'; return; }
  grid.innerHTML = tests.map(name => {
    const r = latest[name];
    const ref = RANGES[name];
    const status = getStatus(r.value, ref);
    const dispVal = r.value % 1 === 0 ? r.value : parseFloat(r.value.toFixed(2));
    return `<div class="test-card ${status}" onclick="openTest('${name}')">
      <div class="tc-name">${name}</div>
      <div class="tc-value">${dispVal}</div>
      <div class="tc-unit">${r.unit || (ref ? ref.unit : '')}</div>
      <div class="tc-date">${r.date}</div>
      ${statusBadge(status)}
    </div>`;
  }).join('');
}

function openTest(name) {
  switchView('trends', document.querySelector('[data-view=trends]'));
  setTimeout(() => { document.getElementById('trendTestSelect').value = name; renderTrendChart(); }, 60);
}

/* ── Status helpers ───────────────────────────────── */
function getStatus(value, ref) {
  if (!ref) return 'unknown';
  if (ref.min === 0 && value <= ref.max) return 'ok';
  if (value < ref.min) return 'low';
  if (value > ref.max) return 'high';
  return 'ok';
}

function statusBadge(status) {
  const labels = { ok: 'Normal', low: 'Low', high: 'High', unknown: 'No range' };
  return `<span class="tc-badge ${status}">${labels[status] || status}</span>`;
}

/* ── Trends ───────────────────────────────────────── */
function populateTrendSelect() {
  const names = [...new Set(db.map(r => r.test_name))].sort();
  const sel = document.getElementById('trendTestSelect');
  const current = sel.value;
  sel.innerHTML = '<option value="">— choose a test —</option>' +
    names.map(n => `<option value="${n}" ${n === current ? 'selected' : ''}>${n}</option>`).join('');
}

function renderTrendChart() {
  const name = document.getElementById('trendTestSelect').value;
  const wrap = document.getElementById('trendChartWrap');
  const empty = document.getElementById('emptyTrends');
  if (!name) { wrap.style.display = 'none'; empty.style.display = 'block'; return; }

  const rows = db.filter(r => r.test_name === name).sort((a, b) => a.date.localeCompare(b.date));
  if (!rows.length) { wrap.style.display = 'none'; empty.style.display = 'block'; return; }
  wrap.style.display = 'block';
  empty.style.display = 'none';

  const ref = RANGES[name];
  const latest = rows[rows.length - 1];
  const status = getStatus(latest.value, ref);
  const unit = latest.unit || (ref ? ref.unit : '');
  let trend = '';
  if (rows.length >= 2) {
    const d = latest.value - rows[rows.length - 2].value;
    trend = d > 0 ? '↑' : d < 0 ? '↓' : '→';
  }

  document.getElementById('trendMeta').innerHTML = `
    <div class="stat-card"><div class="stat-label">Latest</div><div class="stat-value">${parseFloat(latest.value.toFixed(2))} <span style="font-size:13px;color:var(--text-3)">${unit}</span></div></div>
    <div class="stat-card"><div class="stat-label">Status</div><div class="stat-value ${status}">${{ok:'Normal',low:'Low',high:'High',unknown:'—'}[status]}</div></div>
    <div class="stat-card"><div class="stat-label">Readings</div><div class="stat-value">${rows.length}</div></div>
    <div class="stat-card"><div class="stat-label">Trend</div><div class="stat-value">${trend || '—'}</div></div>
  `;

  const pointColors = rows.map(r => {
    const s = getStatus(r.value, ref);
    return s === 'ok' ? '#4fffb0' : s === 'unknown' ? '#9090a8' : '#ff5c5c';
  });

  const datasets = [{
    label: name,
    data: rows.map(r => r.value),
    borderColor: '#4fffb0',
    backgroundColor: 'rgba(79,255,176,0.06)',
    pointBackgroundColor: pointColors,
    pointBorderColor: pointColors,
    pointRadius: 5, pointHoverRadius: 7,
    fill: true, tension: 0.35, borderWidth: 2,
  }];

  if (ref) {
    datasets.push({ label: 'Upper limit', data: rows.map(() => ref.max), borderColor: 'rgba(255,92,92,0.35)', borderDash: [4,4], borderWidth: 1, pointRadius: 0, fill: false });
    if (ref.min > 0) datasets.push({ label: 'Lower limit', data: rows.map(() => ref.min), borderColor: 'rgba(245,166,35,0.35)', borderDash: [4,4], borderWidth: 1, pointRadius: 0, fill: false });
  }

  if (trendChartInstance) { trendChartInstance.destroy(); trendChartInstance = null; }
  trendChartInstance = new Chart(document.getElementById('trendChart').getContext('2d'), {
    type: 'line',
    data: { labels: rows.map(r => r.date), datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1a26', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
          titleColor: '#9090a8', bodyColor: '#e8e8f0', padding: 10,
          callbacks: { label: ctx => ` ${ctx.parsed.y} ${unit}` }
        }
      },
      scales: {
        x: { ticks: { color: '#55556a', font: { family: 'DM Mono', size: 11 }, maxRotation: 45, maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { color: 'rgba(255,255,255,0.07)' } },
        y: { ticks: { color: '#55556a', font: { family: 'DM Mono', size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { color: 'rgba(255,255,255,0.07)' } }
      }
    }
  });

  renderReferenceBar(name, ref, latest.value, unit);
  renderTestHistory(rows, unit);
}

function renderReferenceBar(name, ref, currentVal, unit) {
  const el = document.getElementById('referenceBar');
  if (!ref) {
    el.innerHTML = `<div class="ref-title">REFERENCE RANGE</div><p style="font-size:13px;color:var(--text-3)">No reference range on file for ${name}.</p>`;
    return;
  }
  const span = ref.max - ref.min;
  const paddedMin = ref.min - span * 0.3;
  const paddedMax = ref.max + span * 0.3;
  const total = paddedMax - paddedMin;
  const pct = Math.min(98, Math.max(2, ((currentVal - paddedMin) / total) * 100));
  const normalLeft = ((ref.min - paddedMin) / total) * 100;
  const normalWidth = (span / total) * 100;

  el.innerHTML = `
    <div class="ref-title">REFERENCE RANGE</div>
    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-2);margin-bottom:4px">
      <span>${name}</span>
      <span style="font-family:var(--mono)">Normal: ${ref.min}–${ref.max} ${unit}</span>
    </div>
    <div class="ref-range-track">
      <div class="ref-range-normal" style="left:${normalLeft.toFixed(1)}%;width:${normalWidth.toFixed(1)}%"></div>
      <div class="ref-marker" style="left:${pct.toFixed(1)}%"></div>
    </div>
    <div class="ref-labels">
      <span>${paddedMin.toFixed(1)}</span>
      <span>${ref.min} (low)</span>
      <span>${ref.max} (high)</span>
      <span>${paddedMax.toFixed(1)}</span>
    </div>
    ${ref.info ? `<p class="ref-info">${ref.info}</p>` : ''}
  `;
}

function renderTestHistory(rows, unit) {
  document.getElementById('trendHistory').innerHTML = `
    <div class="history-group">
      <div class="history-group-label">All readings</div>
      ${[...rows].reverse().map(r => {
        const ref = RANGES[r.test_name];
        const s = getStatus(r.value, ref);
        return `<div class="history-row">
          <div class="hr-name">${r.date}</div>
          <div class="hr-val">${parseFloat(r.value.toFixed(2))} <span style="font-size:11px;color:var(--text-3)">${unit}</span></div>
          <div>${statusBadge(s)}</div>
        </div>`;
      }).join('')}
    </div>`;
}

/* ── History view ─────────────────────────────────── */
function renderHistory() {
  const search = (document.getElementById('historySearch')?.value || '').toLowerCase();
  const dateFilter = document.getElementById('historyDateFilter')?.value || 'all';
  const el = document.getElementById('historyTable');
  const empty = document.getElementById('emptyHistory');

  if (!db.length) { el.innerHTML = ''; empty.classList.add('visible'); return; }
  empty.classList.remove('visible');

  const cutoff = getDateCutoff(dateFilter);
  const filtered = db.filter(r =>
    r.test_name.toLowerCase().includes(search) && (!cutoff || r.date >= cutoff)
  );

  if (!filtered.length) { el.innerHTML = '<p style="color:var(--text-3);font-size:13px;padding:1rem 0">No results match your filters.</p>'; return; }

  const byDate = {};
  [...filtered].reverse().forEach(r => { if (!byDate[r.date]) byDate[r.date] = []; byDate[r.date].push(r); });

  el.innerHTML = Object.entries(byDate).sort((a,b) => b[0].localeCompare(a[0])).map(([date, rows]) => `
    <div class="history-group">
      <div class="history-group-label">${date}</div>
      ${rows.map(r => {
        const ref = RANGES[r.test_name];
        const s = getStatus(r.value, ref);
        return `<div class="history-row">
          <div class="hr-name">${r.test_name}</div>
          <div class="hr-val">${parseFloat(r.value.toFixed(2))}</div>
          <div class="hr-date">${r.unit || (ref ? ref.unit : '')}</div>
          <div>${statusBadge(s)}</div>
        </div>`;
      }).join('')}
    </div>`).join('');
}

function getDateCutoff(filter) {
  if (filter === 'all') return null;
  const d = new Date();
  if (filter === '6m') d.setMonth(d.getMonth() - 6);
  else if (filter === '1y') d.setFullYear(d.getFullYear() - 1);
  else if (filter === '2y') d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().slice(0, 10);
}

/* ── Import helpers ───────────────────────────────── */
function populateKnownTests() {
  const el = document.getElementById('knownTestsGrid');
  if (!el) return;
  el.innerHTML = Object.entries(RANGES).map(([name, ref]) =>
    `<div class="known-test-item"><div>${name}</div><div class="kti-range">${ref.min}–${ref.max} ${ref.unit}</div></div>`
  ).join('');
}

function openDriveFolder() {
  const url = Drive.getFolderUrl();
  if (url) window.open(url, '_blank');
  else toast('Folder URL not available yet', 'error');
}

function downloadSampleCSV() {
  const rows = [
    ['date','test_name','value','unit'],
    ['2023-03-15','Glucose','95','mg/dL'],
    ['2023-03-15','Total Cholesterol','215','mg/dL'],
    ['2023-03-15','LDL','135','mg/dL'],
    ['2023-03-15','HDL','52','mg/dL'],
    ['2023-03-15','Triglycerides','142','mg/dL'],
    ['2023-03-15','Vitamin D','18','ng/mL'],
    ['2023-03-15','TSH','2.1','mIU/L'],
    ['2023-03-15','Ferritin','22','ng/mL'],
    ['2023-09-10','Glucose','91','mg/dL'],
    ['2023-09-10','LDL','118','mg/dL'],
    ['2023-09-10','Vitamin D','34','ng/mL'],
    ['2024-03-22','Glucose','87','mg/dL'],
    ['2024-03-22','LDL','105','mg/dL'],
    ['2024-03-22','HDL','62','mg/dL'],
    ['2024-03-22','Vitamin D','44','ng/mL'],
    ['2024-03-22','TSH','2.8','mIU/L'],
  ];
  const csv = rows.map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'labtrack-sample.csv';
  a.click();
}

async function clearAllData() {
  if (!confirm('Delete all parsed lab data from Drive? Your CSV files are untouched.')) return;
  db = [];
  await Drive.deleteDataFile();
  renderDashboard();
  populateTrendSelect();
  renderHistory();
  document.getElementById('importLog').style.display = 'none';
  toast('All data cleared');
}

/* ── Navigation ───────────────────────────────────── */
function switchView(name, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  if (btn) btn.classList.add('active');
  const titles = { dashboard: 'Dashboard', trends: 'Trends', history: 'History', import: 'Import' };
  document.getElementById('viewTitle').textContent = titles[name] || name;
  if (window.innerWidth < 700) closeSidebar();
  if (name === 'history') renderHistory();
  if (name === 'trends') populateTrendSelect();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('visible');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('visible');
}

/* ── Helpers ──────────────────────────────────────── */
function getLatestByTest() {
  const map = {};
  db.forEach(r => { if (!map[r.test_name] || r.date > map[r.test_name].date) map[r.test_name] = r; });
  return map;
}

let toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3500);
}

/* ── Service Worker ───────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
