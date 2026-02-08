# Scientist Workflow Journey - MyLab Platform

## 🎯 Overview: Analysis Batch Management & Results

This document outlines the complete journey a scientist takes when working with Analysis Batches and viewing results in MyLab.

---

## 📍 FLOW: Scientist Journey

### **Stage 1: Authentication (User Entry Point)**
```
🌐 Browser
   ↓
Login Page (/login)
   ├─ Email: scientist@lab.com
   ├─ Password: [entered]
   └─ Role: Scientist (automatically assigned based on workspace)
   ↓
✅ Dashboard (/)
```

---

### **Stage 2: Navigation to Analysis Batches**
```
Dashboard (/) - Home View
├─ Shows:
│  ├─ Quick Stats
│  │  ├─ Total Projects
│  │  ├─ Total Samples Tracked
│  │  ├─ Experimental Trials
│  │  └─ 📊 Analysis Batches [CARD CLICK]
│  └─ Recent Projects/Samples Overview
│
└─ Click: "Analysis Batches" tile
   OR navigate via menu → Batches
   ↓
/batches (Batches View)
```

---

## 📋 **Page Structure: Analysis Batches View (`/batches`)**

### What the Scientist Sees:

```
┌─────────────────────────────────────────────────────────────────┐
│ ANALYSIS BATCHES PAGE                                           │
│ Monitor grouped samples sent for analysis across different      │
│ labs and methods                                                │
│                                                                 │
│ 🔍 Search: "Search batches by ID or description..."           │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ BATCH CARD #1                              Status: Created  │ │
│ │ ┌────────────────────────────────────────────────────────┐ │ │
│ │ │ 📊 BATCH-TST001                                        │ │ │
│ │ │ Quality analysis for sample series A                   │ │ │
│ │ │                                                         │ │ │
│ │ │ ┌──────────────────────────────────────────────────┐  │ │ │
│ │ │ │  Samples: 5  │  Analyses: 3  │  Completed: 1   │  │ │ │
│ │ │ └──────────────────────────────────────────────────┘  │ │ │
│ │ │ ℹ️ 2 analysis(es) in progress                         │ │ │
│ │ │ 🔧 Execution: platform                               │ │ │
│ │ │ 📅 Created: 02/08/2026                   → Click here │ │ │
│ │ └────────────────────────────────────────────────────────┘ │ │
│ │                                                              │ │
│ │ [Same structure for other batches]                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key Information Displayed on Cards:
- **Batch ID** - Human-friendly identifier (e.g., BATCH-TST001)
- **Status Badge** - Color-coded: Created, Ready, Sent, In Progress, Completed
- **Description** - What the batch is for
- **Sample Count** - Number of samples in this batch
- **Analysis Count** - Total analyses run for this batch
- **Completed Count** - Number of completed analyses
- **In Progress Alert** - Shows if analyses are still running
- **Execution Mode** - Platform or External
- **Dates** - Creation date, sent date, completion date

---

## 🔍 **Interaction Flow: Clicking a Batch Card**

```
Batch Card Click
   ↓
Navigate to: /batches/{batchId}
   ↓
BATCH DETAIL VIEW LOADS
```

---

## 📊 **Stage 3: Batch Detail View (`/batches/:batchId`)**

### Page Structure:

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Back to Batches                                                │
│                                                                  │
│ 📊 BATCH-TST001                              Status: In Progress │
│ Quality analysis for sample series A                             │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ KEY METRICS                                                │  │
│ │                                                            │  │
│ │  Sample Count    Total Analyses    Completed   In Progress│  │
│ │      5              3                1            2        │  │
│ │   🧪                📊              ✅            ⏱️         │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌─ TABS ────────────────────────────────────────────────────┐   │
│ │ [Batch Details]  [Analyses (3)]  [Results]              │   │
│ └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

### **TAB 1: Batch Details**

```
┌───────────────────────────────────────────────────┐
│ BATCH INFORMATION                                 │
│                                                   │
│ Batch ID: BATCH-TST001                           │
│ Status: In Progress                              │
│ Execution Mode: Platform                         │
│ Created On: Feb 8, 2026, 2:45 PM                │
│                                                   │
│ Description:                                      │
│ Quality analysis for sample series A             │
│                                                   │
│ Sent On: Feb 8, 2026, 3:00 PM                   │
│                                                   │
│ Parameters:                                       │
│ {                                                │
│   "analysisType": "NMR",                         │
│   "priority": "high",                            │
│   "deadline": "2026-02-15"                       │
│ }                                                │
└───────────────────────────────────────────────────┘
```

---

### **TAB 2: Analyses (3)**

Shows all analyses associated with the batch:

```
┌─────────────────────────────────────────────────────┐
│ ✅ NMR Analysis #1                    Status: Done  │
│ Complete NMR spectroscopy analysis                 │
│ Performed by: Dr. Smith | 02/08/2026             │
│ [View Results]                                    │
│                                                   │
│ ⏱️ HPLC Analysis #2                Status: Running │
│ High-performance liquid chromatography             │
│ Performed by: Dr. Johnson | 02/08/2026           │
│                                                   │
│ ⏱️ GC-MS Analysis #3                Status: Running │
│ Gas chromatography-mass spectrometry               │
│ Performed by: Dr. Lee | 02/08/2026               │
└─────────────────────────────────────────────────────┘
```

---

### **TAB 3: Results**

Shows completed analysis results:

```
┌──────────────────────────────────────────────────────────┐
│ RESULTS SUMMARY                                          │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ ✅ NMR Analysis                                    │  │
│ │ Method: 1H-NMR, DMSO-d6, 400MHz                  │  │
│ │                                                    │  │
│ │ Results:                                           │  │
│ │ ┌─────────────────────────────────────────────┐  │  │
│ │ │ δ (ppm): 1.23 (3H, singlet, CH₃)           │  │  │
│ │ │ δ (ppm): 3.45 (2H, quartet, CH₂)           │  │  │
│ │ │ δ (ppm): 7.12-7.25 (5H, multiplet, Ar)     │  │  │
│ │ │ Integration ratios: 3:2:5 (expected)       │  │  │
│ │ │ Purity: 99.2% (excellent)                  │  │  │
│ │ └─────────────────────────────────────────────┘  │  │
│ │                                                    │  │
│ │ Conclusions:                                       │  │
│ │ Structure confirmed. Sample meets all specs.     │  │
│ │                                                    │  │
│ │ [View Full Report] ←─ Links to detailed report   │  │
│ └────────────────────────────────────────────────────┘  │
│ [Similar cards for other completed analyses]          │
└──────────────────────────────────────────────────────────┘
```

---

## 🎬 **Complete User Flow Diagram**

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCIENTIST WORKFLOW                           │
│                                                                 │
│  Step 1: LOGIN                                                  │
│  ┌──────────────────────┐                                       │
│  │  Login Page          │                                       │
│  │  scientist@lab.com   │                                       │
│  └──────────────────────┘                                       │
│           │                                                      │
│           ↓                                                      │
│  Step 2: NAVIGATE                                               │
│  ┌──────────────────────┐                                       │
│  │  Dashboard           │ ← View overview stats                 │
│  │  - Quick Stats       │                                       │
│  │  - Batches Tile      │                                       │
│  └──────────────────────┘                                       │
│           │                                                      │
│           ↓ Click "Analysis Batches"                            │
│  Step 3: VIEW BATCHES                                           │
│  ┌──────────────────────┐                                       │
│  │  /batches            │ ← See all batch cards                 │
│  │  - Search/Filter     │                                       │
│  │  - Sample counts     │                                       │
│  │  - Analysis counts   │                                       │
│  │  - Status indicators │                                       │
│  └──────────────────────┘                                       │
│           │                                                      │
│           ↓ Click a batch card                                  │
│  Step 4: VIEW BATCH DETAILS                                     │
│  ┌──────────────────────────────────────┐                       │
│  │  /batches/:batchId                   │                       │
│  │  ┌────────────────────────────────┐  │                       │
│  │  │ Key Metrics Dashboard          │  │                       │
│  │  │ - Sample count                 │  │                       │
│  │  │ - Total analyses               │  │                       │
│  │  │ - Completed vs running         │  │                       │
│  │  └────────────────────────────────┘  │                       │
│  │                                      │                       │
│  │  Three Tabs Available:               │                       │
│  │  [Batch Details] [Analyses] [Results]│                       │
│  │                                      │                       │
│  │  Can View:                           │                       │
│  │  - Batch metadata (creation, status) │                       │
│  │  - List of all analyses              │                       │
│  │  - Completed analysis results        │                       │
│  └──────────────────────────────────────┘                       │
│           │                                                      │
│           ↓ Click "View Full Report" on a result                │
│  Step 5: DETAILED ANALYSIS REPORT                               │
│  ┌──────────────────────────────────────┐                       │
│  │  /analyses/:analysisId/complete      │                       │
│  │  - Full analysis parameters          │                       │
│  │  - Complete results data             │                       │
│  │  - Conclusions & recommendations     │                       │
│  │  - Download options                  │                       │
│  └──────────────────────────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 **Key Features in Batch View**

### **For Each Batch Card:**
✅ See sample count at a glance  
✅ Monitor analysis progress (completed vs in-progress)  
✅ Know execution location (platform vs external)  
✅ View important dates (created, sent, completed)  
✅ One-click access to detailed information  

### **In Batch Detail View:**
✅ Complete batch lifecycle information  
✅ All associated analyses and their status  
✅ Completed results summary  
✅ Parameters and execution details  
✅ Quick navigation to full reports  

### **In Results Tab:**
✅ Quick summary of all completed analyses  
✅ Key findings and conclusions  
✅ Data preview (truncated for readability)  
✅ Link to full detailed reports  

---

## 📌 **Scientist Actions & Outcomes**

| Action | Page | Outcome |
|--------|------|---------|
| **Login** | /login | Enters dashboard |
| **View Batches** | /batches | Sees all batch cards with metrics |
| **Click Batch** | /batches/:id | Views detailed batch information |
| **Select Analysis Tab** | /batches/:id | Sees all analyses for the batch |
| **Select Results Tab** | /batches/:id | Sees completed analysis results |
| **Click "View Full Report"** | /analyses/:id/complete | Views detailed analysis report |
| **Download Results** | /analyses/:id/complete | Exports data/PDF |

---

## 🔄 **Status Progression**

A batch moves through these statuses:

```
Created (Initial)
   ↓
Ready (All samples included, ready to send)
   ↓
Sent (Sent to lab/analyzer)
   ↓
In Progress (Lab is working on it)
   ↓
Completed (All results uploaded)
```

Each analysis within a batch can have:
```
Pending → In Progress → Completed/Failed
```

---

## 💡 **Why This Flow?**

1. **Clear Hierarchy**: Batches group samples, analyses are within batches, results belong to analyses
2. **At-a-Glance Metrics**: Cards show sample/analysis counts without clicking
3. **Progressive Detail**: Dashboard → Batch List → Batch Detail → Full Report
4. **Efficient Monitoring**: See which analyses are done vs still running
5. **Easy Navigation**: Back buttons at each level

---

## 🔗 **Related Pages**

- **Dashboard** (`/`) - Overview and quick access
- **Samples View** (`/samples`) - Manage raw samples
- **Batches View** (`/batches`) - List all batches
- **Batch Detail** (`/batches/:batchId`) - NEW! Detailed batch view
- **Analyses View** (`/analyses`) - All analyses across all batches
- **Analysis Report** (`/analyses/:analysisId/complete`) - Full results

---

## ✨ **Summary**

A scientist's journey with Analysis Batches is now:
1. **Seamless** - Clear progression from list to detail to results
2. **Informative** - Key metrics visible at each level
3. **Actionable** - Can navigate through batches and access detailed reports
4. **Visual** - Status indicators, progress tracking, and organized layouts
