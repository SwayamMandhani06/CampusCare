/**
 * User Model
 * Defines the schema for users across all roles (student, admin, staff)
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Prevents password from being returned in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ['student', 'admin', 'staff'],
        message: '{VALUE} is not a valid role. Allowed roles: student, admin, staff',
      },
      default: 'student',
    },
    studentId: {
      type: String,
      trim: true,
      default: null,
      // Optional field; relevant primarily for student accounts
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt fields
  }
);

/**
 * Pre-save middleware: Hashes the user password using bcryptjs before saving
 */
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified or is new
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/**
 * Instance method: Compares candidate password with stored hashed password
 * @param {string} enteredPassword - The plain text password to check
 * @returns {Promise<boolean>}
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
