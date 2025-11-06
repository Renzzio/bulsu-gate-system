// backend/seedUsers.js
// Run this script once to populate your Firebase database with initial users
// Usage: node seedUsers.js

const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

// Replace with your actual Firebase service account key
const serviceAccount = require('./config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://your-project-id.firebaseio.com' // Replace with your Firebase URL
});

const db = admin.database();

async function seedUsers() {
  console.log('Starting user seeding process...\n');

  const users = [
    {
      userId: 'admin001',
      username: 'admin',
      password: await bcrypt.hash('admin123', 10),
      email: 'admin@bulsu.edu.ph',
      role: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      userId: 'faculty001',
      username: 'faculty',
      password: await bcrypt.hash('faculty123', 10),
      email: 'faculty@bulsu.edu.ph',
      role: 'faculty',
      firstName: 'John',
      lastName: 'Doe',
      department: 'CICT',
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      userId: 'security001',
      username: 'security',
      password: await bcrypt.hash('security123', 10),
      email: 'security@bulsu.edu.ph',
      role: 'security',
      firstName: 'Guard',
      lastName: 'One',
      gateAssignment: 'Main Gate',
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      userId: 'student001',
      username: 'student',
      password: await bcrypt.hash('student123', 10),
      email: 'student@bulsu.edu.ph',
      role: 'student',
      firstName: 'Jane',
      lastName: 'Smith',
      studentNumber: '2021-12345',
      program: 'BSIT-WMAD',
      yearLevel: 3,
      section: '3H',
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ];

  try {
    for (const user of users) {
      await db.ref(`users/${user.userId}`).set(user);
      console.log(`✓ Created ${user.role}: ${user.username}`);
    }

    console.log('\n✅ All users seeded successfully!');
    console.log('\nLogin Credentials:');
    console.log('==================');
    console.log('Admin    - username: admin    | password: admin123');
    console.log('Faculty  - username: faculty  | password: faculty123');
    console.log('Security - username: security | password: security123');
    console.log('Student  - username: student  | password: student123');
    console.log('==================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();