import { useState, useEffect } from 'react'
import { User, Batch, Organization } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ChartLine, MagnifyingGlass, Plus, Users, Calendar, TestTube } from '@phosphor-icons/react'
import axiosInstance from '@/lib/axiosConfig'
import { toast } from 'sonner'

interface BatchesViewProps {
  user: User
}

export function BatchesView({ user }: BatchesViewProps) {
  const [batches, setBatches] = useState<Batch[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchBatches()
  }, [])

  const fetchBatches = async () => {
    try {
      const response = await axiosInstance.get('/batches')
      setBatches(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch batches:', error)
      setBatches([])
      toast.error('Failed to load batches')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredBatches = batches.filter(batch =>
    batch.batchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    batch.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status: Batch['status']) => {
    switch (status) {
      case 'completed': return 'default'
      case 'in_progress': return 'secondary'
      case 'sent': return 'outline'
      case 'ready': return 'outline'
      case 'created': return 'outline'
      default: return 'outline'
    }
  }

  const getStatusDisplay = (status: Batch['status']) => {
    switch (status) {
      case 'in_progress': return 'In Progress'
      case 'created': return 'Created'
      case 'ready': return 'Ready'
      case 'sent': return 'Sent'
      case 'completed': return 'Completed'
      default: return status
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Analysis Batches</h2>
            <p className="text-muted-foreground">
              Monitor grouped samples sent for analysis across different labs and methods
            </p>
          </div>
          <Button className="gap-2">
            <Plus size={18} />
            Create Batch
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlass
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="Search batches by ID or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin text-muted-foreground mb-4">
              <ChartLine size={48} />
            </div>
            <p className="text-muted-foreground">Loading batches...</p>
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="text-center py-16">
            <ChartLine size={64} className="mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No analysis batches found</h3>
            <p className="text-muted-foreground mb-4">
              {batches.length === 0 
                ? "Create your first batch to group samples for analysis"
                : "Try adjusting your search terms"
              }
            </p>
            <Button className="gap-2">
              <Plus size={18} />
              Create First Batch
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBatches.map((batch) => (
              <Card key={batch.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ChartLine size={16} className="text-blue-500" />
                      <CardTitle className="text-lg font-mono">{batch.batchId}</CardTitle>
                    </div>
                    <Badge variant={getStatusColor(batch.status)}>
                      {getStatusDisplay(batch.status)}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center justify-between">
                    <span className="truncate">{batch.description}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users size={12} />
                    <span>Execution: {batch.executionMode}</span>
                  </div>
                  
                  {batch.sentAt && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar size={12} />
                      <span>Sent: {new Date(batch.sentAt).toLocaleDateString()}</span>
                    </div>
                  )}

                  {batch.completedAt && (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <TestTube size={12} />
                      <span>Completed: {new Date(batch.completedAt).toLocaleDateString()}</span>
                    </div>
                  )}

                  {batch.externalReference && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        Ref: {batch.externalReference}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-3">
                    <span>Created: {new Date(batch.createdAt).toLocaleDateString()}</span>
                    <span>Click for details</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}