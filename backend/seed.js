/**
 * CampusCare 2.0 Database Seeder Script
 * Idempotently seeds:
 * - 2 Admin Accounts
 * - 8 Specialized Staff Personnel (Electrical, Plumbing, Civil, IT, Cleaning, Security, Furniture, Lead)
 * - 12 Diverse Student Accounts
 * - 28 Realistic Campus Complaints across all statuses, priorities, and categories
 * - Discussion Comments, Timeline Events, In-App Notifications, and Feedback Ratings
 * 
 * Run using: `npm run seed` or `npm run seed:demo`
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Comment = require('./models/Comment');
const Notification = require('./models/Notification');
const SystemLock = require('./models/SystemLock');
const { evaluatePriority } = require('./services/priorityService');
const { calculateSlaDeadlines, computeSlaStatus } = require('./services/slaService');

dotenv.config();

const DEFAULT_PASSWORD = process.env.DEMO_PASSWORD || 'Password@123';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'Staff@12345';
const STUDENT_PASSWORD = process.env.STUDENT_PASSWORD || 'Student@12345';

const upsertUser = async ({ name, email, password, role, studentId = null }) => {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ name, email, password, role, studentId });
    console.log(`[Seed:User] Created ${role.toUpperCase()}: ${email}`);
  } else {
    user.name = name;
    user.password = password;
    user.role = role;
    if (studentId) user.studentId = studentId;
    await user.save();
    console.log(`[Seed:User] Synced ${role.toUpperCase()}: ${email}`);
  }
  return user;
};

const seedDemonstrationData = async () => {
  let mongod = null;
  try {
    let mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuscare';
    console.log(`[Seed] Connecting to MongoDB at: ${mongoUri}`);

    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
      console.log('[Seed] Database connected successfully.');
    } catch (connErr) {
      console.warn(`[Seed] Direct connection failed (${connErr.message}). Using MongoMemoryServer fallback for demo verification...`);
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      console.log(`[Seed] Connected to in-memory MongoDB at: ${mongoUri}`);
      await mongoose.connect(mongoUri);
    }

    // -------------------------------------------------------------
    // 1. Seed Administrators (2 accounts)
    // -------------------------------------------------------------
    const adminLead = await upsertUser({
      name: 'Campus Administrator',
      email: 'admin@pccoepune.org',
      password: ADMIN_PASSWORD,
      role: 'admin',
    });

    const adminDirector = await upsertUser({
      name: 'Dr. S. K. Deshmukh (Facility Director)',
      email: 'campus.director@pccoepune.org',
      password: ADMIN_PASSWORD,
      role: 'admin',
    });

    // -------------------------------------------------------------
    // 2. Seed Specialized Staff Members (8 accounts)
    // -------------------------------------------------------------
    const staffLead = await upsertUser({
      name: 'Ramesh Deshmukh (Facilities Lead)',
      email: 'staff@pccoepune.org',
      password: STAFF_PASSWORD,
      role: 'staff',
    });

    const staffElectrical = await upsertUser({
      name: 'Rajesh Kumar (Electrical)',
      email: 'staff.electrical@pccoepune.org',
      password: STAFF_PASSWORD,
      role: 'staff',
    });

    const staffPlumbing = await upsertUser({
      name: 'Suresh Patil (Plumbing)',
      email: 'staff.plumbing@pccoepune.org',
      password: STAFF_PASSWORD,
      role: 'staff',
    });

    const staffCivil = await upsertUser({
      name: 'Anil Shinde (Civil & Maintenance)',
      email: 'staff.civil@pccoepune.org',
      password: STAFF_PASSWORD,
      role: 'staff',
    });

    const staffIT = await upsertUser({
      name: 'Vikram Joshi (Network & IT Support)',
      email: 'staff.it@pccoepune.org',
      password: STAFF_PASSWORD,
      role: 'staff',
    });

    const staffCleaning = await upsertUser({
      name: 'Sunita Jadhav (Housekeeping)',
      email: 'staff.cleaning@pccoepune.org',
      password: STAFF_PASSWORD,
      role: 'staff',
    });

    const staffSecurity = await upsertUser({
      name: 'Mahesh Pawar (Security & Access)',
      email: 'staff.security@pccoepune.org',
      password: STAFF_PASSWORD,
      role: 'staff',
    });

    const staffFurniture = await upsertUser({
      name: 'Dinesh More (Carpentry & Furniture)',
      email: 'staff.furniture@pccoepune.org',
      password: STAFF_PASSWORD,
      role: 'staff',
    });

    // -------------------------------------------------------------
    // 3. Seed Students (12 accounts)
    // -------------------------------------------------------------
    const studentsData = [
      { name: 'Aarav Sharma', email: 'aarav.sharma@pccoepune.org', studentId: '123B1B201' },
      { name: 'Neha Patil', email: 'neha.patil@pccoepune.org', studentId: '123B1B202' },
      { name: 'Rohan Deshmukh', email: 'rohan.deshmukh@pccoepune.org', studentId: '123B1B203' },
      { name: 'Ananya Sharma', email: 'ananya.sharma@pccoepune.org', studentId: '123B1B204' },
      { name: 'Priya Kulkarni', email: 'priya.kulkarni@pccoepune.org', studentId: '123B1B205' },
      { name: 'Aditya Verma', email: 'aditya.verma@pccoepune.org', studentId: '123B1B206' },
      { name: 'Tanvi Joshi', email: 'tanvi.joshi@pccoepune.org', studentId: '123B1B207' },
      { name: 'Rahul Nair', email: 'rahul.nair@pccoepune.org', studentId: '123B1B208' },
      { name: 'Sneha Chavan', email: 'sneha.chavan@pccoepune.org', studentId: '123B1B209' },
      { name: 'Siddharth Mehta', email: 'siddharth.mehta@pccoepune.org', studentId: '123B1B210' },
      { name: 'Pooja Shinde', email: 'pooja.shinde@pccoepune.org', studentId: '123B1B211' },
      { name: 'Varun Gupta', email: 'varun.gupta@pccoepune.org', studentId: '123B1B212' },
    ];

    const students = [];
    for (const s of studentsData) {
      const student = await upsertUser({ ...s, password: STUDENT_PASSWORD, role: 'student' });
      students.push(student);
    }

    // -------------------------------------------------------------
    // 4. Reset & Seed 28 Realistic Campus Complaints
    // -------------------------------------------------------------
    await Complaint.deleteMany({});
    await Comment.deleteMany({});
    await Notification.deleteMany({});
    await SystemLock.deleteMany({});
    console.log('[Seed] Cleared existing complaints, comments, notifications, and system locks.');

    const now = Date.now();
    const hours = (h) => new Date(now - h * 60 * 60 * 1000);
    const days = (d) => new Date(now - d * 24 * 60 * 60 * 1000);

    const complaintsDefinitions = [
      // 1. PENDING
      {
        title: 'Ceiling Fan Regulators Loose in LH-302',
        description: 'Two ceiling fans in Lecture Hall 302 have malfunctioning wall speed switches causing sparking.',
        category: 'Classroom Infrastructure',
        location: 'Academic Complex 2, 3rd Floor, Room LH-302',
        priority: 'MEDIUM',
        status: 'PENDING',
        student: students[0],
        createdAt: hours(2),
      },
      // 2. PENDING
      {
        title: 'Water Cooler Filter Choked in Mechanical Workshop',
        description: 'Drinking water dispenser exhibits low discharge and cloudy water output near lathe machine bay.',
        category: 'Plumbing',
        location: 'Workshop Building, Ground Floor Water Station',
        priority: 'HIGH',
        student: students[1],
        createdAt: hours(5),
      },
      // 3. PENDING
      {
        title: 'Projector HDMI Audio Jack Broken in Audi-2',
        description: 'HDMI cable connector has bent ground shielding pins resulting in buzzing audio and blank display.',
        category: 'Equipment',
        location: 'Auditorium Complex, Ground Floor Audi-2',
        priority: 'LOW',
        student: students[2],
        createdAt: hours(10),
      },
      // 4. PENDING
      {
        title: 'Window Glass Latch Jammed in Girls Hostel C-304',
        description: 'North-facing window latch is misaligned, letting rain moisture penetrate into dorm study corner.',
        category: 'Hostel Maintenance',
        location: 'Girls Hostel Block C, 3rd Floor, Room 304',
        priority: 'MEDIUM',
        student: students[3],
        createdAt: hours(14),
      },
      // 5. PENDING
      {
        title: 'Flickering LED Batten Lights in Reading Hall 4',
        description: 'Three overhead LED lights produce rapid 50Hz strobe flicker during evening library hours.',
        category: 'Electrical',
        location: 'Central Library, 2nd Floor Quiet Reading Section',
        priority: 'LOW',
        student: students[4],
        createdAt: hours(18),
      },
      // 6. PENDING
      {
        title: 'Litter Accumulation Near Canteen Amphitheatre Steps',
        description: 'Dustbin overfilled with food packaging following campus festival rehearsal.',
        category: 'Cleanliness',
        location: 'Campus Quad, Amphitheatre West Staircase',
        priority: 'MEDIUM',
        student: students[5],
        createdAt: hours(22),
      },

      // 7. REVIEWED (Demo Scenario: Manually Overridden Priority by Administrator)
      {
        title: 'LAN Jack Termination Dislodged in High-Performance Computing Lab',
        description: 'Workstation Node-12 ethernet port wall faceplate pulled out with exposed CAT6 conductor pair.',
        category: 'Internet/WiFi',
        location: 'Computer Center, 4th Floor, HPC Research Lab',
        priority: 'HIGH',
        prioritySource: 'MANUAL',
        priorityReason: 'Administrative override: High-occupancy research cluster with active M.Tech capstone project evaluations.',
        status: 'REVIEWED',
        student: students[6],
        createdAt: hours(6),
      },
      // 8. REVIEWED
      {
        title: 'Damaged Hydraulic Lift Cylinder on Seminar Chairs',
        description: 'Four executive revolving chairs in conference room sink to lowest height under normal load.',
        category: 'Furniture',
        location: 'Administration Wing, 1st Floor Boardroom',
        priority: 'LOW',
        status: 'REVIEWED',
        student: students[7],
        createdAt: days(1),
      },
      // 9. REVIEWED
      {
        title: 'Biometric Turnstile Scanner Unresponsive at Gate 2',
        description: 'Student ID RFID card reader takes up to 8 seconds to register morning entry punches.',
        category: 'Other',
        location: 'Campus Perimeter, South Entry Turnstile Gate 2',
        priority: 'HIGH',
        status: 'REVIEWED',
        student: students[8],
        createdAt: days(2),
      },
      // 10. REVIEWED (Demo Scenario: Automatically Classified CRITICAL Hazard)
      {
        title: 'Water Stagnation Near Chemistry Lab Emergency Eye Wash',
        description: 'Drainage pipe has slight upward gradient causing water pooling around the safety station.',
        category: 'Plumbing',
        location: 'Science Block, 1st Floor Chemistry Lab 108',
        priority: 'CRITICAL',
        prioritySource: 'AUTOMATIC',
        priorityReason: 'Laboratory safety station hazard threatening eyewash accessibility.',
        status: 'REVIEWED',
        student: students[9],
        createdAt: days(2),
      },

      // 11. ASSIGNED (Demo Scenario: HIGH + AT_RISK SLA Warning)
      {
        title: 'Master Switchboard MCB Trip in CAD Lab 104',
        description: 'Circuit breaker trips when 10 or more CAD graphic workstations are switched on simultaneously.',
        category: 'Electrical',
        location: 'Mechanical Dept Building, Ground Floor, CAD Lab 104',
        priority: 'HIGH',
        prioritySource: 'AUTOMATIC',
        priorityReason: 'High facility impact disrupting computer graphics laboratory curriculum.',
        status: 'ASSIGNED',
        staff: staffElectrical,
        student: students[1],
        createdAt: hours(19), // 19h elapsed out of 24h target -> 5h remaining (< 25%) -> AT_RISK
        slaOverride: {
          status: 'AT_RISK',
          atRiskNotified: true,
        },
      },
      // 12. ASSIGNED (Demo Scenario: HIGH + BREACHED SLA)
      {
        title: 'Hostel Block A 3rd Floor Washroom Basin Clog',
        description: 'Two adjacent ceramic handwash basins have slow drainage with debris buildup in trap pipe.',
        category: 'Plumbing',
        location: 'Boys Hostel Block A, 3rd Floor East Restroom',
        priority: 'HIGH',
        prioritySource: 'AUTOMATIC',
        priorityReason: 'Sanitary plumbing issue in residential hostel wing.',
        status: 'ASSIGNED',
        staff: staffPlumbing,
        student: students[0],
        createdAt: hours(28), // 28h elapsed out of 24h target -> BREACHED by 4h
        slaOverride: {
          status: 'BREACHED',
          resolutionBreached: true,
          breachNotified: true,
        },
      },
      // 13. ASSIGNED
      {
        title: 'Broken Drafting Table T-Square Guide Rail',
        description: 'Architecture studio drafting board 14 has a loose aluminum parallel bar ruler.',
        category: 'Furniture',
        location: 'Design Studio 202, Architecture Wing',
        priority: 'LOW',
        status: 'ASSIGNED',
        staff: staffFurniture,
        student: students[2],
        createdAt: days(3),
      },
      // 14. ASSIGNED
      {
        title: 'Cracked Floor Tiles at Chemistry Lab Entrance',
        description: 'Ceramic entryway tile has fractured with sharp uneven edges, creating a tripping hazard.',
        category: 'Classroom Infrastructure',
        location: 'Science Block, Ground Floor Hallway outside Lab 102',
        priority: 'MEDIUM',
        status: 'ASSIGNED',
        staff: staffCivil,
        student: students[3],
        createdAt: days(4),
      },
      // 15. ASSIGNED
      {
        title: 'Hostel Block B 2nd Floor WiFi Packet Loss',
        description: 'Cisco AP drops ping packets during peak study hours between 7 PM and 10 PM.',
        category: 'Internet/WiFi',
        location: 'Boys Hostel Block B, 2nd Floor Corridor',
        priority: 'HIGH',
        status: 'ASSIGNED',
        staff: staffIT,
        student: students[4],
        createdAt: days(4),
      },
      // 16. ASSIGNED (Demo Scenario: CRITICAL + ESCALATED Level 1)
      {
        title: 'Exhaust Fan Bearing Noise in Central Kitchen',
        description: 'Commercial 24-inch exhaust hood fan generates loud metallic grinding vibration.',
        category: 'Hostel Maintenance',
        location: 'Mess & Dining Hall, Kitchen Exhaust Hood Bay',
        priority: 'CRITICAL',
        prioritySource: 'AUTOMATIC',
        priorityReason: 'Active safety hazard in dining kitchen ventilation system.',
        status: 'ASSIGNED',
        staff: staffLead,
        student: students[5],
        createdAt: hours(9), // 9h elapsed out of 8h CRITICAL target -> Overdue by 1h -> Level 1 escalation
        slaOverride: {
          status: 'BREACHED',
          resolutionBreached: true,
          breachNotified: true,
          escalated: true,
          escalationLevel: 1,
          escalation1Notified: true,
        },
      },

      // 17. IN_PROGRESS
      {
        title: 'Physics Darkroom Light Seal Gasket Detached',
        description: 'Optics experiments compromised due to exterior sunlight leaking past the revolving door frame.',
        category: 'Classroom Infrastructure',
        location: 'Applied Science Wing, Basement Darkroom B-08',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        staff: staffCivil,
        student: students[6],
        createdAt: days(5),
      },
      // 18. IN_PROGRESS (Demo Scenario: CRITICAL + ESCALATED Level 2 Executive Director queue)
      {
        title: 'Main Server Room Split AC Temperature Sensor Drift',
        description: 'Primary 2-ton cooling unit reports 18C but ambient temperature probe reads 27C near core rack 3.',
        category: 'Equipment',
        location: 'Server Room Data Center, 2nd Floor IT Wing',
        priority: 'CRITICAL',
        prioritySource: 'AUTOMATIC',
        priorityReason: 'Critical IT server infrastructure overheating threat.',
        status: 'IN_PROGRESS',
        staff: staffElectrical,
        student: students[7],
        createdAt: hours(15), // 15h elapsed out of 8h target -> Overdue by 7h (> 120m) -> Level 2 escalation
        slaOverride: {
          status: 'BREACHED',
          resolutionBreached: true,
          breachNotified: true,
          escalated: true,
          escalationLevel: 2,
          escalation1Notified: true,
          escalation2Notified: true,
        },
      },
      // 19. IN_PROGRESS
      {
        title: 'Overhead Water Tank Float Sensor Malfunction',
        description: 'Hostel C rooftop water storage pump runs continuously even after reaching maximum brim level.',
        category: 'Plumbing',
        location: 'Girls Hostel Block C Rooftop Reservoir',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        staff: staffPlumbing,
        student: students[8],
        createdAt: days(5),
      },
      // 20. IN_PROGRESS
      {
        title: 'Sports Complex Main Hall Floor Polish Stripped',
        description: 'Badminton wooden court floor has lost anti-slip grip near court boundary 2.',
        category: 'Cleanliness',
        location: 'Indoor Sports Arena, Wooden Court 2',
        priority: 'LOW',
        status: 'IN_PROGRESS',
        staff: staffCleaning,
        student: students[9],
        createdAt: days(6),
      },
      // 21. IN_PROGRESS
      {
        title: 'Digital Signage Display Screen Dead Pixels',
        description: 'Notice board 55-inch display in campus lobby has vertical pink line across right half.',
        category: 'Internet/WiFi',
        location: 'Admin Building Atrium, Digital Notice Board',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        staff: staffIT,
        student: students[10],
        createdAt: days(6),
      },
      // 22. IN_PROGRESS
      {
        title: 'CCTV Camera 07 Glare Distortion at West Parking',
        description: 'Security camera dome has dirt film scattering night illumination lamps.',
        category: 'Other',
        location: 'Two-Wheeler West Parking Lot, Pole 4',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        staff: staffSecurity,
        student: students[11],
        createdAt: days(6),
      },

      // 23. RESOLVED (Demo Scenario: Resolved Within SLA Target Window)
      {
        title: 'Flush Valve Leakage in Main Building 1st Floor Washroom',
        description: 'Continuous water drainage from central flush valve in cubicle 3.',
        category: 'Plumbing',
        location: 'Main Administrative Building, 1st Floor East Wing Washroom',
        priority: 'MEDIUM',
        status: 'RESOLVED',
        staff: staffPlumbing,
        student: students[1],
        resolvedWithinSla: true,
        resolutionNotes: 'Replaced worn rubber seal washer and calibrated dual-flush brass cylinder. Pressure tested leak-free.',
        feedback: { rating: 5, comment: 'Fixed the leak within two hours. Excellent plumbing support.' },
        createdAt: days(3),
      },
      // 24. RESOLVED
      {
        title: 'Interactive Smart Board Touch Offset in Seminar Hall 1',
        description: 'Infrared stylus input had 5cm leftward calibration drift.',
        category: 'Equipment',
        location: 'Academic Complex 1, Seminar Hall 1',
        priority: 'HIGH',
        status: 'RESOLVED',
        staff: staffIT,
        student: students[0],
        resolutionNotes: 'Recalibrated 9-point optical sensor array and updated firmware to build 4.2.1.',
        feedback: { rating: 5, comment: 'Touch works accurately now. Great help before our symposium!' },
        createdAt: days(8),
      },
      // 25. RESOLVED
      {
        title: 'Corridor Safety Fire Door Magnet Release Broken',
        description: 'Magnetic door holder was unpowered, causing emergency egress door to swing shut in wind.',
        category: 'Other',
        location: 'Electronics Block, 2nd Floor Fire Stairwell',
        priority: 'CRITICAL',
        status: 'RESOLVED',
        staff: staffElectrical,
        student: students[2],
        resolutionNotes: 'Replaced 24V DC electromagnetic armature coil and verified fire alarm panel interlock trip.',
        feedback: { rating: 4, comment: 'Door stays open safely now. Thank you for prompt action.' },
        createdAt: days(9),
      },
      // 26. RESOLVED
      {
        title: 'Broken Wooden Armrest on Lecture Hall Bench 24',
        description: 'Splintered oak armrest panel in LH 204 created snag hazard for backpacks.',
        category: 'Furniture',
        location: 'Academic Complex 1, 2nd Floor, Room LH-204',
        priority: 'LOW',
        status: 'RESOLVED',
        staff: staffFurniture,
        student: students[3],
        resolutionNotes: 'Removed broken section, sanded smooth, and installed reinforced matching oak armrest bracket.',
        feedback: { rating: 5, comment: 'Clean repair. No more sharp edges.' },
        createdAt: days(10),
      },
      // 27. RESOLVED (Demo Scenario: Resolved After SLA Deadline Breach)
      {
        title: 'Hostel Mess Drainage Grate Blockage',
        description: 'Dishwashing area exterior floor trap clogged with food grease residue.',
        category: 'Cleanliness',
        location: 'Mess Kitchen Exterior Wash Area',
        priority: 'HIGH',
        status: 'RESOLVED',
        staff: staffCleaning,
        student: students[4],
        resolvedWithinSla: false,
        resolutionNotes: 'High-pressure hydro-jet cleared oil trap and sanitized trench with chlorine wash.',
        feedback: { rating: 4, comment: 'Drainage is completely clean now although it took longer than expected.' },
        createdAt: days(4),
      },
      // 28. RESOLVED
      {
        title: 'Hostel Study Room Power Strip Sparking',
        description: 'Extension socket under study desk 3 had scorched live pin receptacle.',
        category: 'Electrical',
        location: 'Boys Hostel Block A, 1st Floor Common Study Room',
        priority: 'HIGH',
        status: 'RESOLVED',
        staff: staffElectrical,
        student: students[5],
        resolutionNotes: 'Replaced complete 6-gang surge protected socket box and tested line insulation impedance.',
        feedback: { rating: 5, comment: 'Replaced with brand new surge protector. Safe to use now!' },
        createdAt: days(12),
      },
    ];

    let seededComplaintsCount = 0;

    for (const def of complaintsDefinitions) {
      const student = def.student;
      const staff = def.staff || null;

      // Priority evaluation & source attribution
      const evaluated = evaluatePriority({
        title: def.title,
        description: def.description,
        category: def.category,
        location: def.location,
      });

      const priority = def.priority || evaluated.priority;
      const prioritySource = def.prioritySource || 'AUTOMATIC';
      const priorityReason = def.priorityReason || evaluated.priorityReason;

      // SLA calculation & lifecycle scenario application
      let baseSla = calculateSlaDeadlines(priority, def.createdAt);

      if (def.status !== 'PENDING') {
        baseSla.responseAt = new Date(def.createdAt.getTime() + 2 * 60 * 60 * 1000);
        baseSla.responseBreached = false;
      }

      if (def.status === 'RESOLVED') {
        const resolutionHours = def.resolvedWithinSla === false ? Math.round((baseSla.resolutionTargetMinutes / 60) + 12) : 10;
        const resolutionTime = new Date(def.createdAt.getTime() + resolutionHours * 60 * 60 * 1000);
        baseSla.resolutionAt = resolutionTime;
        baseSla.resolutionBreached = def.resolvedWithinSla === false;
        baseSla.status = 'RESOLVED';
      } else if (def.slaOverride) {
        Object.assign(baseSla, def.slaOverride);
        if (def.slaOverride.escalated) {
          baseSla.escalatedAt = new Date(def.createdAt.getTime() + baseSla.resolutionTargetMinutes * 60 * 1000);
        }
      } else {
        const computed = computeSlaStatus({ createdAt: def.createdAt, priority, sla: baseSla, status: def.status });
        baseSla.status = computed.status;
      }

      // Status history
      const history = [
        {
          status: 'PENDING',
          changedAt: def.createdAt,
          changedBy: student._id,
          notes: 'Initial issue reported via student portal.',
        },
      ];

      // Activity timeline
      const timeline = [
        {
          eventType: 'CREATED',
          actor: student._id,
          actorName: student.name,
          actorRole: 'student',
          message: 'Complaint submitted by student',
          timestamp: def.createdAt,
        },
      ];

      // Priority timeline event
      if (prioritySource === 'MANUAL') {
        timeline.push({
          eventType: 'PRIORITY_CHANGED',
          actor: adminLead._id,
          actorName: adminLead.name,
          actorRole: 'admin',
          message: `Priority manually set to ${priority}: ${priorityReason}`,
          timestamp: new Date(def.createdAt.getTime() + 10 * 60 * 1000),
          metadata: { priority, reason: priorityReason, source: 'MANUAL' },
        });
      } else {
        timeline.push({
          eventType: 'PRIORITY_AUTO_ASSIGNED',
          actorName: 'System Automation',
          actorRole: 'system',
          message: `Priority classified as ${priority}: ${priorityReason}`,
          timestamp: def.createdAt,
          metadata: { priority, reason: priorityReason, source: 'AUTOMATIC' },
        });
      }

      // SLA policy activation event
      timeline.push({
        eventType: 'SLA_STARTED',
        actorName: 'System Automation',
        actorRole: 'system',
        message: `SLA policy activated. Target resolution: ${Math.round(baseSla.resolutionTargetMinutes / 60)}h.`,
        timestamp: def.createdAt,
        metadata: {
          responseDeadline: baseSla.responseDeadline,
          resolutionDeadline: baseSla.resolutionDeadline,
        },
      });

      if (def.status === 'REVIEWED' || def.status === 'ASSIGNED' || def.status === 'IN_PROGRESS' || def.status === 'RESOLVED') {
        const reviewedTime = new Date(def.createdAt.getTime() + 2 * 60 * 60 * 1000);
        history.push({
          status: 'REVIEWED',
          changedAt: reviewedTime,
          changedBy: adminLead._id,
          notes: 'Reviewed by campus administration.',
        });
        timeline.push({
          eventType: 'STATUS_CHANGED',
          actor: adminLead._id,
          actorName: adminLead.name,
          actorRole: 'admin',
          message: 'Reviewed by administration',
          timestamp: reviewedTime,
        });
      }

      if (staff && (def.status === 'ASSIGNED' || def.status === 'IN_PROGRESS' || def.status === 'RESOLVED')) {
        const assignedTime = new Date(def.createdAt.getTime() + 4 * 60 * 60 * 1000);
        history.push({
          status: 'ASSIGNED',
          changedAt: assignedTime,
          changedBy: adminLead._id,
          notes: `Assigned to ${staff.name}`,
        });
        timeline.push({
          eventType: 'ASSIGNED',
          actor: adminLead._id,
          actorName: adminLead.name,
          actorRole: 'admin',
          message: `Assigned to ${staff.name}`,
          timestamp: assignedTime,
        });
      }

      if (staff && (def.status === 'IN_PROGRESS' || def.status === 'RESOLVED')) {
        const progressTime = new Date(def.createdAt.getTime() + 6 * 60 * 60 * 1000);
        history.push({
          status: 'IN_PROGRESS',
          changedAt: progressTime,
          changedBy: staff._id,
          notes: 'Technician arrived on-site and commenced inspection.',
        });
        timeline.push({
          eventType: 'STATUS_CHANGED',
          actor: staff._id,
          actorName: staff.name,
          actorRole: 'staff',
          message: 'Work commenced by technician',
          timestamp: progressTime,
        });
      }

      // SLA AT RISK event
      if (baseSla.status === 'AT_RISK' || baseSla.atRiskNotified) {
        timeline.push({
          eventType: 'SLA_AT_RISK',
          actorName: 'System Automation',
          actorRole: 'system',
          message: 'SLA resolution window at risk (<25% time remaining). Priority flagged.',
          timestamp: new Date(def.createdAt.getTime() + Math.round(baseSla.resolutionTargetMinutes * 0.76 * 60 * 1000)),
          metadata: { priority },
        });
      }

      // SLA BREACHED event
      if (baseSla.status === 'BREACHED' || baseSla.resolutionBreached) {
        timeline.push({
          eventType: 'SLA_BREACHED',
          actorName: 'System Automation',
          actorRole: 'system',
          message: 'Target resolution deadline exceeded. SLA breach recorded.',
          timestamp: baseSla.resolutionDeadline,
          metadata: { priority },
        });
      }

      // COMPLAINT ESCALATED event
      if (baseSla.escalated) {
        timeline.push({
          eventType: 'COMPLAINT_ESCALATED',
          actorName: 'System Automation',
          actorRole: 'system',
          message: `Complaint escalated to Level ${baseSla.escalationLevel} supervisory queue.`,
          timestamp: baseSla.escalatedAt || baseSla.resolutionDeadline,
          metadata: { escalationLevel: baseSla.escalationLevel },
        });
      }

      if (def.status === 'RESOLVED') {
        const resolvedTime = baseSla.resolutionAt || new Date(def.createdAt.getTime() + 10 * 60 * 60 * 1000);
        history.push({
          status: 'RESOLVED',
          changedAt: resolvedTime,
          changedBy: staff ? staff._id : adminLead._id,
          notes: def.resolutionNotes || 'Work completed successfully.',
        });
        timeline.push({
          eventType: 'RESOLVED',
          actor: staff ? staff._id : adminLead._id,
          actorName: staff ? staff.name : adminLead.name,
          actorRole: staff ? 'staff' : 'admin',
          message: def.resolutionNotes || 'Complaint resolved',
          timestamp: resolvedTime,
        });

        timeline.push({
          eventType: 'SLA_RESOLVED',
          actor: staff ? staff._id : adminLead._id,
          actorName: staff ? staff.name : adminLead.name,
          actorRole: staff ? 'staff' : 'admin',
          message: baseSla.resolutionBreached
            ? 'Complaint resolved after SLA deadline (breached).'
            : 'Complaint resolved within target SLA window.',
          timestamp: resolvedTime,
          metadata: { resolutionBreached: baseSla.resolutionBreached },
        });

        if (def.feedback) {
          timeline.push({
            eventType: 'FEEDBACK_SUBMITTED',
            actor: student._id,
            actorName: student.name,
            actorRole: 'student',
            message: `Student rated resolution ${def.feedback.rating}/5 stars`,
            timestamp: new Date(resolvedTime.getTime() + 1 * 60 * 60 * 1000),
          });
        }
      }

      const complaintDoc = await Complaint.create({
        title: def.title,
        description: def.description,
        category: def.category,
        location: def.location,
        priority,
        prioritySource,
        priorityReason,
        priorityUpdatedAt: def.createdAt,
        priorityUpdatedBy: prioritySource === 'MANUAL' ? adminLead._id : null,
        sla: baseSla,
        status: def.status || 'PENDING',
        createdBy: student._id,
        assignedTo: staff ? staff._id : null,
        resolutionNotes: def.resolutionNotes || '',
        statusHistory: history,
        activityTimeline: timeline,
        feedback: def.feedback
          ? {
              rating: def.feedback.rating,
              comment: def.feedback.comment,
              submittedAt: new Date(def.createdAt.getTime() + 11 * 60 * 60 * 1000),
            }
          : null,
        createdAt: def.createdAt,
        updatedAt: def.createdAt,
      });

      // Add a realistic discussion comment
      if (staff) {
        await Comment.create({
          complaintId: complaintDoc._id,
          userId: staff._id,
          authorName: staff.name,
          authorRole: 'staff',
          text: `Maintenance ticket acknowledged. Spare parts requisitioned and on-site inspection scheduled.`,
          createdAt: new Date(def.createdAt.getTime() + 5 * 60 * 60 * 1000),
        });
      }

      // Add student notification
      await Notification.create({
        recipient: student._id,
        type: def.status === 'RESOLVED' ? 'COMPLAINT_RESOLVED' : 'STATUS_CHANGED',
        title: `Ticket Update: #${complaintDoc._id.toString().slice(-6)}`,
        message: `Your complaint "${def.title}" is now ${complaintDoc.status}.`,
        complaintId: complaintDoc._id,
        read: def.status === 'RESOLVED',
        createdAt: def.createdAt,
      });

      seededComplaintsCount++;
    }

    console.log(`[Seed] Successfully created ${seededComplaintsCount} complaints across all categories and lifecycle states!`);

    console.log('\n======================================================');
    console.log('       CAMPUSCARE 2.0 DEMONSTRATION DATA SEEDED       ');
    console.log('======================================================');
    console.log(`Admins: 2 | Staff Members: 8 | Students: ${students.length} | Complaints: ${seededComplaintsCount}`);
    console.log('======================================================');
    console.table([
      { Role: 'ADMIN 1', Email: 'admin@pccoepune.org', Password: ADMIN_PASSWORD, Desk: 'Admin Console' },
      { Role: 'ADMIN 2', Email: 'campus.director@pccoepune.org', Password: ADMIN_PASSWORD, Desk: 'Director Desk' },
      { Role: 'STAFF LEAD', Email: 'staff@pccoepune.org', Password: STAFF_PASSWORD, Area: 'Facilities Lead' },
      { Role: 'ELECTRICAL', Email: 'staff.electrical@pccoepune.org', Password: STAFF_PASSWORD, Area: 'Electrical & Power' },
      { Role: 'PLUMBING', Email: 'staff.plumbing@pccoepune.org', Password: STAFF_PASSWORD, Area: 'Plumbing & Water' },
      { Role: 'CIVIL', Email: 'staff.civil@pccoepune.org', Password: STAFF_PASSWORD, Area: 'Civil & Infrastructure' },
      { Role: 'IT SUPPORT', Email: 'staff.it@pccoepune.org', Password: STAFF_PASSWORD, Area: 'Network & Labs' },
      { Role: 'CLEANING', Email: 'staff.cleaning@pccoepune.org', Password: STAFF_PASSWORD, Area: 'Housekeeping' },
      { Role: 'SECURITY', Email: 'staff.security@pccoepune.org', Password: STAFF_PASSWORD, Area: 'Security & Access' },
      { Role: 'FURNITURE', Email: 'staff.furniture@pccoepune.org', Password: STAFF_PASSWORD, Area: 'Carpentry & Desks' },
      { Role: 'STUDENT 1', Email: 'aarav.sharma@pccoepune.org', Password: STUDENT_PASSWORD, PRN: '123B1B201' },
      { Role: 'STUDENT 2', Email: 'neha.patil@pccoepune.org', Password: STUDENT_PASSWORD, PRN: '123B1B202' },
    ]);
    console.log('======================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Error] Failed to seed data: ${error.message}`);
    process.exit(1);
  }
};

seedDemonstrationData();
