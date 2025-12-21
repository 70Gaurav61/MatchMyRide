import cookie from 'cookie'
import { verifyAccessToken } from './auth.helper.js'

const socketAuth = async (socket, next) => {
  try {
    const cookies = cookie.parse(socket.handshake.headers.cookie || '')

    const accessToken =
      socket.handshake?.auth?.token ||
      socket.handshake.headers.authorization?.replace('Bearer ', '') ||
      cookies.accessToken

    const user = await verifyAccessToken(accessToken)
    socket.user = user

    next()
  } catch (error) {
    next(error)
  }
}

export default socketAuth
