import { User } from '@/lib/types'

interface ModulePlaceholderProps {
  user: User
  moduleId: string
}

export function ModulePlaceholder({ user, moduleId }: ModulePlaceholderProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">{moduleId.charAt(0).toUpperCase() + moduleId.slice(1)} Module</h1>
        <p className="text-muted-foreground mb-4">This module is coming soon...</p>
        <p className="text-sm text-muted-foreground">Logged in as: {user.email}</p>
      </div>
    </div>
  )
}