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
      const serverError = error.response?.data?.error || ''
      
      // Log the 401 for debugging
      console.warn('[axios] Got 401 response:', {
        url: error.config?.url,
        method: error.config?.method,
        message: serverError
      })
      
      // Clear token on ANY 401 - token is either invalid, expired, or user no longer has access
      // This handles: invalid token, expired token, user not found, etc.
      console.warn('[axios] Clearing auth due to 401 response')
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      
      // Optional: Navigate to login if in app context
      // window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
