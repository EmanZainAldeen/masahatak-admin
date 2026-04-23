const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || !String(secret).trim()) {
    throw new Error('JWT_SECRET is missing');
  }
  return secret;
}

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, getJwtSecret());

    // Verify user is admin from users collection
    const userDoc = await db.collection('users').doc(decoded.userId).get();
    const role = (userDoc.data()?.role || '').toLowerCase();

    if (!userDoc.exists || (role !== 'admin' && role !== 'super_admin')) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    req.admin = {
      id: decoded.userId,
      email: userDoc.data().email,
      role: userDoc.data().role,
    };

    next();
  } catch (error) {
    if (error.message === 'JWT_SECRET is missing') {
      return res.status(500).json({
        error: 'Server configuration error: JWT secret is not configured',
      });
    }

    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
