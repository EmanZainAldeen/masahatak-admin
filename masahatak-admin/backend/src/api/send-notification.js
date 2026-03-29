import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "masahatak-73bf9",
      clientEmail: "firebase-adminsdk-fbsvc@masahatak-73bf9.iam.gserviceaccount.com",
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req, res) {
  const { token, title, body } = req.body;

  try {
    await admin.messaging().send({
      token,
      notification: {
        title,
        body,
      },
    });

    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
}
