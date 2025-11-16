// backend/config/firebase.js (NEW VERSION)
const admin = require('firebase-admin');

// Import your downloaded service account key
const serviceAccount = require('./serviceAccountKey.json'); // Make sure path is correct

// Your database URL from the Firebase console
const DATABASE_URL = "https://webappprojectfirebase-default-rtdb.firebaseio.com/"; // !!! REPLACE THIS with your database URL

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: DATABASE_URL
  });
}

const db = admin.database();

// Export both 'db' (for Realtime Database) and 'admin' (for Messaging)
module.exports = { db, admin }