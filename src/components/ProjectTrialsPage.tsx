import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { Project, Sample, Trial, User } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, TestTube, FloppyDisk, ChartBar, X } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface ProjectTrialsPageProps {
  user: User
}

const defaultTrialRow = {
  id: `row-${Date.now()}`,
  name: '',
  status: 'planned' as Trial['status'],
  performedAt: new Date().toISOString().split('T')[0],
  readings: {} as Record<string, string>
}

const defaultCommonSetup = {
  objective: '',
  equipment: '',
  notes: '',
  performedAt: new Date().toISOString().split('T')[0]
}

const defaultSampleForm = {
  sampleId: '',
  description: '',
  type: ''
}

export function ProjectTrialsPage({ user }: ProjectTrialsPageProps) {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [trials, setTrials] = useState<Trial[]>([])
  const [samplesByTrial, setSamplesByTrial] = useState<Record<string, Sample[]>>({})
  const [isSampleDialogOpen, setIsSampleDialogOpen] = useState(false)
  const [selectedTrial, setSelectedTrial] = useState<Trial | null>(null)
  const [commonSetup, setCommonSetup] = useState(defaultCommonSetup)
  const [trialRows, setTrialRows] = useState([defaultTrialRow])
  const [parameterColumns, setParameterColumns] = useState<string[]>([])
  const [removedColumns, setRemovedColumns] = useState<string[]>([])
  const [isSavingColumns, setIsSavingColumns] = useState(false)
  const [hasLoadedColumns, setHasLoadedColumns] = useState(false)
  const [sampleForm, setSampleForm] = useState(defaultSampleForm)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (projectId) {
      fetchProject()
      fetchParameterTemplate()
      fetchTrials()
    }
  }, [projectId])

  useEffect(() => {
    if (!hasLoadedColumns) {
      return
    }

    const timeout = setTimeout(() => {
      handleSaveColumns(true)
    }, 800)

    return () => clearTimeout(timeout)
  }, [hasLoadedColumns, parameterColumns])

  const fetchProject = async () => {
    try {
      const response = await axiosInstance.get(`/projects/${projectId}`)
      setProject(response.data.data || response.data)
    } catch (error) {
      console.error('Failed to fetch project:', error)
      toast.error('Failed to load project')
      navigate('/projects')
    }
  }

  const fetchTrials = async () => {
    try {
      const response = await axiosInstance.get(`/projects/${projectId}/trials`)
      const loadedTrials = response.data.data || []
      setTrials(loadedTrials)
      await fetchSamplesForTrials(loadedTrials)
    } catch (error) {
      console.error('Failed to fetch trials:', error)
      setTrials([])
    }
  }

  const fetchParameterTemplate = async () => {
    if (!projectId) {
      return
    }

    try {
      const response = await axiosInstance.get(`/projects/${projectId}/trials/parameters`)
      const columns = response.data.data?.columns || []
      setParameterColumns(columns)
      setHasLoadedColumns(true)
    } catch (error) {
      console.error('Failed to fetch trial parameter template:', error)
      setHasLoadedColumns(true)
    }
  }

  const fetchSamplesForTrials = async (loadedTrials: Trial[]) => {
    if (!projectId || loadedTrials.length === 0) {
      setSamplesByTrial({})
      return
    }

    try {
      const results = await Promise.all(
        loadedTrials.map(async (trial) => {
          const response = await axiosInstance.get(`/projects/${projectId}/trials/${trial.id}/samples`)
          return { trialId: trial.id, samples: response.data.data || [] }
        })
      )

      const mapped: Record<string, Sample[]> = {}
      results.forEach(result => {
        mapped[result.trialId] = result.samples
      })
      setSamplesByTrial(mapped)
    } catch (error) {
      console.error('Failed to fetch trial samples:', error)
      setSamplesByTrial({})
    }
  }

  const openSampleDialog = (trial: Trial) => {
    setSelectedTrial(trial)
    setSampleForm(defaultSampleForm)
    setIsSampleDialogOpen(true)
  }

  const addTrialRow = () => {
    setTrialRows(prev => [
      ...prev,
      { ...defaultTrialRow, id: `row-${Date.now()}-${Math.random().toString(16).slice(2, 6)}` }
    ])
  }

  const updateTrialRow = (rowId: string, updates: Partial<typeof defaultTrialRow>) => {
    setTrialRows(prev => prev.map(row => (row.id === rowId ? { ...row, ...updates } : row)))
  }

  const updateTrialReading = (rowId: string, column: string, value: string) => {
    setTrialRows(prev => prev.map(row => {
      if (row.id !== rowId) {
        return row
      }
      return {
        ...row,
        readings: {
          ...row.readings,
          [column]: value
        }
      }
    }))
  }

  const addParameterColumn = () => {
    setParameterColumns(prev => [...prev, ''])
  }

  const updateParameterColumn = (index: number, value: string) => {
    setParameterColumns(prev => prev.map((col, idx) => (idx === index ? value : col)))
  }

  const removeParameterColumn = (index: number) => {
    const column = parameterColumns[index]
    if (!column) {
      setParameterColumns(prev => prev.filter((_, idx) => idx !== index))
      return
    }

    const hasSavedUsage = trials.some(trial => {
      if (!trial.parameters_json) {
        return false
      }
      return Object.prototype.hasOwnProperty.call(trial.parameters_json, column)
    })

    if (hasSavedUsage) {
      toast.error(`Column "${column}" is used by saved trials and cannot be removed.`)
      return
    }

    const hasValues = trialRows.some(row => row.readings[column])
    if (hasValues) {
      const confirmRemove = confirm(`Remove column "${column}"? Existing readings will be hidden but not deleted.`)
      if (!confirmRemove) {
        return
      }
    }

    setRemovedColumns(prev => (prev.includes(column) ? prev : [...prev, column]))
    setParameterColumns(prev => prev.filter((_, idx) => idx !== index))
  }

  const restoreParameterColumn = (column: string) => {
    if (!column) {
      return
    }
    setParameterColumns(prev => [...prev, column])
    setRemovedColumns(prev => prev.filter(col => col !== column))
  }

  const handleSaveColumns = async (silent = false) => {
    if (!projectId) {
      if (!silent) {
        toast.error('Project is required')
      }
      return
    }

    const trimmed = parameterColumns.map(col => col.trim()).filter(Boolean)
    const uniqueColumns = Array.from(new Set(trimmed))
    if (uniqueColumns.length !== trimmed.length && !silent) {
      toast.info('Duplicate column names removed')
    }
    const columns = uniqueColumns

    if (columns.join('|') !== parameterColumns.join('|')) {
      setParameterColumns(columns)
    }

    setIsSavingColumns(true)
    try {
      await axiosInstance.put(`/projects/${projectId}/trials/parameters`, { columns })
      if (!silent) {
        toast.success('Trial columns saved')
      }
    } catch (error: any) {
      console.error('Failed to save trial columns:', error)
      if (!silent) {
        const errorMessage = error.response?.data?.details
          ? Object.values(error.response.data.details).join(', ')
          : error.response?.data?.error || 'Failed to save trial columns'
        toast.error(errorMessage)
      }
    } finally {
      setIsSavingColumns(false)
    }
  }

  const removeTrialRow = (rowId: string) => {
    setTrialRows(prev => prev.filter(row => row.id !== rowId))
  }

  const handleSaveTrials = async () => {
    if (!projectId) {
      toast.error('Project is required')
      return
    }

    const rowsToSave = trialRows.filter(row => row.name.trim())

    if (rowsToSave.length === 0) {
      toast.error('Add at least one trial name')
      return
    }

    setIsLoading(true)
    try {
      const measurementKeys = parameterColumns.map(col => col.trim()).filter(Boolean)
      const payload = {
        trials: rowsToSave.map(row => {
          const measurements: Record<string, string> = {}
          measurementKeys.forEach(key => {
            if (row.readings[key] !== undefined && row.readings[key] !== '') {
              measurements[key] = row.readings[key]
            }
          })
          return {
            name: row.name,
            status: row.status,
            performedAt: row.performedAt || commonSetup.performedAt,
            objective: commonSetup.objective || undefined,
            equipment: commonSetup.equipment || undefined,
            notes: commonSetup.notes || undefined,
            measurements: Object.keys(measurements).length > 0 ? measurements : undefined
          }
        })
      }
      const response = await axiosInstance.post(`/projects/${projectId}/trials/bulk`, payload)
      const createdTrials = response.data.data || response.data

      setTrials(prev => [...createdTrials, ...prev])
      await fetchSamplesForTrials([...createdTrials, ...trials])
      setTrialRows([{ ...defaultTrialRow, id: `row-${Date.now()}` }])
      toast.success('Trials saved successfully')
    } catch (error: any) {
      console.error('Failed to save trials:', error)
      const errorMessage = error.response?.data?.details
        ? Object.values(error.response.data.details).join(', ')
        : error.response?.data?.error || 'Failed to save trials'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSample = async () => {
    if (!selectedTrial || !projectId) {
      toast.error('Select a trial before creating a sample')
      return
    }

    if (!sampleForm.sampleId.trim()) {
      toast.error('Sample ID is required')
      return
    }

    if (!sampleForm.description.trim()) {
      toast.error('Sample description is required')
      return
    }

    setIsLoading(true)
    try {
      const payload = {
        projectId,
        trialId: selectedTrial.id,
        sampleId: sampleForm.sampleId,
        description: sampleForm.description,
        type: sampleForm.type || undefined
      }
      const response = await axiosInstance.post('/samples', payload)
      const createdSample = response.data.data || response.data
      setSamplesByTrial(prev => ({
        ...prev,
        [selectedTrial.id]: [createdSample, ...(prev[selectedTrial.id] || [])]
      }))
      setIsSampleDialogOpen(false)
      toast.success('Sample added to trial')
    } catch (error: any) {
      console.error('Failed to create sample:', error)
      const errorMessage = error.response?.data?.details
        ? Object.values(error.response.data.details).join(', ')
        : error.response?.data?.error || 'Failed to create sample'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMoveToAnalysis = (sample: Sample) => {
    if (!projectId) {
      return
    }

    navigate(`/projects/${projectId}/samples/${sample.id}/create-analysis`)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
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
            <h1 className="text-3xl font-bold">Trial Log</h1>
            <p className="text-muted-foreground">
              {project?.name || 'Project'} - Run experiments, capture trials, then move samples to analysis
            </p>
          </div>
        </div>

        <div className="space-y-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Common Trial Setup</CardTitle>
              <CardDescription>
                Define shared experiment conditions once. Each trial row will inherit these values.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Trial Parameters (Table Columns)</Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={addParameterColumn} className="gap-2">
                      <Plus size={14} />
                      Add Column
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSaveColumns(false)}
                      disabled={isSavingColumns}
                      className="gap-2"
                    >
                      <FloppyDisk size={14} />
                      {isSavingColumns ? 'Saving...' : 'Save Columns'}
                    </Button>
                    {isSavingColumns && (
                      <span className="text-xs text-muted-foreground">Autosaving...</span>
                    )}
                  </div>
                </div>
                {removedColumns.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Removed:</span>
                    {removedColumns.map((column) => (
                      <Button
                        key={column}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => restoreParameterColumn(column)}
                        className="h-7"
                      >
                        Restore {column}
                      </Button>
                    ))}
                  </div>
                )}
                {parameterColumns.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    Add column names like temperature, pressure, flow_rate to capture readings per trial.
                  </div>
                )}
                {parameterColumns.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Removing a column only hides its readings. Saved trials keep their original values.
                  </div>
                )}
                {parameterColumns.map((col, index) => (
                  <div key={`param-${index}`} className="flex items-center gap-2">
                    <Input
                      value={col}
                      onChange={(e) => updateParameterColumn(index, e.target.value)}
                      placeholder="e.g., temperature"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => removeParameterColumn(index)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="common-objective">Objective</Label>
                <Textarea
                  id="common-objective"
                  value={commonSetup.objective}
                  onChange={(e) => setCommonSetup({ ...commonSetup, objective: e.target.value })}
                  placeholder="What are you trying to learn or improve?"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="common-equipment">Equipment</Label>
                  <Textarea
                    id="common-equipment"
                    value={commonSetup.equipment}
                    onChange={(e) => setCommonSetup({ ...commonSetup, equipment: e.target.value })}
                    placeholder="Reactors, pumps, detectors, etc."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="common-notes">Notes</Label>
                  <Textarea
                    id="common-notes"
                    value={commonSetup.notes}
                    onChange={(e) => setCommonSetup({ ...commonSetup, notes: e.target.value })}
                    placeholder="Observations, deviations, or outcomes"
                    rows={3}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="common-date">Default Date</Label>
                  <Input
                    id="common-date"
                    type="date"
                    value={commonSetup.performedAt}
                    onChange={(e) => setCommonSetup({ ...commonSetup, performedAt: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Trial Entries</CardTitle>
                  <CardDescription>Add each trial as a row, then save them together.</CardDescription>
                </div>
                <Button type="button" variant="outline" onClick={addTrialRow} className="gap-2">
                  <Plus size={16} />
                  Add Row
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 text-xs font-medium text-muted-foreground" style={{ gridTemplateColumns: `2fr 1fr 1fr ${parameterColumns.length > 0 ? `repeat(${parameterColumns.length}, minmax(120px, 1fr))` : ''} 40px` }}>
                <div>Trial Name *</div>
                <div>Status</div>
                <div>Date</div>
                {parameterColumns.map((col, index) => (
                  <div key={`header-${index}`}>{col || 'Parameter'}</div>
                ))}
                <div></div>
              </div>
              {trialRows.map((row) => (
                <div key={row.id} className="grid gap-3 items-center" style={{ gridTemplateColumns: `2fr 1fr 1fr ${parameterColumns.length > 0 ? `repeat(${parameterColumns.length}, minmax(120px, 1fr))` : ''} 40px` }}>
                  <Input
                    value={row.name}
                    onChange={(e) => updateTrialRow(row.id, { name: e.target.value })}
                    placeholder="e.g., Trial 5TE"
                  />
                  <Select
                    value={row.status}
                    onValueChange={(value) => updateTrialRow(row.id, { status: value as Trial['status'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={row.performedAt}
                    onChange={(e) => updateTrialRow(row.id, { performedAt: e.target.value })}
                  />
                  {parameterColumns.map((col, index) => (
                    <Input
                      key={`cell-${row.id}-${index}`}
                      value={row.readings[col] || ''}
                      onChange={(e) => updateTrialReading(row.id, col, e.target.value)}
                      placeholder={col || 'Value'}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => removeTrialRow(row.id)}
                    disabled={trialRows.length === 1}
                  >
                    <X size={16} />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end gap-3 pt-2">
                <Button onClick={handleSaveTrials} disabled={isLoading} className="gap-2">
                  <FloppyDisk size={16} />
                  {isLoading ? 'Saving...' : 'Save Trials'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {trials.length === 0 ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>No trials yet</CardTitle>
                <CardDescription>
                  Start by creating your first experiment trial. Then add samples to move them into analysis.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            trials.map((trial) => (
              <Card key={trial.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TestTube size={18} />
                        {trial.name}
                      </CardTitle>
                      <CardDescription>
                        {trial.objective || 'No objective recorded'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => openSampleDialog(trial)} className="gap-2">
                        <Plus size={14} />
                        Add Sample
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">Parameters</p>
                      <p>{trial.parameters || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Equipment</p>
                      <p>{trial.equipment || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Notes</p>
                      <p>{trial.notes || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Status</p>
                      <p className="capitalize">{trial.status}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold">Trial Samples</p>
                      <span className="text-xs text-muted-foreground">
                        {samplesByTrial[trial.id]?.length || 0} samples
                      </span>
                    </div>
                    <div className="space-y-2">
                      {(samplesByTrial[trial.id] || []).map(sample => (
                        <div key={sample.id} className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
                          <div>
                            <p className="font-medium">{sample.sample_id || sample.name}</p>
                            <p className="text-xs text-muted-foreground">{sample.description}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleMoveToAnalysis(sample)}
                          >
                            <ChartBar size={14} />
                            Move to Analysis
                          </Button>
                        </div>
                      ))}
                      {(samplesByTrial[trial.id] || []).length === 0 && (
                        <div className="text-sm text-muted-foreground">No samples attached yet.</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={isSampleDialogOpen} onOpenChange={setIsSampleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Sample to Trial</DialogTitle>
            <DialogDescription>
              {selectedTrial ? `Attach a sample output for ${selectedTrial.name}` : 'Attach a sample output'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sample-id">Sample ID *</Label>
              <Input
                id="sample-id"
                value={sampleForm.sampleId}
                onChange={(e) => setSampleForm({ ...sampleForm, sampleId: e.target.value })}
                placeholder="e.g., RXN-001-A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sample-description">Description *</Label>
              <Textarea
                id="sample-description"
                value={sampleForm.description}
                onChange={(e) => setSampleForm({ ...sampleForm, description: e.target.value })}
                placeholder="What output or fraction is this sample?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sample-type">Type</Label>
              <Input
                id="sample-type"
                value={sampleForm.type}
                onChange={(e) => setSampleForm({ ...sampleForm, type: e.target.value })}
                placeholder="e.g., intermediate, crude, purified"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsSampleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSample} disabled={isLoading} className="gap-2">
                <FloppyDisk size={16} />
                {isLoading ? 'Saving...' : 'Add Sample'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
