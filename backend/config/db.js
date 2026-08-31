/**
 * Database Configuration
 * Connects to MongoDB using Mongoose with process.env.MONGO_URI
 */
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
    console.log(`[MongoDB] Database Name: ${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB] Connection Error: ${error.message}`);
    // Exit process with failure code so orchestrators/Docker can handle restarts
    process.exit(1);
  }
};

module.exports = connectDB;
