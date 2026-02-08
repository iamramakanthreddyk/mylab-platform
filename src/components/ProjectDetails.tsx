import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { User, Project, Sample } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, 
  Flask, 
  ChartBar, 
  FolderOpen, 
  Users, 
  FileText,
  Calendar,
  Buildings,
  Plus,
  Trash,
  GearSix,
  Info,
  Rows,
  Folder
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Stage {
  id: string
  projectId: string
  name: string
  description?: string
  orderIndex: number  
  status: string
  createdAt: string
}

interface ProjectDetailsProps {
  user: User
}

export function ProjectDetails({ user }: ProjectDetailsProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [samples, setSamples] = useState<Sample[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [analyses, setAnalyses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (id) {
      Promise.all([
        fetchProjectDetails(),
        fetchProjectSamples(),
        fetchProjectStages(),
        fetchProjectAnalyses()
      ])
    }
  }, [id])

  const fetchProjectDetails = async () => {
    try {
      const response = await axiosInstance.get(`/projects/${id}`)
      setProject(response.data.data || response.data)
    } catch (error: any) {
      console.error('Failed to fetch project:', error)
      toast.error('Failed to load project details')
      navigate('/projects')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProjectSamples = async () => {
    try {
      const response = await axiosInstance.get(`/samples?projectId=${id}`)
      setSamples(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch samples:', error)
      setSamples([])
    }
  }

  const fetchProjectStages = async () => {
    try {
      const response = await axiosInstance.get(`/projects/${id}/stages`)
      setStages(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch stages:', error)
      setStages([])
    }
  }

  const fetchProjectAnalyses = async () => {
    try {
      const response = await axiosInstance.get(`/analyses?projectId=${id}`)
      setAnalyses(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch analyses:', error)
      setAnalyses([])
    }
  }

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm('Are you sure you want to delete this stage?')) return

    try {
      await axiosInstance.delete(`/projects/${id}/stages/${stageId}`)
      toast.success('Stage deleted successfully')
      fetchProjectStages()
    } catch (error: any) {
      console.error('Failed to delete stage:', error)
      toast.error(error.response?.data?.error?.message || 'Failed to delete stage')
    }
  }

  const handleDeleteSample = async (sampleId: string) => {
    if (!confirm('Are you sure you want to delete this sample?')) return

    try {
      await axiosInstance.delete(`/samples/${sampleId}`)
      toast.success('Sample deleted successfully')
      fetchProjectSamples()
    } catch (error: any) {
      console.error('Failed to delete sample:', error)
      toast.error(error.response?.data?.error?.message || 'Failed to delete sample')
    }
  }

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'Active': return 'default'
      case 'Planning': return 'secondary'
      case 'On Hold': return 'outline'
      case 'Completed': return 'outline'
      case 'Archived': return 'outline'
      default: return 'secondary'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
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
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{project.name}</h1>
                <Badge variant={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
              </div>
              {project.description && (
                <p className="text-muted-foreground text-lg mb-4">
                  {project.description}
                </p>
              )}
              
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
                {project.clientOrgName && (
                  <div className="flex items-center gap-2">
                    <Buildings size={16} />
                    <span>Client: {project.clientOrgName}</span>
                  </div>
                )}
                {project.executingOrgName && (
                  <div className="flex items-center gap-2">
                    <Buildings size={16} />
                    <span>Lab: {project.executingOrgName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Research Journey Workflow */}
        <div className="space-y-8">
          {/* Progress Overview */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-blue-900">Research Journey</CardTitle>
                  <CardDescription className="text-blue-700">
                    Track your progress through the complete research workflow
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-900">
                    {Math.round(((samples.length > 0 ? 25 : 0) + (stages.length > 0 ? 25 : 0) + (analyses.length > 0 ? 50 : 0)) * 1)}%
                  </div>
                  <div className="text-xs text-blue-700">Complete</div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Step 1: Project Setup */}
          <Card className={`transition-all ${stages.length === 0 ? 'ring-2 ring-blue-200 bg-blue-50/30' : 'bg-green-50/30 border-green-200'}`}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  stages.length > 0 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                }`}>
                  {stages.length > 0 ? (
                    <span className="text-lg font-bold">✓</span>
                  ) : (
                    <span className="text-lg font-bold">1</span>
                  )}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Step 1: Setup & Organization</CardTitle>
                  <CardDescription>
                    {stages.length === 0 
                      ? 'Optional: Create stages to organize your research workflow'
                      : `${stages.length} workflow stages created`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => navigate(`/projects/${id}/create-stage`)} 
                    variant={stages.length === 0 ? 'default' : 'outline'}
                    className="gap-2"
                  >
                    <Plus size={16} />
                    {stages.length === 0 ? 'Create First Stage' : 'Add Stage'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {stages.length > 0 && (
              <CardContent>
                <div className="grid gap-3">
                  {stages.slice(0, 3).map((stage, index) => (
                    <div key={stage.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                      <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{stage.name}</p>
                        <p className="text-sm text-muted-foreground">{stage.status}</p>
                      </div>
                    </div>
                  ))}
                  {stages.length > 3 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      +{stages.length - 3} more stages...
                    </p>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Step 2: Sample Collection */}
          <Card className={`transition-all ${samples.length === 0 ? 'ring-2 ring-blue-200 bg-blue-50/30' : 'bg-green-50/30 border-green-200'}`}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  samples.length > 0 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                }`}>
                  {samples.length > 0 ? (
                    <span className="text-lg font-bold">✓</span>
                  ) : (
                    <span className="text-lg font-bold">2</span>
                  )}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Step 2: Sample Collection & Trials</CardTitle>
                  <CardDescription>
                    {samples.length === 0 
                      ? 'Add samples to begin your research work'
                      : `${samples.length} samples collected with experimental data`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => navigate(`/projects/${id}/create-sample`)} 
                    variant={samples.length === 0 ? 'default' : 'outline'}
                    className="gap-2"
                  >
                    <Plus size={16} />
                    {samples.length === 0 ? 'Add First Sample' : 'Add Sample'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {samples.length > 0 && (
              <CardContent>
                <div className="grid gap-3">
                  {samples.slice(0, 4).map((sample) => {
                    const trialsCount = sample.trials?.length || 0
                    const successfulTrials = sample.trials?.filter(t => t.success).length || 0
                    
                    return (
                      <div key={sample.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                        <Flask size={20} className="text-blue-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{sample.name}</p>
                            <Badge variant="secondary">{sample.status}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>{sample.sample_id}</span>
                            {trialsCount > 0 && (
                              <span>🧪 {successfulTrials}/{trialsCount} trials successful</span>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => navigate(`/projects/${id}/samples/${sample.id}/create-analysis`)}
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-blue-600 hover:text-blue-700"
                        >
                          <ChartBar size={14} />
                          Analyze
                        </Button>
                      </div>
                    )
                  })}
                  {samples.length > 4 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      +{samples.length - 4} more samples...
                    </p>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Step 3: Analysis */}
          <Card className={`transition-all ${analyses.length === 0 ? (samples.length > 0 ? 'ring-2 ring-blue-200 bg-blue-50/30' : 'bg-gray-100 border-gray-200') : 'bg-green-50/30 border-green-200'}`}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  analyses.length > 0 
                    ? 'bg-green-500 text-white' 
                    : samples.length > 0 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-400 text-white'
                }`}>
                  {analyses.length > 0 ? (
                    <span className="text-lg font-bold">✓</span>
                  ) : (
                    <span className="text-lg font-bold">3</span>
                  )}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Step 3: Analysis & Testing</CardTitle>
                  <CardDescription>
                    {analyses.length === 0 
                      ? samples.length > 0
                        ? 'Ready to analyze your samples - choose analysis methods'
                        : 'Analysis will be available after adding samples'
                      : `${analyses.length} analyses completed or in progress`}
                  </CardDescription>
                </div>
                {samples.length > 0 && (
                  <div className="text-right">
                    <p className="text-sm font-medium">{samples.length} samples</p>
                    <p className="text-xs text-muted-foreground">ready for analysis</p>
                  </div>
                )}
              </div>
            </CardHeader>
            {analyses.length > 0 && (
              <CardContent>
                <div className="grid gap-3">
                  {analyses.slice(0, 3).map((analysis) => (
                    <div key={analysis.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                      <ChartBar size={20} className="text-purple-500" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{analysis.description || 'Analysis'}</p>
                          <Badge variant={analysis.status === 'Completed' ? 'default' : 'secondary'}>
                            {analysis.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {analysis.execution_mode === 'external' ? 'External Lab' : 'Internal Lab'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {analyses.length > 3 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      +{analyses.length - 3} more analyses...
                    </p>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Step 4: Results & Documentation */}
          <Card className={`transition-all ${analyses.length === 0 ? 'bg-gray-100 border-gray-200' : 'ring-2 ring-green-200 bg-green-50/30'}`}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  analyses.length > 0 ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'
                }`}>
                  <span className="text-lg font-bold">4</span>
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Step 4: Results & Documentation</CardTitle>
                  <CardDescription>
                    {analyses.length === 0 
                      ? 'Final results and documentation will appear here'
                      : 'Review analysis results and generate reports'}
                  </CardDescription>
                </div>
                {analyses.length > 0 && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                      <FileText size={16} />
                      Generate Report
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            {analyses.length > 0 && (
              <CardContent>
                <div className="bg-white rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Research Summary</h4>
                    <Badge variant="outline">Ready for Review</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Samples Processed</p>
                      <p className="font-semibold">{samples.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Analyses Complete</p>
                      <p className="font-semibold">{analyses.filter(a => a.status === 'Completed').length}/{analyses.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Success Rate</p>
                      <p className="font-semibold">
                        {analyses.length > 0 
                          ? Math.round((analyses.filter(a => a.status === 'Completed').length / analyses.length) * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Quick Actions */}
          <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Jump to any step in your research workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button 
                  onClick={() => navigate(`/projects/${id}/create-stage`)} 
                  variant="ghost" 
                  className="h-auto flex-col gap-2 p-4"
                >
                  <Folder size={20} className="text-blue-500" />
                  <span className="text-sm">Add Stage</span>
                </Button>
                <Button 
                  onClick={() => navigate(`/projects/${id}/create-sample`)} 
                  variant="ghost" 
                  className="h-auto flex-col gap-2 p-4"
                >
                  <Flask size={20} className="text-green-500" />
                  <span className="text-sm">Add Sample</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="h-auto flex-col gap-2 p-4"
                  disabled={samples.length === 0}
                >
                  <ChartBar size={20} className={samples.length > 0 ? 'text-purple-500' : 'text-gray-400'} />
                  <span className="text-sm">Run Analysis</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="h-auto flex-col gap-2 p-4"
                  disabled={analyses.length === 0}
                >
                  <FileText size={20} className={analyses.length > 0 ? 'text-orange-500' : 'text-gray-400'} />
                  <span className="text-sm">View Results</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
