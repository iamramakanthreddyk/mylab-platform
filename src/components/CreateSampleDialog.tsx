import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import axiosInstance from '@/lib/axiosConfig'
import { toast } from 'sonner'

interface Stage {
  id: string
  name: string
  orderIndex: number
}

interface CreateSampleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onSuccess: () => void
}

export function CreateSampleDialog({ open, onOpenChange, projectId, onSuccess }: CreateSampleDialogProps) {
  const [stages, setStages] = useState<Stage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sampleType: '',
    quantity: '',
    unit: '',
    stageId: ''
  })

  useEffect(() => {
    if (open && projectId) {
      fetchStages()
    }
  }, [open, projectId])

  const fetchStages = async () => {
    try {
      const response = await axiosInstance.get(`/projects/${projectId}/stages`)
      const stagesData = response.data.data || []
      setStages(stagesData)
      if (stagesData.length > 0) {
        setFormData(prev => ({ ...prev, stageId: stagesData[0].id }))
      }
    } catch (error) {
      console.error('Failed to fetch stages:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Sample name is required')
      return
    }

    setIsLoading(true)
    try {
      await axiosInstance.post('/samples', {
        projectId,
        name: formData.name,
        description: formData.description,
        sampleType: formData.sampleType,
        quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
        unit: formData.unit,
        stageId: formData.stageId || undefined
      })

      toast.success('Sample created successfully')
      setFormData({
        name: '',
        description: '',
        sampleType: '',
        quantity: '',
        unit: '',
        stageId: stages[0]?.id || ''
      })
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Failed to create sample:', error)
      toast.error(error.response?.data?.error?.message || 'Failed to create sample')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Sample</DialogTitle>
          <DialogDescription>
            Add a new sample to this project
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Sample Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Sample-001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the sample..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sampleType">Sample Type</Label>
              <Input
                id="sampleType"
                value={formData.sampleType}
                onChange={(e) => setFormData({ ...formData, sampleType: e.target.value })}
                placeholder="e.g., Blood, Tissue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <Select
                value={formData.stageId}
                onValueChange={(val) => setFormData({ ...formData, stageId: val })}
              >
                <SelectTrigger id="stage">
                  <SelectValue placeholder="Select stage..." />
                </SelectTrigger>
                <SelectContent>
                  {stages.length === 0 && (
                    <SelectItem value="none" disabled>No stages available</SelectItem>
                  )}
                  {stages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="e.g., 10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g., mg, mL"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Sample'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
