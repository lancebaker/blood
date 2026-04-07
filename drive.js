/* ── drive.js — Google Drive API layer ───────────────
   Uses redirect-based OAuth (no popups) so it works
   on all browsers and devices without permission issues.
   Data stored in user's own Google Drive.
   ───────────────────────────────────────────────────── */

const Drive = (() => {
  let accessToken = null;
  let tokenExpiry = null;
  let folderId = null;
  let dataFileId = null;
  let driveFolderUrl = null;

  const API    = 'https://www.googleapis.com/drive/v3';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
  const TOKEN_KEY   = 'labtrack_token';
  const EXPIRY_KEY  = 'labtrack_expiry';
  const EMAIL_KEY   = 'labtrack_email';

  /* ── Token storage ────────────────────────────────── */
  function saveToken(token, expiresIn) {
    const expiry = Date.now() + (expiresIn * 1000) - 60000; // 1min buffer
    accessToken  = token;
    tokenExpiry  = expiry;
    localStorage.setItem(TOKEN_KEY,  token);
    localStorage.setItem(EXPIRY_KEY, expiry.toString());
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

  /* ── OAuth redirect flow ──────────────────────────── */
  // Step 1: redirect to Google
  function redirectToGoogle() {
    const params = new URLSearchParams({
      client_id:     CONFIG.CLIENT_ID,
      redirect_uri:  window.location.origin + window.location.pathname,
      response_type: 'token',
      scope:         CONFIG.SCOPES,
      include_granted_scopes: 'true',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  // Step 2: called on page load to check if we're returning from Google
  function handleRedirectCallback() {
    // Google returns the token in the URL hash fragment
    const hash = window.location.hash;
    if (!hash) return false;

    const params = new URLSearchParams(hash.substring(1)); // strip leading #
    const token      = params.get('access_token');
    const expiresIn  = parseInt(params.get('expires_in') || '3600', 10);
    const error      = params.get('error');

    // Clean the hash from the URL so refreshing doesn't re-trigger
    window.history.replaceState(null, '', window.location.pathname);

    if (error) {
      console.warn('OAuth error:', error);
      return false;
    }

    if (token) {
      saveToken(token, expiresIn);
      return true;
    }

    return false;
  }

  /* ── Init ─────────────────────────────────────────── */
  async function init() {
    // 1. Check if returning from Google OAuth redirect
    const fromRedirect = handleRedirectCallback();
    if (fromRedirect) return true; // has fresh token

    // 2. Check for valid stored token
    if (loadToken()) return true;

    // 3. No token — need sign-in
    return false;
  }

  /* ── Sign in — just redirects to Google ──────────── */
  function signIn() {
    redirectToGoogle();
    // This never resolves — the page navigates away
    return new Promise(() => {});
  }

  /* ── Sign out ─────────────────────────────────────── */
  function signOut() {
    // Revoke the token
    if (accessToken) {
      fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, { method: 'POST' })
        .catch(() => {});
    }
    clearToken();
    localStorage.removeItem(EMAIL_KEY);
  }

  function isSignedIn() { return !!accessToken && Date.now() < (tokenExpiry || 0); }

  /* ── User info ────────────────────────────────────── */
  async function getUserInfo() {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const info = await res.json();
      if (info.email) localStorage.setItem(EMAIL_KEY, info.email);
      return info;
    } catch(e) { return null; }
  }

  /* ── Folder management ────────────────────────────── */
  async function ensureFolder() {
    if (folderId) return folderId;
    const q   = encodeURIComponent(`name='${CONFIG.DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const res = await gfetch(`${API}/files?q=${q}&fields=files(id,name,webViewLink)&spaces=drive`);

    if (res.files && res.files.length > 0) {
      folderId       = res.files[0].id;
      driveFolderUrl = res.files[0].webViewLink;
      return folderId;
    }

    const created = await gfetch(`${API}/files?fields=id,webViewLink`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: CONFIG.DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
    });
    folderId       = created.id;
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
    const text = await content.text();
    try { return JSON.parse(text); } catch(e) { return null; }
  }

  async function saveDataFile(data) {
    await ensureFolder();
    const body = JSON.stringify(data, null, 2);

    if (dataFileId) {
      await fetch(`${UPLOAD}/files/${dataFileId}?uploadType=media`, {
        method:  'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body,
      });
    } else {
      const boundary = 'labtrack_b';
      const meta     = JSON.stringify({ name: CONFIG.DATA_FILE_NAME, parents: [folderId] });
      const mp       = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
      const res      = await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
        body:    mp,
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
    const boundary = 'labtrack_b';
    const q        = encodeURIComponent(`name='${filename}' and '${folderId}' in parents and trashed=false`);
    const existing = await gfetch(`${API}/files?q=${q}&fields=files(id)`);

    if (existing.files && existing.files.length > 0) {
      await fetch(`${UPLOAD}/files/${existing.files[0].id}?uploadType=media`, {
        method:  'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'text/csv' },
        body:    content,
      });
      return existing.files[0].id;
    }

    const meta = JSON.stringify({ name: filename, parents: [folderId] });
    const mp   = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: text/csv\r\n\r\n${content}\r\n--${boundary}--`;
    const res  = await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body:    mp,
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
