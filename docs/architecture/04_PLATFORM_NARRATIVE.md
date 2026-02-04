# MyLab Platform Narrative: Customer Journey and System Story

**A comprehensive story of how MyLab enables secure, compliant lab collaboration, based on the database schema and business requirements. This narrative demonstrates multi-stage project management, lineage integrity, and enterprise-grade controls for pharma, CROs, and regulators.**

---

## The Story of PharmaCorp's Journey on MyLab: From Onboarding to Breakthrough Discovery

In the world of drug development, PharmaCorp—a pharmaceutical company—needs to manage complex sample transformations across contract research organizations (CROs), analyzers, and internal teams without losing traceability or compromising intellectual property. MyLab provides a collaborative platform with workspace isolation, explicit sharing, and immutable lineage to ensure secure, compliant workflows.

### **1. Onboarding: Setting Up the Workspace**
PharmaCorp's journey begins with onboarding. The company's IT admin creates a new **Workspace** in the `Workspace` table, providing details like name ("PharmaCorp"), slug ("pharmacorp"), and type ("pharma"). This isolates PharmaCorp's data, ensuring no cross-contamination with other organizations.

- **Tables Involved**: `Workspace` (id, name, slug, type, email_domain).
- **How It Works**: UUID generation and domain-based invites enforce tenant isolation. All data ties to `workspace_id`, preventing unauthorized access.
- **Why It Matters**: Reduces security risks and simplifies multi-tenant management.

Users like Dr. Elena Reyes (researcher) and Alex Chen (manager) join via the `Users` table, with roles ("admin", "user") verified against the workspace domain.

- **Tables Involved**: `Users` (id, workspace_id, email, name, role).
- **How It Works**: Roles control internal permissions; the `AuditLog` captures all actions for compliance.
- **Tables Involved**: `AuditLog` (id, object_type, object_id, action, actor_id, details, timestamp).

### **2. Launching a Project: Organizing the Work**
Alex creates "Compound X Optimization" in the `Projects` table, linked to the workspace.

- **Tables Involved**: `Projects` (id, workspace_id, name, description, created_by).
- **How It Works**: Projects containerize samples; foreign keys ensure ownership.
- **Why It Matters**: Provides clear project boundaries for collaboration.

Elena adds initial samples in the `Samples` table, with metadata and status.

- **Tables Involved**: `Samples` (id, project_id, workspace_id, sample_id, metadata, status, created_by).
- **How It Works**: Immutable once created; JSONB allows flexible fields like {quantity: "10mg", purity: "95%"}.
- **Why It Matters**: Ensures original data integrity for regulatory audits.

### **3. Deriving Samples: Multi-Stage Transformations**
PharmaCorp shares samples with a CRO via the `AccessGrants` table, granting "Processor" role.

- **Tables Involved**: `AccessGrants` (id, object_type, object_id, granted_to_org_id, granted_role, access_mode, expires_at).
- **How It Works**: Explicit, non-transitive sharing—recipients cannot re-share without owner approval. Roles (e.g., "Processor") define actions, separate from workspace roles. Supports both platform and offline access.
- **Why It Matters**: Prevents IP leakage and ensures controlled access.

The CRO creates derived samples in `DerivedSamples`, but ownership remains with PharmaCorp via `owner_workspace_id` (PharmaCorp), while `executor_workspace_id` (CRO) tracks who performed the work. For external executions, `execution_mode` is set to 'external', with `executed_by_org_id` pointing to the external CRO organization.

- **Tables Involved**: `DerivedSamples` (id, root_sample_id, parent_id, owner_workspace_id, executor_workspace_id, derived_id, metadata, depth, status, execution_mode, executed_by_org_id, external_reference).
- **How It Works**: Root links to original sample; parent allows chaining up to depth 3. External references track off-platform work.
- **Why It Matters**: Maintains clear ownership for disputes and compliance.

Transformations occur within **Project Stages** in the `ProjectStages` table, allowing chronological progress tracking.

- **Tables Involved**: `ProjectStages` (id, project_id, name, order, owner_workspace_id, status).
- **How It Works**: Samples reference `stage_id`; stages enforce workflow order.
- **Why It Matters**: Provides structured multi-stage views without breaking lineage.

### **4. Batching for Analysis: Grouping and Sending**
The CRO batches derived samples in `Batches` and `BatchItems`.

- **Tables Involved**: `Batches` (id, workspace_id, original_workspace_id, batch_id, parameters, status, execution_mode, executed_by_org_id, external_reference), `BatchItems` (id, batch_id, derived_id, sequence).
- **How It Works**: Tracks cross-workspace flow; sequences ensure order. External batches use `execution_mode` = 'external'.
- **Why It Matters**: Streamlines analysis workflows.

Shared with an analyzer, who performs tests using `AnalysisTypes`.

- **Tables Involved**: `AnalysisTypes` (id, name, category, is_active).
- **How It Works**: Normalizes methods for consistency.
- **Why It Matters**: Improves reporting and reduces errors.

### **5. Analysis and Results: Generating Insights**
Results upload to `Analyses`, with immutable files and checksums. For external analyzers, `source_org_id` points to the external organization, `received_at` tracks when results arrived.

- **Tables Involved**: `Analyses` (id, batch_id, workspace_id, analysis_type_id, results, file_path, file_checksum, status, execution_mode, executed_by_org_id, source_org_id, external_reference, received_at, uploaded_by).
- **How It Works**: S3 storage with integrity checks; JSONB for flexible results. External references link to off-platform reports.
- **Why It Matters**: Ensures data authenticity for regulators.

### **6. Documentation and Compliance: Wrapping It Up**
Documents attach via `Documents`; lineage queries reveal full chains.

- **Tables Involved**: `Documents` (id, workspace_id, project_id, sample_id, file_path, version).
- **How It Works**: Versioned and shareable.

Access revocation: When expired, visibility ends, but `AuditLog` preserves history.

- **How It Works**: Soft deletes in `AccessGrants`; historical actions remain visible.
- **Why It Matters**: Supports audits without data loss.

MyLab aligns with ALCOA+ principles (Attributable, Legible, Contemporaneous, Original, Accurate) via immutability, checksums, timestamps, and ownership enforcement, supporting FDA/EMA inspections.

- **Figure Reference**: End-to-end sample lineage across workspaces (see database ERD).

### **Off-Platform Scenario: Tekflow for External Clients**
When clients like NovaPharma aren't on MyLab, Tekflow creates projects in `Projects` with `client_org_id` pointing to an external `Organizations` entry for NovaPharma, and `executing_org_id` for Tekflow.

- **Tables Involved**: `Organizations` (id, name, type, is_platform_workspace, workspace_id, contact_info), `Projects` (id, workspace_id, client_org_id, executing_org_id, name).
- **How It Works**: External orgs have `is_platform_workspace` = false. Projects separate business ownership from execution.
- **Why It Matters**: Enables CRO workflows without requiring all parties on-platform.

Samples are processed internally, but batches sent externally: `AccessGrants` with `access_mode` = 'offline' grants access to external analyzers. Results received later are uploaded with `source_org_id` and `received_at`.

- **Tables Involved**: `AccessGrants` (id, object_type, object_id, granted_to_org_id, access_mode), `Analyses` (source_org_id, received_at).
- **How It Works**: Tracks external interactions without assuming platform presence.
- **Why It Matters**: Future-proofs onboarding; preserves audit trails.

### **The Happy Ending: Collaboration and Discovery**
PharmaCorp achieves traceable breakthroughs, with MyLab's schema enabling secure sharing, lineage, and compliance—even for off-platform actors. External organizations can join later, instantly gaining visibility without data migration.

---

**Upgrade Applied**: Incorporated ownership separation, private workspaces, project stages, non-transitive sharing, revocation clarity, ALCOA+ compliance, and off-platform actor support via Organizations and AccessGrants. Reduced repetition; added "why it matters" and diagram reference. This narrative is now airtight for enterprise and regulatory audiences.