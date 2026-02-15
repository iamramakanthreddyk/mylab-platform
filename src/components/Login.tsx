import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Flask, EnvelopeOpen, LockOpen } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface LoginProps {
  onLogin: (user: any, token: string) => void
  onNeedSetPassword: () => void
}

export function Login({ onLogin, onNeedSetPassword }: LoginProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await axiosInstance.post(`/auth/login`, {
        email,
        password,
      })

      const { user, token } = response.data

      // Store token in localStorage (interceptor will use this)
      localStorage.setItem('authToken', token)
      localStorage.setItem('user', JSON.stringify(user))

      onLogin(user, token)
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-100 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-2xl"
      >
        {/* Main Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left Section - Branding */}
            <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-600 to-indigo-600">
              <div>
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-8">
                  <Flask size={48} weight="duotone" className="text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">MyLab Platform</h2>
                <p className="text-blue-100 text-sm mb-12">Enterprise Laboratory Information Management System</p>
              </div>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-lg font-bold">✓</span>
                  </div>
                  <div>
                    <p className="text-blue-50 font-semibold text-sm">Secure Access</p>
                    <p className="text-blue-100 text-xs mt-1">Enterprise-grade authentication</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-lg font-bold">✓</span>
                  </div>
                  <div>
                    <p className="text-blue-50 font-semibold text-sm">Real-Time Data</p>
                    <p className="text-blue-100 text-xs mt-1">Access your laboratory information</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-lg font-bold">✓</span>
                  </div>
                  <div>
                    <p className="text-blue-50 font-semibold text-sm">24/7 Support</p>
                    <p className="text-blue-100 text-xs mt-1">Always available when you need it</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Login Form */}
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <div className="md:hidden text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Flask size={40} weight="duotone" className="text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">MyLab Platform</h1>
                <p className="text-gray-600 text-sm">Enterprise Laboratory Information Management System</p>
              </div>

              <div>
                {/* Error Alert */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-base font-semibold flex items-center gap-2 text-gray-900">
                      <EnvelopeOpen size={20} className="text-blue-600" />
                      Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="your.email@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-14 text-base border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-base font-semibold flex items-center gap-2 text-gray-900">
                      <LockOpen size={20} className="text-blue-600" />
                      Password
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-14 text-base border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-14 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg mt-8"
                    disabled={isLoading || !email || !password}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Signing In...
                      </span>
                    ) : (
                      'Sign In to Platform'
                    )}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                    >
                      Forgot your password?
                    </button>
                  </div>
                </form>

                {/* Footer Links */}
                <div className="mt-8 pt-8 border-t border-gray-200 text-center space-y-3">
                  <p className="text-gray-700 font-medium">Need an account?</p>
                  <p className="text-gray-600 text-sm">Contact your administrator to register</p>
                  <button
                    type="button"
                    onClick={onNeedSetPassword}
                    className="inline-block mt-4 px-6 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors text-sm"
                  >
                    Need to set your password?
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
