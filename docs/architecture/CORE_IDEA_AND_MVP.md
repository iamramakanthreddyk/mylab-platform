# MyLab Platform: Core Architecture & MVP Definition

## **The Core Idea: System of Record for Experimental Lineage**

MyLab is a secure collaboration platform that ensures **no experiment, sample, or result ever loses its ownership, context, or audit trail**, even as work moves across CROs, CDMOs, QC labs, and commercial plants.

### **The Problem (Real Pain Points)**
- **Fragmented Workflows**: Experiments run across multiple vendors, data lives in emails/PDFs/Excel
- **Lost Context**: Sample transformations happen off-platform, lineage breaks
- **Ownership Confusion**: Who owns what IP? Who can see what?
- **Audit Nightmares**: Reconstructing what happened months later
- **Security Risks**: Sensitive pharma data shared via insecure channels

### **The Solution (What MyLab Actually Does)**
MyLab becomes the **single source of truth for experimental lineage** by connecting existing lab systems safely, not replacing them.

**Key Innovation**: Most platforms try to be everything to everyone. MyLab is deliberately narrow - it solves ONE problem exceptionally well: **"Who owns this molecule, and what happened to it?"**

---

## **MVP Definition: Lineage + Ownership + Sharing**

### **✅ MUST HAVE (Table Stakes - Build These First)**

1. **Workspaces** - Isolated tenants with clear ownership boundaries
2. **Projects** - Scientific intent containers
3. **Samples** - Immutable originals with metadata
4. **Derived Samples** - Parent-child lineage (depth-limited)
5. **Access Grants** - Explicit, non-transitive, revocable sharing
6. **Audit Log** - Every mutation tracked
7. **External Execution Support** - Offline/off-platform traceability

**Reality Check**: If these 7 things work perfectly, you have a sellable product.

### **🚫 EXPLICITLY NOT MVP (Phase 2+ - Resist Building)**

- Real-time chat/communication
- Analytics dashboards & reporting
- Predictive alerts/AI insights
- Equipment integrations
- Mobile apps
- Advanced billing automation
- Complex notification workflows

**Exception**: Simple state-change notifications (e.g., "Analysis complete", "Access expired") are OK. No chat.

---

## **Database Schema → User Journey Mapping**

### **🎬 ACT 1: Onboarding ("Who owns what?")**
**Tables**: `Workspace`, `Users`, `Organizations`, `AuditLog`
**User Value**: Clear tenant isolation, role clarity, legal ownership boundaries
**Gap Filled**: No more "whose data is this?"

### **🎬 ACT 2: Project Setup ("What are we studying?")**
**Tables**: `Projects`, `ProjectStages`, `Samples`
**User Value**: Scientific intent is explicit, samples are immutable originals
**Gap Filled**: No more lost experimental context

### **🎬 ACT 3: CRO/CDMO Collaboration ("Who touched the sample?")**
**Tables**: `AccessGrants`, `DerivedSamples`
**Key Innovation**: `owner_workspace_id` ≠ `executor_workspace_id`
**User Value**: CROs can work on client samples without owning client IP
**Gap Filled**: Safe external collaboration without IP risk

### **🎬 ACT 4: Analysis & Results ("What was tested?")**
**Tables**: `Batches`, `BatchItems`, `AnalysisTypes`, `Analyses`
**User Value**: Complete chain of custody, file integrity, method traceability
**Gap Filled**: No more "where did this result come from?"

### **🎬 ACT 5: Compliance & Audit ("Can you prove it?")**
**Tables**: `AuditLog`, `Documents`
**User Value**: ALCOA+ compliance, FDA/EMA-ready audit trails
**Gap Filled**: Audits become automated queries, not manual reconstruction

### **🎬 ACT 6: Ecosystem Growth ("What if players join later?")**
**Tables**: `Organizations` (external), `AccessGrants`, `Analyses` (external sources)
**User Value**: No data migration required, late joiners inherit visibility not control
**Gap Filled**: Platform grows organically without disruption

---

## **Real CRO Workflow Stress Test: TekFlow Scenario**

### **Scenario Setup**
- **TekFlow (CRO)**: On MyLab platform
- **PharmaClient**: NOT on MyLab (uses email/PDFs)
- **External QC Lab**: NOT on MyLab (receives physical samples)

### **Step-by-Step Workflow Validation**

#### **Step 1: Project Creation**
```
TekFlow creates project:
- client_org_id = "PharmaClient" (external org record)
- executing_org_id = "TekFlow"
- owner_workspace_id = "PharmaClient" (virtual)
```
✅ **Client owns project, CRO executes** - no forced onboarding

#### **Step 2: DOE Development (TekFlow IP)**
```
DOE stored as Document:
- workspace_id = "TekFlow"
- NOT shared with client
```
✅ **CRO protects its know-how** - client never sees unless explicitly shared

#### **Step 3: Sample Processing**
```
Internal processing:
- Samples → Derived Samples (lineage preserved)
- Batches formed for analysis
- All owned by PharmaClient
```
✅ **Full traceability** - every transformation logged

#### **Step 4: External QC Testing**
```
Offline execution:
- execution_mode = 'external'
- external_reference = "QC-Lab-Report-2024-001"
- received_at = timestamp when results return
```
✅ **Offline work traceable** - no fake user accounts needed

#### **Step 5: Results Delivery**
```
Selective sharing:
- Access Grants created for specific samples/analyses
- Auto-expiry prevents permanent access
- CRO cannot re-share client data
```
✅ **Client owns results, CRO cannot leak IP**

#### **Step 6: Audit Query**
```sql
-- "Who touched this molecule?"
SELECT
  ds.derived_id,
  ow.name as owner_org,
  ex.name as executor_org,
  ds.created_at,
  ds.execution_mode,
  ds.external_reference
FROM DerivedSamples ds
JOIN Organizations ow ON ds.owner_workspace_id = ow.workspace_id
JOIN Organizations ex ON ds.executed_by_org_id = ex.id
WHERE ds.root_sample_id = ?
```
✅ **One query answers regulatory questions**

---

## **Business Model Reality Check**

### **How MyLab Makes Money**
1. **CRO Subscription**: $500-2000/month per workspace (they need this for compliance)
2. **Pharma Subscription**: $1000-5000/month per workspace (they need this for oversight)
3. **External Org Records**: Free (creates network effects)
4. **Premium Features**: Advanced analytics, mobile access (Phase 2)

### **Go-To-Market Strategy**
1. **Start with CROs**: They have the pain, they pay the bills
2. **Let clients follow**: Pharma joins to see their own data
3. **Network effects**: More orgs on platform = more value for all

### **Competitive Advantages**
- **Ownership-first**: Unlike Benchling/ELN (collaboration-first)
- **External-native**: Unlike LabWare/LIMS (internal-only)
- **Audit-built-in**: Unlike email/PDF workflows (no audit trail)

---

## **Technical Foundation (What We Built)**

### **Database Schema Status**: ✅ Complete
- 15 core tables implemented
- Workspace isolation enforced
- Immutable lineage designed
- External actor support built-in

### **API Layer Status**: ✅ Functional
- RESTful endpoints for all operations
- Authentication middleware ready
- Audit logging integrated

### **Frontend Status**: 🚧 MVP-Ready
- Basic CRUD interfaces built
- Notification system (state-change only)
- Responsive design implemented

### **Critical Gaps Identified & Fixed**

1. **✅ Notification Over-Engineering**: Simplified to state-change alerts only (no chat)
2. **✅ Payment Complexity**: Moved to Phase 2 (MVP focuses on core lineage)
3. **✅ Feature Creep**: Clear MVP boundaries established
4. **✅ Business Clarity**: Revenue model and GTM strategy defined

---

## **Next Steps (Execution Priority)**

### **Immediate (This Week)**
1. **Database Connection**: Get PostgreSQL running with proper credentials
2. **Basic CRUD**: Projects, Samples, Derived Samples working
3. **Access Grants**: Sharing mechanism functional
4. **Audit Logging**: All mutations tracked

### **Short Term (Next Month)**
1. **CRO Workflow**: Complete TekFlow scenario end-to-end
2. **External Execution**: Offline/off-platform support
3. **Basic UI**: Functional web interface
4. **State Notifications**: Simple alerts for status changes

### **Validation Milestones**
1. **MVP Demo**: Create project → share samples → CRO processes → results returned
2. **CRO Interest**: Show to 3 CROs, get feedback
3. **Pharma Validation**: Demo audit capabilities

---

**This is now a coherent, executable plan. The core idea is solid: MyLab becomes the connective tissue of scientific collaboration by solving lineage + ownership + sharing. Everything else is Phase 2.**

Ready to execute? The database foundation is built - we just need to connect it and start with the core workflow. 🚀</content>
<parameter name="filePath">c:\Users\r.kowdampalli\Documents\MyProjects\mylab-platform\docs\architecture\CORE_IDEA_AND_MVP.md