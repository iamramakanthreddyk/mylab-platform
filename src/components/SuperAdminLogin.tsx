import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { FRONTEND_CONFIG } from '@/lib/config/frontend'

interface SuperAdminLoginProps {
  onLogin: (token: string, user: any) => void
  onError?: (message: string) => void
}

const API_BASE = FRONTEND_CONFIG.apiBase

export function SuperAdminLogin({ onLogin, onError }: SuperAdminLoginProps) {
  const [email, setEmail] = useState('superadmin@mylab.io')
  const [password, setPassword] = useState('SuperAdmin123!')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await axios.post(`${API_BASE}/admin/auth/login`, {
        email,
        password,
      })

      const { token, admin } = response.data
      localStorage.setItem('adminToken', token)
      localStorage.setItem('adminUser', JSON.stringify(admin))
      onLogin(token, admin)
    } catch (err: any) {
      const message = err.response?.data?.message || 'Invalid credentials'
      setError(message)
      onError?.(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md shadow-2xl border border-slate-700 bg-slate-800">
          <CardHeader className="text-center space-y-2 pb-6 border-b border-slate-700">
            <div className="mx-auto w-14 h-14 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">⚙️</span>
            </div>
            <CardTitle className="text-2xl text-white">Admin Console</CardTitle>
            <CardDescription className="text-slate-400">
              MyLab Platform Administration
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superadmin@mylab.io"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                  <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In as Admin'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-700 space-y-2">
              <p className="text-xs text-slate-400 text-center font-medium">Demo Credentials</p>
              <div className="bg-slate-700/50 rounded p-3 space-y-1">
                <p className="text-xs text-slate-300">
                  <span className="font-mono text-blue-400">superadmin@mylab.io</span>
                </p>
                <p className="text-xs text-slate-300">
                  <span className="font-mono text-blue-400">SuperAdmin123!</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
