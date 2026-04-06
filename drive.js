/* ── drive.js — Google Drive API layer ───────────────
   Handles all OAuth and Drive file operations.
   The app only ever touches files inside its own folder
   (scope: drive.file), so no other Drive content is
   accessible to LabTrack.
   ───────────────────────────────────────────────────── */

const Drive = (() => {
  let tokenClient = null;
  let accessToken = null;
  let folderId = null;
  let dataFileId = null;
  let driveFolderUrl = null;

  /* ── Init ─────────────────────────────────────────── */
  async function init() {
    return new Promise((resolve, reject) => {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            apiKey: CONFIG.API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          });
          resolve();
        } catch(e) { reject(e); }
      });
    });
  }

  function initTokenClient(callback) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: CONFIG.SCOPES,
      callback: async (resp) => {
        if (resp.error) { callback(null, resp.error); return; }
        accessToken = resp.access_token;
        gapi.client.setToken({ access_token: accessToken });
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
      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  function signOut() {
    if (accessToken) {
      google.accounts.oauth2.revoke(accessToken, () => {});
    }
    accessToken = null;
    folderId = null;
    dataFileId = null;
    gapi.client.setToken(null);
  }

  function isSignedIn() { return !!accessToken; }

  /* ── Folder management ────────────────────────────── */
  async function ensureFolder() {
    if (folderId) return folderId;

    // Search for existing folder
    const res = await gapi.client.drive.files.list({
      q: `name='${CONFIG.DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id,name,webViewLink)',
      spaces: 'drive',
    });

    if (res.result.files.length > 0) {
      folderId = res.result.files[0].id;
      driveFolderUrl = res.result.files[0].webViewLink;
      return folderId;
    }

    // Create folder
    const create = await gapi.client.drive.files.create({
      resource: {
        name: CONFIG.DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id,webViewLink',
    });

    folderId = create.result.id;
    driveFolderUrl = create.result.webViewLink;
    return folderId;
  }

  function getFolderUrl() { return driveFolderUrl; }
  function getFolderId() { return folderId; }

  /* ── Data file (labtrack-data.json) ───────────────── */
  async function loadDataFile() {
    await ensureFolder();

    // Find existing data file
    const res = await gapi.client.drive.files.list({
      q: `name='${CONFIG.DATA_FILE_NAME}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id)',
    });

    if (res.result.files.length === 0) {
      dataFileId = null;
      return null;
    }

    dataFileId = res.result.files[0].id;

    // Download contents
    const content = await gapi.client.drive.files.get({
      fileId: dataFileId,
      alt: 'media',
    });

    try {
      return JSON.parse(content.body);
    } catch(e) {
      return null;
    }
  }

  async function saveDataFile(data) {
    await ensureFolder();
    const body = JSON.stringify(data, null, 2);

    if (dataFileId) {
      // Update existing file
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${dataFileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body,
      });
    } else {
      // Create new file
      const meta = { name: CONFIG.DATA_FILE_NAME, parents: [folderId] };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
      form.append('file', new Blob([body], { type: 'application/json' }));

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: form,
      });
      const json = await res.json();
      dataFileId = json.id;
    }
  }

  async function deleteDataFile() {
    if (!dataFileId) return;
    await gapi.client.drive.files.delete({ fileId: dataFileId });
    dataFileId = null;
  }

  /* ── CSV file upload to Drive ─────────────────────── */
  async function uploadCSV(filename, content) {
    await ensureFolder();

    // Check if a file with this name already exists in the folder
    const existing = await gapi.client.drive.files.list({
      q: `name='${filename}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id)',
    });

    const meta = { name: filename, parents: [folderId] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'text/csv' }));

    if (existing.result.files.length > 0) {
      // Update existing (remove parent metadata for update)
      const existingId = existing.result.files[0].id;
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: (() => {
          const f = new FormData();
          f.append('metadata', new Blob([JSON.stringify({ name: filename })], { type: 'application/json' }));
          f.append('file', new Blob([content], { type: 'text/csv' }));
          return f;
        })(),
      });
      return existingId;
    }

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      body: form,
    });
    const json = await res.json();
    return json.id;
  }

  /* ── List CSV files in the LabTrack folder ────────── */
  async function listCSVFiles() {
    await ensureFolder();
    const res = await gapi.client.drive.files.list({
      q: `'${folderId}' in parents and name contains '.csv' and trashed=false`,
      fields: 'files(id,name,modifiedTime)',
      orderBy: 'modifiedTime desc',
    });
    return res.result.files || [];
  }

  return {
    init, signIn, signOut, isSignedIn,
    ensureFolder, getFolderUrl, getFolderId,
    loadDataFile, saveDataFile, deleteDataFile,
    uploadCSV, listCSVFiles,
  };
})();
