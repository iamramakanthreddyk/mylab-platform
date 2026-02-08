# 🎯 Scientist Workflow - Quick Reference Guide

## The Journey at a Glance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   SCIENTIST WORKFLOW - BATCHES & RESULTS                     │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: LOGIN
═══════════════════════════════════════════════════════════════════════════════
  🌐 Navigate to Application
      ↓
  📧 scientist@lab.com
  🔐 Enter Password
      ↓
  ✅ Authentication Successful
      ↓
  🏠 Redirect to Dashboard

STEP 2: NAVIGATE TO BATCHES
═══════════════════════════════════════════════════════════════════════════════
  📊 Dashboard Home (/)
      │
      ├─ See "Analysis Batches" card with quick stats
      └─ Click on card OR click "Batches" in navigation menu
            ↓
  📋 Batches List View (/batches)

STEP 3: VIEW BATCH LIST WITH METRICS
═══════════════════════════════════════════════════════════════════════════════
  Card Layout:
  ┌─────────────────────────────────────────────────────────┐
  │ 📊 BATCH-TST001                     Status: In Progress  │
  │ Quality analysis for sample series A                     │
  │                                                          │
  │ ┌──────────────────────────────────────────────────┐   │
  │ │  Samples: 5  │  Analyses: 3  │  Completed: 1    │   │
  │ │     🧪       │      📊       │       ✅         │   │
  │ └──────────────────────────────────────────────────┘   │
  │ ℹ️  2 analysis(es) in progress                         │
  │ 🔧 Execution: platform                                 │
  │ 📅 Created: 02/08/2026                            →    │
  └─────────────────────────────────────────────────────────┘
  
  Key Information at a Glance:
  • Sample count: How many samples in this batch
  • Analysis count: How many analyses running
  • Completed count: How many finished
  • In Progress: Alert if analyses are still running
  • Execution mode: Platform vs External
  • Dates: When created/sent/completed
  
  Actions:
  ✓ Search by Batch ID or Description
  ✓ Click any card to view details

STEP 4: CLICK BATCH CARD → DETAIL VIEW
═══════════════════════════════════════════════════════════════════════════════
  /batches/:batchId
  
  Header:
  ┌──────────────────────────────────────────────────────────┐
  │ ← Back to Batches                                        │
  │ 📊 BATCH-TST001                     Status: In Progress  │
  │ Quality analysis for sample series A                     │
  └──────────────────────────────────────────────────────────┘
  
  Metrics Dashboard:
  ┌────────────────┬─────────────────┬───────────┬──────────┐
  │ Sample Count   │ Total Analyses  │ Completed │In Progress│
  │      5         │       3        │     1     │    2     │
  │      🧪        │       📊       │     ✅    │    ⏱️     │
  └────────────────┴─────────────────┴───────────┴──────────┘

STEP 5: EXPLORE THREE TABS
═══════════════════════════════════════════════════════════════════════════════

  TAB 1: BATCH DETAILS
  ──────────────────────────────────────────────────────────
  Shows:
  • Batch ID (e.g., BATCH-TST001)
  • Status (Created, Ready, Sent, In Progress, Completed)
  • Execution Mode (Platform or External)
  • Timeline (Created, Sent, Completed dates)
  • Description of the batch
  • Parameters (JSON view if applicable)
  
  Example:
  ┌────────────────────────────────────────────────────────┐
  │ BATCH INFORMATION                                      │
  │ Batch ID: BATCH-TST001                                 │
  │ Status: In Progress                                    │
  │ Execution Mode: Platform                               │
  │ Created On: Feb 8, 2026, 2:45 PM                      │
  │ Sent On: Feb 8, 2026, 3:00 PM                         │
  │                                                        │
  │ Description:                                           │
  │ Quality analysis for sample series A                   │
  │                                                        │
  │ Parameters:                                            │
  │ { "analysisType": "NMR", "priority": "high" }         │
  └────────────────────────────────────────────────────────┘

  TAB 2: ANALYSES
  ──────────────────────────────────────────────────────────
  Shows:
  • All analyses for this batch
  • Status icon (✅ Done, ⏱️ Running, ❌ Failed)
  • Analysis type (NMR, HPLC, GC-MS, etc.)
  • Performer & Date
  • "View Results" button (for completed only)
  
  Example:
  ┌──────────────────────────────────────────────────────┐
  │ ✅ NMR Analysis                    Status: Completed │
  │    Complete NMR spectroscopy analysis                │
  │    Performed by: Dr. Smith | 02/08/2026             │
  │    [View Results]                                    │
  │                                                      │
  │ ⏱️ HPLC Analysis                  Status: Running    │
  │    High-performance liquid chromatography            │
  │    Performed by: Dr. Johnson | 02/08/2026           │
  │                                                      │
  │ ⏱️ GC-MS Analysis                 Status: Running    │
  │    Gas chromatography-mass spectrometry              │
  │    Performed by: Dr. Lee | 02/08/2026               │
  └──────────────────────────────────────────────────────┘

  TAB 3: RESULTS
  ──────────────────────────────────────────────────────────
  Shows:
  • ONLY completed analyses with results
  • Summary of findings
  • Key data highlights
  • Conclusions
  • "View Full Report" button for details
  
  Example:
  ┌──────────────────────────────────────────────────────┐
  │ ✅ NMR ANALYSIS                                      │
  │ Method: 1H-NMR, DMSO-d6, 400MHz                     │
  │                                                      │
  │ Results:                                             │
  │ δ (ppm): 1.23 (3H, singlet, CH₃)                    │
  │ δ (ppm): 3.45 (2H, quartet, CH₂)                    │
  │ Integration ratios: 3:2:5 (expected)                │
  │ Purity: 99.2% (excellent)                           │
  │                                                      │
  │ Conclusions:                                         │
  │ Structure confirmed. Sample meets all specs.        │
  │                                                      │
  │ [View Full Report] → /analyses/:id/complete         │
  └──────────────────────────────────────────────────────┘

STEP 6: (OPTIONAL) VIEW DETAILED REPORT
═══════════════════════════════════════════════════════════════════════════════
  Click "View Full Report" from Analyses tab
      ↓
  /analyses/:analysisId/complete
  
  This page shows:
  • Complete analysis parameters
  • Full results data
  • Conclusions & recommendations
  • Download/Export options
  • Back link to batch

═══════════════════════════════════════════════════════════════════════════════
```

## 🎯 Key Pages & Routes

| Page | Route | What You See |
|------|-------|--------------|
| Dashboard | `/` | Quick stats & batch summary |
| Batch List | `/batches` | All batches with metrics |
| Batch Detail | `/batches/:batchId` | Batch info + 3 tabs |
| Analysis Report | `/analyses/:analysisId/complete` | Full analysis data |

---

## 🎬 Status Indicators

### Batch Status (Color-coded badges)
- 🟢 **Completed** - All work finished
- 🔵 **In Progress** - Lab is working
- ⚪ **Created** - Initial state
- ⚪ **Ready** - Prepared to send  
- ⚪ **Sent** - On the way

### Analysis Status (Icons in list)
- ✅ **Completed** - Green checkmark, results available
- ⏱️ **In Progress** - Blue clock, lab is working
- ❌ **Failed** - Red warning, something went wrong
- ⏳ **Pending** - Gray clock, not started

---

## ⚡ Quick Actions

From **Batch List** (`/batches`):
- 🔍 Search by Batch ID
- 🔍 Search by Description
- 📊 Click card → View details

From **Batch Detail** (`/batches/:batchId`):
- 📖 Read batch info
- 📊 Review all analyses
- 👁️ View completed results
- 📄 Click "View Full Report" → detailed analysis
- ← Back button → Return to list

---

## 📌 What Each Tab Shows

```
┌─────────────────────────────────────────────────────────┐
│  [Batch Details]  [Analyses]  [Results]                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ • Batch metadata    • All analyses   • Completed only   │
│ • Creation dates    • Status icons   • Results summary  │
│ • Execution mode    • Performer      • Key findings     │
│ • Description       • Date/time      • Conclusions      │
│ • Parameters        • View buttons   • Full report link │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Flow Summary

```
Scientist's Journey:

1. LOGIN                  2. NAVIGATE              3. VIEW LIST
   ├─ Email               ├─ Home                 ├─ Card metrics
   ├─ Password            ├─ Click Batches        ├─ Status badges
   └─ Enter                     ↓                  └─ Search
         ↓ (Success)      
                          
4. CLICK BATCH           5. VIEW DETAILS         6. EXPLORE RESULTS
   ├─ Navigate to        ├─ Batch metadata      ├─ Switch tabs
   │ /batches/:id        ├─ See 3 tabs          ├─ View data
   └─ Load details       ├─ Metrics show        ├─ Click Full Report
         ↓               └─ Everything clear     └─ Export/Download
                               ↓                      
                               ✅ ALL INFO CLEAR!
```

---

## 💡 Tips for Scientists

✓ **Check Sample Count** → Know how many samples in batch  
✓ **Watch Analysis Count** → See how many tests running  
✓ **Monitor Progress** → In-progress alert shows which are done  
✓ **Find Results Fast** → Results tab shows only completed  
✓ **Get Details** → Click "View Full Report" for everything  
✓ **Go Back Easily** → Use "Back" button at any point  

---

## 🎓 Remember

- **Batch** = Container for multiple samples going to analysis
- **Analysis** = Individual test (NMR, HPLC, etc.)
- **Results** = The output/data from analysis
- **Tabs** = Different ways to view the same batch info

One batch can have many analyses, and the view helps you track all of them! 🚀
