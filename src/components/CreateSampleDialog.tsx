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
    sampleId: '',
    description: '',
    type: '',
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
    
    if (!formData.sampleId.trim()) {
      toast.error('Sample ID is required')
      return
    }

    if (!formData.description.trim()) {
      toast.error('Description is required')
      return
    }

    setIsLoading(true)
    try {
      await axiosInstance.post('/samples', {
        projectId,
        sampleId: formData.sampleId.trim(),
        type: formData.type || undefined,
        description: formData.description.trim(),
        stageId: formData.stageId || undefined
      })

      toast.success('Sample created successfully')
      setFormData({
        sampleId: '',
        description: '',
        type: '',
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
            <Label htmlFor="sampleId">Sample ID *</Label>
            <Input
              id="sampleId"
              value={formData.sampleId}
              onChange={(e) => setFormData({ ...formData, sampleId: e.target.value })}
              placeholder="e.g., Sample-001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the sample..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Sample Type</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
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
