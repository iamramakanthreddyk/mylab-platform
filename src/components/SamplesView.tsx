import { useState } from 'react'
import { User, Sample } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Flask, MagnifyingGlass, Plus, TestTube } from '@phosphor-icons/react'

interface SamplesViewProps {
  user: User
  samples: Sample[]
  onSamplesChange?: (samples: Sample[]) => void
}

export function SamplesView({ user, samples, onSamplesChange }: SamplesViewProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSamples = samples.filter(sample =>
    sample.sample_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sample.type && sample.type.toLowerCase().includes(searchQuery.toLowerCase())) ||
    sample.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status: Sample['status']) => {
    const lowerStatus = String(status).toLowerCase()
    switch (lowerStatus) {
      case 'created': return 'secondary'
      case 'registered': return 'secondary'
      case 'in progress': return 'default'
      case 'ready': return 'default'
      case 'analyzed': return 'outline'
      case 'completed': return 'outline'
      case 'archived': return 'outline'
      default: return 'secondary'
    }
  }

  const handleSampleClick = (sample: Sample) => {
    // TODO: Navigate to sample details page when implemented
    console.log('Sample clicked:', sample.id)
  }

  const getSampleIcon = (sample: Sample) => {
    if (sample.trials && sample.trials.length > 0) {
      return <TestTube size={16} className="text-blue-500" />
    }
    return <Flask size={16} className="text-muted-foreground" />
  }

  const getTrialInfo = (sample: Sample) => {
    if (!sample.trials || sample.trials.length === 0) return null
    
    const selectedTrial = sample.trials.find(t => t.success) // Use success instead of isSelected
    return {
      totalTrials: sample.trials.length,
      selectedIndex: selectedTrial ? sample.trials.findIndex(t => t.id === selectedTrial.id) + 1 : null
    }
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Samples</h2>
              <p className="text-muted-foreground">
                Track samples and their experimental lineage through trials and analysis
              </p>
            </div>
            <Button className="gap-2">
              <Plus size={18} />
              Register Sample
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
                placeholder="Search samples by ID, type, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </div>

          {filteredSamples.length === 0 ? (
            <div className="text-center py-16">
              <Flask size={64} className="mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No samples found</h3>
              <p className="text-muted-foreground mb-4">
                {samples.length === 0 
                  ? "Register your first sample to begin tracking experimental workflows"
                  : "Try adjusting your search terms"
                }
              </p>
              <Button className="gap-2">
                <Plus size={18} />
                Register First Sample
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSamples.map((sample) => {
                const trialInfo = getTrialInfo(sample)
                return (
                  <Card 
                    key={sample.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleSampleClick(sample)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getSampleIcon(sample)}
                          <CardTitle className="text-lg font-mono">{sample.sample_id}</CardTitle>
                        </div>
                        <Badge variant={getStatusColor(sample.status)}>
                          {sample.status}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center justify-between">
                        <span>{sample.type || 'N/A'}</span>
                        {trialInfo && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {trialInfo.totalTrials} trial{trialInfo.totalTrials !== 1 ? 's' : ''}
                            {trialInfo.selectedIndex && ` • #${trialInfo.selectedIndex} selected`}
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {sample.description}
                      </p>
                      {sample.selectedTrialId && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2">
                          <TestTube size={14} className="text-green-500" />
                            <span className="text-xs text-green-700">Selected from trials</span>
                          </div>
                        </div>
                      )}
                      <div className="mt-3 flex justify-between items-center text-xs text-muted-foreground">
                        <span>Created: {new Date(sample.created_at).toLocaleDateString()}</span>
                        <span>Click to view details</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
