import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { User, Project, Sample } from '@/lib/types'
import { AuthContextProvider } from '@/lib/AuthContext'
import { Login } from '@/components/Login'
import { SetPassword } from '@/components/SetPassword'
import { Register } from '@/components/Register'
import { ForgotPassword } from '@/components/ForgotPassword'
import { ResetPassword } from '@/components/ResetPassword'
import { SuperAdminLogin } from '@/components/SuperAdminLogin'
import { AdminDashboard } from '@/components/AdminDashboard'
import { Navigation, NavigationHeader } from '@/components/Navigation'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Dashboard } from '@/components/Dashboard'
import { ProjectsView } from '@/components/ProjectsView'
import { ProjectDetails } from '@/components/ProjectDetails'
import { ProjectTrialsPage } from '@/components/ProjectTrialsPage'
import { SamplesView } from '@/components/SamplesView'
import { BatchesView } from '@/components/BatchesView'
import { BatchDetailView } from '@/components/BatchDetailView'
import { AnalysesView } from '@/components/AnalysesView'
import { SchemaExplorer } from '@/components/SchemaExplorer'
import { NotificationCenter } from '@/components/NotificationCenter'
import { UserManagement } from '@/components/UserManagement'
import { CreateSamplePage } from '@/components/CreateSamplePage'
import { CreateStagePage } from '@/components/CreateStagePage'
import { CreateAnalysisPage } from '@/components/CreateAnalysisPage'
import { CreateProjectPage } from '@/components/CreateProjectPage'
import { CompleteAnalysisPage } from '@/components/CompleteAnalysisPage'
import { SupplyChainCollaboration } from '@/components/SupplyChainCollaboration'
import { ModulePlaceholder } from '@/components/ModulePlaceholder'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import LandingPage from '@/components/LandingPage'

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
    const validateAndRestoreSession = async () => {
      // Check for admin session first (higher priority)
      const adminToken = localStorage.getItem('adminToken')
      const adminUser = localStorage.getItem('adminUser')
      if (adminToken && adminUser) {
        try {
          // TODO: Add token validation API call here if needed
          setAdminToken(adminToken)
          setAdminUser(JSON.parse(adminUser))
          setLoginMode('admin')
          setIsInitialized(true)
          return
        } catch (error) {
          // Invalid admin session, clear it
          localStorage.removeItem('adminToken')
          localStorage.removeItem('adminUser')
        }
      }

      // Check for regular user session
      const savedToken = localStorage.getItem('authToken')
      const savedUser = localStorage.getItem('user')
      if (savedToken && savedUser) {
        try {
          // TODO: Add token validation API call here if needed
          setCurrentUser(JSON.parse(savedUser))
          setLoginMode('user')
          // Token is automatically sent by axios interceptor
        } catch (error) {
          // Invalid user session, clear it
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
        }
      }

      setIsInitialized(true)
    }

    validateAndRestoreSession()
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
      const projectsData = response.data.data || []
      setProjects(projectsData.map((project: any) => ({
        ...project,
        workflowMode: project.workflowMode ?? project.workflow_mode
      })))
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
    navigate('/admin')
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
        <NavigationHeader user={currentUser} onLogout={handleLogout} />
        <SidebarProvider className="overflow-x-hidden">
          <Navigation user={currentUser} onLogout={handleLogout} />
          <SidebarInset className="min-h-screen bg-background overflow-x-hidden">
            <Routes>
              <Route path="/dashboard" element={<Dashboard user={currentUser} projects={projects || []} samples={samples || []} />} />
              <Route path="/projects" element={<ProjectsView user={currentUser} projects={projects || []} onProjectsChange={setProjects} />} />
              <Route path="/projects/create" element={<CreateProjectPage user={currentUser} onProjectsChange={setProjects} />} />
              <Route path="/projects/:id" element={<ProjectDetails user={currentUser} />} />
              <Route path="/projects/:projectId/trials" element={<ProjectTrialsPage user={currentUser} />} />
              <Route path="/projects/:projectId/create-stage" element={<CreateStagePage user={currentUser} />} />
              <Route path="/projects/:projectId/create-sample" element={<CreateSamplePage user={currentUser} />} />
              <Route path="/projects/:projectId/samples/:sampleId/create-analysis" element={<CreateAnalysisPage user={currentUser} />} />
              <Route path="/supply-chain/collaboration" element={<SupplyChainCollaboration user={currentUser} />} />
              <Route path="/samples" element={<SamplesView user={currentUser} samples={samples || []} onSamplesChange={setSamples} />} />
              <Route path="/users" element={<UserManagement user={currentUser} />} />
              <Route path="/batches" element={<BatchesView user={currentUser} />} />
              <Route path="/batches/:batchId" element={<BatchDetailView user={currentUser} />} />
              <Route path="/analyses" element={<AnalysesView user={currentUser} />} />
              <Route path="/analyses/:analysisId/complete" element={<CompleteAnalysisPage user={currentUser} />} />
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
          </SidebarInset>
        </SidebarProvider>
      </AuthContextProvider>
    )
  }

  // Login mode selection screen (when not logged in)
  if (loginMode === null) {
    return (
      <>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
              {/* Background Decorative Elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full opacity-20 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-100 rounded-full opacity-20 blur-3xl"></div>
              </div>

              <div className="relative w-full max-w-2xl">
                {/* Main Card Container */}
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                  <div className="grid md:grid-cols-2 gap-0">
                    {/* Left Section - Branding */}
                    <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-600 to-indigo-600">
                      <div>
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 12h20M12 2v20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M6 8h12M6 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">MyLab Platform</h2>
                        <p className="text-blue-100 text-sm mb-8">Enterprise Laboratory Information Management System</p>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0 mt-1">
                            <span className="text-white text-sm font-bold">✓</span>
                          </div>
                          <p className="text-blue-50 text-sm">Secure access to laboratory data</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0 mt-1">
                            <span className="text-white text-sm font-bold">✓</span>
                          </div>
                          <p className="text-blue-50 text-sm">Real-time experiment monitoring</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0 mt-1">
                            <span className="text-white text-sm font-bold">✓</span>
                          </div>
                          <p className="text-blue-50 text-sm">Advanced reporting & analytics</p>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Login Options */}
                    <div className="p-8 md:p-12 flex flex-col justify-center">
                      <div className="md:hidden text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">MyLab Platform</h1>
                        <p className="text-gray-600 text-sm">Laboratory Information Management System</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-center text-gray-700 font-semibold mb-6">Please select how you'd like to access the platform</p>
                        </div>

                        <Button
                          onClick={() => {
                            setLoginMode('user');
                            navigate('/user-login');
                          }}
                          className="w-full h-14 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Regular User Login
                        </Button>

                        <Button
                          onClick={() => {
                            setLoginMode('admin');
                            navigate('/admin-login');
                          }}
                          className="w-full h-14 text-base font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                          </svg>
                          System Administrator
                        </Button>
                      </div>

                      <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-500 space-y-2">
                        <p>Select your access level to continue to the login screen</p>
                        <p>If you're already logged in, try refreshing the page</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          } />
          <Route path="/user-login" element={<Login onLogin={handleLogin} onNeedSetPassword={() => navigate('/set-password')} />} />
          <Route path="/admin-login" element={<SuperAdminLogin onLogin={handleAdminLogin} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/set-password" element={<SetPassword onSuccess={() => navigate('/')} />} />
          {/* Catch-all route for unmatched paths */}
          <Route path="/*" element={<LandingPage />} />
        </Routes>
        <Toaster />
      </>
    )
  }

  // Regular user login (if loginMode is 'user' but not logged in yet)
  if (loginMode === 'user' && !currentUser) {
    return (
      <>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<div>Redirecting...</div>} />
          <Route path="/user-login" element={<Login onLogin={handleLogin} onNeedSetPassword={() => navigate('/set-password')} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/set-password" element={<SetPassword onSuccess={() => navigate('/')} />} />
          {/* Catch-all route for unmatched paths */}
          <Route path="/*" element={<LandingPage />} />
        </Routes>
        <Toaster />
      </>
    )
  }

  // Default fallback for unhandled states
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/*" element={<LandingPage />} />
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
