import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { transformStageForAPI } from '@/lib/endpointTransformers'
import { Project, ProjectStage, User } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, FloppyDisk } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface CreateStagePageProps {
  user: User
}

export function CreateStagePage({ user }: CreateStagePageProps) {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [existingStages, setExistingStages] = useState<ProjectStage[]>([])

  const [stage, setStage] = useState<Partial<ProjectStage>>({
    name: '',
    description: '',
    expected_start_date: '',
    expected_end_date: '',
    status: 'Planning',
    notes: ''
  })

  useEffect(() => {
    if (projectId) {
      fetchProject()
      fetchExistingStages()
    }
  }, [projectId])

  const fetchProject = async () => {
    try {
      const response = await axiosInstance.get(`/projects/${projectId}`)
      setProject(response.data.data)
    } catch (error) {
      console.error('Failed to fetch project:', error)
      toast.error('Failed to load project')
      navigate('/projects')
    }
  }

  const fetchExistingStages = async () => {
    try {
      const response = await axiosInstance.get(`/projects/${projectId}/stages`)
      setExistingStages(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch stages:', error)
      setExistingStages([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const transformedData = transformStageForAPI({
        ...stage,
        order_index: existingStages.length + 1
      })

      await axiosInstance.post(`/projects/${projectId}/stages`, transformedData)
      toast.success('Stage created successfully')
      navigate(`/projects/${projectId}`)
    } catch (error: any) {
      console.error('Failed to create stage:', error)
      const errorMessage = error.response?.data?.details 
        ? Object.values(error.response.data.details).join(', ')
        : error.response?.data?.error || 'Failed to create stage'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading project...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/projects/${projectId}`)}
            className="gap-2"
          >
            <ArrowLeft size={16} />
            Back to Project
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Create Stage</h1>
            <p className="text-muted-foreground">
              {project.name} - Add a new project stage
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Stage Information</CardTitle>
            <CardDescription>
              Define a project stage to organize samples and trials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Stage Name *</Label>
                <Input
                  id="name"
                  value={stage.name}
                  onChange={(e) => setStage(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Initial Testing, Optimization, Validation"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={stage.description}
                  onChange={(e) => setStage(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the goals and activities of this stage"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Expected Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={stage.expected_start_date}
                    onChange={(e) => setStage(prev => ({ ...prev, expected_start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Expected End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={stage.expected_end_date}
                    onChange={(e) => setStage(prev => ({ ...prev, expected_end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Initial Status</Label>
                <Select
                  value={stage.status}
                  onValueChange={(value) => setStage(prev => ({ 
                    ...prev, 
                    status: value as ProjectStage['status']
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planning">📋 Planning</SelectItem>
                    <SelectItem value="In Progress">🔄 In Progress</SelectItem>
                    <SelectItem value="On Hold">⏸️ On Hold</SelectItem>
                    <SelectItem value="Completed">✅ Completed</SelectItem>
                    <SelectItem value="Cancelled">❌ Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={stage.notes}
                  onChange={(e) => setStage(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes or requirements for this stage"
                  rows={3}
                />
              </div>

              {/* Existing Stages Preview */}
              {existingStages.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Existing Stages in Project:</h4>
                  <div className="space-y-2">
                    {existingStages.map((existingStage, index) => (
                      <div key={existingStage.id} className="text-sm text-gray-600">
                        {index + 1}. {existingStage.name} - {existingStage.status}
                      </div>
                    ))}
                    <div className="text-sm text-blue-600 font-medium">
                      {existingStages.length + 1}. {stage.name || 'New Stage'} - {stage.status}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/projects/${projectId}`)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="gap-2">
                  <FloppyDisk size={16} />
                  {isLoading ? 'Creating...' : 'Create Stage'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}