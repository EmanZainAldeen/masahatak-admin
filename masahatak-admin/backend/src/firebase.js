const admin = require("firebase-admin");

const serviceAccount = require("../masahatak-73bf9-firebase-adminsdk-fbsvc-ff6906f389.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
