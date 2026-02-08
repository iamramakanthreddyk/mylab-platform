import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User, Batch, Analysis, DerivedSample } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ChartLine, 
  CaretLeft, 
  Calendar, 
  TestTube, 
  Users,
  CheckCircle,
  Clock,
  WarningCircle,
  Eye,
  Download
} from '@phosphor-icons/react'
import axiosInstance from '@/lib/axiosConfig'
import { toast } from 'sonner'

interface BatchDetailViewProps {
  user: User
}

export function BatchDetailView({ user }: BatchDetailViewProps) {
  const { batchId } = useParams()
  const navigate = useNavigate()
  
  const [batch, setBatch] = useState<Batch | null>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [samples, setSamples] = useState<DerivedSample[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (batchId) {
      fetchBatchDetails()
    }
  }, [batchId])

  const fetchBatchDetails = async () => {
    try {
      setIsLoading(true)
      
      // Fetch batch details
      const batchResponse = await axiosInstance.get(`/batches/${batchId}`)
      const batchData = batchResponse.data.data
      setBatch(batchData)

      // Fetch analyses for this batch
      const analysesResponse = await axiosInstance.get(`/analyses?batchId=${batchId}`)
      setAnalyses(analysesResponse.data.data || [])
      
    } catch (error) {
      console.error('Failed to fetch batch details:', error)
      toast.error('Failed to load batch details')
    } finally {
      setIsLoading(false)
    }
  }

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

  const getAnalysisStatusIcon = (status: Analysis['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-600" />
      case 'in_progress':
        return <Clock size={16} className="text-blue-600" />
      case 'failed':
        return <WarningCircle size={16} className="text-red-600" />
      default:
        return <Clock size={16} className="text-gray-600" />
    }
  }

  const getAnalysisStatusColor = (status: Analysis['status']) => {
    switch (status) {
      case 'completed': return 'default'
      case 'in_progress': return 'secondary'
      case 'pending': return 'outline'
      case 'failed': return 'destructive'
      default: return 'outline'
    }
  }

  const completedAnalyses = analyses.filter(a => a.status === 'completed').length
  const inProgressAnalyses = analyses.filter(a => a.status === 'in_progress').length
  const failedAnalyses = analyses.filter(a => a.status === 'failed').length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-muted-foreground mb-4">
            <ChartLine size={48} />
          </div>
          <p className="text-muted-foreground">Loading batch details...</p>
        </div>
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <WarningCircle size={48} className="text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Batch Not Found</h3>
          <p className="text-muted-foreground mb-4">We couldn't find this batch.</p>
          <Button onClick={() => navigate('/batches')}>Back to Batches</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-4 gap-2"
            onClick={() => navigate('/batches')}
          >
            <CaretLeft size={18} />
            Back to Batches
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ChartLine size={32} className="text-blue-500" />
                <h1 className="text-4xl font-bold font-mono">{batch.batchId}</h1>
              </div>
              <p className="text-lg text-muted-foreground">{batch.description}</p>
            </div>
            <Badge variant={getStatusColor(batch.status)} className="text-base px-3 py-1">
              {getStatusDisplay(batch.status)}
            </Badge>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sample Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TestTube size={20} className="text-blue-500" />
                <span className="text-2xl font-bold">{batch.sampleCount || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Analyses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ChartLine size={20} className="text-purple-500" />
                <span className="text-2xl font-bold">{analyses.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-green-600" />
                <span className="text-2xl font-bold">{completedAnalyses}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-blue-600" />
                <span className="text-2xl font-bold">{inProgressAnalyses}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Batch Information */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="details">Batch Details</TabsTrigger>
            <TabsTrigger value="analyses">Analyses ({analyses.length})</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          {/* Tab: Batch Details */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Batch Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Batch ID</label>
                      <p className="text-lg font-mono font-bold">{batch.batchId}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <Badge variant={getStatusColor(batch.status)} className="mt-1">
                        {getStatusDisplay(batch.status)}
                      </Badge>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Execution Mode</label>
                      <p className="text-base capitalize">{batch.executionMode}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Created On</label>
                      <p className="text-base flex items-center gap-2">
                        <Calendar size={16} />
                        {new Date(batch.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <p className="text-base">{batch.description}</p>
                    </div>

                    {batch.sentAt && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Sent On</label>
                        <p className="text-base flex items-center gap-2">
                          <Calendar size={16} />
                          {new Date(batch.sentAt).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {batch.completedAt && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Completed On</label>
                        <p className="text-base flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-600" />
                          {new Date(batch.completedAt).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {batch.externalReference && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">External Reference</label>
                        <p className="text-base font-mono">{batch.externalReference}</p>
                      </div>
                    )}
                  </div>
                </div>

                {batch.parameters && Object.keys(batch.parameters).length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Parameters</h3>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                      {JSON.stringify(batch.parameters, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Analyses */}
          <TabsContent value="analyses">
            {analyses.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <TestTube size={48} className="text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No analyses associated with this batch yet.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {analyses.map(analysis => (
                  <Card key={analysis.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/analyses/${analysis.id}/complete`)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getAnalysisStatusIcon(analysis.status)}
                          <div>
                            <CardTitle className="text-lg">
                              {analysis.analysisType?.name || 'Unknown Analysis Type'}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {analysis.description}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={getAnalysisStatusColor(analysis.status)}>
                          {analysis.status === 'in_progress' ? 'In Progress' :
                           analysis.status === 'completed' ? 'Completed' :
                           analysis.status === 'failed' ? 'Failed' : 'Pending'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Performed by: {analysis.performed_by}</span>
                        <span>{new Date(analysis.performed_date).toLocaleDateString()}</span>
                      </div>
                      {analysis.status === 'completed' && (
                        <Button size="sm" variant="outline" className="mt-3 gap-2">
                          <Eye size={16} />
                          View Results
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Results */}
          <TabsContent value="results">
            {completedAnalyses === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <WarningCircle size={48} className="text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">No completed analyses yet.</p>
                    <p className="text-sm text-muted-foreground">
                      {inProgressAnalyses > 0 
                        ? `${inProgressAnalyses} analysis(es) in progress...`
                        : 'Start analyses to see results here.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analyses
                  .filter(a => a.status === 'completed')
                  .map(analysis => (
                    <Card key={analysis.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle size={20} className="text-green-600" />
                          {analysis.analysisType?.name || 'Analysis'}
                        </CardTitle>
                        <CardDescription>
                          Method: {analysis.method || 'N/A'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="bg-muted p-4 rounded-lg max-h-48 overflow-y-auto">
                          {analysis.results ? (
                            typeof analysis.results === 'string' ? (
                              <p className="text-sm whitespace-pre-wrap">{analysis.results}</p>
                            ) : (
                              <pre className="text-xs overflow-x-auto">
                                {JSON.stringify(analysis.results, null, 2)}
                              </pre>
                            )
                          ) : (
                            <p className="text-sm text-muted-foreground">No results data available</p>
                          )}
                        </div>

                        {analysis.conclusions && (
                          <div>
                            <label className="text-sm font-medium">Conclusions</label>
                            <p className="text-sm mt-1">{analysis.conclusions}</p>
                          </div>
                        )}

                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full gap-2"
                          onClick={() => navigate(`/analyses/${analysis.id}/complete`)}
                        >
                          <Eye size={16} />
                          View Full Report
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
