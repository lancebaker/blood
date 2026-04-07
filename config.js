/* ── config.js ────────────────────────────────────────
   Fill in your Google Cloud credentials here.
   See README.md for step-by-step setup instructions.
   ───────────────────────────────────────────────────── */

const CONFIG = {
  // From Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID
  CLIENT_ID: '475390764115-v3588flr9668gt9s0pqmoq31gjc2oepv.apps.googleusercontent.com',

  // The Drive API key (used for non-auth requests)
    API_KEY: 'AIzaSyBlXuOdOjyXYXkGMzIvet4OAsuqxexe8Sw',

  // OAuth scopes — drive.file means the app can ONLY see files it creates
  SCOPES: 'https://www.googleapis.com/auth/drive.file',

  // Name of the folder that will be created in the user's Drive root
  DRIVE_FOLDER_NAME: 'LabTrack',

  // Name of the JSON file that stores parsed lab data
  DATA_FILE_NAME: 'labtrack-data.json',
};
