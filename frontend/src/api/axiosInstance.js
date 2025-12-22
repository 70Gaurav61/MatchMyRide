import axios from 'axios'
import { getAccessToken } from "../auth/tokenStore.js";
import { refreshAccessToken } from '../auth/refreshToken.js'

const apiUrl = import.meta.env.VITE_APP_API_URL;

let isRefreshing = false;
let pendingRequests = [];

const resolvePendingRequests = (token) => {
  pendingRequests.forEach((callback) => callback(token));
  pendingRequests = [];
}

let logoutCallback = null

export const setLogoutCallback = (callback) => {
  logoutCallback = callback
}

const axiosInstance = axios.create({
    baseURL: apiUrl,
    headers: {
        'Content-Type': 'application/json',
    },
})

axiosInstance.interceptors.request.use((config => {
    const token = getAccessToken();
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
}), (error) => {
    return Promise.reject(error);
});

axiosInstance.interceptors.response.use((response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status !== 401) {
      return Promise.reject(error)
    }

    if (originalRequest._retry || originalRequest.skipAuthRefresh) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push((token) => {
          if (!token) return reject(error)
          originalRequest.headers.Authorization = `Bearer ${token}`
          resolve(axiosInstance(originalRequest))
        })
      })
    }

    isRefreshing = true

    try {
      const newToken = await refreshAccessToken()

      resolvePendingRequests(newToken)

      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return axiosInstance(originalRequest)
    } catch (refreshError) {
      resolvePendingRequests(null)
      localStorage.removeItem('refreshToken')
      if (logoutCallback) {
        logoutCallback()
      } else {
        window.location.href = '/login'
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default axiosInstance
