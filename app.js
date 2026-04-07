/* ── app.js ───────────────────────────────────────────
   Main application logic for LabTrack (Drive edition).
   ───────────────────────────────────────────────────── */

/* ── Reference ranges & descriptions ──────────────── */
const RANGES = {
  'Glucose': {
    min: 70, max: 99, unit: 'mg/dL', cat: 'Metabolic',
    what: 'Measures the amount of sugar (glucose) in your blood at the time of the test. Usually taken after fasting for 8+ hours.',
    high: 'Levels between 100–125 mg/dL indicate prediabetes. Above 126 mg/dL on two separate tests indicates type 2 diabetes. Can also be temporarily elevated after eating, stress, or illness.',
    low: 'Below 70 mg/dL is hypoglycemia. Symptoms include shakiness, sweating, confusion, and fatigue. Can result from skipping meals, excessive exercise, or certain medications.',
  },
  'HbA1c': {
    min: 4.0, max: 5.6, unit: '%', cat: 'Metabolic',
    what: 'Reflects your average blood sugar level over the past 2–3 months by measuring the percentage of hemoglobin coated with sugar. Unlike fasting glucose, it is not affected by short-term fluctuations.',
    high: '5.7–6.4% indicates prediabetes. 6.5% or above indicates diabetes. Chronically elevated HbA1c increases risk of nerve damage, kidney disease, and cardiovascular disease.',
    low: 'Rarely a concern on its own. Very low values may be seen in certain blood disorders like hemolytic anemia or with certain genetic hemoglobin variants.',
  },
  'Insulin': {
    min: 2, max: 25, unit: 'µIU/mL', cat: 'Metabolic',
    what: 'Measures fasting insulin, the hormone produced by the pancreas that allows cells to use glucose for energy. Best interpreted alongside fasting glucose.',
    high: 'Elevated fasting insulin is a key marker of insulin resistance — the body is producing extra insulin to compensate for cells not responding properly. Linked to prediabetes, metabolic syndrome, PCOS, and weight gain.',
    low: 'Low insulin in a fasting state is generally normal. Very low insulin combined with high glucose may indicate type 1 diabetes or advanced type 2 diabetes.',
  },
  'Uric Acid': {
    min: 2.4, max: 7.0, unit: 'mg/dL', cat: 'Metabolic',
    what: 'A waste product formed when the body breaks down purines — substances found in certain foods and drinks. Most is filtered by the kidneys and excreted in urine.',
    high: 'Elevated levels (hyperuricemia) can cause uric acid crystals to form in joints, leading to gout attacks. Also associated with kidney stones, hypertension, and metabolic syndrome.',
    low: 'Rarely clinically significant. Occasionally seen with certain liver conditions, low-purine diets, or some medications.',
  },
  'Total Cholesterol': {
    min: 0, max: 200, unit: 'mg/dL', cat: 'Lipids',
    what: 'The total amount of cholesterol in your blood, including LDL, HDL, and VLDL. Cholesterol is a fatty substance essential for building cells and producing hormones.',
    high: '200–239 mg/dL is borderline high. 240 mg/dL and above is high and associated with increased cardiovascular risk. However, total cholesterol alone is less meaningful than the breakdown of LDL vs. HDL.',
    low: 'Below 150 mg/dL may be associated with certain conditions including malnutrition, hyperthyroidism, or liver disease, though some people naturally run low.',
  },
  'LDL': {
    min: 0, max: 100, unit: 'mg/dL', cat: 'Lipids',
    what: 'Low-density lipoprotein, often called "bad" cholesterol. LDL carries cholesterol through the bloodstream and can deposit it in artery walls, contributing to plaque buildup.',
    high: '100–129 mg/dL is near optimal. 130–159 is borderline high. 160–189 is high. Above 190 is very high. Elevated LDL is a primary risk factor for coronary artery disease and heart attack.',
    low: 'Generally considered favorable. Very low LDL (below 40 mg/dL) is uncommon and may occasionally be associated with genetic conditions or very aggressive statin therapy.',
  },
  'HDL': {
    min: 60, max: 200, unit: 'mg/dL', cat: 'Lipids',
    what: 'High-density lipoprotein, the "good" cholesterol. HDL helps remove excess cholesterol from the bloodstream and arterial walls, transporting it back to the liver for disposal.',
    high: 'Higher HDL is generally protective against heart disease. Above 60 mg/dL is considered cardioprotective. Very high levels (above 100 mg/dL) are unusual and worth discussing with a doctor.',
    low: 'Below 40 mg/dL in men and below 50 mg/dL in women is considered low and increases cardiovascular risk. Associated with sedentary lifestyle, smoking, obesity, and high triglycerides.',
  },
  'Triglycerides': {
    min: 0, max: 150, unit: 'mg/dL', cat: 'Lipids',
    what: 'A type of fat (lipid) in your blood. When you eat, your body converts calories it does not need immediately into triglycerides, which are stored in fat cells.',
    high: '150–199 mg/dL is borderline high. 200–499 is high. Above 500 is very high and risks pancreatitis. High triglycerides are linked to heart disease, metabolic syndrome, and poorly controlled diabetes.',
    low: 'Below 150 is normal. Very low triglycerides are generally not a concern and often reflect a low-carbohydrate diet.',
  },
  'TSH': {
    min: 0.4, max: 4.0, unit: 'mIU/L', cat: 'Thyroid',
    what: 'Thyroid-stimulating hormone, produced by the pituitary gland. TSH tells the thyroid gland how much thyroid hormone to make. It is the primary screening test for thyroid function.',
    high: 'Elevated TSH suggests the thyroid is underactive (hypothyroidism) — the pituitary is working harder to stimulate it. Symptoms include fatigue, weight gain, cold intolerance, constipation, and depression.',
    low: 'Low TSH suggests the thyroid is overactive (hyperthyroidism) — it is producing too much hormone. Symptoms include weight loss, rapid heartbeat, anxiety, sweating, and heat intolerance.',
  },
  'Free T4': {
    min: 0.8, max: 1.8, unit: 'ng/dL', cat: 'Thyroid',
    what: 'The unbound, active form of thyroxine (T4), one of two main hormones made by the thyroid. Free T4 is the portion available to enter cells and exert its effects.',
    high: 'Elevated Free T4 with low TSH confirms hyperthyroidism. Can cause rapid heartbeat, anxiety, weight loss, heat sensitivity, and in severe cases, thyroid storm.',
    low: 'Low Free T4 with high TSH confirms primary hypothyroidism. Symptoms include fatigue, weight gain, dry skin, hair loss, constipation, and brain fog.',
  },
  'Free T3': {
    min: 2.3, max: 4.2, unit: 'pg/mL', cat: 'Thyroid',
    what: 'The active form of thyroid hormone at the cellular level. T4 is converted to T3 in body tissues. Free T3 is often checked when symptoms of thyroid disease persist despite normal TSH and T4.',
    high: 'Elevated Free T3 can indicate hyperthyroidism or T3 toxicosis. Symptoms include palpitations, tremors, weight loss, and heat intolerance.',
    low: 'Low Free T3 can explain hypothyroid-like symptoms (fatigue, weight gain, cold intolerance) even when TSH and T4 appear normal. Can result from poor T4-to-T3 conversion.',
  },
  'Vitamin D': {
    min: 30, max: 100, unit: 'ng/mL', cat: 'Vitamins',
    what: 'A fat-soluble vitamin (actually a hormone precursor) essential for calcium absorption, bone health, immune function, and mood regulation. Produced by the skin from sunlight exposure.',
    high: 'Above 100 ng/mL may cause vitamin D toxicity (hypervitaminosis D), leading to nausea, weakness, and dangerously high calcium levels. Usually only from excessive supplementation, not sun exposure.',
    low: '20–29 ng/mL is insufficient. Below 20 is deficient. Low vitamin D is extremely common and linked to weak bones, impaired immunity, fatigue, depression, and increased risk of certain cancers.',
  },
  'Vitamin B12': {
    min: 200, max: 900, unit: 'pg/mL', cat: 'Vitamins',
    what: 'An essential vitamin required for red blood cell formation, DNA synthesis, and neurological function. Found almost exclusively in animal products; stored in the liver for several years.',
    high: 'Rarely harmful from diet or supplements. Very high levels without supplementation may warrant investigation for certain liver or blood disorders.',
    low: 'Below 200 pg/mL indicates deficiency. Symptoms include fatigue, weakness, numbness or tingling in hands and feet, memory problems, and megaloblastic anemia. Common in vegans, older adults, and those on metformin.',
  },
  'Folate': {
    min: 2.7, max: 17, unit: 'ng/mL', cat: 'Vitamins',
    what: 'A B-vitamin (B9) essential for DNA synthesis, cell division, and the formation of red blood cells. Critical during pregnancy to prevent neural tube defects in the developing fetus.',
    high: 'Excess folate from diet is generally harmless as it is water-soluble and excreted. Very high supplemental doses may mask B12 deficiency.',
    low: 'Deficiency causes megaloblastic anemia, fatigue, mouth sores, and in pregnancy, serious neural tube defects. Common with poor diet, alcohol excess, malabsorption disorders, or certain medications.',
  },
  'Ferritin': {
    min: 12, max: 150, unit: 'ng/mL', cat: 'Blood',
    what: 'A protein that stores iron inside cells. Serum ferritin reflects total body iron stores and is the most sensitive early marker of iron deficiency — it drops before hemoglobin or red cell counts change.',
    high: 'Can indicate iron overload (hemochromatosis), chronic inflammation, liver disease, or certain cancers. Ferritin is also an acute phase reactant, meaning it rises with any inflammatory state.',
    low: 'Below 12 ng/mL indicates depleted iron stores. Symptoms include fatigue, weakness, hair loss, brittle nails, restless legs, and poor exercise tolerance. Often precedes full iron-deficiency anemia.',
  },
  'Hemoglobin': {
    min: 12.0, max: 17.5, unit: 'g/dL', cat: 'Blood',
    what: 'The protein in red blood cells that carries oxygen from the lungs to the rest of the body and returns carbon dioxide back to the lungs. The primary marker used to diagnose anemia.',
    high: 'Elevated hemoglobin (polycythemia) can thicken the blood and increase clotting risk. Causes include dehydration, high altitude, smoking, and rare bone marrow disorders.',
    low: 'Below normal indicates anemia. Symptoms include fatigue, shortness of breath, dizziness, pale skin, and rapid heartbeat. Many possible causes including iron, B12, or folate deficiency, blood loss, or chronic disease.',
  },
  'Hematocrit': {
    min: 36, max: 52, unit: '%', cat: 'Blood',
    what: 'The percentage of your blood volume made up of red blood cells. Closely related to hemoglobin and used alongside it to assess anemia and overall blood cell production.',
    high: 'High hematocrit thickens the blood and increases risk of clots, stroke, and heart attack. Associated with dehydration, polycythemia vera, or living at high altitude.',
    low: 'Low hematocrit indicates anemia. Levels below 36% in women and below 41% in men are considered low. Same causes as low hemoglobin.',
  },
  'WBC': {
    min: 4.5, max: 11.0, unit: 'K/µL', cat: 'Blood',
    what: 'White blood cells are the cells of the immune system. The WBC count measures the total number of these infection-fighting cells in the blood.',
    high: 'Leukocytosis (high WBC) is usually a sign of infection, inflammation, or immune activation. Can also be caused by stress, corticosteroids, smoking, or rarely blood cancers like leukemia.',
    low: 'Leukopenia (low WBC) increases susceptibility to infection. Causes include viral infections, autoimmune disease, bone marrow suppression, chemotherapy, or certain medications.',
  },
  'Platelets': {
    min: 150, max: 400, unit: 'K/µL', cat: 'Blood',
    what: 'Small cell fragments that play a critical role in blood clotting. When a blood vessel is damaged, platelets clump together to form a plug that stops bleeding.',
    high: 'Thrombocytosis (high platelets) can increase clotting risk. Often reactive to infection, inflammation, or iron deficiency. Rarely indicates a bone marrow disorder.',
    low: 'Thrombocytopenia (low platelets) impairs clotting, causing easy bruising, prolonged bleeding, and in severe cases spontaneous bleeding. Causes include autoimmune disease, viral infections, medications, and bone marrow issues.',
  },
  'RBC': {
    min: 4.2, max: 5.9, unit: 'M/µL', cat: 'Blood',
    what: 'The count of red blood cells per microliter of blood. Red blood cells contain hemoglobin and are responsible for transporting oxygen throughout the body.',
    high: 'High RBC count can thicken the blood. Associated with dehydration, high altitude, smoking, and polycythemia vera.',
    low: 'Low RBC indicates anemia. The body may not be producing enough red cells, or they may be being destroyed or lost through bleeding.',
  },
  'Creatinine': {
    min: 0.6, max: 1.2, unit: 'mg/dL', cat: 'Kidney',
    what: 'A waste product produced by normal muscle metabolism. The kidneys filter creatinine out of the blood; when kidney function declines, creatinine builds up in the bloodstream.',
    high: 'Elevated creatinine suggests the kidneys are not filtering efficiently. Can be caused by dehydration, kidney disease, high protein intake, or certain medications. Should always be evaluated alongside eGFR.',
    low: 'Low creatinine is usually not a medical concern. More common in people with low muscle mass, such as the elderly or those who are malnourished.',
  },
  'eGFR': {
    min: 60, max: 200, unit: 'mL/min', cat: 'Kidney',
    what: 'Estimated Glomerular Filtration Rate — a calculated measure of how well the kidneys are filtering waste from the blood per minute. Derived from creatinine, age, and sex.',
    high: 'Above 60 is considered normal kidney function. Values above 90 represent optimal kidney function.',
    low: '45–59 indicates mild to moderate kidney disease. 30–44 is moderate to severe. Below 30 is severe. Below 15 indicates kidney failure. Early kidney disease often has no symptoms.',
  },
  'BUN': {
    min: 7, max: 20, unit: 'mg/dL', cat: 'Kidney',
    what: 'Blood Urea Nitrogen measures the amount of nitrogen in the blood from urea, a waste product formed when the liver breaks down protein. The kidneys filter urea out of the blood.',
    high: 'Elevated BUN can indicate kidney dysfunction, dehydration, high protein diet, or increased protein breakdown from illness or trauma. Often evaluated as a BUN-to-creatinine ratio for more context.',
    low: 'Low BUN can be seen with low protein intake, liver disease, or overhydration.',
  },
  'ALT': {
    min: 7, max: 40, unit: 'U/L', cat: 'Liver',
    what: 'Alanine aminotransferase, an enzyme found primarily in liver cells. When liver cells are damaged or inflamed, ALT leaks into the bloodstream. It is the most specific marker for liver injury.',
    high: 'Mildly elevated ALT (1–3x normal) is common with fatty liver disease, alcohol use, or certain medications. Markedly elevated levels (10x+ normal) suggest acute hepatitis, drug toxicity, or significant liver injury.',
    low: 'Low ALT has no clinical significance.',
  },
  'AST': {
    min: 10, max: 40, unit: 'U/L', cat: 'Liver',
    what: 'Aspartate aminotransferase, an enzyme found in the liver, heart, muscles, and kidneys. Less liver-specific than ALT; elevated AST with normal ALT may point to muscle or heart issues.',
    high: 'Elevated AST alongside elevated ALT points to liver disease. Elevated AST with normal ALT may indicate muscle damage, heart attack, or strenuous exercise. An AST:ALT ratio above 2:1 often suggests alcohol-related liver disease.',
    low: 'Low AST has no clinical significance.',
  },
  'GGT': {
    min: 9, max: 48, unit: 'U/L', cat: 'Liver',
    what: 'Gamma-glutamyl transferase, an enzyme found in the liver and bile ducts. Highly sensitive to liver stress and one of the first liver enzymes to elevate with alcohol use.',
    high: 'Elevated GGT is a sensitive indicator of liver stress, bile duct obstruction, fatty liver, or alcohol use. Even modest alcohol consumption can elevate GGT. Often elevated before other liver tests show abnormalities.',
    low: 'Low GGT has no clinical significance.',
  },
  'Albumin': {
    min: 3.5, max: 5.0, unit: 'g/dL', cat: 'Liver',
    what: 'The most abundant protein in blood plasma, produced exclusively by the liver. Albumin maintains fluid balance, transports hormones and drugs, and is a marker of overall nutritional status.',
    high: 'High albumin is uncommon and usually reflects dehydration.',
    low: 'Low albumin indicates the liver is not producing enough protein, which can be due to liver disease, chronic illness, malnutrition, or conditions causing protein loss such as kidney disease or inflammatory bowel disease.',
  },
  'Testosterone': {
    min: 300, max: 1000, unit: 'ng/dL', cat: 'Hormones',
    what: 'The primary male sex hormone, produced mainly in the testes (and in smaller amounts by the adrenal glands and ovaries in women). Essential for muscle mass, bone density, libido, mood, and energy.',
    high: 'In men, naturally high testosterone is generally not a concern. Elevated levels may result from anabolic steroid use or, rarely, tumors. In women, high testosterone can indicate PCOS or adrenal disorders.',
    low: 'In men, below 300 ng/dL indicates hypogonadism. Symptoms include fatigue, decreased libido, erectile dysfunction, reduced muscle mass, increased body fat, depression, and brain fog.',
  },
  'Estradiol': {
    min: 15, max: 350, unit: 'pg/mL', cat: 'Hormones',
    what: 'The primary form of estrogen, produced mainly by the ovaries in women and in small amounts by the testes and adrenal glands in men. Critical for reproductive health, bone density, and cardiovascular function.',
    high: 'In women, varies widely with the menstrual cycle. High levels may indicate ovarian cysts or estrogen dominance. In men, elevated estradiol can cause gynecomastia and reduced libido.',
    low: 'Low estradiol in women can cause hot flashes, vaginal dryness, bone loss, and mood changes. In men, very low estradiol is associated with poor bone density and joint pain.',
  },
  'Cortisol': {
    min: 6, max: 23, unit: 'µg/dL', cat: 'Hormones',
    what: 'The primary stress hormone, produced by the adrenal glands. Cortisol regulates metabolism, immune response, blood pressure, and the sleep-wake cycle. Best measured in the morning when levels are highest.',
    high: 'Chronically elevated cortisol (Cushing\'s syndrome) causes weight gain (especially in the abdomen and face), high blood pressure, diabetes, muscle weakness, and poor wound healing. Also elevated during acute stress or illness.',
    low: 'Low cortisol may indicate adrenal insufficiency (Addison\'s disease). Symptoms include fatigue, weight loss, low blood pressure, salt cravings, and nausea.',
  },
  'DHEA-S': {
    min: 80, max: 560, unit: 'µg/dL', cat: 'Hormones',
    what: 'Dehydroepiandrosterone sulfate, produced by the adrenal glands. A precursor hormone that converts to testosterone and estrogen in body tissues. Naturally declines with age from the mid-20s onward.',
    high: 'Elevated DHEA-S may indicate adrenal tumors, congenital adrenal hyperplasia, or PCOS. In women can cause acne and excess facial hair.',
    low: 'Low DHEA-S is common with aging and adrenal insufficiency. Associated with fatigue, low libido, reduced bone density, and decreased sense of wellbeing.',
  },
  'PSA': {
    min: 0, max: 4.0, unit: 'ng/mL', cat: 'Hormones',
    what: 'Prostate-Specific Antigen, a protein produced by prostate gland cells. Used as a screening tool for prostate cancer and to monitor prostate health in men.',
    high: 'Elevated PSA (above 4.0 ng/mL) warrants further evaluation but does not confirm cancer — benign prostate enlargement (BPH) and prostatitis also raise PSA. Values between 4–10 ng/dL are considered the "gray zone."',
    low: 'Low or undetectable PSA is normal and favorable, especially after prostate cancer treatment.',
  },
  'CRP': {
    min: 0, max: 1.0, unit: 'mg/L', cat: 'Inflammation',
    what: 'High-sensitivity C-reactive protein (hs-CRP), a protein produced by the liver in response to inflammation anywhere in the body. Used as a cardiovascular risk marker when measured at low levels.',
    high: '1–3 mg/L represents average cardiovascular risk. Above 3 mg/L represents high risk. Acutely elevated CRP (above 10 mg/L) usually reflects active infection or significant inflammation rather than cardiovascular risk.',
    low: 'Below 1 mg/L indicates low cardiovascular inflammation risk. Lower is better.',
  },
  'Homocysteine': {
    min: 4, max: 15, unit: 'µmol/L', cat: 'Inflammation',
    what: 'An amino acid produced during protein metabolism. Elevated homocysteine damages blood vessel walls and is an independent risk factor for cardiovascular disease, stroke, and cognitive decline.',
    high: 'Above 15 µmol/L is elevated. Moderate elevation (15–30) is most common and typically responds to B-vitamin supplementation (B12, folate, B6). Severely elevated levels may indicate a genetic enzyme deficiency.',
    low: 'Low homocysteine is generally favorable and not clinically concerning.',
  },
  'Magnesium': {
    min: 1.7, max: 2.2, unit: 'mg/dL', cat: 'Minerals',
    what: 'An essential mineral involved in over 300 enzymatic reactions including energy production, protein synthesis, muscle and nerve function, and blood glucose control. About 60% is stored in bone.',
    high: 'Hypermagnesemia is rare with normal kidney function. High levels can cause nausea, low blood pressure, muscle weakness, and in severe cases, cardiac arrest. Usually seen with kidney failure or excessive supplementation.',
    low: 'Hypomagnesemia is common and often undiagnosed. Symptoms include muscle cramps, fatigue, poor sleep, anxiety, constipation, irregular heartbeat, and migraines. Associated with high alcohol intake, diabetes, and proton pump inhibitor use.',
  },
  'Calcium': {
    min: 8.5, max: 10.5, unit: 'mg/dL', cat: 'Minerals',
    what: 'The most abundant mineral in the body, essential for bone structure, muscle contraction, nerve signaling, and blood clotting. Serum calcium is tightly regulated by parathyroid hormone and vitamin D.',
    high: 'Hypercalcemia (above 10.5 mg/dL) is most commonly caused by primary hyperparathyroidism or certain cancers. Symptoms include fatigue, constipation, kidney stones, bone pain, and confusion.',
    low: 'Hypocalcemia causes muscle cramps, numbness and tingling, and in severe cases, seizures and cardiac arrhythmias. Common causes include vitamin D deficiency, hypoparathyroidism, and low magnesium.',
  },
  'Potassium': {
    min: 3.5, max: 5.0, unit: 'mEq/L', cat: 'Minerals',
    what: 'A critical electrolyte that regulates heart rhythm, muscle contractions, nerve signals, and fluid balance. The body maintains potassium within a very narrow range.',
    high: 'Hyperkalemia (above 5.0 mEq/L) can cause dangerous heart arrhythmias. Causes include kidney disease, certain medications (ACE inhibitors, potassium-sparing diuretics), and adrenal insufficiency.',
    low: 'Hypokalemia (below 3.5 mEq/L) causes muscle weakness, cramps, constipation, and heart arrhythmias. Common causes include diarrhea, vomiting, diuretic use, and poor dietary intake.',
  },
  'Sodium': {
    min: 136, max: 145, unit: 'mEq/L', cat: 'Minerals',
    what: 'The main electrolyte in blood and fluid outside cells. Sodium regulates fluid balance, blood pressure, and nerve and muscle function. Closely regulated by the kidneys and hormones.',
    high: 'Hypernatremia (above 145 mEq/L) usually indicates dehydration or inadequate water intake. Symptoms include thirst, confusion, muscle twitching, and in severe cases, seizures.',
    low: 'Hyponatremia (below 136 mEq/L) is the most common electrolyte disorder. Causes include excess water intake, heart failure, kidney disease, and certain medications. Symptoms range from nausea and headache to confusion and seizures.',
  },
  'Iron': {
    min: 60, max: 170, unit: 'µg/dL', cat: 'Minerals',
    what: 'Serum iron measures the amount of iron circulating bound to transferrin. Iron is essential for hemoglobin production, oxygen transport, and energy metabolism. Best interpreted alongside ferritin and TIBC.',
    high: 'Elevated serum iron can indicate iron overload (hemochromatosis), liver disease, or recent iron supplementation. Iron overload damages the liver, heart, and joints.',
    low: 'Low serum iron, especially combined with low ferritin, indicates iron deficiency. Causes include poor dietary intake, blood loss, malabsorption, and increased demand (pregnancy).',
  },
  'Zinc': {
    min: 70, max: 120, unit: 'µg/dL', cat: 'Minerals',
    what: 'An essential trace mineral involved in immune function, wound healing, protein synthesis, DNA repair, and taste and smell. Not stored in the body, so regular dietary intake is required.',
    high: 'Zinc toxicity from supplements can cause nausea, vomiting, and impaired copper absorption. Rare from food alone.',
    low: 'Deficiency causes impaired immune function, poor wound healing, loss of taste and smell, hair loss, skin problems, and growth retardation in children. Common in vegetarians and those with malabsorption disorders.',
  },
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
  const hasSession = await Drive.init();
  if (hasSession) {
    showAuth('loading', 'Loading your lab data…');
    try {
      await afterSignIn();
    } catch(e) {
      showAuth('signIn');
    }
  } else {
    showAuth('signIn');
  }
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
  showAuth('loading', 'Opening Google sign-in…');
  try {
    await Drive.signIn();
    showAuth('loading', 'Loading your lab data…');
    await afterSignIn();
  } catch(e) {
    if (e.message === 'cancelled') { showAuth('signIn'); return; }
    if (e.message && e.message.includes('not ready')) {
      showAuth('error', 'Still loading — please wait a moment and try again.');
      return;
    }
    // Likely popup blocked
    showAuth('error',
      'Sign-in popup was blocked. In Chrome: click the popup icon in the address bar and select "Always allow pop-ups from lancebaker.github.io", then try again.');
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
  renderTestInfo(name, ref);
  renderTestHistory(rows, unit);
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


function renderTestInfo(name, ref) {
  const el = document.getElementById('testInfoPanel');
  if (!el) return;
  if (!ref || (!ref.what && !ref.high && !ref.low)) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  el.innerHTML = `
    <div class="info-panel-title">About this test</div>
    ${ref.what ? `<div class="info-section"><div class="info-label">What it measures</div><p class="info-text">${ref.what}</p></div>` : ''}
    ${ref.high ? `<div class="info-section"><div class="info-label high-label">If high</div><p class="info-text">${ref.high}</p></div>` : ''}
    ${ref.low ? `<div class="info-section"><div class="info-label low-label">If low</div><p class="info-text">${ref.low}</p></div>` : ''}
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
