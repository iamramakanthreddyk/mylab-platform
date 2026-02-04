import { useState, useEffect } from 'react'
import axios from 'axios'
import { User, UserRole, Project, Sample } from '@/lib/types'
import { FRONTEND_CONFIG, getAvailableModules, checkRouteAccess } from '@/lib/config/frontend'
import { Login } from '@/components/Login'
import { Navigation } from '@/components/Navigation'
import { Dashboard } from '@/components/Dashboard'
import { ProjectsView } from '@/components/ProjectsView'
import { SamplesView } from '@/components/SamplesView'
import { SchemaExplorer } from '@/components/SchemaExplorer'
import { NotificationCenter } from '@/components/NotificationCenter'
import { Toaster } from '@/components/ui/sonner'

const API_BASE = FRONTEND_CONFIG.apiBase

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [samples, setSamples] = useState<Sample[]>([])
  const [currentView, setCurrentView] = useState<string>('dashboard')
  const [isInitialized, setIsInitialized] = useState(false)

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

  if (!currentUser) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster />
      </>
    )
  }

  return (
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
  )
}

export default App
