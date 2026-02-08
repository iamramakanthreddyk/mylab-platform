import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { User, UserRole, Project, Sample } from '@/lib/types'
import { FRONTEND_CONFIG, getAvailableModules, checkRouteAccess } from '@/lib/config/frontend'
import { AuthContextProvider } from '@/lib/AuthContext'
import { Login } from '@/components/Login'
import { SetPassword } from '@/components/SetPassword'
import { Register } from '@/components/Register'
import { ForgotPassword } from '@/components/ForgotPassword'
import { ResetPassword } from '@/components/ResetPassword'
import { SuperAdminLogin } from '@/components/SuperAdminLogin'
import { AdminDashboard } from '@/components/AdminDashboard'
import { Navigation } from '@/components/Navigation'
import { Dashboard } from '@/components/Dashboard'
import { ProjectsView } from '@/components/ProjectsView'
import { ProjectDetails } from '@/components/ProjectDetails'
import { SamplesView } from '@/components/SamplesView'
import { BatchesView } from '@/components/BatchesView'
import { AnalysesView } from '@/components/AnalysesView'
import { SchemaExplorer } from '@/components/SchemaExplorer'
import { NotificationCenter } from '@/components/NotificationCenter'
import { UsersManager } from '@/components/UsersManager'
import { CreateSamplePage } from '@/components/CreateSamplePage'
import { CreateStagePage } from '@/components/CreateStagePage'
import { CreateAnalysisPage } from '@/components/CreateAnalysisPage'
import { SupplyChainCollaboration } from '@/components/SupplyChainCollaboration'
import { ModulePlaceholder } from '@/components/ModulePlaceholder'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'

function AppContent() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [adminToken, setAdminToken] = useState<string | null>(null)
  const [adminUser, setAdminUser] = useState<any>(null)
  const [loginMode, setLoginMode] = useState<'user' | 'admin' | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [samples, setSamples] = useState<Sample[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Check for saved sessions on app load
  useEffect(() => {
    // Check for regular user session
    const savedToken = localStorage.getItem('authToken')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      setCurrentUser(JSON.parse(savedUser))
      setLoginMode('user')
      // Token is automatically sent by axios interceptor
    }

    // Check for admin session
    const adminToken = localStorage.getItem('adminToken')
    const adminUser = localStorage.getItem('adminUser')
    if (adminToken && adminUser) {
      setAdminToken(adminToken)
      setAdminUser(JSON.parse(adminUser))
      setLoginMode('admin')
    }

    setIsInitialized(true)
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchProjects()
      fetchSamples()
    }
  }, [currentUser])

  const fetchProjects = async () => {
    try {
      const response = await axiosInstance.get(`/projects`)
      // API returns { success, data, count } - extract the data array
      setProjects(response.data.data || [])
    } catch (error: any) {
      // Always set empty array on error to prevent crashes
      setProjects([])
      // Log specific error types
      if (error.response?.status === 404) {
        console.log('Projects endpoint not available yet')
      } else if (error.response?.status === 401) {
        console.error('Not authorized to fetch projects')
      } else if (error.response?.status === 400) {
        console.error('Bad request to projects endpoint:', error.response?.data)
      } else {
        console.error('Failed to fetch projects:', error)
      }
    }
  }

  const fetchSamples = async () => {
    try {
      const response = await axiosInstance.get(`/samples`)
      // API returns { success, data, count } - extract the data array
      setSamples(response.data.data || [])
    } catch (error: any) {
      // Always set empty array on error to prevent crashes
      setSamples([])
      // Log specific error types
      if (error.response?.status === 404) {
        console.log('Samples endpoint not available yet')
      } else if (error.response?.status === 401) {
        console.error('Not authorized to fetch samples')
      } else if (error.response?.status === 400) {
        console.error('Bad request to samples endpoint:', error.response?.data)
      } else {
        console.error('Failed to fetch samples:', error)
      }
    }
  }

  const handleLogin = (user: User, token: string) => {
    setCurrentUser(user)
    setLoginMode('user')
    localStorage.setItem('authToken', token)
    localStorage.setItem('user', JSON.stringify(user))
    navigate('/dashboard')
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setLoginMode(null)
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    navigate('/')
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
      const response = await axiosInstance.post(`/projects`, projectData)
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
    return (
      <>
        <Routes>
          <Route path="/" element={<SuperAdminLogin onLogin={handleAdminLogin} />} />
          <Route path="/admin" element={<AdminDashboard token={adminToken!} user={adminUser} onLogout={handleAdminLogout} />} />
        </Routes>
        <Toaster />
      </>
    )
  }

  // If user is logged in, show main app (regardless of loginMode)
  if (currentUser) {
    return (
      <AuthContextProvider value={{ user: currentUser, isLoading: false, error: null }}>
        <div className="min-h-screen bg-background">
          <Navigation
            user={currentUser}
            onLogout={handleLogout}
          />
          <Routes>
            <Route path="/dashboard" element={<Dashboard user={currentUser} projects={projects || []} samples={samples || []} />} />
            <Route path="/projects" element={<ProjectsView user={currentUser} projects={projects || []} onProjectsChange={setProjects} />} />
            <Route path="/projects/:id" element={<ProjectDetails user={currentUser} />} />
            <Route path="/projects/:projectId/create-stage" element={<CreateStagePage user={currentUser} />} />
            <Route path="/projects/:projectId/create-sample" element={<CreateSamplePage user={currentUser} />} />
            <Route path="/projects/:projectId/samples/:sampleId/create-analysis" element={<CreateAnalysisPage user={currentUser} />} />
            <Route path="/supply-chain/collaboration" element={<SupplyChainCollaboration user={currentUser} />} />
            <Route path="/samples" element={<SamplesView user={currentUser} samples={samples || []} onSamplesChange={setSamples} />} />
            <Route path="/users" element={<UsersManager user={currentUser} />} />
            <Route path="/batches" element={<BatchesView user={currentUser} />} />
            <Route path="/analyses" element={<AnalysesView user={currentUser} />} />
            <Route path="/analytics" element={<ModulePlaceholder user={currentUser} moduleId="analytics" />} />
            <Route path="/compliance" element={<ModulePlaceholder user={currentUser} moduleId="compliance" />} />
            <Route path="/integration" element={<ModulePlaceholder user={currentUser} moduleId="integration" />} />
            <Route path="/marketplace" element={<ModulePlaceholder user={currentUser} moduleId="marketplace" />} />
            <Route path="/support" element={<ModulePlaceholder user={currentUser} moduleId="support" />} />
            <Route path="/schema" element={<SchemaExplorer />} />
            <Route path="/notifications" element={<NotificationCenter />} />
            <Route path="/" element={<Dashboard user={currentUser} projects={projects || []} samples={samples || []} />} />
          </Routes>
          <Toaster />
        </div>
      </AuthContextProvider>
    )
  }

  // Login mode selection screen (when not logged in)
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
  return (
    <>
      <Routes>
        <Route path="/" element={<Login onLogin={handleLogin} onNeedSetPassword={() => navigate('/set-password')} />} />
        <Route path="/login" element={<Login onLogin={handleLogin} onNeedSetPassword={() => navigate('/set-password')} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/set-password" element={<SetPassword onSuccess={() => navigate('/')} />} />
      </Routes>
      <Toaster />
    </>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
