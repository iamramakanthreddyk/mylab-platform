/**
 * Create Project Page
 * Full-page form for creating new research and testing initiatives
 * Replaces the previous modal implementation
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { CreateProjectFormState, transformProjectForAPI } from '@/lib/endpointTransformers'
import { User, Project, Organization, WorkflowMode } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface CreateProjectPageProps {
  user: User
  onProjectsChange?: (projects: Project[]) => void
}

export function CreateProjectPage({ user, onProjectsChange }: CreateProjectPageProps) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(true)

  const [formData, setFormData] = useState<CreateProjectFormState>({
    name: '',
    description: '',
    clientOrgId: null,
    clientOrgLookupId: '',
    externalClientName: '',
    clientMode: 'registered',
    executingOrgId: '',
    workflowMode: 'trial_first',
  })

  // Fetch organizations on mount
  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        console.warn('No auth token found - user may not be logged in')
        setLoadingOrgs(false)
        toast.error('You must be logged in to access this page')
        // Redirect to login after a short delay
        setTimeout(() => navigate('/login'), 2000)
        return
      }

      const response = await axiosInstance.get('/organizations')
      const orgs = response.data.data || response.data
      setOrganizations(Array.isArray(orgs) ? orgs : [])
    } catch (error: any) {
      console.error('Error fetching organizations:', error)
      if (error.response?.status === 401) {
        // 401 - check if it's a token problem or something else
        const serverError = error.response?.data?.error || ''
        const isTokenError = serverError.toLowerCase().includes('invalid') || 
                           serverError.toLowerCase().includes('expired') ||
                           serverError.toLowerCase().includes('malformed')
        
        if (isTokenError) {
          toast.error('Your session has expired. Please log in again.')
          navigate('/login')
        } else {
          // 401 but might not be a token issue - could be backend validation
          console.log('401 error but not token-related:', serverError)
          // Don't show "session expired" if token exists - just show a generic error
          const hasToken = !!localStorage.getItem('authToken')
          if (hasToken) {
            toast.error('Unable to load organizations. Please try refreshing the page.')
          } else {
            toast.error('Session ended. Please log in again.')
            navigate('/login')
          }
        }
      } else {
        toast.error('Failed to load organizations')
      }
    } finally {
      setLoadingOrgs(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name.trim()) {
      toast.error('Project name is required')
      return
    }

    const clientOrgId = formData.clientOrgId || formData.clientOrgLookupId.trim()
    const externalClientName = formData.externalClientName.trim()

    if (!clientOrgId && !externalClientName) {
      toast.error('Provide a registered client org or an external client name')
      return
    }

    if (!formData.executingOrgId) {
      toast.error('Executing lab is required')
      return
    }

    setIsLoading(true)
    try {
      // Check token before making request
      const token = localStorage.getItem('authToken')
      if (!token) {
        toast.error('Session expired. Please log in again.')
        navigate('/login')
        return
      }

      const transformedData = transformProjectForAPI({
        ...formData,
        clientOrgLookupId: formData.clientOrgLookupId.trim(),
        externalClientName,
      })

      const response = await axiosInstance.post('/projects', transformedData)
      const createdProject = response.data.data || response.data

      toast.success(`Project "${formData.name}" created successfully`)
      
      // Notify parent if callback provided
      if (onProjectsChange) {
        onProjectsChange([createdProject])
      }

      // Redirect to project details
      navigate(`/projects/${createdProject.id}`)
    } catch (error: any) {
      console.error('Error creating project:', error)
      
      let errorMessage = 'Failed to create project'
      let detailedMessage = ''
      
      if (error.response?.status === 401) {
        // Check if this is actually a token/session issue
        const serverError = error.response?.data?.error || ''
        const isTokenError = serverError.toLowerCase().includes('invalid') || 
                           serverError.toLowerCase().includes('expired') ||
                           serverError.toLowerCase().includes('malformed')
        
        const hasToken = !!localStorage.getItem('authToken')
        
        if (isTokenError || !hasToken) {
          // Real session/token problem
          errorMessage = 'Your session has expired. Please log in again.'
          setTimeout(() => navigate('/login'), 2000)
        } else {
          // 401 but not necessarily a session issue - might be a backend problem
          errorMessage = 'Authentication check failed. Please try again.'
          detailedMessage = serverError || 'Please ensure your credentials are still valid.'
        }
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to create projects'
      } else if (error.response?.status === 400) {
        const data = error.response?.data
        
        // Check for organization not found errors
        if (data?.details?.clientOrgId) {
          errorMessage = '❌ Client Organization Not Found'
          detailedMessage = `${data.details.clientOrgId}\n\nAction: Ask your admin to register this organization first.`
        } else if (data?.details?.executingOrgId) {
          errorMessage = '❌ Lab Organization Not Found'
          detailedMessage = `${data.details.executingOrgId}\n\nAction: Ask your admin to register this laboratory first.`
        } else if (data?.error) {
          errorMessage = data.error
          detailedMessage = data.hint || (data?.details ? JSON.stringify(data.details) : '')
        } else {
          errorMessage = 'Invalid project data. Please check all fields.'
        }
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }
      
      if (detailedMessage) {
        toast.error(`${errorMessage}\n\n${detailedMessage}`)
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/projects')}
            className="mb-4 gap-2"
          >
            <ArrowLeft size={18} />
            Back to Projects
          </Button>
          
          <div>
            <h1 className="text-4xl font-bold mb-2">Create New Project</h1>
            <p className="text-muted-foreground text-lg">
              Set up a new research or testing initiative
            </p>
          </div>
        </div>

        {/* Main Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>
              Define the basic details and organization roles for your project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="name" className="font-semibold">
                  Project Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Polymer Stability Study, Flow Chemistry Optimization"
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Give your project a clear, descriptive name
                </p>
              </div>

              {/* Project Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the project objectives, scope, and key goals..."
                  rows={4}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Provide context about what this project will accomplish
                </p>
              </div>

              {/* Organization Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client Organization */}
                <div className="space-y-2">
                  <Label className="font-semibold">
                    Client <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200 mb-3">
                    Choose a registered client org or provide an external client name.
                  </p>

                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, clientMode: 'registered', externalClientName: '' })}
                      className={`flex-1 px-3 py-2 rounded border text-sm font-medium transition-colors ${
                        formData.clientMode === 'registered'
                          ? 'bg-blue-100 border-blue-300 text-blue-900'
                          : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                      disabled={isLoading}
                    >
                      Registered Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, clientMode: 'external', clientOrgId: null, clientOrgLookupId: '' })}
                      className={`flex-1 px-3 py-2 rounded border text-sm font-medium transition-colors ${
                        formData.clientMode === 'external'
                          ? 'bg-green-100 border-green-300 text-green-900'
                          : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                      disabled={isLoading}
                    >
                      External Client
                    </button>
                  </div>

                  {formData.clientMode === 'registered' && (
                    <>
                      <Select
                        value={formData.clientOrgId || ''}
                        onValueChange={(val) => {
                          setFormData({ ...formData, clientOrgId: val || null, clientOrgLookupId: '' })
                        }}
                        disabled={isLoading || loadingOrgs}
                      >
                        <SelectTrigger id="client">
                          <SelectValue placeholder="Select from registered organizations" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              No client organizations found
                            </div>
                          ) : (
                            organizations
                              .filter(org => org.type === 'Client' || org.type === 'Internal' || org.type === 'client' || org.type === 'internal' || org.type === 'pharma')
                              .map(org => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                      
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Or paste UUID if not in list:</p>
                        <Input
                          placeholder="f47ac10b-58cc-4372-a567-0e02b2c3d479"
                          value={formData.clientOrgLookupId}
                          onChange={(e) => {
                            setFormData({ ...formData, clientOrgLookupId: e.target.value })
                          }}
                          disabled={isLoading}
                          className="text-sm"
                        />
                      </div>
                    </>
                  )}

                  {formData.clientMode === 'external' && (
                    <div className="space-y-2">
                      <p className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                        Enter the external client's name (will be linked later when onboarded).
                      </p>
                      <Input
                        placeholder="e.g., Acme Pharmaceuticals Inc."
                        value={formData.externalClientName}
                        onChange={(e) => {
                          setFormData({ ...formData, externalClientName: e.target.value })
                        }}
                        disabled={isLoading}
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Executing Lab */}
                <div className="space-y-2">
                  <Label htmlFor="executing" className="font-semibold">
                    Executing Lab <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.executingOrgId}
                    onValueChange={(val) => setFormData({ ...formData, executingOrgId: val })}
                    disabled={isLoading || loadingOrgs}
                  >
                    <SelectTrigger id="executing">
                      <SelectValue placeholder="Select executing lab" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No organizations available
                        </div>
                      ) : (
                        organizations
                          .filter(org => 
                            org.type === 'laboratory' || 
                            org.type === 'Laboratory' || 
                            org.type === 'cro' || 
                            org.type === 'analyzer' ||
                            org.type === 'testing_facility' ||
                            org.type === 'research_institute' ||
                            org.type === 'Internal'
                          )
                          .map(org => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The laboratory performing the experiments and analysis. Must be registered by your superadmin.
                  </p>
                </div>
              </div>

              {/* Workflow Selection */}
              <div className="space-y-2">
                <Label htmlFor="workflow" className="font-semibold">
                  Project Workflow <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.workflowMode}
                  onValueChange={(val) => setFormData({ ...formData, workflowMode: val as WorkflowMode })}
                  disabled={isLoading}
                >
                  <SelectTrigger id="workflow">
                    <SelectValue placeholder="Select workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial_first">
                      Trial-first (Flow chemistry)
                    </SelectItem>
                    <SelectItem value="analysis_first">
                      Analysis-first (QC / Routine analysis)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Trial-first starts with experiments and then selects samples for analysis.
                  Analysis-first captures samples first, then runs analyses.
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/projects')}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="ml-auto"
                >
                  {isLoading ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Information Panel */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">What happens next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              After creating your project, you'll be able to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Add project stages or trials depending on your workflow</li>
              <li>Create samples and associate them with the project</li>
              <li>Assign team members and manage permissions</li>
              <li>Track experiments, analyses, and results</li>
              <li>Collaborate with other organizations if configured</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
