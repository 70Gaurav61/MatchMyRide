import axios from 'axios'
import { setAccessToken, clearAccessToken } from './tokenStore'

const apiUrl = import.meta.env.VITE_APP_API_URL

export const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken')

  if (!refreshToken) {
    clearAccessToken()
    throw new Error('No refresh token')
  }

  try {
    const res = await axios.post(
      `${apiUrl}/users/refresh-token`,
      { refreshToken },
      {
        headers: { 'Content-Type': 'application/json' },
        skipAuthRefresh: true
      }
    )

    const { accessToken, refreshToken: newRefreshToken } = res.data || {}

    if (!accessToken) {
      throw new Error(res.data?.message || 'Failed to refresh token')
    }

    setAccessToken(accessToken)

    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken)
    }

    return accessToken
  } catch (error) {
    clearAccessToken()
    throw error
  }
}
