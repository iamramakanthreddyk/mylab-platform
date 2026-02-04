import { useState, useMemo } from 'react'
import { entities, relationships } from '@/lib/schema-data'
import { EntityCard } from '@/components/EntityCard'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MagnifyingGlass, Database, Graph } from '@phosphor-icons/react'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null)
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)

  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return entities

    const query = searchQuery.toLowerCase()
    return entities.filter((entity) => {
      const nameMatch = entity.name.toLowerCase().includes(query)
      const fieldMatch = entity.fields.some((field) => field.name.toLowerCase().includes(query))
      return nameMatch || fieldMatch
    })
  }, [searchQuery])

  const connectedEntities = useMemo(() => {
    if (!hoveredEntity && !selectedEntity) return new Set<string>()

    const target = hoveredEntity || selectedEntity
    const connected = new Set<string>()

    relationships.forEach((rel) => {
      if (rel.from === target) {
        connected.add(rel.to)
      }
      if (rel.to === target) {
        connected.add(rel.from)
      }
    })

    return connected
  }, [hoveredEntity, selectedEntity])

  const relationshipStats = useMemo(() => {
    const entityRelCount: Record<string, number> = {}
    relationships.forEach((rel) => {
      entityRelCount[rel.from] = (entityRelCount[rel.from] || 0) + 1
      entityRelCount[rel.to] = (entityRelCount[rel.to] || 0) + 1
    })
    return entityRelCount
  }, [])

  const getRelationshipsForEntity = (entityName: string) => {
    return relationships.filter((rel) => rel.from === entityName || rel.to === entityName)
  }

  const handleEntityClick = (entityName: string) => {
    setSelectedEntity((prev) => (prev === entityName ? null : entityName))
  }

  const activeEntity = selectedEntity || hoveredEntity

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 mb-2">
                <Database size={36} weight="duotone" className="text-primary" />
                Database Schema Explorer
              </h1>
              <p className="text-muted-foreground">
                Interactive visualization of {entities.length} entities and {relationships.length} relationships
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-sm">
                <Graph size={16} className="mr-1.5" />
                {relationships.length} Relationships
              </Badge>
            </div>
          </div>

          <div className="relative">
            <MagnifyingGlass
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="Search entities or fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="grid" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="space-y-6">
            {filteredEntities.length === 0 ? (
              <div className="text-center py-16">
                <Database size={64} className="mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No entities found</h3>
                <p className="text-muted-foreground">Try adjusting your search query</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEntities.map((entity) => (
                  <EntityCard
                    key={entity.name}
                    entity={entity}
                    isHighlighted={entity.name === activeEntity}
                    isConnected={connectedEntities.has(entity.name)}
                    onHover={setHoveredEntity}
                    onClick={handleEntityClick}
                  />
                ))}
              </div>
            )}

            {activeEntity && (
              <div className="mt-8 p-6 bg-accent/10 border-2 border-accent rounded-lg">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Graph size={24} className="text-accent" weight="duotone" />
                  Relationships for {activeEntity}
                </h3>
                <div className="space-y-2">
                  {getRelationshipsForEntity(activeEntity).map((rel, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm p-3 bg-background rounded border">
                      <Badge variant={rel.from === activeEntity ? 'default' : 'secondary'} className="font-mono">
                        {rel.from}
                      </Badge>
                      <span className="text-muted-foreground">
                        {rel.fromLabel || 'relates to'}
                        {rel.isOptional && ' (optional)'}
                      </span>
                      <span className="text-accent font-bold">→</span>
                      <Badge variant={rel.to === activeEntity ? 'default' : 'secondary'} className="font-mono">
                        {rel.to}
                      </Badge>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {rel.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="relationships">
            <div className="space-y-3">
              {relationships.map((rel, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-4 bg-card rounded-lg border hover:border-accent transition-colors"
                >
                  <Badge variant="default" className="font-mono min-w-[140px] justify-center">
                    {rel.from}
                  </Badge>
                  <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">{rel.fromLabel || 'has'}</span>
                    {rel.isOptional && <span className="text-xs italic">(optional)</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-accent font-bold text-lg">→</span>
                    <Badge variant="outline" className="text-xs">
                      {rel.type}
                    </Badge>
                  </div>
                  <div className="flex-1 text-sm text-muted-foreground text-right">
                    <span className="font-medium">{rel.toLabel || 'belongs to'}</span>
                  </div>
                  <Badge variant="secondary" className="font-mono min-w-[140px] justify-center">
                    {rel.to}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-card rounded-lg border">
            <div className="text-2xl font-bold text-primary">{entities.length}</div>
            <div className="text-sm text-muted-foreground">Total Entities</div>
          </div>
          <div className="p-4 bg-card rounded-lg border">
            <div className="text-2xl font-bold text-accent">{relationships.length}</div>
            <div className="text-sm text-muted-foreground">Relationships</div>
          </div>
          <div className="p-4 bg-card rounded-lg border">
            <div className="text-2xl font-bold text-secondary">
              {entities.reduce((sum, e) => sum + e.fields.filter((f) => f.isForeignKey).length, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Foreign Keys</div>
          </div>
          <div className="p-4 bg-card rounded-lg border">
            <div className="text-2xl font-bold text-foreground">
              {Math.max(...Object.values(relationshipStats))}
            </div>
            <div className="text-sm text-muted-foreground">Max Connections</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
