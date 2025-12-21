import cookie from 'cookie'
import { verifyAccessToken } from './auth.helper.js'

const socketAuth = async (socket, next) => {
  try {
    const cookies = cookie.parse(socket.handshake.headers.cookie || '')

    const accessToken =
      socket.handshake?.auth?.token ||
      socket.handshake.headers.authorization?.replace('Bearer ', '') ||
      cookies.accessToken

    const { user, decoded } = await verifyAccessToken(accessToken)
    socket.user = user
    setupAutoDisconnect(socket, decoded.exp)

    next()
  } catch (error) {
    next(error)
  }
}

const setupAutoDisconnect = (socket, expTimeUnix) => {

  if (socket._expiryTimer) clearTimeout(socket._expiryTimer);

  const expInMs = expTimeUnix * 1000 - Date.now();

  if (expInMs <= 0) return socket.disconnect(true);

  socket._expiryTimer = setTimeout(() => {
    socket.disconnect(true); 
  }, expInMs);
  
}

export default socketAuth
export { setupAutoDisconnect }
