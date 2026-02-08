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
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    derivedId: '',
    description: '',
    metadata: '{}',
    executionMode: 'platform' as 'platform' | 'external',
    executedByOrgId: '',
    externalReference: '',
    performedAt: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (open) {
      fetchOrganizations()
      // Generate suggested derived ID
      setFormData(prev => ({
        ...prev,
        derivedId: generateDerivedId(parentSample.sample_id)
      }))
    }
  }, [open, parentSample])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.derivedId.trim()) {
      toast.error('Derived sample ID is required')
      return
    }

    if (!formData.description.trim()) {
      toast.error('Description is required')
      return
    }

    if (formData.executionMode === 'external' && !formData.externalReference.trim()) {
      toast.error('External reference is required for external execution')
      return
    }

    let parsedMetadata = {}
    if (formData.metadata.trim()) {
      try {
        parsedMetadata = JSON.parse(formData.metadata)
      } catch (error) {
        toast.error('Invalid JSON format in metadata')
        return
      }
    }

    setIsLoading(true)
    try {
      const transformedData = transformDerivedSampleForAPI({
        parentId: parentSample.id,
        derivedId: formData.derivedId,
        description: formData.description,
        derivation_method: formData.derivedId || 'unknown'
      })

      await axiosInstance.post('/derived-samples', transformedData)

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
      derivedId: generateDerivedId(parentSample.sample_id),
      description: '',
      metadata: '{}',
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
                  <p className="font-mono text-sm">{parentSample.sample_id}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {parentSample.description}
                  </p>
                </div>
                <Badge variant="secondary">{parentSample.status}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="derivedId">Derived Sample ID *</Label>
              <Input
                id="derivedId"
                value={formData.derivedId}
                onChange={(e) => setFormData({...formData, derivedId: e.target.value})}
                placeholder={`e.g., ${parentSample.sample_id}-A`}
                required
              />
            </div>

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
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe the transformation process (e.g., purification, recrystallization, extraction...)"
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="performedAt">Date Performed</Label>
              <Input
                id="performedAt"
                type="date"
                value={formData.performedAt}
                onChange={(e) => setFormData({...formData, performedAt: e.target.value})}
              />
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
            <Label htmlFor="metadata">Metadata (JSON format)</Label>
            <Textarea
              id="metadata"
              value={formData.metadata}
              onChange={(e) => setFormData({...formData, metadata: e.target.value})}
              placeholder={`{\n  "purity": "95%",\n  "yield": "78%",\n  "method": "column chromatography"\n}`}
              rows={4}
            />
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Derived Sample'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}