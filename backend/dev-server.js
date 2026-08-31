/**
 * Development Server Launcher with Auto In-Memory MongoDB Fallback
 * 
 * If a local/cloud MongoDB is unreachable at MONGO_URI, this launcher starts
 * MongoMemoryServer, automatically seeds Admin, Staff, Student accounts,
 * and 4 genuine demonstration complaints across multiple lifecycle stages.
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Complaint = require('./models/Complaint');

async function seedDemoData() {
  // 1. Seed Administrator and Staff
  let admin = await User.findOne({ email: 'admin@pccoepune.org' });
  if (!admin) {
    admin = await User.create({
      name: 'Campus Administrator',
      email: 'admin@pccoepune.org',
      password: 'Admin@12345',
      role: 'admin',
    });
    console.log('[DevServer] Seeded Admin account: admin@pccoepune.org / Admin@12345');
  }

  let staff = await User.findOne({ email: 'staff@pccoepune.org' });
  if (!staff) {
    staff = await User.create({
      name: 'Maintenance Staff Lead',
      email: 'staff@pccoepune.org',
      password: 'Staff@12345',
      role: 'staff',
    });
    console.log('[DevServer] Seeded Staff account: staff@pccoepune.org / Staff@12345');
  }

  // 2. Seed Student accounts
  let studentAarav = await User.findOne({ email: 'aarav.sharma@pccoepune.org' });
  if (!studentAarav) {
    studentAarav = await User.create({
      name: 'Aarav Sharma',
      email: 'aarav.sharma@pccoepune.org',
      studentId: '123B1B201',
      password: 'Student@12345',
      role: 'student',
    });
    console.log('[DevServer] Seeded Student account: aarav.sharma@pccoepune.org');
  }

  let studentNeha = await User.findOne({ email: 'neha.patil@pccoepune.org' });
  if (!studentNeha) {
    studentNeha = await User.create({
      name: 'Neha Patil',
      email: 'neha.patil@pccoepune.org',
      studentId: '123B1B202',
      password: 'Student@12345',
      role: 'student',
    });
    console.log('[DevServer] Seeded Student account: neha.patil@pccoepune.org');
  }

  // 3. Seed 4 Genuine Demonstration Complaints if none exist
  const complaintCount = await Complaint.countDocuments();
  if (complaintCount === 0) {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);

    const demoComplaints = [
      // 1. PENDING (Newly Submitted, Unassigned)
      {
        title: 'Ceiling Fan Regulators Loose in LH-302',
        description: 'Two ceiling fans in Lecture Hall 302 have malfunctioning wall speed switches. They cause sudden sparking when rotated and are stuck running only on maximum velocity.',
        category: 'Classroom Infrastructure',
        location: 'Academic Complex 2, 3rd Floor, Room LH-302',
        priority: 'MEDIUM',
        status: 'PENDING',
        createdBy: studentAarav._id,
        assignedTo: null,
        resolutionNotes: '',
        createdAt: oneHourAgo,
        updatedAt: oneHourAgo,
        statusHistory: [
          {
            status: 'PENDING',
            changedAt: oneHourAgo,
            changedBy: studentAarav._id,
            notes: 'Initial issue reported via student portal.',
          },
        ],
      },

      // 2. ASSIGNED (Reviewed and Assigned to Staff)
      {
        title: 'Master Switchboard MCB Trip in CAD Lab 104',
        description: 'The right-side circuit breaker MCB trips automatically as soon as 10 or more CAD workstations are powered on simultaneously. Lab sessions are interrupted.',
        category: 'Electrical',
        location: 'Mechanical Dept Building, Ground Floor, CAD Lab 104',
        priority: 'HIGH',
        status: 'ASSIGNED',
        createdBy: studentNeha._id,
        assignedTo: staff._id,
        resolutionNotes: '',
        createdAt: oneDayAgo,
        updatedAt: threeHoursAgo,
        statusHistory: [
          {
            status: 'PENDING',
            changedAt: oneDayAgo,
            changedBy: studentNeha._id,
            notes: 'Issue reported by student coordinator.',
          },
          {
            status: 'REVIEWED',
            changedAt: new Date(oneDayAgo.getTime() + 2 * 60 * 60 * 1000),
            changedBy: admin._id,
            notes: 'Verified priority level with department lab in-charge.',
          },
          {
            status: 'ASSIGNED',
            changedAt: threeHoursAgo,
            changedBy: admin._id,
            notes: 'Dispatched to electrical maintenance staff for distribution panel inspection.',
          },
        ],
      },

      // 3. IN_PROGRESS (Staff has accepted and started work)
      {
        title: 'Hostel Block B 2nd Floor Access Point Packet Loss',
        description: 'Wi-Fi AP Cisco-AP-B204 drops 70% ping packets intermittently. Academic portal and online lab submissions fail during evening study hours (6 PM - 10 PM).',
        category: 'Internet/WiFi',
        location: 'Boys Hostel Block B, 2nd Floor Corridor (near Room B-212)',
        priority: 'CRITICAL',
        status: 'IN_PROGRESS',
        createdBy: studentAarav._id,
        assignedTo: staff._id,
        resolutionNotes: '',
        createdAt: twoDaysAgo,
        updatedAt: oneHourAgo,
        statusHistory: [
          {
            status: 'PENDING',
            changedAt: twoDaysAgo,
            changedBy: studentAarav._id,
            notes: 'Ticket submitted with ping latency screenshots.',
          },
          {
            status: 'REVIEWED',
            changedAt: new Date(twoDaysAgo.getTime() + 4 * 60 * 60 * 1000),
            changedBy: admin._id,
            notes: 'Campus IT confirmed uplink flapping on switch port Gi0/14.',
          },
          {
            status: 'ASSIGNED',
            changedAt: oneDayAgo,
            changedBy: admin._id,
            notes: 'Assigned to field technician for PoE cable and patch panel testing.',
          },
          {
            status: 'IN_PROGRESS',
            changedAt: oneHourAgo,
            changedBy: staff._id,
            notes: 'Inspecting CAT6 RJ45 termination and testing with Fluke network analyzer.',
          },
        ],
      },

      // 4. RESOLVED (Completed with full notes and sign-off)
      {
        title: 'Flush Valve Leakage in Main Building 1st Floor Washroom',
        description: 'Continuous water drainage from the central flush valve in cubicle 3, causing puddle accumulation and persistent water wastage.',
        category: 'Plumbing',
        location: 'Main Administrative Building, 1st Floor East Wing Washroom',
        priority: 'MEDIUM',
        status: 'RESOLVED',
        createdBy: studentNeha._id,
        assignedTo: staff._id,
        resolutionNotes: 'Replaced worn rubber seal washer and calibrated the dual-flush brass cylinder assembly. Pressure tested with zero leaks detected over a 30-minute observation cycle.',
        createdAt: twoDaysAgo,
        updatedAt: threeHoursAgo,
        statusHistory: [
          {
            status: 'PENDING',
            changedAt: twoDaysAgo,
            changedBy: studentNeha._id,
            notes: 'Reported water leakage in east wing restroom.',
          },
          {
            status: 'REVIEWED',
            changedAt: new Date(twoDaysAgo.getTime() + 3 * 60 * 60 * 1000),
            changedBy: admin._id,
            notes: 'Acknowledged ticket and marked for immediate plumbing visit.',
          },
          {
            status: 'ASSIGNED',
            changedAt: new Date(twoDaysAgo.getTime() + 5 * 60 * 60 * 1000),
            changedBy: admin._id,
            notes: 'Assigned to plumbing staff team.',
          },
          {
            status: 'IN_PROGRESS',
            changedAt: oneDayAgo,
            changedBy: staff._id,
            notes: 'Turned off isolation valve and disassembled flush tank fittings.',
          },
          {
            status: 'RESOLVED',
            changedAt: threeHoursAgo,
            changedBy: staff._id,
            notes: 'Replaced worn rubber seal washer and calibrated the dual-flush brass cylinder assembly. Verified leak-free.',
          },
        ],
      },
    ];

    await Complaint.insertMany(demoComplaints);
    console.log(`[DevServer] Seeded ${demoComplaints.length} demonstration complaints across lifecycle stages.`);
  }
}

async function startDevServer() {
  const targetUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuscare';
  console.log(`[DevServer] Checking MongoDB availability at ${targetUri}...`);

  let mongod = null;
  let activeUri = targetUri;

  try {
    await mongoose.connect(targetUri, { serverSelectionTimeoutMS: 1500 });
    console.log(`[DevServer] Connected to external MongoDB successfully.`);
  } catch (err) {
    console.log(`[DevServer] External MongoDB offline (${err.message}).`);
    console.log(`[DevServer] Initializing embedded MongoMemoryServer for development...`);
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    activeUri = mongod.getUri();
    process.env.MONGO_URI = activeUri;
    await mongoose.connect(activeUri);
    console.log(`[DevServer] Connected to MongoMemoryServer at: ${activeUri}`);
  }

  // Seed demonstration data
  await seedDemoData();

  // Now boot the Express server
  const { app, server } = require('./server');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[DevServer] Shutting down server...');
    server.close();
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.exit(0);
  });
}

startDevServer().catch((err) => {
  console.error('[DevServer Fatal]', err);
  process.exit(1);
});
