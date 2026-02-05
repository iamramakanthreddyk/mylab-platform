import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import axiosInstance from '@/lib/axiosConfig'
import { toast } from 'sonner'

interface CreateStageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  nextOrderIndex: number
  onSuccess: () => void
}

export function CreateStageDialog({ open, onOpenChange, projectId, nextOrderIndex, onSuccess }: CreateStageDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Stage name is required')
      return
    }

    setIsLoading(true)
    try {
      await axiosInstance.post(`/projects/${projectId}/stages`, {
        name: formData.name,
        description: formData.description,
        orderIndex: nextOrderIndex
      })

      toast.success('Stage created successfully')
      setFormData({ name: '', description: '' })
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Failed to create stage:', error)
      toast.error(error.response?.data?.error?.message || 'Failed to create stage')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Stage</DialogTitle>
          <DialogDescription>
            Add a workflow stage to this project
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stageName">Stage Name *</Label>
            <Input
              id="stageName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Extraction, Analysis, QC"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stageDescription">Description</Label>
            <Textarea
              id="stageDescription"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what happens in this stage..."
              rows={3}
            />
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
              {isLoading ? 'Creating...' : 'Create Stage'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
