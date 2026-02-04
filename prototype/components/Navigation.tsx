import { User } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Flask, User as UserIcon, SignOut, Database } from '@phosphor-icons/react'
import { canAccessSchema } from '@/lib/auth'

interface NavigationProps {
  user: User
  currentView: string
  onViewChange: (view: string) => void
  onLogout: () => void
}

export function Navigation({ user, currentView, onViewChange, onLogout }: NavigationProps) {
  const showSchema = canAccessSchema(user)

  return (
    <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Flask size={24} weight="duotone" className="text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">MyLab Platform</h1>
                <p className="text-xs text-muted-foreground">Laboratory Information Management</p>
              </div>
            </div>

            <nav className="flex items-center gap-1 ml-6">
              <Button
                variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                onClick={() => onViewChange('dashboard')}
                className="px-4"
              >
                Dashboard
              </Button>
              <Button
                variant={currentView === 'projects' ? 'default' : 'ghost'}
                onClick={() => onViewChange('projects')}
                className="px-4"
              >
                Projects
              </Button>
              <Button
                variant={currentView === 'samples' ? 'default' : 'ghost'}
                onClick={() => onViewChange('samples')}
                className="px-4"
              >
                Samples
              </Button>
              {showSchema && (
                <Button
                  variant={currentView === 'schema' ? 'default' : 'ghost'}
                  onClick={() => onViewChange('schema')}
                  className="px-4 gap-2"
                >
                  <Database size={16} />
                  Schema
                </Button>
              )}
            </nav>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 h-10">
                <UserIcon size={18} weight="duotone" />
                <span className="hidden sm:inline">{user.name}</span>
                <Badge variant="secondary" className="text-xs">{user.role}</Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive gap-2">
                <SignOut size={16} />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
