import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { Analysis, User } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, FloppyDisk } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface CompleteAnalysisPageProps {
  user: User
}

export function CompleteAnalysisPage({ user }: CompleteAnalysisPageProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const { analysisId } = useParams<{ analysisId: string }>()
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    status: 'completed',
    results: '',
    conclusions: '',
    notes: '',
    performedAt: new Date().toISOString().split('T')[0],
    filePath: ''
  })

  useEffect(() => {
    if (!analysisId) {
      return
    }
    fetchAnalysis(analysisId)
  }, [analysisId])

  const fetchAnalysis = async (id: string) => {
    setIsLoading(true)
    try {
      const response = await axiosInstance.get(`/analyses/${id}`)
      const loaded = response.data.data || response.data
      setAnalysis(loaded)

      const baseResults = typeof loaded.results === 'object' && loaded.results ? loaded.results : {}
      setForm({
        status: loaded.status || 'completed',
        results: baseResults.results || '',
        conclusions: baseResults.conclusions || '',
        notes: baseResults.notes || '',
        performedAt: loaded.performedAt
          ? new Date(loaded.performedAt).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        filePath: loaded.filePath || ''
      })
    } catch (error) {
      console.error('Failed to load analysis:', error)
      toast.error('Failed to load analysis')
      navigate(projectId ? `/analyses?projectId=${projectId}` : '/analyses')
    } finally {
      setIsLoading(false)
    }
  }

  // Check if user can edit this analysis
  const canEdit = () => {
    if (!analysis) return false
    // Allow if user is admin or manager
    if (user.role && ['admin', 'manager'].includes(user.role)) return true
    // Allow if user is the original analyst (uploaded_by)
    if ((analysis as any).uploaded_by === user.id) return true
    return false
  }

  const handleSave = async () => {
    if (!analysis) {
      return
    }

    if (!form.results.trim()) {
      toast.error('Results are required to complete analysis')
      return
    }

    const baseResults = typeof analysis.results === 'object' && analysis.results ? analysis.results : {}

    setIsSaving(true)
    try {
      const payload = {
        status: form.status,
        results: {
          ...baseResults,
          results: form.results,
          conclusions: form.conclusions || undefined,
          notes: form.notes || undefined
        },
        performedAt: form.performedAt || undefined,
        filePath: form.filePath || undefined
      }

      await axiosInstance.put(`/analyses/${analysis.id}`, payload)
      toast.success('Analysis report saved')
      navigate(projectId ? `/analyses?projectId=${projectId}` : '/analyses')
    } catch (error) {
      console.error('Failed to save analysis report:', error)
      toast.error('Failed to save analysis report')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading analysis...</p>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Analysis not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(projectId ? `/analyses?projectId=${projectId}` : '/analyses')}
            className="gap-2"
          >
            <ArrowLeft size={16} />
            Back to Analyses
          </Button>
          {projectId && (
            <Button variant="outline" onClick={() => navigate(`/projects/${projectId}`)}>
              Back to Project
            </Button>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              {isEditing ? 'Edit Analysis Report' : 'Analysis Report'}
            </h1>
            <p className="text-muted-foreground">
              {(analysis as any).analysis_type_name || 'Analysis'}
            </p>
          </div>
          {canEdit() && !isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              className="gap-2"
            >
              Edit Report
            </Button>
          )}
        </div>

        {/* Audit Trail Section */}
        {(analysis as any).edited_at && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-700">
                <strong>Last edited:</strong> {new Date((analysis as any).edited_at).toLocaleString()} 
                {(analysis as any).edited_by_name && ` by ${(analysis as any).edited_by_name}`}
                {(analysis as any).revision_number && ` (Revision ${(analysis as any).revision_number})`}
              </p>
            </CardContent>
          </Card>
        )}

        {isEditing ? (
          // EDIT MODE
          <Card>
            <CardHeader>
              <CardTitle>Edit Analysis Report</CardTitle>
              <CardDescription>Update results and other analysis details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Results *</Label>
                <Textarea
                  value={form.results}
                  onChange={(e) => setForm(prev => ({ ...prev, results: e.target.value }))}
                  placeholder="Summarize results or paste the report."
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Conclusions</Label>
                <Textarea
                  value={form.conclusions}
                  onChange={(e) => setForm(prev => ({ ...prev, conclusions: e.target.value }))}
                  placeholder="Key findings or conclusions."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observations or follow-ups."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Performed Date</Label>
                  <Input
                    type="date"
                    value={form.performedAt}
                    onChange={(e) => setForm(prev => ({ ...prev, performedAt: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Report PDF (optional)</Label>
                  <Input
                    value={form.filePath}
                    onChange={(e) => setForm(prev => ({ ...prev, filePath: e.target.value }))}
                    placeholder="/reports/analysis-001.pdf"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  <FloppyDisk size={16} />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // READ-ONLY MODE
          <Card>
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
              <CardDescription>View analysis details and results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground">Status</p>
                  <p className="text-base capitalize">{form.status}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground">Analysis Type</p>
                  <p className="text-base">{(analysis as any).analysis_type_name}</p>
                </div>
              </div>

              {form.results && (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm font-semibold text-muted-foreground">Results</p>
                  <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">{form.results}</p>
                </div>
              )}

              {form.conclusions && (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm font-semibold text-muted-foreground">Conclusions</p>
                  <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">{form.conclusions}</p>
                </div>
              )}

              {form.notes && (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm font-semibold text-muted-foreground">Notes</p>
                  <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">{form.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground">Performed Date</p>
                  <p className="text-sm">{form.performedAt}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground">Report File</p>
                  <p className="text-sm">{form.filePath || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
