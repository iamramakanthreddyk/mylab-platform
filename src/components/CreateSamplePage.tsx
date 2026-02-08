import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { Project, ProjectStage, Sample, TrialData, User } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Plus, FloppyDisk, TestTube, X } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface CreateSamplePageProps {
  user: User
}

interface WorkspaceUser {
  id: string
  name: string
  email: string
}

export function CreateSamplePage({ user }: CreateSamplePageProps) {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [stages, setStages] = useState<ProjectStage[]>([])
  const [users, setUsers] = useState<WorkspaceUser[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [sample, setSample] = useState<Partial<Sample>>({
    name: '',
    description: '',
    type: '',
    source: '',
    storage_conditions: '',
    notes: '',
    trials: [],
    selectedTrialId: undefined,
    projectStageId: undefined
  })

  const [trials, setTrials] = useState<TrialData[]>([])
  const [selectedTrialIds, setSelectedTrialIds] = useState<string[]>([])

  useEffect(() => {
    if (projectId) {
      fetchProject()
      fetchStages()
      fetchUsers()
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

  const fetchStages = async () => {
    try {
      const response = await axiosInstance.get(`/projects/${projectId}/stages`)
      setStages(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch stages:', error)
      setStages([])
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/users')
      setUsers(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
      setUsers([])
    }
  }

  const addTrial = () => {
    const newTrial: TrialData = {
      id: `trial-${Date.now()}`,
      name: `Trial ${trials.length + 1}`,
      description: '',
      conditions: '',
      results: '',
      performedBy: '',
      performedDate: new Date().toISOString().split('T')[0],
      success: false,
      notes: ''
    }
    setTrials([...trials, newTrial])
  }

  const updateTrial = (id: string, updates: Partial<TrialData>) => {
    setTrials(trials.map(trial => 
      trial.id === id ? { ...trial, ...updates } : trial
    ))
  }

  const removeTrial = (id: string) => {
    setTrials(trials.filter(trial => trial.id !== id))
    setSelectedTrialIds(selectedTrialIds.filter(tid => tid !== id))
  }

  const toggleTrialSelection = (trialId: string) => {
    if (selectedTrialIds.includes(trialId)) {
      setSelectedTrialIds(selectedTrialIds.filter(id => id !== trialId))
    } else {
      setSelectedTrialIds([...selectedTrialIds, trialId])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Include selected trials in the sample
      const sampleWithTrials = {
        ...sample,
        project_id: projectId,
        trials: selectedTrialIds.map(id => trials.find(t => t.id === id)).filter(Boolean),
        created_by: user.id
      }

      await axiosInstance.post('/samples', sampleWithTrials)
      toast.success('Sample created successfully')
      navigate(`/projects/${projectId}`)
    } catch (error: any) {
      console.error('Failed to create sample:', error)
      toast.error(error.response?.data?.error || 'Failed to create sample')
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
      <div className="max-w-4xl mx-auto px-6 py-8">
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
            <h1 className="text-3xl font-bold">Create Sample</h1>
            <p className="text-muted-foreground">
              {project.name} - Add a new sample with optional trials
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Sample Details</TabsTrigger>
              <TabsTrigger value="trials">Experimental Trials</TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Define the sample properties and metadata</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Sample Name *</Label>
                      <Input
                        id="name"
                        value={sample.name}
                        onChange={(e) => setSample(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter sample name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Sample Type *</Label>
                      <Input
                        id="type"
                        value={sample.type || ''}
                        onChange={(e) => setSample(prev => ({ ...prev, type: e.target.value }))}
                        placeholder="e.g., Blood, Tissue, Solution"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={sample.description}
                      onChange={(e) => setSample(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the sample purpose and background"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="source">Source</Label>
                      <Input
                        id="source"
                        value={sample.source}
                        onChange={(e) => setSample(prev => ({ ...prev, source: e.target.value }))}
                        placeholder="Where/how was this obtained?"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storage">Storage Conditions</Label>
                      <Input
                        id="storage"
                        value={sample.storage_conditions}
                        onChange={(e) => setSample(prev => ({ ...prev, storage_conditions: e.target.value }))}
                        placeholder="e.g., -80°C, Room temp"
                      />
                    </div>
                  </div>

                  {stages.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="stage">Project Stage (Optional)</Label>
                      <Select
                        value={sample.projectStageId || ''}
                        onValueChange={(value) => setSample(prev => ({ 
                          ...prev, 
                          projectStageId: value || null 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project stage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No stage</SelectItem>
                          {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={sample.notes}
                      onChange={(e) => setSample(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any additional observations or notes"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trials">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Experimental Trials</CardTitle>
                      <CardDescription>
                        Document experimental trials performed on this sample (optional)
                      </CardDescription>
                    </div>
                    <Button 
                      type="button"
                      onClick={addTrial}
                      variant="outline"
                      className="gap-2"
                    >
                      <Plus size={16} />
                      Add Trial
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {trials.length === 0 ? (
                    <div className="text-center py-8">
                      <TestTube size={64} className="mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No trials added</h3>
                      <p className="text-muted-foreground mb-4">
                        Add experimental trials to document your research process
                      </p>
                      <Button onClick={addTrial} variant="outline" className="gap-2">
                        <Plus size={16} />
                        Add First Trial
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {trials.map((trial) => (
                        <Card key={trial.id} className={`border-2 ${
                          selectedTrialIds.includes(trial.id) ? 'border-blue-200 bg-blue-50/50' : ''
                        }`}>
                          <CardHeader className="pb-4">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedTrialIds.includes(trial.id)}
                                  onChange={() => toggleTrialSelection(trial.id)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <div>
                                  <CardTitle className="text-lg">{trial.name}</CardTitle>
                                  <CardDescription>
                                    {trial.success ? '✅ Successful' : '❌ Failed/Inconclusive'}
                                  </CardDescription>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTrial(trial.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X size={16} />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Trial Name</Label>
                                <Input
                                  value={trial.name}
                                  onChange={(e) => updateTrial(trial.id, { name: e.target.value })}
                                  placeholder="Trial name"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Performed By</Label>
                                <Select
                                  value={trial.performedBy}
                                  onValueChange={(value) => updateTrial(trial.id, { performedBy: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select performer" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {users.map((u) => (
                                      <SelectItem key={u.id} value={u.id}>
                                        {u.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Date Performed</Label>
                                <Input
                                  type="date"
                                  value={trial.performedDate}
                                  onChange={(e) => updateTrial(trial.id, { performedDate: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Success Status</Label>
                                <Select
                                  value={trial.success.toString()}
                                  onValueChange={(value) => updateTrial(trial.id, { success: value === 'true' })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">✅ Successful</SelectItem>
                                    <SelectItem value="false">❌ Failed/Inconclusive</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Textarea
                                value={trial.description}
                                onChange={(e) => updateTrial(trial.id, { description: e.target.value })}
                                placeholder="What was tested in this trial?"
                                rows={2}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Conditions</Label>
                              <Textarea
                                value={trial.conditions}
                                onChange={(e) => updateTrial(trial.id, { conditions: e.target.value })}
                                placeholder="Temperature, pH, concentrations, etc."
                                rows={2}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Results</Label>
                              <Textarea
                                value={trial.results}
                                onChange={(e) => updateTrial(trial.id, { results: e.target.value })}
                                placeholder="Observed results and measurements"
                                rows={2}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Notes</Label>
                              <Textarea
                                value={trial.notes}
                                onChange={(e) => updateTrial(trial.id, { notes: e.target.value })}
                                placeholder="Additional observations"
                                rows={2}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {selectedTrialIds.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-700">
                            <strong>{selectedTrialIds.length}</strong> trial(s) selected to be included with this sample
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Submit */}
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
              {isLoading ? 'Creating...' : 'Create Sample'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}