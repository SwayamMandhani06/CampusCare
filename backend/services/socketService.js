/**
 * CampusCare Real-Time Socket.IO Service
 * Manages WebSocket connections, room-based authorization, and real-time event broadcasting
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const {
  campuscareSocketConnectionsActive,
  campuscareSocketEventsTotal,
} = require('../metrics');

let io = null;

/**
 * Initializes Socket.IO with the provided HTTP server
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
const initSocket = (httpServer) => {
  if (io) return io;

  io = new Server(httpServer, {
    path: '/api/socket.io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication Middleware for WebSocket handshakes
  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization;
      const token =
        socket.handshake.auth?.token ||
        (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication failed: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = {
        id: decoded.id,
        role: decoded.role,
      };

      next();
    } catch (err) {
      console.warn(`[Socket.IO] Authentication rejected: ${err.message}`);
      return next(new Error('Authentication failed: Invalid or expired token'));
    }
  });

  // Connection Handler
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const userRole = socket.user.role;

    campuscareSocketConnectionsActive.inc();
    campuscareSocketEventsTotal.inc({ event_type: 'connect' });

    // Join personal user room for private notifications
    socket.join(`user:${userId}`);

    // Join role-specific channels
    if (userRole === 'admin') {
      socket.join('role:admin');
    } else if (userRole === 'staff') {
      socket.join('role:staff');
    }

    // Join complaint-specific room with strict authorization
    socket.on('join_complaint', async (complaintId, callback) => {
      try {
        if (!complaintId || !mongoose.Types.ObjectId.isValid(complaintId)) {
          if (typeof callback === 'function') callback({ success: false, message: 'Invalid complaint ID' });
          return socket.emit('socket_error', { message: 'Invalid complaint ID' });
        }

        const complaint = await Complaint.findById(complaintId).select('createdBy assignedTo');
        if (!complaint) {
          if (typeof callback === 'function') callback({ success: false, message: 'Complaint not found' });
          return socket.emit('socket_error', { message: 'Complaint not found' });
        }

        // Authorization check:
        // - Admin: can view any complaint room
        // - Staff: can view if assigned to them or unassigned
        // - Student: can view only if they are the creator
        let isAuthorized = false;
        if (userRole === 'admin') {
          isAuthorized = true;
        } else if (userRole === 'staff') {
          if (!complaint.assignedTo || complaint.assignedTo.toString() === userId) {
            isAuthorized = true;
          }
        } else if (userRole === 'student') {
          if (complaint.createdBy && complaint.createdBy.toString() === userId) {
            isAuthorized = true;
          }
        }

        if (!isAuthorized) {
          if (typeof callback === 'function') {
            callback({
              success: false,
              message: 'Forbidden: You are not authorized to subscribe to updates for this complaint',
            });
          }
          return socket.emit('socket_error', {
            message: 'Forbidden: You are not authorized to subscribe to updates for this complaint',
          });
        }

        socket.join(`complaint:${complaintId}`);
        if (typeof callback === 'function') {
          callback({ success: true, complaintId, room: `complaint:${complaintId}` });
        }
        socket.emit('joined_complaint', { complaintId, success: true, room: `complaint:${complaintId}` });
        campuscareSocketEventsTotal.inc({ event_type: 'join_complaint' });
      } catch (err) {
        console.error(`[Socket.IO] join_complaint error: ${err.message}`);
        if (typeof callback === 'function') callback({ success: false, message: 'Failed to join complaint room' });
        socket.emit('socket_error', { message: 'Failed to join complaint room' });
      }
    });

    // Leave complaint room
    socket.on('leave_complaint', (complaintId) => {
      if (complaintId) {
        socket.leave(`complaint:${complaintId}`);
      }
    });

    // Disconnect Handler
    socket.on('disconnect', () => {
      campuscareSocketConnectionsActive.dec();
      campuscareSocketEventsTotal.inc({ event_type: 'disconnect' });
    });
  });

  console.log('[Socket.IO] Initialized and listening on path /api/socket.io');
  return io;
};

/**
 * Returns the active Socket.IO server instance
 */
const getIO = () => {
  return io;
};

/**
 * Broadcasts real-time complaint updates to authorized rooms and users
 * @param {object} complaint - Updated complaint document
 * @param {string} eventType - Event category (e.g. 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'COMMENT_ADDED', 'SLA_BREACHED')
 * @param {object} [metadata] - Additional event metadata
 */
const notifyComplaintUpdated = (complaint, eventType, metadata = {}) => {
  if (!io || !complaint) return;

  const complaintId = complaint._id ? complaint._id.toString() : complaint.id;
  const payload = {
    complaintId,
    eventType,
    complaint,
    metadata,
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Broadcast to complaint room (subscribers currently viewing this detail)
    io.to(`complaint:${complaintId}`).emit('complaint_updated', payload);

    // 2. Broadcast to admin operational console
    io.to('role:admin').emit('operational_complaint_updated', payload);

    // 3. Broadcast to assigned staff's personal room
    const assignedId = complaint.assignedTo?._id || complaint.assignedTo;
    if (assignedId) {
      io.to(`user:${assignedId.toString()}`).emit('staff_task_updated', payload);
    }

    // 4. Broadcast to student owner's personal room
    const studentId = complaint.createdBy?._id || complaint.createdBy;
    if (studentId) {
      io.to(`user:${studentId.toString()}`).emit('student_complaint_updated', payload);
    }

    campuscareSocketEventsTotal.inc({ event_type: eventType || 'complaint_updated' });
  } catch (err) {
    console.error(`[Socket.IO] Failed to emit complaint update: ${err.message}`);
  }
};

/**
 * Dispatches a real-time notification to a specific user
 * @param {string} userId - Target user ID
 * @param {object} notification - Notification document
 */
const notifyUserNotification = (userId, notification) => {
  if (!io || !userId) return;

  try {
    io.to(`user:${userId.toString()}`).emit('new_notification', notification);
    campuscareSocketEventsTotal.inc({ event_type: 'new_notification' });
  } catch (err) {
    console.error(`[Socket.IO] Failed to emit user notification: ${err.message}`);
  }
};

module.exports = {
  initSocket,
  getIO,
  notifyComplaintUpdated,
  notifyUserNotification,
};
