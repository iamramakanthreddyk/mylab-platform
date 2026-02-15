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
import { ArrowLeft, Plus, TestTube, FloppyDisk, ChartBar, X, CheckCircle, Circle, Flask } from '@phosphor-icons/react'
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

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '')

const normalizeColumnLabel = (value: string) => {
  const cleaned = stripHtml(value)
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim()
  return cleaned
}

const parseColumnLabel = (value: string) => {
  const cleaned = normalizeColumnLabel(value)
  const match = cleaned.match(/^(.*)\(([^()]*)\)\s*$/)
  if (!match) {
    return { name: cleaned, unit: '' }
  }
  return { name: match[1].trim(), unit: match[2].trim() }
}

const formatColumnLabel = (name: string, unit: string) => {
  const cleanedName = normalizeColumnLabel(name)
  const cleanedUnit = normalizeColumnLabel(unit)
  if (!cleanedName) {
    return ''
  }
  if (!cleanedUnit) {
    return cleanedName
  }
  return `${cleanedName} (${cleanedUnit})`
}

  const parseColumnsFromPaste = (value: string) => {
  if (!value.trim()) {
    return [] as string[]
  }
  const raw = value
    .split(/\t|\r?\n|,/)
      .map((entry) => {
        const parsed = parseColumnLabel(entry)
        return formatColumnLabel(parsed.name, parsed.unit)
      })
      .filter((entry) => entry)
  return Array.from(new Set(raw))
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
  const [columnPasteInput, setColumnPasteInput] = useState('')
  const [isSavingColumns, setIsSavingColumns] = useState(false)
  const [hasLoadedColumns, setHasLoadedColumns] = useState(false)
  const [columnsDirty, setColumnsDirty] = useState(false)
  const [savedColumns, setSavedColumns] = useState<string[]>([])
  const [setupLocked, setSetupLocked] = useState(false)
  const [isSavingSetup, setIsSavingSetup] = useState(false)
  const [sampleForm, setSampleForm] = useState(defaultSampleForm)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (projectId) {
      fetchProject()
      fetchParameterTemplate()
      fetchTrialSetup()
      fetchTrials()
    }
  }, [projectId])

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
      setSavedColumns(columns)
      setRemovedColumns([])
      setHasLoadedColumns(true)
      setColumnsDirty(false)
    } catch (error) {
      console.error('Failed to fetch trial parameter template:', error)
      setHasLoadedColumns(true)
    }
  }

  const fetchTrialSetup = async () => {
    if (!projectId) {
      return
    }

    try {
      const response = await axiosInstance.get(`/projects/${projectId}/trials/setup`)
      const setup = response.data.data?.setup
      const hasSetup = response.data.data?.hasSetup

      if (setup) {
        setCommonSetup({
          objective: setup.objective || '',
          equipment: setup.equipment || '',
          notes: setup.notes || '',
          performedAt: setup.performedAt || ''
        })
      }

      if (hasSetup) {
        setSetupLocked(true)
      }
    } catch (error) {
      console.error('Failed to fetch trial setup:', error)
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
    setColumnsDirty(true)
  }

  const appendColumnsFromPaste = () => {
    const parsed = parseColumnsFromPaste(columnPasteInput)
    if (parsed.length === 0) {
      toast.info('Paste column names to add')
      return
    }
    setParameterColumns(prev => {
      const merged = [...prev, ...parsed]
      const cleaned = merged.map((col) => normalizeColumnLabel(col)).filter(Boolean)
      return Array.from(new Set(cleaned))
    })
    setColumnPasteInput('')
    setColumnsDirty(true)
  }

  const replaceColumnsFromPaste = () => {
    const parsed = parseColumnsFromPaste(columnPasteInput)
    if (parsed.length === 0) {
      toast.info('Paste column names to replace')
      return
    }
    setParameterColumns(parsed)
    setRemovedColumns([])
    setColumnPasteInput('')
    setColumnsDirty(true)
  }

  const updateParameterName = (index: number, value: string) => {
    setParameterColumns(prev => prev.map((col, idx) => {
      if (idx !== index) {
        return col
      }
      const parsed = parseColumnLabel(col)
      return formatColumnLabel(value, parsed.unit)
    }))
    setColumnsDirty(true)
  }

  const updateParameterUnit = (index: number, value: string) => {
    setParameterColumns(prev => prev.map((col, idx) => {
      if (idx !== index) {
        return col
      }
      const parsed = parseColumnLabel(col)
      return formatColumnLabel(parsed.name, value)
    }))
    setColumnsDirty(true)
  }

  const removeParameterColumn = (index: number) => {
    const column = parameterColumns[index]
    if (!column) {
      setParameterColumns(prev => prev.filter((_, idx) => idx !== index))
      setColumnsDirty(true)
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
    setColumnsDirty(true)
  }

  const restoreParameterColumn = (column: string) => {
    if (!column) {
      return
    }
    setParameterColumns(prev => [...prev, column])
    setRemovedColumns(prev => prev.filter(col => col !== column))
    setColumnsDirty(true)
  }

  const handleSaveColumns = async (silent = false): Promise<boolean> => {
    if (!projectId) {
      if (!silent) {
        toast.error('Project is required')
      }
      return false
    }

    if (!columnsDirty && !silent) {
      toast.info('No column changes to save')
      return false
    }

    if (parameterColumns.some(col => !col.trim())) {
      if (!silent) {
        toast.error('Name or remove empty columns before saving')
      }
      return false
    }

    const trimmed = parameterColumns
      .map((col) => {
        const parsed = parseColumnLabel(col)
        return formatColumnLabel(parsed.name, parsed.unit)
      })
      .filter(Boolean)
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
      setColumnsDirty(false)
      setSavedColumns(columns)
      if (!silent) {
        toast.success('Trial columns saved')
      }
      return true
    } catch (error: any) {
      console.error('Failed to save trial columns:', error)
      if (!silent) {
        const errorMessage = error.response?.data?.details
          ? Object.values(error.response.data.details).join(', ')
          : error.response?.data?.error || 'Failed to save trial columns'
        toast.error(errorMessage)
      }
      return false
    } finally {
      setIsSavingColumns(false)
    }
  }

  const handleSaveSetup = async (override?: typeof commonSetup): Promise<boolean> => {
    if (!projectId) {
      toast.error('Project is required')
      return false
    }

    const payload = override ?? commonSetup

    setIsSavingSetup(true)
    try {
      const response = await axiosInstance.put(`/projects/${projectId}/trials/setup`, payload)
      const saved = response.data.data?.setup
      if (saved) {
        setCommonSetup({
          objective: saved.objective || '',
          equipment: saved.equipment || '',
          notes: saved.notes || '',
          performedAt: saved.performedAt || ''
        })
      }
      toast.success('Shared setup saved')
      return true
    } catch (error: any) {
      console.error('Failed to save trial setup:', error)
      const errorMessage = error.response?.data?.details
        ? Object.values(error.response.data.details).join(', ')
        : error.response?.data?.error || 'Failed to save shared setup'
      toast.error(errorMessage)
      return false
    } finally {
      setIsSavingSetup(false)
    }
  }

  const handleDiscardColumns = () => {
    if (!columnsDirty) {
      return
    }

    const confirmDiscard = confirm('Discard unsaved column changes?')
    if (!confirmDiscard) {
      return
    }

    setParameterColumns(savedColumns)
    setRemovedColumns([])
    setColumnsDirty(false)
  }

  const handleProceedToTrials = async () => {
    if (columnsDirty) {
      const saved = await handleSaveColumns(false)
      if (!saved) {
        return
      }
    }

    const setupSaved = await handleSaveSetup()
    if (!setupSaved) {
      return
    }

    setSetupLocked(true)
  }

  const handleEditSetup = () => {
    setSetupLocked(false)
  }

  const handleResetSetup = async () => {
    const confirmReset = confirm('Reset shared setup fields?')
    if (!confirmReset) {
      return
    }

    const clearedSetup = {
      objective: '',
      equipment: '',
      notes: '',
      performedAt: ''
    }

    setCommonSetup(clearedSetup)
    const saved = await handleSaveSetup(clearedSetup)
    if (saved) {
      setSetupLocked(false)
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

  const trimmedColumns = parameterColumns.map(col => formatColumnLabel(parseColumnLabel(col).name, parseColumnLabel(col).unit))
  const columnCounts = trimmedColumns.reduce<Record<string, number>>((acc, col) => {
    if (!col) {
      return acc
    }
    acc[col] = (acc[col] || 0) + 1
    return acc
  }, {})
  const hasEmptyColumns = parameterColumns.some(col => !parseColumnLabel(col).name.trim())
  const trialEntriesLocked = !setupLocked

  // Progress tracking
  const stepProgress = {
    columnsReady: parameterColumns.length > 0 && !columnsDirty && !hasEmptyColumns,
    setupSaved: setupLocked,
    trialsAdded: trials.length > 0
  }

  // Validation for setup fields
  const setupRequired = {
    hasColumns: parameterColumns.length > 0,
    hasObjective: commonSetup.objective.trim().length > 0,
    hasEquipment: commonSetup.equipment.trim().length > 0,
    hasDate: commonSetup.performedAt.length > 0
  }

  const setupIsValid = 
    setupRequired.hasColumns && 
    setupRequired.hasObjective && 
    setupRequired.hasEquipment && 
    setupRequired.hasDate &&
    !columnsDirty &&
    !hasEmptyColumns &&
    hasLoadedColumns

  const canProceedToTrials = setupIsValid && !isSavingSetup

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/projects/${projectId}`)}
            className="gap-2 mb-4"
          >
            <ArrowLeft size={16} />
            Back to Project
          </Button>
          <div>
            <h1 className="text-4xl font-bold mb-2">Trial Log</h1>
            <p className="text-base text-muted-foreground">
              {project?.name || 'Project'} — Create and manage laboratory trials
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center gap-6">
            {/* Step 1: Parameters */}
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                stepProgress.columnsReady 
                  ? 'border-green-500 bg-green-50 text-green-600' 
                  : 'border-muted-foreground bg-muted text-muted-foreground'
              }`}>
                {stepProgress.columnsReady ? (
                  <CheckCircle size={20} weight="fill" />
                ) : (
                  <span className="text-sm font-semibold">1</span>
                )}
              </div>
              <div className="text-sm">
                <p className="font-semibold">Columns</p>
                <p className="text-xs text-muted-foreground">{parameterColumns.length} parameters</p>
              </div>
            </div>
            <div className="h-1 flex-1 rounded-full bg-muted" />

            {/* Step 2: Setup */}
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                stepProgress.setupSaved 
                  ? 'border-green-500 bg-green-50 text-green-600' 
                  : 'border-muted-foreground bg-muted text-muted-foreground'
              }`}>
                {stepProgress.setupSaved ? (
                  <CheckCircle size={20} weight="fill" />
                ) : (
                  <span className="text-sm font-semibold">2</span>
                )}
              </div>
              <div className="text-sm">
                <p className="font-semibold">Setup</p>
                <p className="text-xs text-muted-foreground">Shared details</p>
              </div>
            </div>
            <div className="h-1 flex-1 rounded-full bg-muted" />

            {/* Step 3: Trials */}
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                stepProgress.trialsAdded 
                  ? 'border-green-500 bg-green-50 text-green-600' 
                  : 'border-muted-foreground bg-muted text-muted-foreground'
              }`}>
                {stepProgress.trialsAdded ? (
                  <CheckCircle size={20} weight="fill" />
                ) : (
                  <span className="text-sm font-semibold">3</span>
                )}
              </div>
              <div className="text-sm">
                <p className="font-semibold">Trials</p>
                <p className="text-xs text-muted-foreground">{trials.length} trials</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Flask size={20} />
                Configuration
              </CardTitle>
              <CardDescription>
                Set up your experiment parameters and shared trial details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {setupLocked ? (
                // Locked state - Summary view
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 rounded-lg bg-green-50 border border-green-200 p-4">
                    <div>
                      <p className="font-semibold text-green-900">Setup Complete</p>
                      <p className="text-sm text-green-800">Ready to add trials. Edit to make changes.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleEditSetup} className="border-green-200">
                      Edit
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">PARAMETERS</p>
                      <p className="text-sm font-medium">{parameterColumns.length} columns</p>
                      <div className="text-xs text-muted-foreground mt-2 space-y-1 max-h-24 overflow-y-auto">
                        {parameterColumns.length === 0 ? (
                          <p>None</p>
                        ) : (
                          parameterColumns.map((col, idx) => (
                            <p key={idx}>{col}</p>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">DEFAULT DATE</p>
                      <p className="text-sm font-medium">{commonSetup.performedAt || 'Not set'}</p>
                    </div>

                    {commonSetup.objective && (
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">OBJECTIVE</p>
                        <p className="text-sm">{commonSetup.objective}</p>
                      </div>
                    )}

                    {commonSetup.equipment && (
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">EQUIPMENT</p>
                        <p className="text-sm">{commonSetup.equipment}</p>
                      </div>
                    )}
                  </div>

                  {commonSetup.notes && (
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">NOTES</p>
                      <p className="text-sm">{commonSetup.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                // Editable state
                <>
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
                    <p className="font-semibold mb-1">Step 1: Define Trial Parameters</p>
                    <p className="text-sm">Create column headers for data you'll record (temperature, pressure, flow rate, etc.)</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Parameters</Label>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={addParameterColumn} className="gap-2">
                          <Plus size={14} />
                          Add Column
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSaveColumns(false)}
                          disabled={isSavingColumns || !columnsDirty}
                          className="gap-2"
                        >
                          <FloppyDisk size={14} />
                          {isSavingColumns ? 'Saving...' : columnsDirty ? 'Save' : 'Saved'}
                        </Button>
                        {columnsDirty && (
                          <span className="text-xs text-amber-600 font-medium">Unsaved</span>
                        )}
                      </div>
                    </div>

                    {parameterColumns.length > 0 ? (
                      <div className="space-y-2">
                        {parameterColumns.map((col, index) => {
                          const parsed = parseColumnLabel(col)
                          return (
                            <div key={`param-${index}`} className="flex gap-2 items-end">
                              <div className="flex-1 space-y-1">
                                <Input
                                  value={parsed.name}
                                  onChange={(e) => updateParameterName(index, e.target.value)}
                                  placeholder="Column name"
                                  className="text-sm"
                                />
                                {!parsed.name.trim() && (
                                  <p className="text-xs text-red-600">Required</p>
                                )}
                              </div>
                              <Input
                                value={parsed.unit}
                                onChange={(e) => updateParameterUnit(index, e.target.value)}
                                placeholder="Unit (optional)"
                                className="w-32 text-sm"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeParameterColumn(index)}
                                className="border-red-200 text-red-600 hover:bg-red-50"
                              >
                                <X size={16} />
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground italic">No columns yet—start by adding one</div>
                    )}

                    {removedColumns.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Removed:</span>
                        {removedColumns.map((column) => (
                          <Button
                            key={column}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => restoreParameterColumn(column)}
                            className="h-7 text-xs"
                          >
                            ↺ {column}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Excel Paste Section - Collapsed */}
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        <span className="text-xs">▶</span> Quick Add from Excel (paste headers)
                      </summary>
                      <div className="mt-3 border rounded-lg bg-muted/20 p-3 space-y-2">
                        <Textarea
                          value={columnPasteInput}
                          onChange={(e) => setColumnPasteInput(e.target.value)}
                          placeholder="Paste Excel header row (tab or comma separated)"
                          rows={2}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={appendColumnsFromPaste}>
                            Append
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={replaceColumnsFromPaste}>
                            Replace
                          </Button>
                        </div>
                      </div>
                    </details>
                  </div>

                  <div className="border-t pt-6">
                    <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 text-sm text-indigo-900 mb-4">
                      <p className="font-semibold mb-1">Step 2: Add Shared Details</p>
                      <p className="text-sm">Complete all required fields to unlock trial entry <span className="text-red-600">*</span></p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="common-objective" className="font-semibold">Objective <span className="text-red-600">*</span></Label>
                          {setupRequired.hasObjective && <CheckCircle size={16} className="text-green-600" />}
                        </div>
                        <Textarea
                          id="common-objective"
                          value={commonSetup.objective}
                          onChange={(e) => setCommonSetup({ ...commonSetup, objective: e.target.value })}
                          placeholder="What are you trying to achieve with this experiment?"
                          rows={2}
                          className="text-sm"
                        />
                        {!setupRequired.hasObjective && (
                          <p className="text-xs text-red-600">Required field</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="common-equipment" className="font-semibold">Equipment <span className="text-red-600">*</span></Label>
                            {setupRequired.hasEquipment && <CheckCircle size={16} className="text-green-600" />}
                          </div>
                          <Textarea
                            id="common-equipment"
                            value={commonSetup.equipment}
                            onChange={(e) => setCommonSetup({ ...commonSetup, equipment: e.target.value })}
                            placeholder="e.g., Reactor A, Pump 1, Temperature probe"
                            rows={2}
                            className="text-sm"
                          />
                          {!setupRequired.hasEquipment && (
                            <p className="text-xs text-red-600">Required field</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="common-notes" className="font-semibold">Notes (Optional)</Label>
                          <Textarea
                            id="common-notes"
                            value={commonSetup.notes}
                            onChange={(e) => setCommonSetup({ ...commonSetup, notes: e.target.value })}
                            placeholder="Observations, conditions, or special notes"
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="common-date" className="font-semibold">Default Date <span className="text-red-600">*</span></Label>
                          {setupRequired.hasDate && <CheckCircle size={16} className="text-green-600" />}
                        </div>
                        <Input
                          id="common-date"
                          type="date"
                          value={commonSetup.performedAt}
                          onChange={(e) => setCommonSetup({ ...commonSetup, performedAt: e.target.value })}
                          className="text-sm"
                        />
                        {!setupRequired.hasDate && (
                          <p className="text-xs text-red-600">Required field</p>
                        )}
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                        <p className="font-semibold mb-2">Configuration Status:</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            {setupRequired.hasColumns ? (
                              <CheckCircle size={14} className="text-green-600" />
                            ) : (
                              <Circle size={14} className="text-gray-400" />
                            )}
                            <span>{parameterColumns.length} parameters added</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {setupRequired.hasObjective ? (
                              <CheckCircle size={14} className="text-green-600" />
                            ) : (
                              <Circle size={14} className="text-gray-400" />
                            )}
                            <span>Objective defined</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {setupRequired.hasEquipment ? (
                              <CheckCircle size={14} className="text-green-600" />
                            ) : (
                              <Circle size={14} className="text-gray-400" />
                            )}
                            <span>Equipment listed</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {setupRequired.hasDate ? (
                              <CheckCircle size={14} className="text-green-600" />
                            ) : (
                              <Circle size={14} className="text-gray-400" />
                            )}
                            <span>Date selected</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!canProceedToTrials && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-900 mt-6">
                      <p className="font-semibold mb-2">Cannot proceed yet. Missing:</p>
                      <ul className="space-y-1 text-xs ml-2">
                        {!setupRequired.hasColumns && <li>• Define at least one parameter column</li>}
                        {!setupRequired.hasObjective && <li>• Fill in the objective</li>}
                        {!setupRequired.hasEquipment && <li>• List the equipment</li>}
                        {!setupRequired.hasDate && <li>• Select a date</li>}
                        {columnsDirty && <li>• Save parameter changes</li>}
                        {hasEmptyColumns && <li>• Remove empty parameter columns</li>}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResetSetup}
                      disabled={isSavingSetup}
                    >
                      Reset
                    </Button>
                    <Button
                      type="button"
                      onClick={handleProceedToTrials}
                      disabled={!canProceedToTrials}
                      className="gap-2"
                    >
                      {isSavingSetup ? 'Saving...' : 'Continue to Trials'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TestTube size={20} />
                    Trial Entries
                  </CardTitle>
                  <CardDescription>Add trials. Step 3 of 3.</CardDescription>
                </div>
                <Button
                  type="button"
                  onClick={addTrialRow}
                  className="gap-2"
                  disabled={trialEntriesLocked}
                >
                  <Plus size={16} />
                  Add Row
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {trialEntriesLocked && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                  <p className="font-semibold">Complete Configuration First</p>
                  <p className="text-xs">Save your parameters and shared details to start adding trials</p>
                </div>
              )}
              <div className={trialEntriesLocked ? 'space-y-4 opacity-50 pointer-events-none' : 'space-y-4'}>
                {trialRows.length > 0 && (
                  <div className="overflow-x-auto border rounded-lg bg-muted/30">
                    <div
                      className="grid gap-2 p-3 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0"
                      style={{
                        gridTemplateColumns: `1.5fr 1fr 1.2fr ${
                          parameterColumns.length > 0 ? `repeat(${Math.min(parameterColumns.length, 3)}, 1fr)` : ''
                        } 40px`
                      }}
                    >
                      <div>Trial Name</div>
                      <div>Status</div>
                      <div>Date</div>
                      {parameterColumns.slice(0, 3).map((col, index) => {
                        const parsed = parseColumnLabel(col)
                        return (
                          <div key={`header-${index}`} className="truncate">
                            <div className="truncate">{parsed.name || 'Parameter'}</div>
                          </div>
                        )
                      })}
                      {parameterColumns.length > 3 && (
                        <div className="text-muted-foreground">+{parameterColumns.length - 3}</div>
                      )}
                      <div></div>
                    </div>

                    <div className="space-y-1 p-2">
                      {trialRows.map((row, idx) => (
                        <div
                          key={row.id}
                          className="grid gap-2 items-center bg-background rounded p-2 hover:bg-muted/40 transition-colors"
                          style={{
                            gridTemplateColumns: `1.5fr 1fr 1.2fr ${
                              parameterColumns.length > 0 ? `repeat(${Math.min(parameterColumns.length, 3)}, 1fr)` : ''
                            } 40px`
                          }}
                        >
                          <Input
                            value={row.name}
                            onChange={(e) => updateTrialRow(row.id, { name: e.target.value })}
                            placeholder="Trial name"
                            className="text-sm"
                          />
                          <Select
                            value={row.status}
                            onValueChange={(value) => updateTrialRow(row.id, { status: value as Trial['status'] })}
                          >
                            <SelectTrigger className="text-sm">
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
                            className="text-sm"
                          />
                          {parameterColumns.slice(0, 3).map((col, index) => (
                            <Input
                              key={`cell-${row.id}-${index}`}
                              value={row.readings[col] || ''}
                              onChange={(e) => updateTrialReading(row.id, col, e.target.value)}
                              placeholder="Value"
                              className="text-sm"
                            />
                          ))}
                          {parameterColumns.length > 3 && <div></div>}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTrialRow(row.id)}
                            disabled={trialRows.length === 1}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {trialRows.length === 1 && parameterColumns.length > 3 && (
                  <div className="text-xs text-muted-foreground italic">
                    Showing first 3 parameters. Scroll right to see all {parameterColumns.length} parameters.
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button onClick={handleSaveTrials} disabled={isLoading} className="gap-2">
                    <FloppyDisk size={16} />
                    {isLoading ? 'Saving...' : 'Save Trials'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Saved Trials</h2>
              <p className="text-sm text-muted-foreground">{trials.length} trial{trials.length !== 1 ? 's' : ''} recorded</p>
            </div>
          </div>

          {trials.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-12 pb-12 text-center">
                <TestTube size={40} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                <CardTitle className="mb-2">No Trials Yet</CardTitle>
                <CardDescription className="mb-4">
                  Create your first trial using the form above, then add samples for analysis.
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {trials.map((trial) => {
                const samples = samplesByTrial[trial.id] || []
                const statusColors = {
                  planned: 'bg-blue-100 text-blue-800 border-blue-200',
                  running: 'bg-amber-100 text-amber-800 border-amber-200',
                  completed: 'bg-green-100 text-green-800 border-green-200'
                }
                return (
                  <Card key={trial.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <TestTube size={18} className="text-blue-600" />
                            <h3 className="text-lg font-bold">{trial.name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColors[trial.status as keyof typeof statusColors] || statusColors.planned}`}>
                              {trial.status.charAt(0).toUpperCase() + trial.status.slice(1)}
                            </span>
                          </div>
                          {trial.objective && (
                            <p className="text-sm text-muted-foreground italic">{trial.objective}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {trial.equipment && (
                          <div className="rounded-lg border bg-muted/40 p-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Equipment</p>
                            <p className="text-sm font-medium">{trial.equipment}</p>
                          </div>
                        )}
                        {trial.notes && (
                          <div className="rounded-lg border bg-muted/40 p-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
                            <p className="text-sm">{trial.notes}</p>
                          </div>
                        )}
                        <div className="rounded-lg border bg-muted/40 p-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Date</p>
                          <p className="text-sm font-medium">
                            {trial.performed_at ? new Date(trial.performed_at).toLocaleDateString() : 'Not specified'}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-blue-50 p-3 border-blue-200">
                          <p className="text-xs font-semibold text-blue-900 mb-1">Samples</p>
                          <p className="text-lg font-bold text-blue-600">{samples.length}</p>
                        </div>
                      </div>

                      {/* Samples Section */}
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-sm">Attached Samples</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openSampleDialog(trial)}
                            className="gap-2"
                          >
                            <Plus size={14} />
                            Add Sample
                          </Button>
                        </div>

                        {samples.length === 0 ? (
                          <div className="text-center py-6 border rounded-lg bg-muted/30">
                            <p className="text-sm text-muted-foreground">No samples yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Add samples to prepare for analysis</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {samples.map((sample) => (
                              <div
                                key={sample.id}
                                className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3 hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{sample.sample_id || sample.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{sample.description}</p>
                                  {sample.type && (
                                    <p className="text-xs text-muted-foreground mt-1">Type: {sample.type}</p>
                                  )}
                                </div>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleMoveToAnalysis(sample)}
                                  className="gap-1 shrink-0"
                                >
                                  <ChartBar size={14} />
                                  Analyze
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isSampleDialogOpen} onOpenChange={setIsSampleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Sample to Trial</DialogTitle>
            <DialogDescription>
              {selectedTrial ? `Record a sample output from trial: ${selectedTrial.name}` : 'Record a sample output'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTrial && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex items-start gap-3">
                <TestTube size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold">Trial: {selectedTrial.name}</p>
                  <p className="text-xs text-blue-800 mt-1 opacity-80">{selectedTrial.objective || 'No objective recorded'}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="sample-id" className="font-semibold">Sample ID *</Label>
              <Input
                id="sample-id"
                value={sampleForm.sampleId}
                onChange={(e) => setSampleForm({ ...sampleForm, sampleId: e.target.value })}
                placeholder="e.g., RXN-001-A, S001-crude, mixture-1a"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">Unique identifier for this sample output</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sample-description" className="font-semibold">Description *</Label>
              <Textarea
                id="sample-description"
                value={sampleForm.description}
                onChange={(e) => setSampleForm({ ...sampleForm, description: e.target.value })}
                placeholder="What is this sample? (e.g., crude reaction mixture, purified product, intermediate)"
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">Required—what was collected or produced</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sample-type" className="font-semibold">Type (optional)</Label>
              <Input
                id="sample-type"
                value={sampleForm.type}
                onChange={(e) => setSampleForm({ ...sampleForm, type: e.target.value })}
                placeholder="e.g., crude, purified, intermediate, standard, blank"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">Categorize the sample type for better organization</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsSampleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSample} disabled={isLoading} className="gap-2">
                <FloppyDisk size={16} />
                {isLoading ? 'Adding...' : 'Add Sample'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
