import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { User, UserRole, Project, Sample } from '@/lib/types'
import { seedProjects, seedSamples } from '@/lib/seed-data'
import { Login } from '@/components/Login'
import { Navigation } from '@/components/Navigation'
import { Dashboard } from '@/components/Dashboard'
import { ProjectsView } from '@/components/ProjectsView'
import { SamplesView } from '@/components/SamplesView'
import { SchemaExplorer } from '@/components/SchemaExplorer'
import { Toaster } from '@/components/ui/sonner'

function App() {
  const [currentUser, setCurrentUser] = useKV<User | null>('mylab-current-user', null)
  const [projects, setProjects] = useKV<Project[]>('mylab-projects', [])
  const [samples, setSamples] = useKV<Sample[]>('mylab-samples', [])
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
    if (currentUser && (!projects || projects.length === 0)) {
      setProjects(seedProjects)
    }
    if (currentUser && (!samples || samples.length === 0)) {
      setSamples(seedSamples)
    }
  }, [currentUser])

  const handleLogin = (role: UserRole) => {
    const user: User = {
      id: `user-${Date.now()}`,
      email: 'user@mylab.com',
      name: 'Lab User',
      role,
      workspaceId: 'workspace-1',
    }
    setCurrentUser(user)
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setCurrentView('dashboard')
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
        <ProjectsView user={currentUser} projects={projects || []} onProjectsChange={setProjects} />
      )}
      {currentView === 'samples' && (
        <SamplesView user={currentUser} samples={samples || []} />
      )}
      {currentView === 'schema' && <SchemaExplorer />}
      <Toaster />
    </div>
  )
}

export default App
