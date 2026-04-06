/* ── drive.js — Google Drive API layer ───────────────
   Uses direct fetch() calls against the Drive REST API
   rather than gapi.client.drive, which is more reliable
   in static hosting environments.
   ───────────────────────────────────────────────────── */

const Drive = (() => {
  let tokenClient = null;
  let accessToken = null;
  let folderId = null;
  let dataFileId = null;
  let driveFolderUrl = null;

  const API = 'https://www.googleapis.com/drive/v3';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

  /* ── Authenticated fetch helper ───────────────────── */
  async function gfetch(url, opts = {}) {
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

  /* ── Init ─────────────────────────────────────────── */
  async function init() {
    return new Promise((resolve) => {
      if (typeof gapi !== 'undefined') { resolve(); return; }
      const check = setInterval(() => {
        if (typeof gapi !== 'undefined') { clearInterval(check); resolve(); }
      }, 100);
    });
  }

  /* ── Auth ─────────────────────────────────────────── */
  function initTokenClient(callback) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: CONFIG.SCOPES,
      callback: (resp) => {
        if (resp.error) { callback(null, resp.error); return; }
        accessToken = resp.access_token;
        callback(resp.access_token, null);
      },
    });
  }

  async function signIn() {
    return new Promise((resolve, reject) => {
      initTokenClient((token, err) => {
        if (err) reject(new Error(err));
        else resolve(token);
      });
      tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  function signOut() {
    if (accessToken) google.accounts.oauth2.revoke(accessToken, () => {});
    accessToken = null;
    folderId = null;
    dataFileId = null;
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
    uploadCSV, listCSVFiles,
  };
})();
