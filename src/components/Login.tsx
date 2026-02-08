import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md shadow-xl border-2">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Flask size={32} weight="duotone" className="text-primary" />
            </div>
            <div>
              <CardTitle className="text-3xl mb-2">MyLab Platform</CardTitle>
              <CardDescription className="text-base">
                Enterprise Laboratory Information Management System
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <EnvelopeOpen size={16} />
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <LockOpen size={16} />
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isLoading || !email || !password}
              >
                {isLoading ? 'Signing In...' : 'Sign In to Platform'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot your password?
                </button>
              </div>
            </form>

            <div className="pt-4 border-t text-center text-xs text-muted-foreground">
              <p>Need an account?</p>
              <p className="mt-1">Contact your administrator to register</p>
              <p className="mt-3">
                <button
                  type="button"
                  onClick={onNeedSetPassword}
                  className="text-primary hover:underline font-medium"
                >
                  Need to set your password?
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
