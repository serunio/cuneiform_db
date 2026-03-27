const admin = require("firebase-admin");

const serviceAccount = require("./cunei-collector-firebase-adminsdk-fbsvc-5e2fa0323b.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

module.exports = admin