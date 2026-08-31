/**
 * Database Seeder Script
 * Seeds initial Administrator and Staff accounts directly into MongoDB.
 * Run using: `npm run seed` or `node seed.js`
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

// Load environment variables from .env
dotenv.config();

const seedAccounts = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuscare';
    console.log(`[Seed] Connecting to MongoDB at: ${mongoUri}`);

    await mongoose.connect(mongoUri);
    console.log('[Seed] Database connected successfully.');

    // Seed Data definition
    const usersToSeed = [
      {
        name: 'Campus Administrator',
        email: 'admin@campuscare.edu',
        password: 'AdminPassword123!',
        role: 'admin',
      },
      {
        name: 'Maintenance Staff Lead',
        email: 'staff@campuscare.edu',
        password: 'StaffPassword123!',
        role: 'staff',
      },
    ];

    console.log('\n--- Seeding Privileged Accounts ---');

    for (const userData of usersToSeed) {
      // Check if user already exists
      let existingUser = await User.findOne({ email: userData.email });

      if (existingUser) {
        // Update password and details to ensure deterministic credentials for testing
        existingUser.name = userData.name;
        existingUser.password = userData.password; // pre-save hook will hash it
        existingUser.role = userData.role;
        await existingUser.save();
        console.log(`[Seed] Updated existing account: ${userData.email} (${userData.role})`);
      } else {
        // Create new account
        await User.create(userData);
        console.log(`[Seed] Created new account: ${userData.email} (${userData.role})`);
      }
    }

    console.log('\n======================================================');
    console.log('       CAMPUSCARE SEED ACCOUNTS CREDENTIALS           ');
    console.log('======================================================');
    console.table([
      {
        Role: 'ADMIN',
        Email: 'admin@campuscare.edu',
        Password: 'AdminPassword123!',
        Description: 'Oversees campus complaints, assigns staff',
      },
      {
        Role: 'STAFF',
        Email: 'staff@campuscare.edu',
        Password: 'StaffPassword123!',
        Description: 'Receives assigned tickets, updates statuses',
      },
    ]);
    console.log('======================================================\n');
    console.log('[Seed] Seeding completed successfully.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Error] Failed to seed accounts: ${error.message}`);
    process.exit(1);
  }
};

seedAccounts();
