const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

// Collection name constants — change here if Firestore collection names change
const COLLECTIONS = {
  SPACES: 'spaces',        // main workspaces/spaces collection (Flutter app uses 'spaces')
  USERS: 'users',
  BOOKINGS: 'bookings',
  PROVIDERS: 'providers',
  REVIEWS: 'reviews',
};

module.exports = { admin, db, auth, COLLECTIONS };
