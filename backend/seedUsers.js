// backend/seedUsers.js
// Comprehensive data seeding script for BulSU Gate System
// Run this script once to populate your Firebase database with complete test data
// Usage: node seedUsers.js

const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

// Replace with your actual Firebase service account key
const serviceAccount = require('./config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://bulsugatesystem-default-rtdb.firebaseio.com/' // Replace with your Firebase URL
});

const db = admin.database();

// Sample data arrays
const campusesData = [
  {
    campusId: 'MAIN-001',
    name: 'Main Campus - San Jose',
    location: 'San Jose, Bulacan',
    address: 'San Jose City, Bulacan, Philippines',
    contactPerson: 'Dr. Maria Santos',
    contactNumber: '+63 123 456 7890',
    status: 'active'
  },
  {
    campusId: 'HSI-001',
    name: 'HSI Campus - San Jose',
    location: 'San Jose, Bulacan',
    address: 'Higher Studies Institute, San Jose City, Bulacan',
    contactPerson: 'Prof. Antonio Reyes',
    contactNumber: '+63 123 456 7891',
    status: 'active'
  },
  {
    campusId: 'MEN-001',
    name: 'Malolos Campus',
    location: 'Malolos, Bulacan',
    address: 'Malolos City, Bulacan, Philippines',
    contactPerson: 'Dr. Elena Cruz',
    contactNumber: '+63 123 456 7892',
    status: 'active'
  }
];

const gatesData = [
  // Main Campus Gates
  { gateId: 'GATE-Main-Entrance', name: 'Main Entrance', campusId: 'MAIN-001', type: 'entrance', ipAddress: '192.168.1.10', location: 'University Boulevard' },
  { gateId: 'GATE-Main-Back', name: 'Back Exit', campusId: 'MAIN-001', type: 'exit', ipAddress: '192.168.1.11', location: 'Behind Library' },
  { gateId: 'GATE-Main-Service', name: 'Service Gate', campusId: 'MAIN-001', type: 'service', ipAddress: '192.168.1.12', location: 'Service Area' },

  // HSI Campus Gates
  { gateId: 'GATE-HSI-Front', name: 'HSI Main Gate', campusId: 'HSI-001', type: 'normal', ipAddress: '192.168.2.10', location: 'Front Entrance' },
  { gateId: 'GATE-HSI-Side', name: 'HSI Side Gate', campusId: 'HSI-001', type: 'service', ipAddress: '192.168.2.11', location: 'Residential Area' },

  // Malolos Campus Gates
  { gateId: 'GATE-Men-Main', name: 'Malolos Main Gate', campusId: 'MEN-001', type: 'normal', ipAddress: '192.168.3.10', location: 'City Center' },
  { gateId: 'GATE-Men-Parking', name: 'Malolos Parking Entrance', campusId: 'MEN-001', type: 'entrance', ipAddress: '192.168.3.11', location: 'Parking Area' }
];

const studentsData = [
  // Main Campus Students
  { userId: 'STUDENT-001', firstName: 'Juan', lastName: 'Dela Cruz', email: 'juandc@bulsu.edu.ph', username: 'student001', studentNumber: '2021-00101', program: 'BSIT-WMAD', yearLevel: 3, section: '3A', campusId: 'MAIN-001', studentDepartment: 'CICT' },
  { userId: 'STUDENT-002', firstName: 'Maria', lastName: 'Santos', email: 'mariasantos@bulsu.edu.ph', username: 'student002', studentNumber: '2021-00102', program: 'BSIT-WMMD', yearLevel: 3, section: '3B', campusId: 'MAIN-001', studentDepartment: 'CICT' },
  { userId: 'STUDENT-003', firstName: 'Pedro', lastName: 'Garcia', email: 'pedrogarcia@bulsu.edu.ph', username: 'student003', studentNumber: '2021-00103', program: 'BSIT-WNET', yearLevel: 2, section: '2A', campusId: 'MAIN-001', studentDepartment: 'CICT' },
  { userId: 'STUDENT-004', firstName: 'Ana', lastName: 'Reyes', email: 'anareyes@bulsu.edu.ph', username: 'student004', studentNumber: '2021-00104', program: 'BS Psychology', yearLevel: 4, section: '4A', campusId: 'MAIN-001', studentDepartment: 'Psychology' },
  { userId: 'STUDENT-005', firstName: 'Carlos', lastName: 'Mendoza', email: 'carlosmendoza@bulsu.edu.ph', username: 'student005', studentNumber: '2021-00105', program: 'BS Biology', yearLevel: 2, section: '2B', campusId: 'MAIN-001', studentDepartment: 'Science' },

  // HSI Campus Students
  { userId: 'STUDENT-006', firstName: 'Isabella', lastName: 'Torres', email: 'isabellatorres@bulsu.edu.ph', username: 'student006', studentNumber: '2021-00106', program: 'MA Education', yearLevel: 1, section: '1A', campusId: 'HSI-001', studentDepartment: 'Education' },
  { userId: 'STUDENT-007', firstName: 'Roberto', lastName: 'Luna', email: 'robertoluna@bulsu.edu.ph', username: 'student007', studentNumber: '2021-00107', program: 'MS Mathematics', yearLevel: 1, section: '1B', campusId: 'HSI-001', studentDepartment: 'Mathematics' },

  // Malolos Campus Students
  { userId: 'STUDENT-008', firstName: 'Elena', lastName: 'Vargas', email: 'elenavargas@bulsu.edu.ph', username: 'student008', studentNumber: '2021-00108', program: 'BSBADMA', yearLevel: 3, section: '3A', campusId: 'MEN-001', studentDepartment: 'Business Administration' },
  { userId: 'STUDENT-009', firstName: 'Miguel', lastName: 'Ramos', email: 'miguelramos@bulsu.edu.ph', username: 'student009', studentNumber: '2021-00109', program: 'BS Accountancy', yearLevel: 2, section: '2B', campusId: 'MEN-001', studentDepartment: 'Business Administration' },
  { userId: 'STUDENT-010', firstName: 'Sofia', lastName: 'Hernandez', email: 'sofiahernandez@bulsu.edu.ph', username: 'student010', studentNumber: '2021-00110', program: 'BS Nursing', yearLevel: 4, section: '4A', campusId: 'MEN-001', studentDepartment: 'Nursing' }
];

const facultyData = [
  // Main Campus Faculty
  { userId: 'FACULTY-001', firstName: 'Dr. Ricardo', lastName: 'Dimabuyu', email: 'ricardodimabuyu@bulsu.edu.ph', username: 'faculty001', department: 'CICT', position: 'Dean', campusId: 'MAIN-001' },
  { userId: 'FACULTY-002', firstName: 'Prof. Carmen', lastName: 'Valdez', email: 'carmvalo@bulsu.edu.ph', username: 'faculty002', department: 'CICT', position: 'Associate Professor', campusId: 'MAIN-001' },
  { userId: 'FACULTY-003', firstName: 'Engr. Manuel', lastName: 'Cruz', email: 'manuelcruz@bulsu.edu.ph', username: 'faculty003', department: 'Engineering', position: 'Professor', campusId: 'MAIN-001' },
  { userId: 'FACULTY-004', firstName: 'Dr. Gloria', lastName: 'Prieto', email: 'glori.prieto@bulsu.edu.ph', username: 'faculty004', department: 'Psychology', position: 'Assistant Professor', campusId: 'MAIN-001' },

  // HSI Campus Faculty
  { userId: 'FACULTY-005', firstName: 'Dr. Rafael', lastName: 'Aquino', email: 'rafaelaquino@bulsu.edu.ph', username: 'faculty005', department: 'Education', position: 'Director', campusId: 'HSI-001' },
  { userId: 'FACULTY-006', firstName: 'Prof. Tessa', lastName: 'Baldwin', email: 'tessabaldwin@bulsu.edu.ph', username: 'faculty006', department: 'Mathematics', position: 'Associate Professor', campusId: 'HSI-001' },

  // Malolos Campus Faculty
  { userId: 'FACULTY-007', firstName: 'Dr. Michael', lastName: 'Gonzales', email: 'michaelgonzales@bulsu.edu.ph', username: 'faculty007', department: 'Business Administration', position: 'Chairperson', campusId: 'MEN-001' },
  { userId: 'FACULTY-008', firstName: 'Prof. Claire', lastName: 'Flores', email: 'claireflores@bulsu.edu.ph', username: 'faculty008', department: 'Nursing', position: 'Assistant Professor', campusId: 'MEN-001' }
];

const securityGuardsData = [
  // Main Campus Guards (with main campus privilege)
  { userId: 'GUARD-001', firstName: 'Jose', lastName: 'Morales', email: 'josemorales@bulsu.edu.ph', username: 'guard001', assignedGate: 'GATE-Main-Entrance', campusId: 'MAIN-001', mainCampusAccess: true },
  { userId: 'GUARD-002', firstName: 'Rosa', lastName: 'Palacio', email: 'rosapalacio@bulsu.edu.ph', username: 'guard002', assignedGate: 'GATE-Main-Back', campusId: 'MAIN-001', mainCampusAccess: true },
  { userId: 'GUARD-003', firstName: 'Fernando', lastName: 'Gutierrez', email: 'fernandogutierrez@bulsu.edu.ph', username: 'guard003', assignedGate: 'GATE-Main-Service', campusId: 'MAIN-001', mainCampusAccess: true },

  // HSI Campus Guards
  { userId: 'GUARD-004', firstName: 'Armando', lastName: 'Romero', email: 'armandoromero@bulsu.edu.ph', username: 'guard004', assignedGate: 'GATE-HSI-Front', campusId: 'HSI-001', mainCampusAccess: false },
  { userId: 'GUARD-005', firstName: 'Concepcion', lastName: 'Espinosa', email: 'concepcionespinosa@bulsu.edu.ph', username: 'guard005', assignedGate: 'GATE-HSI-Side', campusId: 'HSI-001', mainCampusAccess: false },

  // Malolos Campus Guards
  { userId: 'GUARD-006', firstName: 'Luis', lastName: 'Moreno', email: 'luismoreno@bulsu.edu.ph', username: 'guard006', assignedGate: 'GATE-Men-Main', campusId: 'MEN-001', mainCampusAccess: false },
  { userId: 'GUARD-007', firstName: 'Patricia', lastName: 'Ortega', email: 'patriciaortega@bulsu.edu.ph', username: 'guard007', assignedGate: 'GATE-Men-Parking', campusId: 'MEN-001', mainCampusAccess: false }
];

function generateAccessLogs() {
  const logs = [];
  const today = new Date();

  // Generate logs for last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    // Morning rush hour entries (8:00-10:00 AM)
    for (let j = 0; j < 50; j++) {
      const hour = Math.floor(Math.random() * 2) + 8; // 8-9 AM
      const minute = Math.floor(Math.random() * 60);
      const timestamp = new Date(date);
      timestamp.setHours(hour, minute, 0);

      const student = studentsData[Math.floor(Math.random() * studentsData.length)];
      const studentGates = gatesData.filter(gate => gate.campusId === student.campusId);
      const gate = studentGates[Math.floor(Math.random() * studentGates.length)];

      logs.push({
        logId: `LOG-${dateKey}-${j + 1}-ENTRY`,
        userId: student.userId,
        userName: `${student.firstName} ${student.lastName}`,
        userType: 'student',
        scanType: 'entry',
        gateId: gate.gateId,
        allowed: true,
        timestamp: timestamp.toISOString()
      });
    }

    // Morning exits (11:00 AM-1:00 PM)
    for (let j = 0; j < 30; j++) {
      const hour = Math.floor(Math.random() * 2) + 11; // 11 AM-12 PM
      const minute = Math.floor(Math.random() * 60);
      const timestamp = new Date(date);
      timestamp.setHours(hour, minute, 0);

      const student = studentsData[Math.floor(Math.random() * studentsData.length)];
      const studentGates = gatesData.filter(gate => gate.campusId === student.campusId);
      const gate = studentGates[Math.floor(Math.random() * studentGates.length)];

      logs.push({
        logId: `LOG-${dateKey}-${j + 51}-EXIT`,
        userId: student.userId,
        userName: `${student.firstName} ${student.lastName}`,
        userType: 'student',
        scanType: 'exit',
        gateId: gate.gateId,
        allowed: true,
        timestamp: timestamp.toISOString()
      });
    }

    // Faculty entries/leaves throughout day
    for (let j = 0; j < 80; j++) {
      const hour = Math.floor(Math.random() * 12) + 8; // 8 AM-7 PM
      const minute = Math.floor(Math.random() * 60);
      const timestamp = new Date(date);
      timestamp.setHours(hour, minute, 0);

      const faculty = facultyData[Math.floor(Math.random() * facultyData.length)];
      const facultyGates = gatesData.filter(gate => gate.campusId === faculty.campusId);
      const gate = facultyGates[Math.floor(Math.random() * facultyGates.length)];
      const scanType = Math.random() > 0.5 ? 'entry' : 'exit';

      logs.push({
        logId: `LOG-${dateKey}-${j + 81}-FACULTY`,
        userId: faculty.userId,
        userName: `${faculty.firstName} ${faculty.lastName}`,
        userType: 'faculty',
        scanType: scanType,
        gateId: gate.gateId,
        allowed: true,
        timestamp: timestamp.toISOString()
      });
    }

    // Some denied entries (violations)
    for (let j = 0; j < 5; j++) {
      const hour = Math.floor(Math.random() * 12) + 7; // 7 AM-6 PM
      const minute = Math.floor(Math.random() * 60);
      const timestamp = new Date(date);
      timestamp.setHours(hour, minute, 0);

      // Create a "visitor" who doesn't have access
      const visitorName = ['Carlos Silva', 'Ana Martinez', 'Juan Rodriguez', 'Luisa Fernandez', 'Miguel Torres'][j % 5];
      const randomGate = gatesData[Math.floor(Math.random() * gatesData.length)];

      logs.push({
        logId: `LOG-${dateKey}-${j + 161}-DENIED`,
        userId: `VISITOR-${j + 1}`,
        userName: visitorName,
        userType: 'visitor',
        scanType: 'entry',
        gateId: randomGate.gateId,
        allowed: false,
        timestamp: timestamp.toISOString()
      });
    }
  }

  return logs;
}

function generateViolations() {
  const violations = [];
  const today = new Date();

  // Generate violations for last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    // Different types of violations across campuses
    const violationTypes = [
      { type: 'Unauthorized Entry', notes: 'Attempted entry without valid credentials' },
      { type: 'Gate Hopping', notes: 'Attempted to enter through emergency exit' },
      { type: 'Expired ID', notes: 'Student ID has expired' },
      { type: 'Multiple Entry', notes: 'Attempted multiple entries without proper exit' },
      { type: 'Late Night Access', notes: 'Entry after campus curfew' },
      { type: 'Lost ID', notes: 'Entry with reported lost card' }
    ];

    for (let j = 0; j < 8; j++) {
      const hour = Math.floor(Math.random() * 14) + 7; // 7 AM-8 PM
      const minute = Math.floor(Math.random() * 60);
      const timestamp = new Date(date);
      timestamp.setHours(hour, minute, 0);

      const violation = violationTypes[j % violationTypes.length];
      const randomCampus = campusesData[Math.floor(Math.random() * campusesData.length)];
      const campusGates = gatesData.filter(gate => gate.campusId === randomCampus.campusId);
      const gate = campusGates[Math.floor(Math.random() * campusGates.length)];

      // Mix of students, visitors, and faculty violations
      let violatorData;
      const userType = Math.random();
      if (userType < 0.6) {
        // 60% students
        violatorData = studentsData.filter(s => s.campusId === randomCampus.campusId)[0] || studentsData[0];
      } else if (userType < 0.9) {
        // 30% visitors
        const visitorNames = ['Carlos Silva', 'Ana Martinez', 'Juan Rodriguez', 'Luisa Fernandez', 'Miguel Torres', 'Isabella Torres', 'Roberto Luna'];
        violatorData = {
          userId: `VISITOR-${j + 1}`,
          firstName: visitorNames[j % visitorNames.length].split(' ')[0],
          lastName: visitorNames[j % visitorNames.length].split(' ')[1],
          userType: 'visitor'
        };
      } else {
        // 10% faculty
        violatorData = facultyData.filter(f => f.campusId === randomCampus.campusId)[0] || facultyData[0];
      }

      violations.push({
        violationId: `VIOLATION-${dateKey}-${j + 1}`,
        visitorId: violatorData.userId,
        visitorName: `${violatorData.firstName} ${violatorData.lastName}`,
        userType: violatorData.userType || 'unknown',
        violationType: violation.type,
        violationNotes: violation.notes,
        scanType: 'entry',
        gateId: gate.gateId,
        campusId: randomCampus.campusId,
        timestamp: timestamp.toISOString()
      });
    }
  }

  return violations;
}

async function seedComprehensiveData() {
  console.log('🚀 Starting comprehensive BulSU Gate System data seeding...\n');

  try {
    // 1. Seed Campuses
    console.log('🏫 Seeding campuses...');
    for (const campus of campusesData) {
      const campusData = {
        ...campus,
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      };
      await db.ref(`campuses/${campus.campusId}`).set(campusData);
      console.log(`✓ Created campus: ${campus.name}`);
    }

    // 2. Seed Gates
    console.log('\n🚪 Seeding gates...');
    for (const gate of gatesData) {
      const gateData = {
        ...gate,
        description: `${gate.name} at ${gate.location}`,
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      };
      await db.ref(`gates/${gate.gateId}`).set(gateData);
      console.log(`✓ Created gate: ${gate.name} (${gate.campusId})`);
    }

    // 3. Seed Users (Students)
    console.log('\n🎓 Seeding students...');
    for (const student of studentsData) {
      const userData = {
        userId: student.userId,
        username: student.username,
        password: await bcrypt.hash(`${student.username}@2025`, 10), // student001@2025, etc.
        email: student.email,
        role: 'student',
        firstName: student.firstName,
        lastName: student.lastName,
        campusId: student.campusId,
        studentNumber: student.studentNumber,
        program: student.program,
        yearLevel: student.yearLevel,
        section: student.section,
        studentDepartment: student.studentDepartment,
        status: 'active',
        firstTimeLogin: true, // Force first-time password change
        createdAt: new Date().toISOString()
      };
      await db.ref(`users/${student.userId}`).set(userData);
      console.log(`✓ Created student: ${student.firstName} ${student.lastName} (${student.username})`);
    }

    // 4. Seed Users (Faculty)
    console.log('\n👨‍🏫 Seeding faculty...');
    for (const faculty of facultyData) {
      const userData = {
        userId: faculty.userId,
        username: faculty.username,
        password: await bcrypt.hash(`${faculty.username}@2025`, 10), // faculty001@2025, etc.
        email: faculty.email,
        role: 'faculty',
        firstName: faculty.firstName,
        lastName: faculty.lastName,
        campusId: faculty.campusId,
        department: faculty.department,
        position: faculty.position,
        status: 'active',
        firstTimeLogin: true, // Force first-time password change
        createdAt: new Date().toISOString()
      };
      await db.ref(`users/${faculty.userId}`).set(userData);
      console.log(`✓ Created faculty: ${faculty.firstName} ${faculty.lastName} (${faculty.position})`);
    }

    // 5. Seed Users (Security Guards)
    console.log('\n🛡️  Seeding security guards...');
    for (const guard of securityGuardsData) {
      const userData = {
        userId: guard.userId,
        username: guard.username,
        password: await bcrypt.hash(`${guard.username}@2025`, 10), // guard001@2025, etc.
        email: guard.email,
        role: 'guard',
        firstName: guard.firstName,
        lastName: guard.lastName,
        campusId: guard.campusId,
        assignedGate: guard.assignedGate,
        mainCampusAccess: guard.mainCampusAccess,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      await db.ref(`users/${guard.userId}`).set(userData);
      const access = guard.mainCampusAccess ? 'MAIN CAMPUS' : 'CAMPUS';
      console.log(`✓ Created guard: ${guard.firstName} ${guard.lastName} (${access} access)`);
    }

    // 6. Seed Admin User
    console.log('\n👑 Seeding admin user...');
    const adminData = {
      userId: 'ADMIN-001',
      username: 'admin',
      password: await bcrypt.hash('admin123', 10),
      email: 'admin@bulsu.edu.ph',
      role: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      status: 'active',
      createdAt: new Date().toISOString()
    };
    await db.ref(`users/${adminData.userId}`).set(adminData);
    console.log(`✓ Created admin: System Administrator`);

    // 7. Seed Access Logs (last 7 days)
    console.log('\n📊 Seeding access logs...');
    const accessLogs = generateAccessLogs();
    const logsByDate = {};

    accessLogs.forEach(log => {
      const dateKey = log.timestamp.split('T')[0].replace(/-/g, '-');
      if (!logsByDate[dateKey]) logsByDate[dateKey] = {};
      logsByDate[dateKey][log.logId] = log;
    });

    for (const [dateKey, logs] of Object.entries(logsByDate)) {
      await db.ref(`accessLogs/${dateKey}`).set(logs);
    }
    console.log(`✓ Created ${accessLogs.length} access logs across 7 days`);

    // 8. Seed Violations (last 7 days)
    console.log('\n⚠️  Seeding violations...');
    const violations = generateViolations();
    const violationsByDate = {};

    violations.forEach(violation => {
      const dateKey = violation.timestamp.split('T')[0].replace(/-/g, '-');
      if (!violationsByDate[dateKey]) violationsByDate[dateKey] = {};
      violationsByDate[dateKey][violation.violationId] = violation;
    });

    for (const [dateKey, violationSet] of Object.entries(violationsByDate)) {
      await db.ref(`violations/${dateKey}`).set(violationSet);
    }
    console.log(`✓ Created ${violations.length} violations across 7 days`);

    console.log('\n🎉 BulSU Gate System database seeding completed successfully!');
    console.log('\n🔐 LOGIN CREDENTIALS:');
    console.log('='.repeat(60));
    console.log('ADMIN:');
    console.log('  Username: admin | Password: admin123');
    console.log('');
    console.log('STUDENTS (Main Campus):');
    studentsData.slice(0, 3).forEach(student => {
      console.log(`  ${student.username}: ${student.username}@2025`);
    });
    console.log('');
    console.log('FACULTY (Various Campuses):');
    facultyData.slice(0, 3).forEach(faculty => {
      console.log(`  ${faculty.username}: ${faculty.username}@2025`);
    });
    console.log('');
    console.log('SECURITY GUARDS:');
    console.log('  guard001: guard001@2025 (Main Campus - All Access)');
    console.log('  guard002: guard002@2025 (Main Campus - All Access)');
    console.log('  guard004: guard004@2025 (HSI Campus)');
    console.log('  guard006: guard006@2025 (Malolos Campus)');
    console.log('='.repeat(60));
    console.log('');
    console.log('📊 SYSTEM OVERVIEW:');
    console.log(`🏫 ${campusesData.length} Campuses: ${campusesData.map(c => c.name).join(', ')}`);
    console.log(`🚪 ${gatesData.length} Gates across all campuses`);
    console.log(`🎓 ${studentsData.length} Students enrolled`);
    console.log(`👨‍🏫 ${facultyData.length} Faculty members`);
    console.log(`🛡️  ${securityGuardsData.length} Security guards (3 with main campus access)`);
    console.log(`📈 ${accessLogs.length} Access logs for last 7 days`);
    console.log(`⚠️  ${violations.length} Security violations tracked`);
    console.log('');
    console.log('✅ Ready for testing! Visit http://localhost:3000');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

seedComprehensiveData();
