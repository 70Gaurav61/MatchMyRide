let accessToken = null

export const setAccessToken = (token) => {
  accessToken = token
}

export const getAccessToken = () => {
  return accessToken
}

export const clearAccessToken = () => {
  accessToken = null
}

// can also be stored in sessionStorage/localStorage if needed
// Best is cookies but vercel frontend and render backend can't share cookies
// so we use in-memory storage for simplicity