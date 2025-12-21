import jwt from 'jsonwebtoken'
import { User } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'

export const verifyAccessToken = async (accessToken) => {
  if (!accessToken) {
    throw new ApiError(401, 'Access token missing')
  }

  let decoded
  try {
    decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)
  } catch {
    throw new ApiError(401, 'Invalid or expired token')
  }

  const user = await User.findById(decoded._id)
    .select('-password -refreshToken')

  if (!user) {
    throw new ApiError(401, 'User not found')
  }

  return {
    user,
    decoded
  }
}
