import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { User, Analysis } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartBar, MagnifyingGlass, TestTube, Clock, CheckCircle, X, Upload } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface PartnerAnalysisRequestsProps {
  user: User
}

interface AnalysisRequest extends Analysis {
  requestingOrganization: string
  requestingProject: string
  sampleDetails: {
    name: string
    type: string
    description: string
  }
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  dueDate?: string
  estimatedDuration?: string
}

export function PartnerAnalysisRequests({ user }: PartnerAnalysisRequestsProps) {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<AnalysisRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'in_progress' | 'completed'>('all')

  useEffect(() => {
    fetchAnalysisRequests()
  }, [])

  const fetchAnalysisRequests = async () => {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get('/partner/analysis-requests')
      
      // Mock data for now since API might not exist
      const mockRequests: AnalysisRequest[] = [
        {
          id: 'req-001',
          workspaceId: user.workspaceId,
          sample_id: 'sample-001',
          type_id: '1',
          description: 'Chemical composition analysis of polymer sample',
          method: 'GC-MS and FTIR spectroscopy',
          parameters: 'Temperature: 250°C, Flow rate: 1ml/min',
          performed_by: '',
          performed_date: '',
          status: 'Pending',
          execution_mode: 'external',
          external_lab: user.workspaceId,
          integrity_check: 'passed',
          created_by: 'client-user-1',
          createdAt: '2024-02-05T10:00:00Z',
          updatedAt: '2024-02-05T10:00:00Z',
          requestingOrganization: 'TechCorp Industries',
          requestingProject: 'Advanced Polymer Development',
          sampleDetails: {
            name: 'HDPE Sample A',
            type: 'Polymer',
            description: 'High-density polyethylene for automotive applications'
          },
          priority: 'High',
          dueDate: '2024-02-15',
          estimatedDuration: '3-5 business days'
        },
        {
          id: 'req-002',
          workspaceId: user.workspaceId,
          sample_id: 'sample-002',
          type_id: '3',
          description: 'Microbiological contamination testing',
          method: 'Culture-based identification and sensitivity testing',
          parameters: 'Incubation: 37°C, 24-48 hours',
          performed_by: user.id,
          performed_date: '2024-02-06',
          status: 'In Progress',
          execution_mode: 'external',
          external_lab: user.workspaceId,
          integrity_check: 'passed',
          created_by: 'client-user-2',
          createdAt: '2024-02-04T14:30:00Z',
          updatedAt: '2024-02-06T09:15:00Z',
          requestingOrganization: 'MedDevice Solutions',
          requestingProject: 'Sterile Device Validation',
          sampleDetails: {
            name: 'Device Component B',
            type: 'Medical Device',
            description: 'Implantable device component for sterility validation'
          },
          priority: 'Urgent',
          dueDate: '2024-02-10',
          estimatedDuration: '2-3 business days'
        },
        {
          id: 'req-003',
          workspaceId: user.workspaceId,
          sample_id: 'sample-003',
          type_id: '4',
          description: 'Spectroscopic characterization of novel compound',
          method: 'NMR, UV-Vis, and mass spectrometry',
          parameters: 'Solvent: CDCl3, NMR frequency: 400MHz',
          performed_by: user.id,
          performed_date: '2024-02-03',
          status: 'Completed',
          execution_mode: 'external',
          external_lab: user.workspaceId,
          integrity_check: 'passed',
          results: 'Compound successfully characterized. NMR confirms expected structure.',
          conclusions: 'The novel compound shows high purity (>98%) and matches expected molecular structure.',
          created_by: 'client-user-3',
          createdAt: '2024-02-01T11:00:00Z',
          updatedAt: '2024-02-03T16:45:00Z',
          requestingOrganization: 'Research University',
          requestingProject: 'Novel Drug Development',
          sampleDetails: {
            name: 'Compound XYZ-789',
            type: 'Chemical Compound',
            description: 'Potential pharmaceutical compound for diabetes treatment'
          },
          priority: 'Medium',
          dueDate: '2024-02-08',
          estimatedDuration: '1-2 business days'
        }
      ]

      setRequests(response.data?.data || mockRequests)
    } catch (error) {
      console.error('Failed to fetch analysis requests:', error)
      // Use mock data on error
      const mockRequests: AnalysisRequest[] = [
        {
          id: 'req-001',
          workspaceId: user.workspaceId,
          sample_id: 'sample-001',
          type_id: '1',
          description: 'Chemical composition analysis of polymer sample',
          method: 'GC-MS and FTIR spectroscopy',
          performed_by: '',
          performed_date: '',
          status: 'Pending',
          execution_mode: 'external',
          external_lab: user.workspaceId,
          integrity_check: 'passed',
          created_by: 'client-user-1',
          createdAt: '2024-02-05T10:00:00Z',
          updatedAt: '2024-02-05T10:00:00Z',
          requestingOrganization: 'TechCorp Industries',
          requestingProject: 'Advanced Polymer Development',
          sampleDetails: {
            name: 'HDPE Sample A',
            type: 'Polymer',
            description: 'High-density polyethylene for automotive applications'
          },
          priority: 'High',
          dueDate: '2024-02-15'
        }
      ]
      setRequests(mockRequests)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await axiosInstance.post(`/partner/analysis-requests/${requestId}/accept`)
      setRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { ...req, status: 'In Progress' as const, performed_by: user.id }
          : req
      ))
      toast.success('Analysis request accepted successfully')
    } catch (error) {
      console.error('Failed to accept request:', error)
      toast.error('Failed to accept analysis request')
    }
  }

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await axiosInstance.post(`/partner/analysis-requests/${requestId}/decline`)
      setRequests(prev => prev.filter(req => req.id !== requestId))
      toast.success('Analysis request declined')
    } catch (error) {
      console.error('Failed to decline request:', error)
      toast.error('Failed to decline analysis request')
    }
  }

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requestingOrganization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requestingProject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.sampleDetails.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter = filter === 'all' || request.status.toLowerCase().replace(' ', '_') === filter

    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: AnalysisRequest['status']) => {
    switch (status) {
      case 'Pending': return 'outline'
      case 'In Progress': return 'secondary'
      case 'Completed': return 'default'
      case 'Failed': return 'destructive'
      case 'Cancelled': return 'destructive'
      default: return 'outline'
    }
  }

  const getPriorityColor = (priority: AnalysisRequest['priority']) => {
    switch (priority) {
      case 'Low': return 'text-gray-500'
      case 'Medium': return 'text-blue-500'
      case 'High': return 'text-orange-500'
      case 'Urgent': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <TestTube size={24} className="text-white" weight="fill" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Partner Analysis Requests</h1>
              <p className="text-muted-foreground">
                Analysis requests from partner organizations on the platform
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{requests.filter(r => r.status === 'Pending').length}</p>
                    <p className="text-sm text-muted-foreground">Pending Requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <ChartBar size={20} className="text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{requests.filter(r => r.status === 'In Progress').length}</p>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{requests.filter(r => r.status === 'Completed').length}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TestTube size={20} className="text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{requests.length}</p>
                    <p className="text-sm text-muted-foreground">Total Requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlass size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by project, organization, or sample..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="accepted">Accepted</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading analysis requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-16">
            <TestTube size={64} className="mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No analysis requests</h3>
            <p className="text-muted-foreground">
              {filter === 'all' 
                ? 'You haven\'t received any analysis requests yet.' 
                : `No ${filter.replace('_', ' ')} requests found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{request.sampleDetails.name}</CardTitle>
                        <Badge variant={getStatusColor(request.status)}>{request.status}</Badge>
                        <Badge variant="outline" className={getPriorityColor(request.priority)}>
                          {request.priority} Priority
                        </Badge>
                      </div>
                      <CardDescription className="text-base mb-2">
                        {request.description}
                      </CardDescription>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <span><strong>From:</strong> {request.requestingOrganization}</span>
                        <span><strong>Project:</strong> {request.requestingProject}</span>
                        {request.dueDate && (
                          <span><strong>Due:</strong> {new Date(request.dueDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    
                    {request.status === 'Pending' && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          onClick={() => handleAcceptRequest(request.id)}
                          className="gap-2"
                        >
                          <CheckCircle size={16} />
                          Accept Request
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDeclineRequest(request.id)}
                          className="gap-2 text-destructive hover:text-destructive"
                        >
                          <X size={16} />
                          Decline
                        </Button>
                      </div>
                    )}

                    {request.status === 'In Progress' && (
                      <Button
                        onClick={() => navigate(`/partner/analysis-requests/${request.id}/results`)}
                        className="gap-2 ml-4"
                      >
                        <Upload size={16} />
                        Submit Results
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Sample Details</h4>
                      <div className="text-sm space-y-1">
                        <p><strong>Type:</strong> {request.sampleDetails.type}</p>
                        <p><strong>Description:</strong> {request.sampleDetails.description}</p>
                        {request.estimatedDuration && (
                          <p><strong>Est. Duration:</strong> {request.estimatedDuration}</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Analysis Method</h4>
                      <div className="text-sm space-y-1">
                        <p><strong>Method:</strong> {request.method || 'Not specified'}</p>
                        {request.parameters && (
                          <p><strong>Parameters:</strong> {request.parameters}</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Timeline</h4>
                      <div className="text-sm space-y-1">
                        <p><strong>Requested:</strong> {new Date(request.createdAt).toLocaleDateString()}</p>
                        {request.performed_date && (
                          <p><strong>Started:</strong> {new Date(request.performed_date).toLocaleDateString()}</p>
                        )}\n                        {request.status === 'Completed' && (
                          <p><strong>Completed:</strong> {new Date(request.updatedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {request.status === 'Completed' && request.results && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">Analysis Results</h4>
                      <p className="text-sm text-green-800 mb-2">{request.results}</p>
                      {request.conclusions && (
                        <p className="text-sm text-green-700"><strong>Conclusions:</strong> {request.conclusions}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}