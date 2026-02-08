import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { User } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowRight, Buildings, TestTube, Clock, CheckCircle, Package, Lightning } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface SupplyChainCollaborationProps {
  user: User
}

interface SupplyChainRequest {
  id: string
  fromOrganization: string
  fromProject: string
  workflowType: 'analysis_only' | 'material_transfer' | 'product_continuation' | 'supply_chain'
  materialData: {
    name: string
    type: string
    description: string
    specifications?: Record<string, any>
    analysisResults?: any[]
  }
  requirements: {
    analysisType?: string
    methodology?: string
    timeline?: string
    qualityStandards?: string[]
  }
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  createdAt: string
  updatedAt: string
}

export function SupplyChainCollaboration({ user }: SupplyChainCollaborationProps) {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<SupplyChainRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'in_progress' | 'completed'>('all')
  const [workflowFilter, setWorkflowFilter] = useState<'all' | 'analysis_only' | 'material_transfer' | 'product_continuation' | 'supply_chain'>('all')

  useEffect(() => {
    fetchSupplyChainRequests()
  }, [])

  const fetchSupplyChainRequests = async () => {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get('/supply-chain/collaboration-requests')
      setRequests(response.data?.data || [])
    } catch (error) {
      console.error('Failed to fetch supply chain requests:', error)
      // No mock data - real production system
      setRequests([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      await axiosInstance.post(`/supply-chain/collaboration-requests/${requestId}/${action}`)
      setRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { ...req, status: action === 'accept' ? 'accepted' as const : 'rejected' as const }
          : req
      ))
      toast.success(`Request ${action}ed successfully`)
    } catch (error) {
      console.error(`Failed to ${action} request:`, error)
      toast.error(`Failed to ${action} collaboration request`)
    }
  }

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.materialData.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.fromOrganization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.fromProject.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = filter === 'all' || request.status === filter
    const matchesWorkflow = workflowFilter === 'all' || request.workflowType === workflowFilter

    return matchesSearch && matchesStatus && matchesWorkflow
  })

  const getWorkflowIcon = (type: SupplyChainRequest['workflowType']) => {
    switch (type) {
      case 'analysis_only': return <TestTube size={20} className="text-blue-500" />
      case 'material_transfer': return <Package size={20} className="text-green-500" />
      case 'product_continuation': return <Lightning size={20} className="text-orange-500" />
      case 'supply_chain': return <Buildings size={20} className="text-purple-500" />
      default: return <TestTube size={20} />
    }
  }

  const getWorkflowLabel = (type: SupplyChainRequest['workflowType']) => {
    switch (type) {
      case 'analysis_only': return 'Analysis Service'
      case 'material_transfer': return 'Material Transfer'
      case 'product_continuation': return 'Product Development'
      case 'supply_chain': return 'Supply Chain'
      default: return type
    }
  }

  const getStatusColor = (status: SupplyChainRequest['status']) => {
    switch (status) {
      case 'pending': return 'outline'
      case 'accepted': return 'secondary'
      case 'in_progress': return 'default'
      case 'completed': return 'default'
      case 'rejected': return 'destructive'
      default: return 'outline'
    }
  }

  const getPriorityColor = (priority: SupplyChainRequest['priority']) => {
    switch (priority) {
      case 'low': return 'text-gray-500'
      case 'medium': return 'text-blue-500'
      case 'high': return 'text-orange-500'
      case 'urgent': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <Buildings size={24} className="text-white" weight="fill" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Supply Chain Collaboration</h1>
              <p className="text-muted-foreground">
                Manage material transfers and collaborative workflows with partner organizations
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search by material, organization, or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="accepted">Accepted</TabsTrigger>
                  <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs value={workflowFilter} onValueChange={(value) => setWorkflowFilter(value as typeof workflowFilter)}>
                <TabsList>
                  <TabsTrigger value="all">All Types</TabsTrigger>
                  <TabsTrigger value="analysis_only">Analysis</TabsTrigger>
                  <TabsTrigger value="material_transfer">Transfer</TabsTrigger>
                  <TabsTrigger value="product_continuation">Development</TabsTrigger>
                  <TabsTrigger value="supply_chain">Supply Chain</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading collaboration requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-16">
            {requests.length === 0 ? (
              <Alert className="max-w-2xl mx-auto">
                <Buildings size={20} />
                <AlertDescription className="text-left">
                  <strong>No Supply Chain Collaboration Requests</strong>
                  <br />
                  <br />
                  Your organization hasn't received any supply chain collaboration requests yet. 
                  When partner organizations want to:
                  <br />
                  <br />
                  • Transfer materials for analysis or processing
                  <br />
                  • Continue product development stages  
                  <br />
                  • Create supply chain workflows
                  <br />
                  • Collaborate on multi-stage manufacturing
                  <br />
                  <br />
                  Those requests will appear here for your team to review and accept.
                </AlertDescription>
              </Alert>
            ) : (
              <div>
                <Buildings size={64} className="mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No matching requests</h3>
                <p className="text-muted-foreground">
                  No collaboration requests match your current filters.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getWorkflowIcon(request.workflowType)}
                        <CardTitle className="text-lg">{request.materialData.name}</CardTitle>
                        <Badge variant={getStatusColor(request.status)}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(request.priority)}>
                          {request.priority} priority
                        </Badge>
                        <Badge variant="secondary">{getWorkflowLabel(request.workflowType)}</Badge>
                      </div>
                      <CardDescription className="text-base mb-2">
                        {request.materialData.description}
                      </CardDescription>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <span><strong>From:</strong> {request.fromOrganization}</span>
                        <span><strong>Project:</strong> {request.fromProject}</span>
                        {request.dueDate && (
                          <span><strong>Due:</strong> {new Date(request.dueDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    
                    {request.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          onClick={() => handleRequestAction(request.id, 'accept')}
                          className="gap-2"
                        >
                          <CheckCircle size={16} />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleRequestAction(request.id, 'reject')}
                          className="gap-2 text-destructive hover:text-destructive"
                        >
                          Decline
                        </Button>
                      </div>
                    )}

                    {request.status === 'accepted' && (
                      <Button
                        onClick={() => navigate(`/supply-chain/requests/${request.id}/process`)}
                        className="gap-2 ml-4"
                      >
                        <ArrowRight size={16} />
                        Begin Processing
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Material Details</h4>
                      <div className="text-sm space-y-1">
                        <p><strong>Type:</strong> {request.materialData.type}</p>
                        <p><strong>Workflow:</strong> {getWorkflowLabel(request.workflowType)}</p>
                        {request.requirements.timeline && (
                          <p><strong>Timeline:</strong> {request.requirements.timeline}</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Requirements</h4>
                      <div className="text-sm space-y-1">
                        {request.requirements.analysisType && (
                          <p><strong>Analysis:</strong> {request.requirements.analysisType}</p>
                        )}
                        {request.requirements.methodology && (
                          <p><strong>Method:</strong> {request.requirements.methodology}</p>
                        )}
                        {request.requirements.qualityStandards && (
                          <p><strong>Standards:</strong> {request.requirements.qualityStandards.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Timeline</h4>
                      <div className="text-sm space-y-1">
                        <p><strong>Requested:</strong> {new Date(request.createdAt).toLocaleDateString()}</p>
                        {request.status !== 'pending' && (
                          <p><strong>Last Update:</strong> {new Date(request.updatedAt).toLocaleDateString()}</p>
                        )}
                      </div>
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