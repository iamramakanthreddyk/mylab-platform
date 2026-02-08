import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Batch, Organization } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ChartLine, MagnifyingGlass, Plus, Users, Calendar, TestTube, CheckCircle, Clock, ArrowRight } from '@phosphor-icons/react'
import axiosInstance from '@/lib/axiosConfig'
import { toast } from 'sonner'

interface BatchesViewProps {
  user: User
}

interface BatchWithAnalytics extends Batch {
  analysisCount?: number
  completedCount?: number
  inProgressCount?: number
}

export function BatchesView({ user }: BatchesViewProps) {
  const navigate = useNavigate()
  const [batches, setBatches] = useState<BatchWithAnalytics[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchBatches()
  }, [])

  const fetchBatches = async () => {
    try {
      const response = await axiosInstance.get('/batches')
      const batchesData = response.data.data || []
      
      // Fetch analysis counts for each batch
      const batchesWithAnalytics = await Promise.all(
        batchesData.map(async (batch: Batch) => {
          try {
            const analysesResponse = await axiosInstance.get(`/analyses?batchId=${batch.id}`)
            const analyses = analysesResponse.data.data || []
            return {
              ...batch,
              analysisCount: analyses.length,
              completedCount: analyses.filter((a: any) => a.status === 'completed').length,
              inProgressCount: analyses.filter((a: any) => a.status === 'in_progress').length
            }
          } catch (error) {
            console.error(`Failed to fetch analyses for batch ${batch.id}:`, error)
            return {
              ...batch,
              analysisCount: 0,
              completedCount: 0,
              inProgressCount: 0
            }
          }
        })
      )
      
      setBatches(batchesWithAnalytics)
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
              <Card 
                key={batch.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => navigate(`/batches/${batch.id}`)}
              >
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
                  {/* Sample and Analysis Counts */}
                  <div className="grid grid-cols-3 gap-2 py-3 px-3 bg-muted rounded-lg">
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Samples</div>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <TestTube size={14} className="text-blue-500" />
                        <span className="text-lg font-bold">{batch.sampleCount || 0}</span>
                      </div>
                    </div>
                    <div className="text-center border-l border-r">
                      <div className="text-sm font-medium text-muted-foreground">Analyses</div>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <ChartLine size={14} className="text-purple-500" />
                        <span className="text-lg font-bold">{batch.analysisCount || 0}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Done</div>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <CheckCircle size={14} className="text-green-600" />
                        <span className="text-lg font-bold">{batch.completedCount || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Info */}
                  {batch.inProgressCount! > 0 && (
                    <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                      <Clock size={12} />
                      <span>{batch.inProgressCount} analysis(es) in progress</span>
                    </div>
                  )}
                  
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
                      <CheckCircle size={12} />
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
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
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