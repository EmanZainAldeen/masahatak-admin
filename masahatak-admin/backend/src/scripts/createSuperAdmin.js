require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { db, admin } = require('../config/firebase');

const EMAIL = 'superadmin@masahatak.com';
const PASSWORD = 'Admin@123456';
const FULL_NAME = 'Super Admin';

async function run() {
  let uid;

  // 1. Create or update in Firebase Auth
  try {
    const existing = await admin.auth().getUserByEmail(EMAIL);
    uid = existing.uid;
    await admin.auth().updateUser(uid, { password: PASSWORD, displayName: FULL_NAME });
    console.log('Updated Firebase Auth user:', uid);
  } catch {
    const newUser = await admin.auth().createUser({ email: EMAIL, password: PASSWORD, displayName: FULL_NAME });
    uid = newUser.uid;
    console.log('Created Firebase Auth user:', uid);
  }

  // 2. Create or update in users collection
  await db.collection('users').doc(uid).set({
    uid,
    email: EMAIL,
    fullName: FULL_NAME,
    role: 'super_admin',
    status: 'active',
    phoneNumber: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  }, { merge: true });

  console.log('Done! Login with:');
  console.log('  Email:', EMAIL);
  console.log('  Password:', PASSWORD);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
