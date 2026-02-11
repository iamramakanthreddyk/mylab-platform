import { User } from '@/lib/types'
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  SidebarTrigger
} from '@/components/ui/sidebar'
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
import { Flask, User as UserIcon, SignOut, Database, Bell, Buildings, ChartBar, ChartLine, TestTube, FolderOpen } from '@phosphor-icons/react'
import { Link, useLocation } from 'react-router-dom'

interface NavigationProps {
  user: User
  onLogout: () => void
}

export function NavigationHeader({ user, onLogout }: NavigationProps) {
  const firstName = user.name.split(' ')[0] || user.name

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/70 backdrop-blur">
      <div className="flex items-center justify-between py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <Flask size={20} weight="duotone" className="text-primary" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-semibold leading-none">{FRONTEND_CONFIG.name}</span>
            <span className="text-xs text-muted-foreground">v{FRONTEND_CONFIG.version}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/notifications">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell size={18} weight="duotone" />
              <span className="sr-only">Notifications</span>
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 rounded-full px-3 h-9 hover:bg-primary/10">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                  <UserIcon size={14} weight="fill" className="text-primary" />
                </div>
                <span className="text-sm font-semibold hidden sm:inline">{firstName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3 py-2">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <UserIcon size={20} weight="fill" className="text-primary" />
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
    </header>
  )
}

export function Navigation({ user, onLogout }: NavigationProps) {
  const location = useLocation()
  const currentView = location.pathname.split('/')[1] || 'dashboard'
  const showSchema = user.role.toLowerCase() === 'platform_admin'
  const normalizedRole = user.role.toLowerCase()
  const availableModules = getAvailableModules(user.role)
    .filter(module => module.id !== 'login' && module.id !== 'notifications')
  const showSupplyChain = normalizedRole === 'admin' || normalizedRole === 'manager'

  const getModuleIcon = (moduleId: string) => {
    switch (moduleId) {
      case 'dashboard':
        return <ChartBar size={16} />
      case 'projects':
        return <FolderOpen size={16} />
      case 'samples':
        return <TestTube size={16} />
      case 'batches':
        return <ChartLine size={16} />
      case 'analyses':
        return <ChartLine size={16} />
      case 'analytics':
        return <ChartBar size={16} />
      case 'compliance':
        return <Database size={16} />
      case 'support':
        return <Bell size={16} />
      default:
        return <Flask size={16} />
    }
  }

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent className="overflow-x-hidden">
        <div className="hidden md:flex mb-4">
          <SidebarTrigger />
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarMenu>
            {availableModules.map(module => (
              <SidebarMenuItem key={module.id}>
                <SidebarMenuButton
                  asChild
                  isActive={currentView === module.id}
                  size="lg"
                  className="rounded-lg px-3"
                >
                  <Link to={`/${module.id}`} className="flex items-center gap-2 w-full min-w-0">
                    {getModuleIcon(module.id)}
                    <span className="truncate">{module.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {showSupplyChain && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={currentView.startsWith('supply-chain')}
                  size="lg"
                  className="rounded-lg px-3"
                >
                  <Link to="/supply-chain/collaboration" className="flex items-center gap-2 w-full min-w-0">
                    <Buildings size={16} />
                    <span className="truncate">Supply Chain</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarMenu>
            {(normalizedRole === 'admin' || normalizedRole === 'platform_admin') && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={currentView === 'dashboard'}
                  size="lg"
                  className="rounded-lg px-3"
                >
                  <Link to="/dashboard" className="flex items-center gap-2 w-full min-w-0">
                    <span className="truncate">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {(normalizedRole === 'admin' || normalizedRole === 'manager') && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={currentView === 'users'}
                  size="lg"
                  className="rounded-lg px-3"
                >
                  <Link to="/users" className="flex items-center gap-2 w-full min-w-0">
                    <UserIcon size={16} />
                    <span className="truncate">Users</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {showSchema && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={currentView === 'schema'}
                  size="lg"
                  className="rounded-lg px-3"
                >
                  <Link to="/schema" className="flex items-center gap-2 w-full min-w-0">
                    <Database size={16} />
                    <span className="truncate">Schema</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
