// backend/seedData.js
// Run this script to add sample access logs, violations, and schedules
// Usage: node seedData.js

const admin = require('firebase-admin');

// Replace with your actual Firebase service account key
const serviceAccount = require('./config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://bulsugatesystem-default-rtdb.firebaseio.com/'
});

const db = admin.database();

async function seedData() {
  console.log('Starting data seeding process...\n');

  try {
    // Sample Access Logs
    const accessLogs = [];
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Generate logs for the past 7 days
    for (let i = 0; i < 50; i++) {
      const randomDaysAgo = Math.floor(Math.random() * 7);
      const timestamp = now - (randomDaysAgo * oneDayMs) - Math.floor(Math.random() * oneDayMs);
      
      const types = ['entry', 'exit'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      const statuses = ['approved', 'approved', 'approved', 'denied'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      const users = [
        { id: 'student001', name: 'Jane Smith' },
        { id: 'student_1730906094267', name: 'Test Student' },
        { id: 'faculty001', name: 'John Doe' }
      ];
      const user = users[Math.floor(Math.random() * users.length)];

      accessLogs.push({
        timestamp,
        userId: user.id,
        userName: user.name,
        type,
        status,
        gate: 'Main Gate',
        details: status === 'denied' ? 'Access denied - outside scheduled hours' : 'Access granted'
      });
    }

    // Save access logs
    for (const log of accessLogs) {
      const logId = `log_${log.timestamp}_${Math.random().toString(36).substr(2, 9)}`;
      await db.ref(`accessLogs/${logId}`).set(log);
    }
    console.log(`✓ Created ${accessLogs.length} access logs`);

    // Sample Violations
    const violations = [
      {
        timestamp: now - (2 * oneDayMs),
        userId: 'student001',
        userName: 'Jane Smith',
        type: 'Unauthorized Exit',
        severity: 'high',
        status: 'active',
        gate: 'Main Gate',
        details: 'Attempted exit during class hours without permission'
      },
      {
        timestamp: now - (5 * oneDayMs),
        userId: 'student_1730906094267',
        userName: 'Test Student',
        type: 'No Schedule Found',
        severity: 'medium',
        status: 'resolved',
        gate: 'Side Gate',
        details: 'Entry attempted with no registered schedule'
      },
      {
        timestamp: now - oneDayMs,
        userId: 'student001',
        userName: 'Jane Smith',
        type: 'Multiple Entry Attempts',
        severity: 'low',
        status: 'dismissed',
        gate: 'Main Gate',
        details: 'Multiple QR scans detected within 5 minutes'
      }
    ];

    for (const violation of violations) {
      const violationId = `violation_${violation.timestamp}`;
      await db.ref(`violations/${violationId}`).set(violation);
    }
    console.log(`✓ Created ${violations.length} violations`);

    // Sample Schedules
    const schedules = [
      {
        userId: 'student001',
        subject: 'IT 305 - Advanced Web Development',
        day: 'Monday',
        startTime: '07:00',
        endTime: '10:00',
        room: 'Room 301',
        section: '3H',
        instructor: 'Prof. Juan Dela Cruz',
        createdAt: new Date().toISOString()
      },
      {
        userId: 'student001',
        subject: 'IT 306 - Database Management',
        day: 'Monday',
        startTime: '13:00',
        endTime: '16:00',
        room: 'Room 302',
        section: '3H',
        instructor: 'Prof. Maria Santos',
        createdAt: new Date().toISOString()
      },
      {
        userId: 'student001',
        subject: 'IT 307 - Software Engineering',
        day: 'Tuesday',
        startTime: '09:00',
        endTime: '12:00',
        room: 'Room 303',
        section: '3H',
        instructor: 'Prof. Pedro Reyes',
        createdAt: new Date().toISOString()
      },
      {
        userId: 'student001',
        subject: 'IT 308 - Mobile Development',
        day: 'Wednesday',
        startTime: '07:00',
        endTime: '10:00',
        room: 'Room 304',
        section: '3H',
        instructor: 'Prof. Ana Garcia',
        createdAt: new Date().toISOString()
      }
    ];

    for (const schedule of schedules) {
      const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.ref(`schedules/${scheduleId}`).set(schedule);
      // Small delay to ensure unique timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    console.log(`✓ Created ${schedules.length} schedules`);

    console.log('\n✅ All sample data seeded successfully!');
    console.log('\nSummary:');
    console.log('==================');
    console.log(`Access Logs: ${accessLogs.length}`);
    console.log(`Violations: ${violations.length}`);
    console.log(`Schedules: ${schedules.length}`);
    console.log('==================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();