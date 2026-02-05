import axios from 'axios'

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:3001/api',
})

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  (config) => {
    // Check for admin token first, then regular auth token
    const adminToken = localStorage.getItem('adminToken')
    const token = adminToken || localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor to handle 401 errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only clear auth if we got a 401 from the server (not on initial requests)
      // Don't redirect - let the component handle it gracefully
      console.warn('Unauthorized - token may be expired')
      // Check if this is a real auth error vs initial request
      const token = localStorage.getItem('authToken')
      if (token && error.config?.url?.includes('auth') === false) {
        // This is a real 401, not an auth endpoint
        // Clear the token but don't redirect - let React component re-render
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
      }
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
