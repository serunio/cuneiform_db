const admin = require("firebase-admin");

const serviceAccount = require("./cunei-collector-firebase-adminsdk-fbsvc-1010dbebd5.json");


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

module.exports = admin