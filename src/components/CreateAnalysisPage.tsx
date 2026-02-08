import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { transformAnalysisForAPI } from '@/lib/analysisTransformer'
import { Sample, Analysis, AnalysisType, User } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Plus, FloppyDisk, Upload, X, FileText, Buildings } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface CreateAnalysisPageProps {
  user: User
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  preview?: string
}

interface WorkspaceUser {
  id: string
  name: string
  email: string
}

export function CreateAnalysisPage({ user }: CreateAnalysisPageProps) {
  const navigate = useNavigate()
  const { projectId, sampleId } = useParams()
  const [sample, setSample] = useState<Sample | null>(null)
  const [analysisTypes, setAnalysisTypes] = useState<AnalysisType[]>([])
  const [users, setUsers] = useState<WorkspaceUser[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [handoffType, setHandoffType] = useState<string>('analysis_only')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const [analysis, setAnalysis] = useState<Partial<Analysis>>({
    type_id: '',
    description: '',
    method: '',
    parameters: '',
    performed_by: '',
    performed_date: new Date().toISOString().split('T')[0],
    status: 'Pending',
    results: '',
    conclusions: '',
    external_lab: '',
    execution_mode: 'internal',
    integrity_check: 'passed',
    notes: ''
  })

  useEffect(() => {
    if (projectId && sampleId) {
      fetchSample()
      fetchAnalysisTypes()
      fetchUsers()
      fetchOrganizations()
    }
  }, [projectId, sampleId])

  const fetchSample = async () => {
    try {
      const response = await axiosInstance.get(`/samples/${sampleId}`)
      setSample(response.data.data)
    } catch (error) {
      console.error('Failed to fetch sample:', error)
      toast.error('Failed to load sample')
      navigate(`/projects/${projectId}`)
    }
  }

  const fetchAnalysisTypes = async () => {
    try {
      const response = await axiosInstance.get('/analysis-types')
      if (response.data.data && response.data.data.length > 0) {
        setAnalysisTypes(response.data.data)
      } else {
        // Return empty array - no mock data for production
        setAnalysisTypes([])
      }
    } catch (error) {
      console.error('Failed to fetch analysis types:', error)
      // Return empty array on error - no mock data
      setAnalysisTypes([])
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/users')
      const userData = response.data.data || []
      setUsers(userData.length > 0 ? userData : [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
      setUsers([])
    }
  }

  const fetchOrganizations = async () => {
    try {
      const response = await axiosInstance.get('/supply-chain/partners')
      const orgData = response.data.data || []
      setOrganizations(orgData)
    } catch (error) {
      console.error('Failed to fetch supply chain partners:', error)
      setOrganizations([])
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    files.forEach(file => {
      const fileId = `file-${Date.now()}-${Math.random()}`
      const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type
      }

      // If it's an image, create preview
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, preview: e.target?.result as string } : f
          ))
        }
        reader.readAsDataURL(file)
      }

      setUploadedFiles(prev => [...prev, uploadedFile])
    })

    // Reset input
    e.target.value = ''
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Step 1: Create batch first (if sample exists, add it to batch)
      let batchId: string;
      
      try {
        const batchResponse = await axiosInstance.post('/batches', {
          sampleIds: sample?.id ? [sample.id] : [],
          parameters: {
            analysisType: analysis.type_id,
            description: analysis.description
          }
        })
        batchId = batchResponse.data.data?.id || batchResponse.data.data?.batchId
        
        if (!batchId) {
          throw new Error('Failed to create batch: No batch ID returned');
        }
      } catch (batchError: any) {
        console.error('Failed to create batch:', batchError);
        toast.error('Failed to create batch for analysis');
        setIsLoading(false);
        return;
      }

      // Step 2: Transform and create analysis with the batch ID
      let transformedData;
      try {
        transformedData = transformAnalysisForAPI(
          {
            ...analysis,
            result_files: uploadedFiles
          },
          user.organizationId,
          user.workspaceId,
          batchId // Pass the created batch ID
        )
      } catch (transformError: any) {
        toast.error(transformError.message)
        setIsLoading(false)
        return
      }

      // Step 3: Create analysis
      await axiosInstance.post('/analyses', transformedData)
      toast.success('Analysis created successfully')
      navigate(`/projects/${projectId}`)
    } catch (error: any) {
      console.error('Failed to create analysis:', error)
      const errorMessage = error.response?.data?.details 
        ? Object.values(error.response.data.details).join(', ')
        : error.response?.data?.error || 'Failed to create analysis'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (!sample) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading sample...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/projects/${projectId}`)}
            className="gap-2"
          >
            <ArrowLeft size={16} />
            Back to Project
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Create Analysis</h1>
            <p className="text-muted-foreground">
              {sample.name} - Set up new analysis and document results
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="setup">Analysis Setup</TabsTrigger>
              <TabsTrigger value="results">Results & Conclusions</TabsTrigger>
              <TabsTrigger value="files">Documents & Files</TabsTrigger>
            </TabsList>

            <TabsContent value="setup">
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Configuration</CardTitle>
                  <CardDescription>Configure the analysis type and methodology</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Analysis Type *</Label>
                      <Select
                        value={analysis.type_id}
                        onValueChange={(value) => setAnalysis(prev => ({ ...prev, type_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select analysis type" />
                        </SelectTrigger>
                        <SelectContent>
                          {analysisTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{type.name}</span>
                                {type.description && (
                                  <span className="text-xs text-muted-foreground">{type.description}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={analysis.status}
                        onValueChange={(value) => setAnalysis(prev => ({ 
                          ...prev, 
                          status: value as Analysis['status']
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">⏳ Pending</SelectItem>
                          <SelectItem value="In Progress">🔄 In Progress</SelectItem>
                          <SelectItem value="Completed">✅ Completed</SelectItem>
                          <SelectItem value="Failed">❌ Failed</SelectItem>
                          <SelectItem value="Cancelled">🚫 Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={analysis.description}
                      onChange={(e) => setAnalysis(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what is being analyzed and why"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="method">Method/Protocol</Label>
                    <Textarea
                      id="method"
                      value={analysis.method}
                      onChange={(e) => setAnalysis(prev => ({ ...prev, method: e.target.value }))}
                      placeholder="Detailed methodology, protocols, or standards used"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parameters">Parameters & Conditions</Label>
                    <Textarea
                      id="parameters"
                      value={analysis.parameters}
                      onChange={(e) => setAnalysis(prev => ({ ...prev, parameters: e.target.value }))}
                      placeholder="Specific conditions, concentrations, temperatures, durations, etc."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="performedBy">Performed By</Label>
                      <Select
                        value={analysis.performed_by}
                        onValueChange={(value) => setAnalysis(prev => ({ ...prev, performed_by: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select performer" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{u.name}</span>
                                <span className="text-xs text-muted-foreground">{u.email}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date Performed</Label>
                      <Input
                        id="date"
                        type="date"
                        value={analysis.performed_date}
                        onChange={(e) => setAnalysis(prev => ({ ...prev, performed_date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="execution">Execution Mode</Label>
                      <Select
                        value={analysis.execution_mode}
                        onValueChange={(value) => setAnalysis(prev => ({ 
                          ...prev, 
                          execution_mode: value as Analysis['execution_mode']
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">🏢 Internal Lab</SelectItem>
                          <SelectItem value="external">🏭 External Lab</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {analysis.execution_mode === 'external' && (
                    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-purple-900 flex items-center gap-2">
                          <Buildings size={20} />
                          Supply Chain Partner Collaboration
                        </CardTitle>
                        <CardDescription className="text-purple-700">
                          Transfer material/product to partner organization for next stage processing
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="partner">Supply Chain Partner</Label>
                            <Select
                              value={analysis.external_lab}
                              onValueChange={(value) => setAnalysis(prev => ({ ...prev, external_lab: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select partner organization" />
                              </SelectTrigger>
                              <SelectContent>
                                {organizations.map((org) => (
                                  <SelectItem key={org.id} value={org.id}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{org.name}</span>
                                      <div className="text-xs text-muted-foreground">
                                        {org.capabilities?.join(' • ')} • {org.location}
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="handoffType">Collaboration Type</Label>
                            <Select value={handoffType} onValueChange={setHandoffType}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="analysis_only">🔬 Analysis Service Only</SelectItem>
                                <SelectItem value="material_transfer">📦 Material Transfer + Analysis</SelectItem>
                                <SelectItem value="product_continuation">⚡ Product Development Continuation</SelectItem>
                                <SelectItem value="supply_chain">🏭 Raw Material Supply Chain</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {analysis.external_lab && handoffType && (
                          <div className="bg-white rounded-lg border-2 border-dashed border-purple-300 p-4">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white flex items-center justify-center font-bold">
                                {handoffType === 'analysis_only' && '🔬'}
                                {handoffType === 'material_transfer' && '📦'}
                                {handoffType === 'product_continuation' && '⚡'}
                                {handoffType === 'supply_chain' && '🏭'}
                              </div>
                              <div>
                                <p className="font-semibold text-purple-800">
                                  {handoffType.replace('_', ' ').toUpperCase()} Workflow
                                </p>
                                <p className="text-sm text-purple-600">
                                  {organizations.find(o => o.id === analysis.external_lab)?.name} will handle next stage
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                              {handoffType === 'analysis_only' && (
                                <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                                  <p className="font-medium text-blue-800 mb-2">Analysis Service Workflow:</p>
                                  <ul className="text-sm text-blue-700 space-y-1 ml-4">
                                    <li>• Partner organization performs specialized analysis on your sample</li>
                                    <li>• Results are integrated back into your project system</li>
                                    <li>• Material ownership and project control remains with you</li>
                                    <li>• Ideal for accessing specialized equipment or expertise</li>
                                  </ul>
                                </div>
                              )}

                              {handoffType === 'material_transfer' && (
                                <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                                  <p className="font-medium text-green-800 mb-2">Material Transfer Workflow:</p>
                                  <ul className="text-sm text-green-700 space-y-1 ml-4">
                                    <li>• Physical transfer of material/sample to partner organization</li>
                                    <li>• Partner creates their own project and sample records</li>
                                    <li>• Analysis results linked to both organizations' systems</li>
                                    <li>• Full traceability and chain of custody maintained</li>
                                  </ul>
                                </div>
                              )}

                              {handoffType === 'product_continuation' && (
                                <div className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-400">
                                  <p className="font-medium text-orange-800 mb-2">Product Development Continuation:</p>
                                  <ul className="text-sm text-orange-700 space-y-1 ml-4">
                                    <li>• Your analysis results become input data for partner's R&D process</li>
                                    <li>• Partner continues product development using their capabilities</li>
                                    <li>• Seamless handoff of development stage to specialized partner</li>
                                    <li>• Intellectual property agreements and collaboration terms apply</li>
                                  </ul>
                                </div>
                              )}

                              {handoffType === 'supply_chain' && (
                                <div className="bg-purple-50 p-3 rounded-lg border-l-4 border-purple-400">
                                  <p className="font-medium text-purple-800 mb-2">Raw Material Supply Chain:</p>
                                  <ul className="text-sm text-purple-700 space-y-1 ml-4">
                                    <li>• Your finished product becomes raw material for partner's manufacturing</li>
                                    <li>• Partner initiates new batch/project with your material as input</li>
                                    <li>• Complete supply chain provenance and quality tracking</li>
                                    <li>• Multi-stage manufacturing workflow across organizations</li>
                                  </ul>
                                </div>
                              )}
                            </div>

                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm font-medium text-gray-700 mb-1">Next Steps:</p>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                Partner will receive workflow request in their system
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                Material specs and analysis data automatically transferred
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                Progress updates and results synchronized between organizations
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results">
              <Card>
                <CardHeader>
                  <CardTitle>Results & Analysis</CardTitle>
                  <CardDescription>Document findings and conclusions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="results">Results & Observations</Label>
                    <Textarea
                      id="results"
                      value={analysis.results}
                      onChange={(e) => setAnalysis(prev => ({ ...prev, results: e.target.value }))}
                      placeholder="Detailed results, measurements, observations..."
                      rows={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conclusions">Conclusions & Interpretation</Label>
                    <Textarea
                      id="conclusions"
                      value={analysis.conclusions}
                      onChange={(e) => setAnalysis(prev => ({ ...prev, conclusions: e.target.value }))}
                      placeholder="Analysis interpretation, significance, and conclusions..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="integrity">Data Integrity Check</Label>
                    <Select
                      value={analysis.integrity_check}
                      onValueChange={(value) => setAnalysis(prev => ({ 
                        ...prev, 
                        integrity_check: value as Analysis['integrity_check']
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passed">✅ Passed</SelectItem>
                        <SelectItem value="warning">⚠️ Warning</SelectItem>
                        <SelectItem value="failed">❌ Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={analysis.notes}
                      onChange={(e) => setAnalysis(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any additional observations, limitations, or recommendations..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files">
              <Card>
                <CardHeader>
                  <CardTitle>Supporting Documents</CardTitle>
                  <CardDescription>Upload result files, charts, and supporting documents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* File Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-gray-700 mb-2">
                        Click to upload files
                      </p>
                      <p className="text-sm text-gray-500">
                        PDF, DOC, XLS, images, CSV, TXT files supported
                      </p>
                    </label>
                  </div>

                  {/* Uploaded Files */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Uploaded Files ({uploadedFiles.length})</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {uploadedFiles.map((file) => (
                          <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="flex-shrink-0">
                              {file.preview ? (
                                <img 
                                  src={file.preview} 
                                  alt={file.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                  <FileText size={24} className="text-gray-500" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(file.id)}
                              className="text-red-600 hover:text-red-700 flex-shrink-0"
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/projects/${projectId}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              <FloppyDisk size={16} />
              {isLoading ? 'Creating...' : 'Create Analysis'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}