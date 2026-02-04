export type FieldType = 'UUID' | 'VARCHAR' | 'TEXT' | 'INT' | 'BIGINT' | 'BOOLEAN' | 'ENUM' | 'JSONB' | 'TIMESTAMP'

export interface Field {
  name: string
  type: FieldType
  isPrimaryKey?: boolean
  isForeignKey?: boolean
  foreignKeyTo?: string
  isNullable?: boolean
}

export interface Entity {
  name: string
  fields: Field[]
  description?: string
}

export interface Relationship {
  from: string
  to: string
  type: 'one-to-many' | 'one-to-one' | 'many-to-many'
  fromLabel?: string
  toLabel?: string
  isOptional?: boolean
}

export const entities: Entity[] = [
  {
    name: 'Workspace',
    fields: [
      { name: 'id', type: 'UUID', isPrimaryKey: true },
      { name: 'name', type: 'VARCHAR' },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'Organizations',
    fields: [
      { name: 'id', type: 'UUID', isPrimaryKey: true },
      { name: 'name', type: 'VARCHAR' },
      { name: 'type', type: 'ENUM' },
      { name: 'is_platform_workspace', type: 'BOOLEAN' },
      { name: 'workspace_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Workspace' },
      { name: 'contact_info', type: 'JSONB' },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'Users',
    fields: [
      { name: 'id', type: 'UUID', isPrimaryKey: true },
      { name: 'workspace_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Workspace' },
      { name: 'email', type: 'VARCHAR' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'role', type: 'ENUM' },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP' },
      { name: 'deleted_at', type: 'TIMESTAMP', isNullable: true },
    ],
  },
  {
    name: 'Projects',
    fields: [
      { name: 'id', type: 'UUID', isPrimaryKey: true },
      { name: 'workspace_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Workspace' },
      { name: 'client_org_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Organizations' },
      { name: 'executing_org_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Organizations' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'description', type: 'TEXT' },
      { name: 'created_by', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Users' },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP' },
      { name: 'deleted_at', type: 'TIMESTAMP', isNullable: true },
    ],
  },
  {
    name: 'ProjectStages',
    fields: [
      { name: 'id', type: 'UUID', isPrimaryKey: true },
      { name: 'project_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Projects' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'order', type: 'INT' },
      { name: 'owner_workspace_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Workspace' },
      { name: 'status', type: 'ENUM' },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'Samples',
    fields: [
      { name: 'id', type: 'UUID', isPrimaryKey: true },
      { name: 'project_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Projects' },
      { name: 'workspace_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Workspace' },
      { name: 'sample_id', type: 'VARCHAR' },
      { name: 'type', type: 'VARCHAR' },
      { name: 'description', type: 'TEXT' },
      { name: 'metadata', type: 'JSONB' },
      { name: 'status', type: 'ENUM' },
      { name: 'created_by', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Users' },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP' },
      { name: 'deleted_at', type: 'TIMESTAMP', isNullable: true },
    ],
  },
  {
    name: 'DerivedSamples',
    fields: [
      { name: 'id', type: 'UUID', isPrimaryKey: true },
      { name: 'root_sample_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Samples' },
      { name: 'parent_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'DerivedSamples', isNullable: true },
      { name: 'owner_workspace_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Workspace' },
      { name: 'derived_id', type: 'VARCHAR' },
      { name: 'process_notes', type: 'TEXT' },
      { name: 'metadata', type: 'JSONB' },
      { name: 'depth', type: 'INT' },
      { name: 'status', type: 'ENUM' },
      { name: 'execution_mode', type: 'ENUM' },
      { name: 'executed_by_org_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Organizations' },
      { name: 'external_reference', type: 'VARCHAR' },
      { name: 'performed_at', type: 'TIMESTAMP' },
      { name: 'created_by', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Users' },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP' },
      { name: 'deleted_at', type: 'TIMESTAMP', isNullable: true },
    ],
  },
  {
    name: 'Batches',
    fields: [
      { name: 'id', type: 'UUID', isPrimaryKey: true },
      { name: 'workspace_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Workspace' },
      { name: 'original_workspace_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Workspace' },
      { name: 'batch_id', type: 'VARCHAR' },
      { name: 'description', type: 'TEXT' },
      { name: 'parameters', type: 'JSONB' },
      { name: 'status', type: 'ENUM' },
      { name: 'execution_mode', type: 'ENUM' },
      { name: 'executed_by_org_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Organizations' },
      { name: 'external_reference', type: 'VARCHAR' },
      { name: 'performed_at', type: 'TIMESTAMP' },
      { name: 'created_by', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Users' },
      { name: 'sent_at', type: 'TIMESTAMP', isNullable: true },
      { name: 'completed_at', type: 'TIMESTAMP', isNullable: true },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP' },
      { name: 'deleted_at', type: 'TIMESTAMP', isNullable: true },
    ],
  },
  {
    name: 'BatchItems',
    fields: [
      { name: 'id', type: 'UUID', isPrimaryKey: true },
      { name: 'batch_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Batches' },
      { name: 'derived_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'DerivedSamples' },
      { name: 'sequence', type: 'INT' },
      { name: 'created_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'Analyses',
    fields: [
      { name: 'id', type: 'UUID', isPrimaryKey: true },
      { name: 'batch_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Batches' },
      { name: 'workspace_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Workspace' },
      { name: 'analysis_type_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'AnalysisTypes' },
      { name: 'results', type: 'JSONB' },
      { name: 'file_path', type: 'VARCHAR' },
      { name: 'file_checksum', type: 'VARCHAR' },
      { name: 'file_size_bytes', type: 'BIGINT' },
      { name: 'status', type: 'ENUM' },
      { name: 'execution_mode', type: 'ENUM' },
      { name: 'executed_by_org_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Organizations' },
      { name: 'source_org_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Organizations' },
      { name: 'external_reference', type: 'VARCHAR' },
      { name: 'received_at', type: 'TIMESTAMP' },
      { name: 'performed_at', type: 'TIMESTAMP' },
      { name: 'uploaded_by', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Users' },
      { name: 'uploaded_at', type: 'TIMESTAMP' },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP' },
      { name: 'deleted_at', type: 'TIMESTAMP', isNullable: true },
    ],
  },
  {
    name: 'AnalysisTypes',
    fields: [
      { name: 'id', type: 'UUID', isPrimaryKey: true },
      { name: 'name', type: 'VARCHAR' },
      { name: 'description', type: 'TEXT' },
      { name: 'category', type: 'VARCHAR' },
      { name: 'is_active', type: 'BOOLEAN' },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'Documents',
    fields: [
      { name: 'id', type: 'UUID', isPrimaryKey: true },
      { name: 'workspace_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Workspace' },
      { name: 'project_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Projects', isNullable: true },
      { name: 'sample_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Samples', isNullable: true },
      { name: 'name', type: 'VARCHAR' },
      { name: 'file_path', type: 'VARCHAR' },
      { name: 'version', type: 'INT' },
      { name: 'mime_type', type: 'VARCHAR' },
      { name: 'size_bytes', type: 'BIGINT' },
      { name: 'uploaded_by', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Users' },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP' },
      { name: 'deleted_at', type: 'TIMESTAMP', isNullable: true },
    ],
  },
  {
    name: 'AccessGrants',
    fields: [
      { name: 'id', type: 'UUID', isPrimaryKey: true },
      { name: 'object_type', type: 'ENUM' },
      { name: 'object_id', type: 'UUID' },
      { name: 'granted_to_org_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Organizations' },
      { name: 'granted_role', type: 'ENUM' },
      { name: 'access_mode', type: 'ENUM' },
      { name: 'expires_at', type: 'TIMESTAMP', isNullable: true },
      { name: 'created_by', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Users' },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'deleted_at', type: 'TIMESTAMP', isNullable: true },
    ],
  },
  {
    name: 'AuditLog',
    fields: [
      { name: 'id', type: 'UUID', isPrimaryKey: true },
      { name: 'user_id', type: 'UUID', isForeignKey: true, foreignKeyTo: 'Users' },
      { name: 'action', type: 'VARCHAR' },
      { name: 'entity_type', type: 'VARCHAR' },
      { name: 'entity_id', type: 'UUID' },
      { name: 'changes', type: 'JSONB' },
      { name: 'created_at', type: 'TIMESTAMP' },
    ],
  },
]

export const relationships: Relationship[] = [
  { from: 'Workspace', to: 'Organizations', type: 'one-to-many', fromLabel: 'backs', toLabel: 'has', isOptional: true },
  { from: 'Organizations', to: 'Projects', type: 'one-to-many', fromLabel: 'owns', toLabel: 'client of' },
  { from: 'Organizations', to: 'Projects', type: 'one-to-many', fromLabel: 'executes', toLabel: 'executed by' },
  { from: 'Organizations', to: 'AccessGrants', type: 'one-to-many', fromLabel: 'receives', toLabel: 'granted to' },
  { from: 'Organizations', to: 'DerivedSamples', type: 'one-to-many', fromLabel: 'executes', toLabel: 'executed by' },
  { from: 'Organizations', to: 'Batches', type: 'one-to-many', fromLabel: 'executes', toLabel: 'executed by' },
  { from: 'Organizations', to: 'Analyses', type: 'one-to-many', fromLabel: 'executes', toLabel: 'executed by' },
  { from: 'Organizations', to: 'Analyses', type: 'one-to-many', fromLabel: 'sources', toLabel: 'sourced from' },
  { from: 'Users', to: 'Projects', type: 'one-to-many', fromLabel: 'creates', toLabel: 'created by' },
  { from: 'Users', to: 'Samples', type: 'one-to-many', fromLabel: 'creates', toLabel: 'created by' },
  { from: 'Users', to: 'DerivedSamples', type: 'one-to-many', fromLabel: 'creates', toLabel: 'created by' },
  { from: 'Users', to: 'Batches', type: 'one-to-many', fromLabel: 'creates', toLabel: 'created by' },
  { from: 'Users', to: 'Analyses', type: 'one-to-many', fromLabel: 'uploads', toLabel: 'uploaded by' },
  { from: 'Users', to: 'Documents', type: 'one-to-many', fromLabel: 'uploads', toLabel: 'uploaded by' },
  { from: 'Users', to: 'AccessGrants', type: 'one-to-many', fromLabel: 'grants', toLabel: 'granted by' },
  { from: 'Users', to: 'AuditLog', type: 'one-to-many', fromLabel: 'performs', toLabel: 'performed by' },
  { from: 'Projects', to: 'ProjectStages', type: 'one-to-many', fromLabel: 'contains', toLabel: 'part of' },
  { from: 'Projects', to: 'Samples', type: 'one-to-many', fromLabel: 'contains', toLabel: 'belongs to' },
  { from: 'Projects', to: 'Documents', type: 'one-to-many', fromLabel: 'links to', toLabel: 'linked from', isOptional: true },
  { from: 'Samples', to: 'DerivedSamples', type: 'one-to-many', fromLabel: 'root of', toLabel: 'derived from' },
  { from: 'Samples', to: 'Documents', type: 'one-to-many', fromLabel: 'links to', toLabel: 'linked from', isOptional: true },
  { from: 'DerivedSamples', to: 'BatchItems', type: 'one-to-many', fromLabel: 'included in', toLabel: 'contains' },
  { from: 'DerivedSamples', to: 'DerivedSamples', type: 'one-to-many', fromLabel: 'parent of', toLabel: 'child of', isOptional: true },
  { from: 'Batches', to: 'BatchItems', type: 'one-to-many', fromLabel: 'contains', toLabel: 'part of' },
  { from: 'Batches', to: 'Analyses', type: 'one-to-many', fromLabel: 'analyzed in', toLabel: 'analyzes' },
  { from: 'AnalysisTypes', to: 'Analyses', type: 'one-to-many', fromLabel: 'type of', toLabel: 'has type' },
]
