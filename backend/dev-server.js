/**
 * Development Server Launcher with Auto In-Memory MongoDB Fallback
 * 
 * If a local/cloud MongoDB is unreachable at MONGO_URI, this launcher starts
 * MongoMemoryServer, automatically seeds the Admin and Staff accounts, and
 * boots the backend server seamlessly.
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');

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

  // Seed default admin and staff if missing
  const adminExists = await User.findOne({ email: 'admin@campuscare.edu' });
  if (!adminExists) {
    await User.create({
      name: 'Campus Administrator',
      email: 'admin@campuscare.edu',
      password: 'AdminPassword123!',
      role: 'admin',
    });
    console.log('[DevServer] Seeded Admin account: admin@campuscare.edu / AdminPassword123!');
  }

  const staffExists = await User.findOne({ email: 'staff@campuscare.edu' });
  if (!staffExists) {
    await User.create({
      name: 'Maintenance Staff Lead',
      email: 'staff@campuscare.edu',
      password: 'StaffPassword123!',
      role: 'staff',
    });
    console.log('[DevServer] Seeded Staff account: staff@campuscare.edu / StaffPassword123!');
  }

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
