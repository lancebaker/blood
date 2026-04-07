/* ── drive.js — Google Drive API layer ───────────────
   Uses direct fetch() calls against the Drive REST API.
   Persists session in localStorage so the user stays
   signed in on a specific device/browser.
   ───────────────────────────────────────────────────── */

const Drive = (() => {
  let tokenClient = null;
  let accessToken = null;
  let tokenExpiry = null;
  let folderId = null;
  let dataFileId = null;
  let driveFolderUrl = null;

  const API = 'https://www.googleapis.com/drive/v3';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
  const SESSION_KEY = 'labtrack_session';

  /* ── Authenticated fetch helper ───────────────────── */
  async function gfetch(url, opts = {}) {
    // Silently refresh token if it's close to expiry
    if (tokenExpiry && Date.now() > tokenExpiry - 60000) {
      await silentRefresh();
    }
    const res = await fetch(url, {
      ...opts,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        ...(opts.headers || {}),
      },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive API error ${res.status}: ${err}`);
    }
    const text = await res.text();
    try { return text ? JSON.parse(text) : {}; } catch(e) { return {}; }
  }

  /* ── Session persistence ──────────────────────────── */
  function saveSession(token, expiresIn) {
    const expiry = Date.now() + (expiresIn * 1000);
    tokenExpiry = expiry;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token, expiry }));
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const { token, expiry } = JSON.parse(raw);
      // Don't restore if expired
      if (Date.now() > expiry) { localStorage.removeItem(SESSION_KEY); return null; }
      return { token, expiry };
    } catch(e) { return null; }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    tokenExpiry = null;
  }

  /* ── Silent refresh using stored hint ────────────────
     Google's token client supports prompt='' which skips
     the consent screen if the user has previously granted
     access. Combined with select_account hint, this gives
     a seamless re-auth on page load.
   ───────────────────────────────────────────────────── */
  /* ── Silent refresh — only used on page load, with timeout ── */
  async function silentRefresh() {
    return new Promise((resolve, reject) => {
      const storedHint = localStorage.getItem('labtrack_email') || '';
      // Timeout after 3 seconds — if Google doesn't respond, fail fast
      const timeout = setTimeout(() => reject(new Error('silent_timeout')), 3000);
      const tc = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: CONFIG.SCOPES,
        hint: storedHint,
        callback: (resp) => {
          clearTimeout(timeout);
          if (resp.error) { reject(new Error(resp.error)); return; }
          accessToken = resp.access_token;
          saveSession(resp.access_token, resp.expires_in || 3600);
          resolve(resp.access_token);
        },
      });
      tc.requestAccessToken({ prompt: '' });
    });
  }

  /* ── Init — check for stored session ─────────────── */
  async function init() {
    // Wait for Google Identity Services to load (up to 5 seconds)
    await new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.accounts) { resolve(); return; }
      let waited = 0;
      const check = setInterval(() => {
        waited += 100;
        if (typeof google !== 'undefined' && google.accounts) { clearInterval(check); resolve(); return; }
        if (waited > 5000) { clearInterval(check); reject(new Error('Google API failed to load')); }
      }, 100);
    });

    // Pre-initialise the token client so it's ready when the button is clicked
    // This avoids the "nothing happens" bug caused by initialising inside a click handler
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: CONFIG.SCOPES,
      callback: (resp) => {
        if (tokenClient._callback) tokenClient._callback(resp);
      },
    });

    // Check for a stored valid session
    const session = loadSession();
    if (session) {
      accessToken = session.token;
      tokenExpiry = session.expiry;
      return true;
    }
    return false;
  }

  /* ── Sign in — called directly from button click ──── */
  async function signIn() {
    // If we have a stored session, try silent refresh first (no popup)
    if (loadSession()) {
      try {
        await silentRefresh();
        return accessToken;
      } catch(e) {
        clearSession(); // Session stale — fall through to full sign-in
      }
    }

    // Full sign-in with Google popup — must be called from a user gesture (button click)
    return new Promise((resolve, reject) => {
      if (!tokenClient) {
        reject(new Error('Google API not ready. Please refresh the page.'));
        return;
      }
      // Attach one-time callback
      tokenClient._callback = (resp) => {
        tokenClient._callback = null;
        if (resp.error) {
          // popup_closed_by_user is not a real error — user just closed the window
          if (resp.error === 'popup_closed_by_user' || resp.error === 'access_denied') {
            reject(new Error('Sign-in cancelled'));
          } else {
            reject(new Error(resp.error));
          }
          return;
        }
        accessToken = resp.access_token;
        saveSession(resp.access_token, resp.expires_in || 3600);
        getUserEmail().then(email => {
          if (email) localStorage.setItem('labtrack_email', email);
        });
        resolve(resp.access_token);
      };
      tokenClient.requestAccessToken({ prompt: 'select_account' });
    });
  }

  /* ── Get user email for hint ──────────────────────── */
  async function getUserEmail() {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const json = await res.json();
      return json.email || null;
    } catch(e) { return null; }
  }

  async function getUserInfo() {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      return await res.json();
    } catch(e) { return null; }
  }

  function signOut() {
    if (accessToken) google.accounts.oauth2.revoke(accessToken, () => {});
    accessToken = null;
    folderId = null;
    dataFileId = null;
    clearSession();
    localStorage.removeItem('labtrack_email');
  }

  function isSignedIn() { return !!accessToken; }

  /* ── Folder management ────────────────────────────── */
  async function ensureFolder() {
    if (folderId) return folderId;

    const q = encodeURIComponent(`name='${CONFIG.DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const res = await gfetch(`${API}/files?q=${q}&fields=files(id,name,webViewLink)&spaces=drive`);

    if (res.files && res.files.length > 0) {
      folderId = res.files[0].id;
      driveFolderUrl = res.files[0].webViewLink;
      return folderId;
    }

    const created = await gfetch(`${API}/files?fields=id,webViewLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: CONFIG.DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    folderId = created.id;
    driveFolderUrl = created.webViewLink;
    return folderId;
  }

  function getFolderUrl() { return driveFolderUrl; }
  function getFolderId() { return folderId; }

  /* ── Data file ────────────────────────────────────── */
  async function loadDataFile() {
    await ensureFolder();

    const q = encodeURIComponent(`name='${CONFIG.DATA_FILE_NAME}' and '${folderId}' in parents and trashed=false`);
    const res = await gfetch(`${API}/files?q=${q}&fields=files(id)`);

    if (!res.files || res.files.length === 0) {
      dataFileId = null;
      return null;
    }

    dataFileId = res.files[0].id;

    const content = await fetch(`${API}/files/${dataFileId}?alt=media`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    const text = await content.text();
    try { return JSON.parse(text); } catch(e) { return null; }
  }

  async function saveDataFile(data) {
    await ensureFolder();
    const body = JSON.stringify(data, null, 2);

    if (dataFileId) {
      await fetch(`${UPLOAD}/files/${dataFileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body,
      });
    } else {
      const boundary = 'labtrack_boundary';
      const meta = JSON.stringify({ name: CONFIG.DATA_FILE_NAME, parents: [folderId] });
      const multipart = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;

      const res = await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipart,
      });
      const json = await res.json();
      dataFileId = json.id;
    }
  }

  async function deleteDataFile() {
    if (!dataFileId) return;
    await gfetch(`${API}/files/${dataFileId}`, { method: 'DELETE' });
    dataFileId = null;
  }

  /* ── CSV upload ───────────────────────────────────── */
  async function uploadCSV(filename, content) {
    await ensureFolder();

    const q = encodeURIComponent(`name='${filename}' and '${folderId}' in parents and trashed=false`);
    const existing = await gfetch(`${API}/files?q=${q}&fields=files(id)`);
    const boundary = 'labtrack_boundary';

    if (existing.files && existing.files.length > 0) {
      const existingId = existing.files[0].id;
      await fetch(`${UPLOAD}/files/${existingId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'text/csv',
        },
        body: content,
      });
      return existingId;
    }

    const meta = JSON.stringify({ name: filename, parents: [folderId] });
    const multipart = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: text/csv\r\n\r\n${content}\r\n--${boundary}--`;

    const res = await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipart,
    });
    const json = await res.json();
    return json.id;
  }

  async function listCSVFiles() {
    await ensureFolder();
    const q = encodeURIComponent(`'${folderId}' in parents and name contains '.csv' and trashed=false`);
    const res = await gfetch(`${API}/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`);
    return res.files || [];
  }

  return {
    init, signIn, signOut, isSignedIn,
    ensureFolder, getFolderUrl, getFolderId,
    loadDataFile, saveDataFile, deleteDataFile,
    uploadCSV, listCSVFiles, getUserInfo,
  };
})();
