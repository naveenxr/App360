const { CLIENT_EVENTS, ROOMS } = require('../constants/socketEvents');

/**
 * Static room-to-permission mapping for RBAC enforcement
 */
const ROOM_PERMISSIONS = {
  [ROOMS.MONITORING_ALARMS]: { module: 'alarm', action: 'read' },
  [ROOMS.MONITORING_EVENTS]: { module: 'event', action: 'read' },
  [ROOMS.MONITORING_TOPOLOGY]: { module: 'map', action: 'read' },
  [ROOMS.MONITORING_SYSTEM]: { module: 'dashboard', action: 'read' }
};

/**
 * Validates whether a user identity is authorized to join a specific room.
 * Enforces dynamic RBAC and prevents arbitrary room injection.
 * 
 * @param {Object} user - Sanitized user object attached to socket.user
 * @param {string} room - Target room name
 * @returns {boolean} True if authorized
 */
const canJoinRoom = (user, room) => {
  if (!user || !room || typeof room !== 'string') {
    return false;
  }

  // 1. User-specific room: must match own user ID
  if (room.startsWith(ROOMS.USER_PREFIX)) {
    return room === `${ROOMS.USER_PREFIX}${user.id}`;
  }

  // 2. Role-specific room: must match own assigned role
  if (room.startsWith(ROOMS.ROLE_PREFIX)) {
    return room === `${ROOMS.ROLE_PREFIX}${user.role}`;
  }

  // 3. System Administrator retains universal access to monitoring rooms
  if (user.role === 'ADMIN') {
    return Object.values(ROOMS).includes(room) || room.startsWith('monitoring:');
  }

  // 4. Authorized monitoring rooms with granular RBAC validation
  const required = ROOM_PERMISSIONS[room];
  if (required) {
    const hasPerm = Boolean(user.permissions?.[required.module]?.[required.action]);
    return hasPerm;
  }

  // Deny all arbitrary or unrecognized rooms
  return false;
};

/**
 * Configures rooms and event listeners for an authenticated socket connection.
 * 
 * @param {import('socket.io').Socket} socket 
 * @param {import('socket.io').Server} io 
 */
const setupSocketRooms = (socket, io) => {
  const { user } = socket;

  // 1. Automatically join user-specific and role-specific channels
  const userRoom = `${ROOMS.USER_PREFIX}${user.id}`;
  const roleRoom = `${ROOMS.ROLE_PREFIX}${user.role}`;

  socket.join(userRoom);
  socket.join(roleRoom);

  // 2. Handle client subscription requests
  socket.on(CLIENT_EVENTS.SUBSCRIBE, (data, callback) => {
    const room = typeof data === 'string' ? data : data?.room;

    if (!room) {
      const res = { success: false, error: 'BAD_REQUEST', message: 'Room name is required' };
      if (typeof callback === 'function') callback(res);
      return;
    }

    if (!canJoinRoom(user, room)) {
      console.warn(`⚠️ [Socket.IO] Unauthorized subscription attempt by user [${user.email}] to room [${room}]`);
      const res = {
        success: false,
        error: 'FORBIDDEN',
        message: `Unauthorized subscription. User role [${user.role}] lacks permission for room [${room}].`
      };
      if (typeof callback === 'function') callback(res);
      return;
    }

    socket.join(room);
    console.log(`📡 [Socket.IO] User [${user.email}] subscribed to room [${room}]`);

    const res = { success: true, room };
    if (typeof callback === 'function') callback(res);
  });

  // 3. Handle client unsubscription requests
  socket.on(CLIENT_EVENTS.UNSUBSCRIBE, (data, callback) => {
    const room = typeof data === 'string' ? data : data?.room;

    if (!room) {
      const res = { success: false, error: 'BAD_REQUEST', message: 'Room name is required' };
      if (typeof callback === 'function') callback(res);
      return;
    }

    // Protect identity channels from being left accidentally
    if (room.startsWith(ROOMS.USER_PREFIX) || room.startsWith(ROOMS.ROLE_PREFIX)) {
      const res = { success: false, error: 'PROTECTED_ROOM', message: 'Cannot unsubscribe from identity channels' };
      if (typeof callback === 'function') callback(res);
      return;
    }

    socket.leave(room);
    console.log(`📡 [Socket.IO] User [${user.email}] unsubscribed from room [${room}]`);

    const res = { success: true, room };
    if (typeof callback === 'function') callback(res);
  });

  // 4. Handle client heartbeat
  socket.on(CLIENT_EVENTS.HEARTBEAT, (data, callback) => {
    const response = {
      receivedAt: data?.timestamp || Date.now(),
      serverTime: new Date().toISOString(),
      serverTimestamp: Date.now()
    };
    if (typeof callback === 'function') {
      callback(response);
    } else {
      socket.emit(CLIENT_EVENTS.HEARTBEAT, response);
    }
  });
};

module.exports = {
  canJoinRoom,
  setupSocketRooms,
  ROOM_PERMISSIONS
};

