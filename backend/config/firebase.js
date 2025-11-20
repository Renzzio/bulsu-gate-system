// backend/config/firebase.js (NEW VERSION)
const admin = require('firebase-admin');

// Import your downloaded service account key
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY); // Make sure path is correct

// Your database URL from the Firebase console

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

const db = admin.database();

// Export both 'db' (for Realtime Database) and 'admin' (for Messaging)
module.exports = { db, admin }