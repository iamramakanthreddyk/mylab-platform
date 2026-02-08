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
import { Flask, User as UserIcon, SignOut, Database, Bell, Buildings } from '@phosphor-icons/react'
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
              
              {/* Supply Chain Collaboration - for inter-organizational workflows */}
              <Link to="/supply-chain/collaboration">
                <Button
                  variant={currentView.startsWith('supply-chain') ? 'default' : 'ghost'}
                  className="px-4 gap-2"
                >
                  <Buildings size={16} />
                  Supply Chain
                </Button>
              </Link>
              
              {/* Users Management */}
              {(user.role === 'Admin' || user.role === 'Manager') && (
                <Link to="/users">
                  <Button
                    variant={currentView === 'users' ? 'default' : 'ghost'}
                    className="px-4 gap-2"
                  >
                    <UserIcon size={16} />
                    Users
                  </Button>
                </Link>
              )}
              
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

          <div className="flex items-center gap-3">
            <Link to="/notifications">
              <Button
                variant={currentView === 'notifications' ? 'default' : 'ghost'}
                size="icon"
                className="rounded-full relative"
              >
                <Bell size={20} weight="duotone" />
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 rounded-full px-3 h-10 hover:bg-primary/10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <UserIcon size={16} weight="fill" className="text-primary" />
                    </div>
                    <div className="hidden sm:flex flex-col items-start gap-0">
                      <span className="text-sm font-semibold leading-none">{user.name.split(' ')[0]}</span>
                      <span className="text-xs text-muted-foreground">{user.role}</span>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <UserIcon size={24} weight="fill" className="text-primary" />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="font-semibold text-sm leading-none">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <Badge variant="secondary" className="w-fit text-xs mt-1">{user.role}</Badge>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-destructive gap-2 cursor-pointer py-2">
                  <SignOut size={16} weight="duotone" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}
