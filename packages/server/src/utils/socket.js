import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Order } from '../models/order.model.js';

let io;

/**
 * Initializes the Socket.io server instance.
 * @param {Object} httpServer - The Node.js HTTP server.
 * @returns {Object} The initialized Socket.io instance.
 */
export const initSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      // Extract Token from Handshake Auth (preferred) or Headers
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      // Verify Token
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      if (!decoded || !decoded._id) {
        return next(new Error('Authentication error: Invalid token'));
      }

      // Associate socket with user
      socket.userId = decoded._id;
      next();
    } catch (err) {
      console.error(`[SOCKET] Auth Failed: ${err.message}`);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] User connected: ${socket.userId}`);

    // Join a room based on Order ID for real-time tracking
    // Client sends: socket.emit('join_order', { orderId: '...' });
    socket.on('join_order', async (data) => {
      try {
        const orderId = typeof data === 'object' ? data.orderId : data;

        if (!orderId) {
          // console.warn(`[SOCKET] Missing orderId from user ${socket.userId}`);
          return;
        }

        // Verify Ownership: Check if the user really owns this order
        const order = await Order.findOne({
          _id: orderId,
          user: socket.userId,
        }).select('_id');

        if (order) {
          socket.join(orderId);
          console.log(`[SOCKET] ${socket.userId} joined room: ${orderId}`);
        } else {
          // console.warn(`[SOCKET] Unauthorized room join attempt by ${socket.userId} for order ${orderId}`);
          socket.emit('error', {
            message: 'Unauthorized access to this order',
          });
        }
      } catch (error) {
        console.error(`[SOCKET] Error in join_order: ${error.message}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

/**
 * Gets the initialized Socket.io instance.
 * @returns {Object} The Socket.io instance.
 * @throws {Error} If Socket.io has not been initialized.
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
