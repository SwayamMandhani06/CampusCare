const mongoose = require('mongoose');

/**
 * SystemLock Model
 * Provides atomic, distributed lease locking for multi-replica Kubernetes backend pods.
 * Ensures tasks like scheduled SLA monitoring execute on only one pod at a time.
 */
const systemLockSchema = new mongoose.Schema(
  {
    lockKey: {
      type: String,
      required: true,
      unique: true,
    },
    lockedUntil: {
      type: Date,
      required: true,
      index: true,
    },
    lockedBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemLock', systemLockSchema);
