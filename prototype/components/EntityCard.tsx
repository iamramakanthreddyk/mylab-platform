import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Key, Database } from '@phosphor-icons/react'
import { Entity, Field, FieldType } from '@/lib/schema-data'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface EntityCardProps {
  entity: Entity
  isHighlighted?: boolean
  isConnected?: boolean
  onHover?: (entityName: string | null) => void
  onClick?: (entityName: string) => void
}

const typeColorMap: Record<FieldType, string> = {
  UUID: 'bg-amber-100 text-amber-800 border-amber-200',
  VARCHAR: 'bg-blue-100 text-blue-800 border-blue-200',
  TEXT: 'bg-blue-50 text-blue-700 border-blue-100',
  INT: 'bg-green-100 text-green-800 border-green-200',
  BIGINT: 'bg-green-100 text-green-800 border-green-200',
  BOOLEAN: 'bg-purple-100 text-purple-800 border-purple-200',
  ENUM: 'bg-pink-100 text-pink-800 border-pink-200',
  JSONB: 'bg-orange-100 text-orange-800 border-orange-200',
  TIMESTAMP: 'bg-gray-100 text-gray-700 border-gray-200',
}

export function EntityCard({ entity, isHighlighted, isConnected, onHover, onClick }: EntityCardProps) {
  const primaryKeys = entity.fields.filter((f) => f.isPrimaryKey)
  const foreignKeys = entity.fields.filter((f) => f.isForeignKey)
  const regularFields = entity.fields.filter((f) => !f.isPrimaryKey && !f.isForeignKey)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => onHover?.(entity.name)}
      onHoverEnd={() => onHover?.(null)}
      onClick={() => onClick?.(entity.name)}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200 border-2',
          isHighlighted && 'shadow-lg border-primary',
          isConnected && 'border-accent shadow-accent/20 shadow-md',
          !isHighlighted && !isConnected && 'hover:shadow-md'
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="text-primary" size={20} weight="duotone" />
            <span className="font-semibold tracking-tight">{entity.name}</span>
            <Badge variant="outline" className="ml-auto text-xs">
              {entity.fields.length} fields
            </Badge>
          </CardTitle>
          {entity.category && (
            <p className="text-xs text-muted-foreground mt-1">{entity.category}</p>
          )}
          {entity.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{entity.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {primaryKeys.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Key size={12} weight="bold" className="text-amber-600" />
                Primary Key
              </div>
              {primaryKeys.map((field) => (
                <FieldRow key={field.name} field={field} />
              ))}
            </div>
          )}

          {foreignKeys.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Key size={12} weight="bold" className="text-accent" />
                  Foreign Keys
                </div>
                {foreignKeys.map((field) => (
                  <FieldRow key={field.name} field={field} />
                ))}
              </div>
            </>
          )}

          {regularFields.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fields</div>
                {regularFields.map((field) => (
                  <FieldRow key={field.name} field={field} />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function FieldRow({ field }: { field: Field }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-medium text-card-foreground flex-shrink-0">{field.name}</span>
      <Badge variant="secondary" className={cn('text-xs font-mono border', typeColorMap[field.type])}>
        {field.type}
      </Badge>
      {field.foreignKeyTo && (
        <span className="text-xs text-muted-foreground truncate ml-auto">→ {field.foreignKeyTo}</span>
      )}
      {field.isNullable && <span className="text-xs text-muted-foreground italic">nullable</span>}
    </div>
  )
}
