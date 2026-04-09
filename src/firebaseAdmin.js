const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function resolveServiceAccountPath() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  return path.resolve(process.cwd(), 'serviceAccountKey.json');
}

function initFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountPath = resolveServiceAccountPath();

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(
      `Firebase service account key not found at: ${serviceAccountPath}. ` +
        'Set GOOGLE_APPLICATION_CREDENTIALS or place serviceAccountKey.json in project root.'
    );
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

initFirebaseAdmin();

const db = admin.firestore();
const messaging = admin.messaging();

module.exports = {
  admin,
  db,
  messaging,
  initFirebaseAdmin,
};
