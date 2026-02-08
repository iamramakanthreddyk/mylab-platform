import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TestTube, ArrowRight } from '@phosphor-icons/react'
import axiosInstance from '@/lib/axiosConfig'
import { transformDerivedSampleForAPI } from '@/lib/endpointTransformers'
import { Sample, Organization } from '@/lib/types'
import { toast } from 'sonner'

interface CreateDerivedSampleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentSample: Sample
  onSuccess: () => void
}

export function CreateDerivedSampleDialog({ 
  open, 
  onOpenChange, 
  parentSample, 
  onSuccess 
}: CreateDerivedSampleDialogProps) {
  const [step, setStep] = useState<'trial' | 'sample'>('trial')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [availableSamples, setAvailableSamples] = useState<Sample[]>([])
  const [selectedParentId, setSelectedParentId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    trialName: '',
    trialObjective: '',
    trialParameters: '',
    trialEquipment: '',
    trialNotes: '',
    derivedId: '',
    derivationMethod: '',
    description: '',
    executionMode: 'platform' as 'platform' | 'external',
    executedByOrgId: '',
    externalReference: '',
    performedAt: new Date().toISOString().split('T')[0]
  })

  const activeParentSample =
    availableSamples.find(sample => sample.id === selectedParentId) || parentSample

  useEffect(() => {
    if (open) {
      fetchOrganizations()
      fetchSamples(parentSample.project_id)
      setStep('trial')
      // Generate suggested derived ID
      setFormData(prev => ({
        ...prev,
        trialName: parentSample.sample_id,
        derivedId: generateDerivedId(parentSample.sample_id)
      }))
      setSelectedParentId(parentSample.id)
    }
  }, [open, parentSample])

  useEffect(() => {
    if (!open) {
      return
    }

    const selectedSample = availableSamples.find(sample => sample.id === selectedParentId)
    if (!selectedSample) {
      return
    }

    setFormData(prev => ({
      ...prev,
      trialName: selectedSample.sample_id,
      derivedId: generateDerivedId(selectedSample.sample_id)
    }))
  }, [availableSamples, open, selectedParentId])

  const generateDerivedId = (parentId: string) => {
    const timestamp = Date.now().toString(36).slice(-3)
    return `${parentId}-D${timestamp}`
  }

  const fetchOrganizations = async () => {
    try {
      const response = await axiosInstance.get('/organizations')
      const orgsData = response.data.data || []
      setOrganizations(orgsData)
      if (orgsData.length > 0) {
        setFormData(prev => ({ ...prev, executedByOrgId: orgsData[0].id }))
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
    }
  }

  const fetchSamples = async (projectId?: string) => {
    if (!projectId) {
      setAvailableSamples([parentSample])
      return
    }

    try {
      const response = await axiosInstance.get(`/samples?projectId=${projectId}`)
      const samplesData = response.data.data || []
      if (samplesData.length > 0) {
        setAvailableSamples(samplesData)
        return
      }
      setAvailableSamples([parentSample])
    } catch (error) {
      console.error('Failed to fetch samples:', error)
      setAvailableSamples([parentSample])
    }
  }

  const buildDescription = () => {
    const descriptionParts: string[] = []
    const baseDescription = formData.description.trim()

    if (baseDescription) {
      descriptionParts.push(baseDescription)
    }

    const trialDetails = [
      formData.trialName.trim() ? `Trial: ${formData.trialName.trim()}` : '',
      formData.trialObjective.trim() ? `Objective: ${formData.trialObjective.trim()}` : '',
      formData.trialParameters.trim() ? `Parameters: ${formData.trialParameters.trim()}` : '',
      formData.trialEquipment.trim() ? `Equipment: ${formData.trialEquipment.trim()}` : '',
      formData.trialNotes.trim() ? `Notes: ${formData.trialNotes.trim()}` : ''
    ].filter(Boolean)

    if (trialDetails.length > 0) {
      if (descriptionParts.length > 0) {
        descriptionParts.push('', 'Trial details:')
      } else {
        descriptionParts.push('Trial details:')
      }
      descriptionParts.push(...trialDetails.map(detail => `- ${detail}`))
    }

    return descriptionParts.join('\n')
  }

  const canProceedToSample = formData.trialName.trim().length > 0 && formData.trialObjective.trim().length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.derivedId.trim()) {
      toast.error('Derived sample ID is required')
      return
    }

    if (!formData.trialName.trim()) {
      toast.error('Trial name is required')
      return
    }

    if (!formData.trialObjective.trim()) {
      toast.error('Trial objective is required')
      return
    }

    if (!formData.derivationMethod.trim()) {
      toast.error('Derivation method is required')
      return
    }

    if (formData.executionMode === 'external' && !formData.externalReference.trim()) {
      toast.error('External reference is required for external execution')
      return
    }

    const descriptionToSend = buildDescription()

    if (!descriptionToSend.trim()) {
      toast.error('Add a description or trial details before continuing')
      return
    }

    setIsLoading(true)
    try {
      const transformedData = transformDerivedSampleForAPI({
        parentId: activeParentSample.id,
        derivedId: formData.derivedId,
        description: descriptionToSend,
        derivation_method: formData.derivationMethod
      })

      await axiosInstance.post(
        `/samples/${activeParentSample.workspace_id}/${activeParentSample.id}/derived`,
        transformedData
      )

      toast.success('Derived sample created successfully')
      resetForm()
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Failed to create derived sample:', error)
      const errorMessage = error.response?.data?.details 
        ? Object.values(error.response.data.details).join(', ')
        : error.response?.data?.error?.message || 'Failed to create derived sample'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      trialName: activeParentSample.sample_id,
      trialObjective: '',
      trialParameters: '',
      trialEquipment: '',
      trialNotes: '',
      derivedId: generateDerivedId(activeParentSample.sample_id),
      derivationMethod: '',
      description: '',
      executionMode: 'platform',
      executedByOrgId: organizations[0]?.id || '',
      externalReference: '',
      performedAt: new Date().toISOString().split('T')[0]
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Derived Sample</DialogTitle>
          <DialogDescription>
            Create a new sample derived from processing or transforming the parent sample
          </DialogDescription>
        </DialogHeader>

        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TestTube size={16} />
                Parent Sample
                <ArrowRight size={16} className="text-muted-foreground" />
                <span className="text-muted-foreground">New Derived Sample</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm">{activeParentSample.sample_id}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {activeParentSample.description}
                  </p>
                </div>
                <Badge variant="secondary">{activeParentSample.status}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={step === 'trial' ? 'font-semibold text-foreground' : ''}>1. Trial Setup</span>
            <span>→</span>
            <span className={step === 'sample' ? 'font-semibold text-foreground' : ''}>2. Sample + Analysis</span>
          </div>

          {step === 'trial' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trialName">Trial Name *</Label>
                  <Input
                    id="trialName"
                    value={formData.trialName}
                    onChange={(e) => setFormData({ ...formData, trialName: e.target.value })}
                    placeholder="e.g., Trial 5TE"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="performedAt">Date Performed</Label>
                  <Input
                    id="performedAt"
                    type="date"
                    value={formData.performedAt}
                    onChange={(e) => setFormData({ ...formData, performedAt: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trialObjective">Trial Objective *</Label>
                <Textarea
                  id="trialObjective"
                  value={formData.trialObjective}
                  onChange={(e) => setFormData({ ...formData, trialObjective: e.target.value })}
                  placeholder="Why are you running this trial?"
                  required
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trialParameters">Parameters</Label>
                  <Textarea
                    id="trialParameters"
                    value={formData.trialParameters}
                    onChange={(e) => setFormData({ ...formData, trialParameters: e.target.value })}
                    placeholder="Concentration, temperature, duration, etc."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trialEquipment">Equipment</Label>
                  <Textarea
                    id="trialEquipment"
                    value={formData.trialEquipment}
                    onChange={(e) => setFormData({ ...formData, trialEquipment: e.target.value })}
                    placeholder="Instruments, reactors, columns, etc."
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trialNotes">Trial Notes</Label>
                <Textarea
                  id="trialNotes"
                  value={formData.trialNotes}
                  onChange={(e) => setFormData({ ...formData, trialNotes: e.target.value })}
                  placeholder="Observations, issues, or deviations"
                  rows={3}
                />
              </div>
            </>
          )}

          {step === 'sample' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="parentSample">Pick Parent Sample</Label>
                <Select
                  value={selectedParentId}
                  onValueChange={setSelectedParentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a parent sample" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSamples.map((sample) => (
                      <SelectItem key={sample.id} value={sample.id}>
                        {sample.sample_id} - {sample.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="derivedId">Derived Sample ID *</Label>
                  <Input
                    id="derivedId"
                    value={formData.derivedId}
                    onChange={(e) => setFormData({ ...formData, derivedId: e.target.value })}
                    placeholder={`e.g., ${activeParentSample.sample_id}-A`}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="derivationMethod">Derivation Method *</Label>
                  <Input
                    id="derivationMethod"
                    value={formData.derivationMethod}
                    onChange={(e) => setFormData({ ...formData, derivationMethod: e.target.value })}
                    placeholder="e.g., as_received, extraction, purification"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Transformation Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the transformation process (optional if trial details cover it)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="executionMode">Execution Mode *</Label>
                  <Select
                    value={formData.executionMode}
                    onValueChange={(value: 'platform' | 'external') => 
                      setFormData({ ...formData, executionMode: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platform">Platform (Internal)</SelectItem>
                      <SelectItem value="external">External Lab</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="executedBy">Executed By *</Label>
                  <Select
                    value={formData.executedByOrgId}
                    onValueChange={(value) => setFormData({ ...formData, executedByOrgId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name} ({org.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.executionMode === 'external' && (
                <div className="space-y-2">
                  <Label htmlFor="externalReference">External Reference *</Label>
                  <Input
                    id="externalReference"
                    value={formData.externalReference}
                    onChange={(e) => setFormData({ ...formData, externalReference: e.target.value })}
                    placeholder="External lab tracking ID or reference"
                    required
                  />
                </div>
              )}
            </>
          )}

          <div className="flex justify-between gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => (step === 'trial' ? onOpenChange(false) : setStep('trial'))}
              disabled={isLoading}
            >
              {step === 'trial' ? 'Cancel' : 'Back'}
            </Button>
            {step === 'trial' ? (
              <Button
                type="button"
                onClick={() => setStep('sample')}
                disabled={isLoading || !canProceedToSample}
              >
                Next: Sample Setup
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Sample & Continue'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}