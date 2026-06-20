const admin = require("firebase-admin");
const {getAuth} = require("firebase-admin/auth")

admin.initializeApp({
    credential: admin.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
});

const auth = getAuth();

module.exports = {admin, auth}