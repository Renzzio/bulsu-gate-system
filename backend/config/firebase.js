// backend/config/firebase.js
// Firebase configuration for BulSU Gate System
const admin = require('firebase-admin');

// Replace this path with your actual Firebase service account key file
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://webappprojectfirebase-default-rtdb.firebaseio.com/' // Replace with your Firebase project URL
});

const db = admin.database();

/*
FIREBASE DATABASE INDEXES REQUIRED:

To optimize database performance and eliminate Firebase warnings,
add the following indexes to your Firebase Database Rules:

Go to Firebase Console → Database → Realtime Database → Rules

Add these indexes under the rules:

{
  "rules": {
    "users": {
      ".indexOn": ["username", "email", "role"]
    },
    "campuses": {
      ".indexOn": ["campusId"]
    },
    "gates": {
      ".indexOn": ["campusId", "gateId"]
    },
    // ... your existing security rules
  }
}

This will optimize queries that use:
- usersRef.orderByChild('username')
- usersRef.orderByChild('email')
- usersRef.orderByChild('role')
- gatesRef.orderByChild('campusId')
*/

module.exports = { admin, db };
