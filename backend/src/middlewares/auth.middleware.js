import { verifyAccessToken } from './auth.helper.js'

const verifyJWT = async (req, res, next) => {
  try {
    const accessToken = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '')

    const { user } = await verifyAccessToken(accessToken)
    req.user = user

    next()
  } catch (error) {
    return res.status(error.statusCode || 401).json({ message: error.message })
  }
}

export { verifyJWT }