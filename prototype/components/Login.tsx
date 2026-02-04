import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserRole } from '@/lib/types'
import { Flask, User as UserIcon } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface LoginProps {
  onLogin: (role: UserRole) => void
}

export function Login({ onLogin }: LoginProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('Scientist')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    onLogin(selectedRole)
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
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <UserIcon size={16} />
                Select Your Role
              </label>
              <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val as UserRole)}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin - Full System Access</SelectItem>
                  <SelectItem value="Manager">Manager - Project & Schema Access</SelectItem>
                  <SelectItem value="Scientist">Scientist - Lab Operations</SelectItem>
                  <SelectItem value="Viewer">Viewer - Read-Only Access</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedRole === 'Admin' && 'Complete system control including schema access'}
                {selectedRole === 'Manager' && 'Manage projects and view database schema'}
                {selectedRole === 'Scientist' && 'Create and manage projects and samples'}
                {selectedRole === 'Viewer' && 'View projects and samples (read-only)'}
              </p>
            </div>

            <Button 
              onClick={handleLogin} 
              className="w-full h-12 text-base"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In to Platform'}
            </Button>

            <div className="pt-4 border-t text-center text-xs text-muted-foreground">
              <p>Demo Mode - No credentials required</p>
              <p className="mt-1">Change roles anytime to explore different access levels</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
