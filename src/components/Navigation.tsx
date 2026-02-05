import { User } from '@/lib/types'
import { FRONTEND_CONFIG, getAvailableModules } from '@/lib/config/frontend'
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
import { Link, useLocation } from 'react-router-dom'

interface NavigationProps {
  user: User
  onLogout: () => void
}

export function Navigation({ user, onLogout }: NavigationProps) {
  const location = useLocation()
  const currentView = location.pathname.slice(1) || 'dashboard'
  const showSchema = canAccessSchema(user)
  const availableModules = getAvailableModules(user.role)

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
                <h1 className="text-xl font-bold tracking-tight">{FRONTEND_CONFIG.name}</h1>
                <p className="text-xs text-muted-foreground">v{FRONTEND_CONFIG.version}</p>
              </div>
            </div>

            <nav className="flex items-center gap-1 ml-6">
              {availableModules
                .map(module => (
                  <Link key={module.id} to={`/${module.id}`}>
                    <Button
                      variant={currentView === module.id ? 'default' : 'ghost'}
                      className="px-4"
                    >
                      {module.name}
                    </Button>
                  </Link>
                ))}
              {showSchema && (
                <Link to="/schema">
                  <Button
                    variant={currentView === 'schema' ? 'default' : 'ghost'}
                    className="px-4 gap-2"
                  >
                    <Database size={16} />
                    Schema
                  </Button>
                </Link>
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
