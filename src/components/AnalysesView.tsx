import { useState, useEffect } from 'react'
import { User, Analysis, AnalysisType } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TestTube, 
  MagnifyingGlass, 
  Plus, 
  FileText, 
  Calendar, 
  Download,
  Eye,
  Buildings
} from '@phosphor-icons/react'
import axiosInstance from '@/lib/axiosConfig'
import { toast } from 'sonner'

interface AnalysesViewProps {
  user: User
}

export function AnalysesView({ user }: AnalysesViewProps) {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [analysisTypes, setAnalysisTypes] = useState<AnalysisType[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchAnalyses(),
      fetchAnalysisTypes()
    ])
  }, [])

  const fetchAnalyses = async () => {
    try {
      const response = await axiosInstance.get('/analyses')
      setAnalyses(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch analyses:', error)
      setAnalyses([])
      toast.error('Failed to load analyses')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAnalysisTypes = async () => {
    try {
      const response = await axiosInstance.get('/analysis-types')
      setAnalysisTypes(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch analysis types:', error)
      // Mock data if endpoint not available
      setAnalysisTypes([
        { id: '1', name: 'NMR', category: 'Spectroscopy', isActive: true, createdAt: '', updatedAt: '' },
        { id: '2', name: 'HPLC', category: 'Chromatography', isActive: true, createdAt: '', updatedAt: '' },
        { id: '3', name: 'GC-MS', category: 'Mass Spectrometry', isActive: true, createdAt: '', updatedAt: '' }
      ])
    }
  }

  const filteredAnalyses = analyses.filter(analysis => {
    const matchesSearch = analysis.analysisType?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         analysis.externalReference?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || analysis.status === statusFilter
    const matchesType = typeFilter === 'all' || analysis.analysisTypeId === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusColor = (status: Analysis['status']) => {
    switch (status) {
      case 'completed': return 'default'
      case 'in_progress': return 'secondary'
      case 'pending': return 'outline'
      case 'failed': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusDisplay = (status: Analysis['status']) => {
    switch (status) {
      case 'in_progress': return 'In Progress'
      case 'pending': return 'Pending'
      case 'completed': return 'Completed'
      case 'failed': return 'Failed'
      default: return status
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Analyses</h2>
            <p className="text-muted-foreground">
              View and manage analysis results from internal and external labs
            </p>
          </div>
          <Button className="gap-2">
            <Plus size={18} />
            Upload Results
          </Button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="Search analyses by type or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {analysisTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin text-muted-foreground mb-4">
              <TestTube size={48} />
            </div>
            <p className="text-muted-foreground">Loading analyses...</p>
          </div>
        ) : filteredAnalyses.length === 0 ? (
          <div className="text-center py-16">
            <TestTube size={64} className="mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No analyses found</h3>
            <p className="text-muted-foreground mb-4">
              {analyses.length === 0 
                ? "Upload your first analysis results to begin tracking"
                : "Try adjusting your search or filter criteria"
              }
            </p>
            <Button className="gap-2">
              <Plus size={18} />
              Upload First Results
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAnalyses.map((analysis) => (
              <Card key={analysis.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TestTube size={16} className="text-purple-500" />
                      <CardTitle className="text-lg">
                        {analysis.analysisType?.name || 'Unknown Analysis'}
                      </CardTitle>
                    </div>
                    <Badge variant={getStatusColor(analysis.status)}>
                      {getStatusDisplay(analysis.status)}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center justify-between">
                    <span>{analysis.analysisType?.category || 'Unknown Category'}</span>
                    <span className="text-xs">
                      {analysis.execution_mode === 'external' ? 'External' : 'Internal'}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analysis.filePath && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText size={12} />
                      <span>File: {formatFileSize(analysis.fileSizeBytes)}</span>
                      {analysis.fileChecksum && (
                        <span className="text-green-600">✓ Verified</span>
                      )}
                    </div>
                  )}

                  {analysis.receivedAt && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar size={12} />
                      <span>Received: {new Date(analysis.receivedAt).toLocaleDateString()}</span>
                    </div>
                  )}

                  {analysis.performedAt && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar size={12} />
                      <span>Performed: {new Date(analysis.performedAt).toLocaleDateString()}</span>
                    </div>
                  )}

                  {analysis.externalReference && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Buildings size={12} />
                      <span>Ref: {analysis.externalReference}</span>
                    </div>
                  )}

                  {analysis.results && Object.keys(analysis.results).length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Results Available:</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(analysis.results).slice(0, 3).map((key) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key}
                          </Badge>
                        ))}
                        {Object.keys(analysis.results).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{Object.keys(analysis.results).length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-3">
                    <span>Uploaded: {analysis.uploadedAt ? new Date(analysis.uploadedAt).toLocaleDateString() : 'Not available'}</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-6 px-2">
                        <Eye size={12} />
                      </Button>
                      {analysis.filePath && (
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                          <Download size={12} />
                        </Button>
                      )}
                    </div>
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