/**
 * CampusCare Real-Time Socket.IO Client Service
 * Provides centralized WebSocket connection management, authentication,
 * and room subscription utilities for React components.
 */
import { io } from 'socket.io-client';

let socket = null;

/**
 * Initializes and returns the Socket.IO client instance
 * @returns {import('socket.io-client').Socket}
 */
export const getSocket = () => {
  if (socket) return socket;

  const token = localStorage.getItem('campuscare_token');
  const isDev = import.meta.env.DEV;

  // In dev, connect to backend at http://localhost:5000; in prod, connect through Ingress host
  const backendUrl = isDev ? 'http://localhost:5000' : window.location.origin;

  socket = io(backendUrl, {
    path: '/api/socket.io',
    transports: ['websocket', 'polling'],
    auth: {
      token,
    },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    autoConnect: true,
  });

  socket.on('connect', () => {
    // Connected to server
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket Client] Connection error:', err.message);
  });

  return socket;
};

/**
 * Updates authentication token on socket instance when user logs in
 */
export const updateSocketAuth = () => {
  const token = localStorage.getItem('campuscare_token');
  if (socket) {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
  }
};

/**
 * Disconnects and cleans up socket instance upon logout
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Subscribes to updates for a specific complaint room
 * @param {string} complaintId
 * @param {function} onUpdateCallback
 * @returns {function} Cleanup unsubscribe function
 */
export const subscribeToComplaintRoom = (complaintId, onUpdateCallback) => {
  const client = getSocket();

  if (complaintId) {
    client.emit('join_complaint', complaintId);
  }

  const handler = (payload) => {
    if (payload && (payload.complaintId === complaintId || payload.complaint?._id === complaintId)) {
      onUpdateCallback(payload);
    }
  };

  client.on('complaint_updated', handler);

  // Return teardown function
  return () => {
    if (complaintId) {
      client.emit('leave_complaint', complaintId);
    }
    client.off('complaint_updated', handler);
  };
};

export default {
  getSocket,
  updateSocketAuth,
  disconnectSocket,
  subscribeToComplaintRoom,
};
