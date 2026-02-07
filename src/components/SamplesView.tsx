import { useState } from 'react'
import { User, Sample } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Flask, MagnifyingGlass, Plus } from '@phosphor-icons/react'

interface SamplesViewProps {
  user: User
  samples: Sample[]
}

export function SamplesView({ user, samples }: SamplesViewProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSamples = samples.filter(sample =>
    sample.sample_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sample.type && sample.type.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getStatusColor = (status: Sample['status']) => {
    const lowerStatus = String(status).toLowerCase()
    switch (lowerStatus) {
      case 'created': return 'secondary'
      case 'registered': return 'secondary'
      case 'in progress': return 'default'
      case 'analyzed': return 'outline'
      case 'archived': return 'outline'
      default: return 'secondary'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Samples</h2>
            <p className="text-muted-foreground">
              Track samples and their laboratory lifecycle
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
              placeholder="Search samples..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        {filteredSamples.length === 0 ? (
          <div className="text-center py-16">
            <Flask size={64} className="mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No samples yet</h3>
            <p className="text-muted-foreground mb-4">
              Register your first sample to begin tracking
            </p>
            <Button className="gap-2">
              <Plus size={18} />
              Register First Sample
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSamples.map((sample) => (
              <Card key={sample.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg font-mono">{sample.sample_id}</CardTitle>
                    <Badge variant={getStatusColor(sample.status)}>
                      {sample.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {sample.type || 'N/A'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {sample.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
