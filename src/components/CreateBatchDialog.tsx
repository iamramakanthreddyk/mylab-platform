import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ChartLine, TestTube } from '@phosphor-icons/react'
import axiosInstance from '@/lib/axiosConfig'
import { transformBatchForAPI } from '@/lib/endpointTransformers'
import { DerivedSample, Organization } from '@/lib/types'
import { toast } from 'sonner'

interface CreateBatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableDerived: DerivedSample[]
  onSuccess: () => void
}

export function CreateBatchDialog({ 
  open, 
  onOpenChange, 
  availableDerived, 
  onSuccess 
}: CreateBatchDialogProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSamples, setSelectedSamples] = useState<string[]>([])
  const [formData, setFormData] = useState({
    batchId: '',
    description: '',
    parameters: '{}',
    executionMode: 'platform' as 'platform' | 'external',
    executedByOrgId: '',
    externalReference: '',
    performedAt: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (open) {
      fetchOrganizations()
      setFormData(prev => ({
        ...prev,
        batchId: generateBatchId()
      }))
    }
  }, [open])

  const generateBatchId = () => {
    const timestamp = Date.now().toString(36).slice(-4)
    return `BATCH-${timestamp.toUpperCase()}`
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

  const toggleSampleSelection = (sampleId: string) => {
    setSelectedSamples(prev => 
      prev.includes(sampleId)
        ? prev.filter(id => id !== sampleId)
        : [...prev, sampleId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.batchId.trim()) {
      toast.error('Batch ID is required')
      return
    }

    if (!formData.description.trim()) {
      toast.error('Description is required')
      return
    }

    if (selectedSamples.length === 0) {
      toast.error('Please select at least one derived sample')
      return
    }

    if (formData.executionMode === 'external' && !formData.externalReference.trim()) {
      toast.error('External reference is required for external execution')
      return
    }

    let parsedParameters = {}
    if (formData.parameters.trim()) {
      try {
        parsedParameters = JSON.parse(formData.parameters)
      } catch (error) {
        toast.error('Invalid JSON format in parameters')
        return
      }
    }

    setIsLoading(true)
    try {
      const transformedData = transformBatchForAPI({
        ...formData,
        derivedSampleIds: selectedSamples,
        parameters: parsedParameters
      })

      await axiosInstance.post('/batches', transformedData)

      toast.success(`Batch created with ${selectedSamples.length} samples`)
      resetForm()
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Failed to create batch:', error)
      const errorMessage = error.response?.data?.details 
        ? Object.values(error.response.data.details).join(', ')
        : error.response?.data?.error?.message || 'Failed to create batch'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      batchId: generateBatchId(),
      description: '',
      parameters: '{}',
      executionMode: 'platform',
      executedByOrgId: organizations[0]?.id || '',
      externalReference: '',
      performedAt: new Date().toISOString().split('T')[0]
    })
    setSelectedSamples([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Analysis Batch</DialogTitle>
          <DialogDescription>
            Group derived samples together for batch analysis. All samples in the batch will undergo the same analysis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="batchId">Batch ID *</Label>
            <Input
              id="batchId"
              value={formData.batchId}
              onChange={(e) => setFormData({...formData, batchId: e.target.value})}
              placeholder="e.g., BATCH-42"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe the analysis purpose and goals..."
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="executionMode">Execution Mode *</Label>
              <Select
                value={formData.executionMode}
                onValueChange={(value: 'platform' | 'external') => 
                  setFormData({...formData, executionMode: value})
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
                onValueChange={(value) => setFormData({...formData, executedByOrgId: value})}
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
                onChange={(e) => setFormData({...formData, externalReference: e.target.value})}
                placeholder="External lab tracking ID or reference"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="parameters">Analysis Parameters (JSON format)</Label>
            <Textarea
              id="parameters"
              value={formData.parameters}
              onChange={(e) => setFormData({...formData, parameters: e.target.value})}
              placeholder={`{\n  "temperature": "25°C",\n  "solvent": "CDCl3",\n  "acquisition_time": "1 hour"\n}`}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="performedAt">Scheduled Date</Label>
            <Input
              id="performedAt"
              type="date"
              value={formData.performedAt}
              onChange={(e) => setFormData({...formData, performedAt: e.target.value})}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-base">Select Derived Samples ({selectedSamples.length} selected)</Label>
            <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-3">
              {availableDerived.length > 0 ? (
                availableDerived.map((sample) => (
                  <div key={sample.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={sample.id}
                      checked={selectedSamples.includes(sample.id)}
                      onCheckedChange={() => toggleSampleSelection(sample.id)}
                    />
                    <Card className="flex-1 cursor-pointer" onClick={() => toggleSampleSelection(sample.id)}>
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-mono text-sm font-medium">{sample.derivedId}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {sample.description}
                            </p>
                          </div>
                          <Badge variant="secondary">{sample.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <TestTube size={48} className="mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No derived samples ready for analysis</p>
                  <p className="text-sm text-muted-foreground">Create derived samples first</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || selectedSamples.length === 0}>
              {isLoading ? 'Creating...' : `Create Batch (${selectedSamples.length} samples)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}