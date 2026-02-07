import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { User, Project, Sample } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreateSampleDialog } from './CreateSampleDialog'
import { CreateStageDialog } from './CreateStageDialog'
import {
  ArrowLeft, 
  Flask, 
  ChartBar, 
  FolderOpen, 
  Users, 
  FileText,
  Calendar,
  Building,
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
  const [showCreateSample, setShowCreateSample] = useState(false)
  const [showCreateStage, setShowCreateStage] = useState(false)

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
                    <Building size={16} />
                    <span>Client: {project.clientOrgName}</span>
                  </div>
                )}
                {project.executingOrgName && (
                  <div className="flex items-center gap-2">
                    <Building size={16} />
                    <span>Lab: {project.executingOrgName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="border-b bg-linear-to-r from-background to-background/50">
            <TabsList className="w-full h-auto justify-start gap-1 rounded-none border-0 bg-transparent p-0">
              <TabsTrigger 
                value="overview" 
                className="flex-col items-center justify-center gap-1.5 rounded-lg p-4 text-xs sm:text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-b-transparent data-[state=active]:border-b-primary sm:flex-row sm:gap-2 transition-all"
              >
                <Info size={18} weight="duotone" />
                <span>Overview</span>
              </TabsTrigger>

              <TabsTrigger 
                value="samples"
                className="flex-col items-center justify-center gap-1.5 rounded-lg p-4 text-xs sm:text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-b-transparent data-[state=active]:border-b-primary sm:flex-row sm:gap-2 transition-all"
              >
                <Flask size={18} weight="duotone" />
                <span>Samples</span>
                <Badge variant="secondary" className="ml-1">{samples.length}</Badge>
              </TabsTrigger>

              <TabsTrigger 
                value="stages"
                className="flex-col items-center justify-center gap-1.5 rounded-lg p-4 text-xs sm:text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-b-transparent data-[state=active]:border-b-primary sm:flex-row sm:gap-2 transition-all"
              >
                <Rows size={18} weight="duotone" />
                <span>Stages</span>
                <Badge variant="secondary" className="ml-1">{stages.length}</Badge>
              </TabsTrigger>

              <TabsTrigger 
                value="analyses"
                className="flex-col items-center justify-center gap-1.5 rounded-lg p-4 text-xs sm:text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-b-transparent data-[state=active]:border-b-primary sm:flex-row sm:gap-2 transition-all"
              >
                <ChartBar size={18} weight="duotone" />
                <span>Analyses</span>
                <Badge variant="secondary" className="ml-1">{analyses.length}</Badge>
              </TabsTrigger>

              <TabsTrigger 
                value="documents"
                className="flex-col items-center justify-center gap-1.5 rounded-lg p-4 text-xs sm:text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-b-transparent data-[state=active]:border-b-primary sm:flex-row sm:gap-2 transition-all"
              >
                <Folder size={18} weight="duotone" />
                <span>Documents</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Samples</CardTitle>
                  <Flask className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{samples.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Active samples in project
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Stages</CardTitle>
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stages.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Workflow stages
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Analyses</CardTitle>
                  <ChartBar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyses.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Completed analyses
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Project ID</p>
                    <p className="text-sm font-mono mt-1">{project.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p className="text-sm mt-1">{project.status}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Client Organization</p>
                    <p className="text-sm mt-1">{project.clientOrgName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Executing Lab</p>
                    <p className="text-sm mt-1">{project.executingOrgName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <p className="text-sm mt-1">{new Date(project.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                    <p className="text-sm mt-1">{new Date(project.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="samples" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold">Project Samples</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {samples.length} {samples.length === 1 ? 'sample' : 'samples'} in this project
                </p>
              </div>
              <Button onClick={() => setShowCreateSample(true)} className="gap-2 sm:w-auto w-full">
                <Plus size={18} />
                Add Sample
              </Button>
            </div>

            {samples.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Flask size={32} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No samples yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    Add samples to this project to track and manage your research materials. Samples can be optional assigned to workflow stages.
                  </p>
                  <Button onClick={() => setShowCreateSample(true)} size="lg" className="gap-2">
                    <Plus size={18} />
                    Create First Sample
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {samples.map((sample) => (
                  <Card key={sample.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <CardTitle className="text-lg">{sample.sample_id}</CardTitle>
                            <Badge className="whitespace-nowrap">{sample.status}</Badge>
                          </div>
                          {sample.description && (
                            <CardDescription className="mt-2">{sample.description}</CardDescription>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSample(sample.id)}
                          className="text-destructive hover:text-destructive shrink-0"
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Sample ID</p>
                          <p className="font-mono text-xs">{sample.id.substring(0, 8)}...</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p>{new Date(sample.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Type</p>
                          <p>{sample.type || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p>{sample.status}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stages" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <h3 className="text-lg font-semibold">Workflow Stages</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Organize your project into {stages.length === 0 ? 'workflow phases' : `${stages.length} workflow phase${stages.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <Button onClick={() => setShowCreateStage(true)} className="gap-2 sm:w-auto w-full">
                <Plus size={18} />
                Add Stage
              </Button>
            </div>

            {stages.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Rows size={32} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No stages yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    Create stages to organize your project workflow. For example: Sample Preparation, Analysis, Quality Control, Review.
                  </p>
                  <Button onClick={() => setShowCreateStage(true)} size="lg" className="gap-2">
                    <Plus size={18} />
                    Create First Stage
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {stages.map((stage, index) => (
                  <Card key={stage.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary font-semibold text-sm shrink-0 mt-0.5">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg">{stage.name}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{stage.status}</Badge>
                              <span>Created {new Date(stage.createdAt).toLocaleDateString()}</span>
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStage(stage.id)}
                          className="text-destructive hover:text-destructive shrink-0"
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analyses" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <h3 className="text-lg font-semibold">Analyses</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Track and manage sample analyses and results for this project
                </p>
              </div>
              <Button disabled className="gap-2 sm:w-auto w-full" title="Coming soon">
                <Plus size={18} />
                Request Analysis
              </Button>
            </div>

            {analyses.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <ChartBar size={32} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No analyses yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    Request or upload analyses for your samples. Track results, quality metrics, and conclusions all in one place.
                  </p>
                  <Button disabled size="lg" className="gap-2" title="Coming soon">
                    <Plus size={18} />
                    Request Analysis
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {analyses.map((analysis) => (
                  <Card key={analysis.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-lg">{analysis.analysisType}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(analysis.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge>{analysis.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <h3 className="text-lg font-semibold">Documents</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage and organize project documents and files
                </p>
              </div>
              <Button disabled className="gap-2 sm:w-auto w-full" title="Coming soon">
                <Plus size={18} />
                Upload Document
              </Button>
            </div>

            <Card className="border-2 border-dashed">
              <CardContent className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Folder size={32} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Documents coming soon</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Upload and manage project documents like protocols, reports, certificates, and other files.
                </p>
                <Button disabled size="lg" className="gap-2" title="Coming soon">
                  <Plus size={18} />
                  Upload Document
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <CreateSampleDialog
          open={showCreateSample}
          onOpenChange={setShowCreateSample}
          projectId={id!}
          onSuccess={fetchProjectSamples}
        />

        <CreateStageDialog
          open={showCreateStage}
          onOpenChange={setShowCreateStage}
          projectId={id!}
          nextOrderIndex={stages.length}
          onSuccess={fetchProjectStages}
        />
      </div>
    </div>
  )
}
