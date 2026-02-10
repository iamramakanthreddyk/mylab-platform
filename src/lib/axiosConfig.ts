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
      // Log for debugging (only in development)
      if (import.meta.env.DEV) {
        console.log(`[axios] Added auth header to ${config.method?.toUpperCase()} ${config.url}`)
      }
    } else {
      // Log when no token is available (for debugging)
      if (import.meta.env.DEV) {
        console.warn(`[axios] No auth token available for ${config.method?.toUpperCase()} ${config.url}`)
      }
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
      // Log the 401 but don't automatically clear token
      // Let the component decide what to do based on context
      console.warn('[axios] Got 401 response:', {
        url: error.config?.url,
        method: error.config?.method,
        message: error.response?.data?.error
      })
      
      // Only clear token for specific errors that indicate invalid/expired token
      const serverError = error.response?.data?.error || ''
      const shouldClearToken = 
        serverError.toLowerCase().includes('invalid token') ||
        serverError.toLowerCase().includes('expired') ||
        serverError.toLowerCase().includes('malformed') ||
        serverError.toLowerCase().includes('revoked')
      
      if (shouldClearToken) {
        console.warn('[axios] Token is invalid/expired, clearing auth')
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
      }
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
