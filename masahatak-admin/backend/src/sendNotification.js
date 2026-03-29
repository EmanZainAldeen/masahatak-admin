const admin = require("./firebase");

async function sendNotification(token, title, body) {
  try {
    await admin.messaging().send({
      token,
      notification: {
        title,
        body,
      },
    });

    console.log("Notification sent ✅");
  } catch (e) {
    console.error("Error sending notification:", e);
  }
}

module.exports = sendNotification;
