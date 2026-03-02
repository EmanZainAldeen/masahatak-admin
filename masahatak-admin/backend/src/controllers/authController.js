const jwt = require('jsonwebtoken');
const { db, admin } = require('../config/firebase');

// Firebase Web API key (for REST auth)
const FIREBASE_API_KEY = 'AIzaSyAAtRYqL1K7U2rOgZIl5Jkm6D1TCrjZIcA';

// Helper: sign in via Firebase Auth REST API
async function firebaseSignIn(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || 'Invalid credentials');
  return data; // { localId, email, idToken, ... }
}

// Admin login — يتحقق عبر Firebase Auth ثم يتأكد أن الدور admin
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. تحقق من كلمة المرور عبر Firebase Auth
    let firebaseUser;
    try {
      firebaseUser = await firebaseSignIn(email, password);
    } catch {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const uid = firebaseUser.localId;

    // 2. تحقق أن المستخدم أدمن من users collection
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const role = (userData.role || '').toLowerCase();

    if (role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    // 3. أنشئ JWT token
    const token = jwt.sign(
      { userId: uid, email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: uid,
        email,
        fullName: userData.fullName || userData.full_name || 'Admin',
        role: userData.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// Get current admin profile
exports.getProfile = async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.admin.id).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const userData = userDoc.data();

    res.json({
      success: true,
      admin: {
        id: userDoc.id,
        email: userData.email,
        fullName: userData.fullName || userData.full_name || 'Admin',
        role: userData.role,
        phone: userData.phoneNumber || userData.phone || '',
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update current admin profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;
    const adminId = req.admin.id;

    const updateData = { updatedAt: new Date() };
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phoneNumber = phone;

    await db.collection('users').doc(adminId).update(updateData);

    // تحديث Firebase Auth email إذا تغير
    if (email) {
      await admin.auth().updateUser(adminId, { email });
    }

    const userDoc = await db.collection('users').doc(adminId).get();
    const userData = userDoc.data();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      admin: {
        id: adminId,
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Change admin password — يحدّث كلمة المرور في Firebase Auth
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.admin.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // تحقق من كلمة المرور الحالية
    const userDoc = await db.collection('users').doc(adminId).get();
    const email = userDoc.data()?.email;
    try {
      await firebaseSignIn(email, currentPassword);
    } catch {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // حدّث كلمة المرور في Firebase Auth
    await admin.auth().updateUser(adminId, { password: newPassword });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
