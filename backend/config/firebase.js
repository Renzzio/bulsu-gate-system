// backend/config/firebase.js
const admin = require('firebase-admin');

// Replace this path with your actual Firebase service account key file
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://bulsugatesystem-default-rtdb.firebaseio.com/' // Replace with your Firebase project URL
});

const db = admin.database();

module.exports = { admin, db };