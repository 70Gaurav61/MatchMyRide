import { Server as SocketIOServer } from 'socket.io'
import socketAuth, { setupAutoDisconnect } from '../middlewares/socketAuth.middleware.js'
import { handleSendMessage, toggleReadyStatus, handleStartRideCountdown } from '../controllers/group.controller.js'
import { verifyAccessToken } from '../middlewares/auth.helper.js'

export default function initSocket(httpServer) {

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5173']

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true)
        }
        return callback(new Error('Not allowed by Socket.IO CORS'))
      },
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  })

  io.use(socketAuth)

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id)
    const socketUserId = socket.user.id.toString()
    socket.join(socketUserId)

    socket.on('session:refresh', async (data) => {
      try {
        const { decoded } = await verifyAccessToken(data.token);  
        setupAutoDisconnect(socket, decoded.exp);
        socket.emit('session:refresh-success');
      } catch (err) {
        socket.disconnect(true);
      }
    });


    socket.on('join-group', (groupId) => socket.join(groupId))
    socket.on('leave-group', (groupId) => socket.leave(groupId))

    socket.on('send-message', (data) =>
      handleSendMessage(io, socket, data)
    )

    socket.on('toggle-ready-status', (data) =>
      toggleReadyStatus(io, socket, data)
    )

    socket.on('start-ride', (data) =>
      handleStartRideCountdown(io, socket, data)
    )

    socket.on('disconnect', () => {
      if (socket._expiryTimer) {
        clearTimeout(socket._expiryTimer)
      }
      console.log('User disconnected:', socket.id)
    })
  })

  io.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error)
  })

  return io
}