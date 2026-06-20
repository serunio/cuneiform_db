const admin = require("firebase-admin");

// const serviceAccount = require("./cunei-collector-firebase-adminsdk-fbsvc-1010dbebd5.json");


// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
// });
console.log(admin);
console.log(admin.credential);
admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
});

module.exports = admin