import { useState, useEffect } from 'react'
import axios from 'axios'
import { User, UserRole, Project, Sample } from '@/lib/types'
import { FRONTEND_CONFIG, getAvailableModules, checkRouteAccess } from '@/lib/config/frontend'
import { AuthContextProvider } from '@/lib/AuthContext'
import { Login } from '@/components/Login'
import { SuperAdminLogin } from '@/components/SuperAdminLogin'
import { AdminDashboard } from '@/components/AdminDashboard'
import { Navigation } from '@/components/Navigation'
import { Dashboard } from '@/components/Dashboard'
import { ProjectsView } from '@/components/ProjectsView'
import { SamplesView } from '@/components/SamplesView'
import { SchemaExplorer } from '@/components/SchemaExplorer'
import { NotificationCenter } from '@/components/NotificationCenter'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'

const API_BASE = FRONTEND_CONFIG.apiBase

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [adminToken, setAdminToken] = useState<string | null>(null)
  const [adminUser, setAdminUser] = useState<any>(null)
  const [loginMode, setLoginMode] = useState<'user' | 'admin' | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [samples, setSamples] = useState<Sample[]>([])
  const [currentView, setCurrentView] = useState<string>('dashboard')
  const [isInitialized, setIsInitialized] = useState(false)

  // Check for saved admin session
  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken')
    const savedUser = localStorage.getItem('adminUser')
    if (savedToken && savedUser) {
      setAdminToken(savedToken)
      setAdminUser(JSON.parse(savedUser))
      setLoginMode('admin')
    }
    setIsInitialized(true)
  }, [])

  useEffect(() => {
    const initUser = async () => {
      if (currentUser) {
        try {
          const gitHubUser = await window.spark.user()
          if (gitHubUser) {
            setCurrentUser((prev) => {
              if (!prev) return null
              return {
                ...prev,
                id: String(gitHubUser.id),
                email: gitHubUser.email || prev.email,
                name: gitHubUser.login || prev.name,
                avatarUrl: gitHubUser.avatarUrl || prev.avatarUrl,
              }
            })
          }
        } catch (error) {
          console.error('Failed to fetch GitHub user', error)
        }
      }
      setIsInitialized(true)
    }

    initUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchProjects()
      fetchSamples()
    }
  }, [currentUser])

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE}/projects`)
      setProjects(response.data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  const fetchSamples = async () => {
    try {
      const response = await axios.get(`${API_BASE}/samples`)
      setSamples(response.data)
    } catch (error) {
      console.error('Failed to fetch samples:', error)
    }
  }

  const handleLogin = async (role: UserRole) => {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, { role })
      setCurrentUser(response.data.user)
    } catch (error) {
      console.error('Login failed:', error)
      // Fallback to mock user
      const user: User = {
        id: `user-${Date.now()}`,
        email: 'user@mylab.com',
        name: 'Lab User',
        role,
        workspaceId: 'workspace-1',
      }
      setCurrentUser(user)
    }
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setCurrentView('dashboard')
  }

  const handleAdminLogin = (token: string, user: any) => {
    setAdminToken(token)
    setAdminUser(user)
    setLoginMode('admin')
  }

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    setAdminToken(null)
    setAdminUser(null)
    setLoginMode(null)
  }

  const createProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await axios.post(`${API_BASE}/projects`, projectData)
      setProjects(prev => [response.data, ...prev])
    } catch (error) {
      console.error('Failed to create project:', error)
      throw error
    }
  }

  if (!isInitialized) {
    return null
  }

  // Superadmin dashboard mode
  if (loginMode === 'admin') {
    if (!adminToken || !adminUser) {
      return (
        <>
          <SuperAdminLogin onLogin={handleAdminLogin} />
          <Toaster />
        </>
      )
    }
    return (
      <>
        <AdminDashboard user={adminUser} token={adminToken} onLogout={handleAdminLogout} />
        <Toaster />
      </>
    )
  }

  // Login mode selection screen
  if (loginMode === null) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold text-white">MyLab Platform</h1>
            <p className="text-slate-400">Choose your login method</p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => setLoginMode('user')}
              className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
            >
              User Login
            </Button>
            <Button
              onClick={() => setLoginMode('admin')}
              variant="outline"
              className="w-full h-12 text-base border-slate-600 text-slate-200 hover:bg-slate-700"
            >
              Admin Console
            </Button>
          </div>

          <p className="text-xs text-center text-slate-500">
            Select your role to access the appropriate dashboard
          </p>
        </div>
        <Toaster />
      </div>
    )
  }

  // Regular user login
  if (!currentUser) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster />
      </>
    )
  }

  return (
    <AuthContextProvider value={{ user: currentUser, isLoading: false, error: null }}>
      <div className="min-h-screen bg-background">
        <Navigation
          user={currentUser}
          currentView={currentView}
          onViewChange={setCurrentView}
          onLogout={handleLogout}
        />
        {currentView === 'dashboard' && (
          <Dashboard user={currentUser} projects={projects || []} onNavigate={setCurrentView} />
        )}
        {currentView === 'projects' && (
          <ProjectsView user={currentUser} projects={projects || []} onCreateProject={createProject} />
        )}
        {currentView === 'samples' && (
          <SamplesView user={currentUser} samples={samples || []} />
        )}
        {currentView === 'schema' && <SchemaExplorer />}
        {currentView === 'notifications' && <NotificationCenter />}
        <Toaster />
      </div>
    </AuthContextProvider>
  )
}

export default App
