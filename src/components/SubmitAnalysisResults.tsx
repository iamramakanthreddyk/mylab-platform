import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import axiosInstance from '@/lib/axiosConfig'
import { User, Analysis } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Upload, FileText, TestTube, CheckCircle, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface SubmitAnalysisResultsProps {
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
}

const resultSchema = z.object({
  status: z.enum(['Completed', 'Failed', 'Partially Completed']),
  results: z.string().min(10, 'Results must be at least 10 characters long'),
  conclusions: z.string().min(10, 'Conclusions must be at least 10 characters long'),
  methodology: z.string().min(10, 'Methodology description is required'),
  quality_score: z.string().transform((val) => parseInt(val)).refine((val) => val >= 1 && val <= 10, {
    message: 'Quality score must be between 1 and 10'
  }),
  confidence_level: z.string().transform((val) => parseInt(val)).refine((val) => val >= 1 && val <= 100, {
    message: 'Confidence level must be between 1 and 100'
  }),
  notes: z.string().optional(),
  raw_data: z.any().optional(),
  attachments: z.array(z.string()).optional()
})

type ResultFormData = z.infer<typeof resultSchema>

export function SubmitAnalysisResults({ user }: SubmitAnalysisResultsProps) {
  const { requestId } = useParams<{ requestId: string }>()
  const navigate = useNavigate()
  const [request, setRequest] = useState<AnalysisRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const form = useForm<ResultFormData>({
    resolver: zodResolver(resultSchema),
    defaultValues: {
      status: 'Completed',
      results: '',
      conclusions: '',
      methodology: '',
      quality_score: 8,
      confidence_level: 95,
      notes: '',
      attachments: []
    }
  })

  useEffect(() => {
    if (requestId) {
      fetchAnalysisRequest()
    }
  }, [requestId])

  const fetchAnalysisRequest = async () => {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get(`/partner/analysis-requests/${requestId}`)
      
      // Mock data for now
      const mockRequest: AnalysisRequest = {
        id: requestId || 'req-001',
        workspaceId: user.workspaceId,
        sample_id: 'sample-001',
        type_id: '1',
        description: 'Chemical composition analysis of polymer sample',
        method: 'GC-MS and FTIR spectroscopy',
        parameters: 'Temperature: 250°C, Flow rate: 1ml/min',
        performed_by: user.id,
        performed_date: '2024-02-06',
        status: 'in_progress',
        execution_mode: 'external',
        external_lab: user.workspaceId,
        integrity_check: 'passed',
        created_by: 'client-user-1',
        createdAt: '2024-02-05T10:00:00Z',
        updatedAt: '2024-02-06T09:15:00Z',
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

      setRequest(response.data?.data || mockRequest)
    } catch (error) {
      console.error('Failed to fetch analysis request:', error)
      toast.error('Failed to load analysis request')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: ResultFormData) => {
    try {
      setIsSubmitting(true)
      setUploadProgress(0)

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      await axiosInstance.post(`/partner/analysis-requests/${requestId}/results`, {
        ...data,
        performed_by: user.id,
        completed_date: new Date().toISOString()
      })

      clearInterval(interval)
      setUploadProgress(100)

      toast.success('Analysis results submitted successfully')
      navigate('/partner/analysis-requests')
    } catch (error) {
      console.error('Failed to submit results:', error)
      toast.error('Failed to submit analysis results')
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    // Mock file upload
    const fileNames = Array.from(files).map(file => file.name)
    const currentAttachments = form.getValues('attachments') || []
    form.setValue('attachments', [...currentAttachments, ...fileNames])
    
    toast.success(`${files.length} file(s) uploaded successfully`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading analysis request...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Alert variant="destructive">
            <Warning size={20} />
            <AlertTitle>Request Not Found</AlertTitle>
            <AlertDescription>
              The analysis request could not be found or you don't have permission to access it.
            </AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            onClick={() => navigate('/partner/analysis-requests')}
            className="mt-4 gap-2"
          >
            <ArrowLeft size={16} />
            Back to Requests
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/partner/analysis-requests')}
            className="gap-2 mb-4"
          >
            <ArrowLeft size={16} />
            Back to Requests
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Upload size={24} className="text-white" weight="fill" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Submit Analysis Results</h1>
              <p className="text-muted-foreground">
                Submit results for analysis request from {request.requestingOrganization}
              </p>
            </div>
          </div>

          {/* Request Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <TestTube size={20} />
                {request.sampleDetails.name}
              </CardTitle>
              <CardDescription>{request.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Request Details</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Project:</strong> {request.requestingProject}</p>
                    <p><strong>Sample Type:</strong> {request.sampleDetails.type}</p>
                    <p><strong>Method:</strong> {request.method}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Timeline</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Requested:</strong> {new Date(request.createdAt).toLocaleDateString()}</p>
                    <p><strong>Started:</strong> {new Date(request.performed_date || '').toLocaleDateString()}</p>
                    {request.dueDate && (
                      <p><strong>Due:</strong> {new Date(request.dueDate).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Parameters</h4>
                  <div className="text-sm">
                    <p>{request.parameters || 'No specific parameters provided'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Form */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              Please provide detailed results and conclusions for this analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="results" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="results">Results & Conclusions</TabsTrigger>
                    <TabsTrigger value="methodology">Methodology</TabsTrigger>
                    <TabsTrigger value="files">Files & Attachments</TabsTrigger>
                  </TabsList>

                  <TabsContent value="results" className="space-y-6">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Analysis Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select analysis status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Completed">Completed Successfully</SelectItem>
                              <SelectItem value="Partially Completed">Partially Completed</SelectItem>
                              <SelectItem value="Failed">Failed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="results"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Analysis Results</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the detailed results of your analysis..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Provide detailed results including measurements, observations, and data
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="conclusions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Conclusions & Interpretation</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Provide your conclusions and interpretation of the results..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Interpret the results and provide conclusions based on your analysis
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="quality_score"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quality Score (1-10)</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" max="10" {...field} />
                            </FormControl>
                            <FormDescription>
                              Rate the quality of this analysis
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confidence_level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confidence Level (%)</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" max="100" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your confidence in these results
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="methodology" className="space-y-6">
                    <FormField
                      control={form.control}
                      name="methodology"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Methodology & Procedures</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the methodology and procedures used for this analysis..."
                              className="min-h-[200px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Detail the specific methods, instruments, and procedures used
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any additional notes, observations, or recommendations..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional notes, recommendations, or observations
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="files" className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">File Attachments</h3>
                      
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                        <FileText size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-lg font-medium mb-2">Upload Supporting Files</p>
                        <p className="text-muted-foreground mb-4">
                          Raw data, charts, images, or other supporting documents
                        </p>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.txt"
                        />
                        <Button
                          type="button"
                          onClick={() => document.getElementById('file-upload')?.click()}
                          className="gap-2"
                        >
                          <Upload size={16} />
                          Choose Files
                        </Button>
                      </div>

                      {form.watch('attachments') && form.watch('attachments')!.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Uploaded Files:</h4>
                          <div className="space-y-2">
                            {form.watch('attachments')!.map((fileName, index) => (
                              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                                <FileText size={16} />
                                <span className="text-sm">{fileName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Submit Section */}
                <div className="pt-6 border-t">
                  {isSubmitting && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Upload size={16} className="animate-bounce" />
                        <span className="text-sm text-muted-foreground">Submitting results...</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="gap-2 flex-1"
                    >
                      {isSubmitting ? (
                        <>
                          <Upload size={16} className="animate-spin" />
                          Submitting Results...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          Submit Analysis Results
                        </>
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/partner/analysis-requests')}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}