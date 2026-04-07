/* ── drive.js — Google Drive API layer ───────────────
   Uses Google Identity Services (GIS) token model.
   Popups must be allowed for lancebaker.github.io
   ───────────────────────────────────────────────────── */

const Drive = (() => {
  let accessToken = null;
  let tokenExpiry  = null;
  let folderId    = null;
  let dataFileId  = null;
  let driveFolderUrl = null;
  let tokenClientReady = false;
  let resolveSignIn = null;
  let rejectSignIn  = null;

  const API    = 'https://www.googleapis.com/drive/v3';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
  const TOKEN_KEY  = 'labtrack_token';
  const EXPIRY_KEY = 'labtrack_expiry';
  const EMAIL_KEY  = 'labtrack_email';

  /* ── Token storage ────────────────────────────────── */
  function saveToken(token, expiresIn) {
    const expiry = Date.now() + ((expiresIn - 60) * 1000);
    accessToken = token;
    tokenExpiry = expiry;
    localStorage.setItem(TOKEN_KEY,  token);
    localStorage.setItem(EXPIRY_KEY, String(expiry));
  }

  function loadToken() {
    const token  = localStorage.getItem(TOKEN_KEY);
    const expiry = parseInt(localStorage.getItem(EXPIRY_KEY) || '0', 10);
    if (token && Date.now() < expiry) {
      accessToken = token;
      tokenExpiry = expiry;
      return true;
    }
    clearToken();
    return false;
  }

  function clearToken() {
    accessToken = null;
    tokenExpiry = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    folderId   = null;
    dataFileId = null;
  }

  /* ── Authenticated fetch ──────────────────────────── */
  async function gfetch(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: { 'Authorization': `Bearer ${accessToken}`, ...(opts.headers || {}) },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive API ${res.status}: ${err}`);
    }
    const text = await res.text();
    try { return text ? JSON.parse(text) : {}; } catch(e) { return {}; }
  }

  /* ── Init ─────────────────────────────────────────── */
  async function init() {
    // Wait for GIS to load
    await new Promise((resolve) => {
      if (typeof google !== 'undefined' && google.accounts) { resolve(); return; }
      const iv = setInterval(() => {
        if (typeof google !== 'undefined' && google.accounts) { clearInterval(iv); resolve(); }
      }, 50);
      setTimeout(() => { clearInterval(iv); resolve(); }, 5000);
    });

    // Pre-init token client so popup opens instantly on button click
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: CONFIG.SCOPES,
        callback: (resp) => {
          if (resp.error) {
            if (rejectSignIn) rejectSignIn(new Error(resp.error));
          } else {
            saveToken(resp.access_token, resp.expires_in || 3600);
            getUserEmail().then(email => {
              if (email) localStorage.setItem(EMAIL_KEY, email);
            });
            if (resolveSignIn) resolveSignIn(resp.access_token);
          }
          resolveSignIn = null;
          rejectSignIn  = null;
        },
        error_callback: (err) => {
          if (rejectSignIn) rejectSignIn(new Error(err.type || 'sign_in_failed'));
          resolveSignIn = null;
          rejectSignIn  = null;
        },
      });
      tokenClientReady = true;
    }

    return loadToken();
  }

  /* ── Sign in ──────────────────────────────────────── */
  function signIn() {
    if (!tokenClientReady) {
      return Promise.reject(new Error('Google API not ready. Please refresh.'));
    }
    return new Promise((resolve, reject) => {
      resolveSignIn = resolve;
      rejectSignIn  = reject;
      // Re-init each time to ensure fresh callback
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: CONFIG.SCOPES,
        callback: (resp) => {
          if (resp.error) {
            if (resp.error === 'popup_closed_by_user' || resp.error === 'access_denied') {
              reject(new Error('cancelled'));
            } else {
              reject(new Error(resp.error));
            }
          } else {
            saveToken(resp.access_token, resp.expires_in || 3600);
            getUserEmail().then(email => {
              if (email) localStorage.setItem(EMAIL_KEY, email);
            });
            resolve(resp.access_token);
          }
        },
        error_callback: (err) => {
          reject(new Error(err.type || 'sign_in_failed'));
        },
      });
      client.requestAccessToken({ prompt: 'select_account' });
    });
  }

  /* ── Sign out ─────────────────────────────────────── */
  function signOut() {
    if (accessToken) {
      google.accounts.oauth2.revoke(accessToken, () => {});
    }
    clearToken();
    localStorage.removeItem(EMAIL_KEY);
  }

  function isSignedIn() { return !!accessToken && Date.now() < (tokenExpiry || 0); }

  /* ── User info ────────────────────────────────────── */
  async function getUserEmail() {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const info = await res.json();
      return info.email || null;
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

  /* ── Folder ───────────────────────────────────────── */
  async function ensureFolder() {
    if (folderId) return folderId;
    const q   = encodeURIComponent(`name='${CONFIG.DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const res = await gfetch(`${API}/files?q=${q}&fields=files(id,name,webViewLink)&spaces=drive`);
    if (res.files && res.files.length > 0) {
      folderId = res.files[0].id;
      driveFolderUrl = res.files[0].webViewLink;
      return folderId;
    }
    const created = await gfetch(`${API}/files?fields=id,webViewLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: CONFIG.DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
    });
    folderId = created.id;
    driveFolderUrl = created.webViewLink;
    return folderId;
  }

  function getFolderUrl() { return driveFolderUrl; }
  function getFolderId()  { return folderId; }

  /* ── Data file ────────────────────────────────────── */
  async function loadDataFile() {
    await ensureFolder();
    const q   = encodeURIComponent(`name='${CONFIG.DATA_FILE_NAME}' and '${folderId}' in parents and trashed=false`);
    const res = await gfetch(`${API}/files?q=${q}&fields=files(id)`);
    if (!res.files || res.files.length === 0) { dataFileId = null; return null; }
    dataFileId = res.files[0].id;
    const content = await fetch(`${API}/files/${dataFileId}?alt=media`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    try { return await content.json(); } catch(e) { return null; }
  }

  async function saveDataFile(data) {
    await ensureFolder();
    const body = JSON.stringify(data, null, 2);
    if (dataFileId) {
      await fetch(`${UPLOAD}/files/${dataFileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body,
      });
    } else {
      const b   = 'lt_b';
      const meta = JSON.stringify({ name: CONFIG.DATA_FILE_NAME, parents: [folderId] });
      const mp  = `--${b}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${b}--`;
      const res  = await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${b}` },
        body: mp,
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
    const b = 'lt_b';
    if (existing.files && existing.files.length > 0) {
      await fetch(`${UPLOAD}/files/${existing.files[0].id}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'text/csv' },
        body: content,
      });
      return existing.files[0].id;
    }
    const meta = JSON.stringify({ name: filename, parents: [folderId] });
    const mp   = `--${b}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n--${b}\r\nContent-Type: text/csv\r\n\r\n${content}\r\n--${b}--`;
    const res  = await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${b}` },
      body: mp,
    });
    const json = await res.json();
    return json.id;
  }

  async function listCSVFiles() {
    await ensureFolder();
    const q   = encodeURIComponent(`'${folderId}' in parents and name contains '.csv' and trashed=false`);
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
