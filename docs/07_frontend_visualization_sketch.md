# Frontend Visualization Sketch

## **Resilion Enrichment Pre-Loader POC**

## 1. Overview

The enrichment POC requires a lightweight, user-friendly front-end to monitor, trigger, and visualize enrichment jobs. This document outlines the visual and functional design needed to support onboarding teams during POC validation and future enrichment expansion.

---

## 2. Objectives

- Show the user which enrichment steps are running
- Provide high-level status visibility across multiple enrichment passes
- Display extracted enrichment facts and their confidence scores
- Allow manual refresh or status polling
- Support review of evidence text for confidence validation

---

## 3. UI Features

**Job Trigger Panel**

- Input field for domain name (and optionally HQ location)
- “Start Enrichment” button
- Job queue indicator showing current/pending jobs

**Enrichment Workflow Visualization**

- Mermaid.js diagram showing:
    - Crawl
    - Chunk
    - Embed
    - Extract
    - Score
    - Persist
    - Finalize
- Color-coded node states:
    - pending: gray
    - running: blue
    - success: green
    - failed: red
- Status updates refreshed by polling or manual refresh

**Job Status Table**

- List of recent enrichment jobs
- Columns:
    - domain
    - job ID
    - status (pending, running, success, failed)
    - start time
    - end time
    - number of facts found

**Fact Viewer Panel**

- JSON preview of the enrichment facts
- ability to expand/collapse each fact
- color-coded confidence score indicator
    - high confidence (>0.85): green
    - medium confidence (0.5–0.85): yellow
    - low confidence (<0.5): red
- link to the evidence text snippet and source URL

**Error Panel**

- Shows job failures with reason
- ability to manually retry enrichment jobs

---

## 4. Interaction Flow

1. User enters domain name and clicks “Start Enrichment”
2. Enrichment agent starts running in the backend
3. Workflow visualization diagram updates node states in near real-time
4. When completed, the Fact Viewer shows all enrichment results
5. Users can validate evidence text and confidence levels
6. If the enrichment fails, the Error Panel provides retry options

---

## 5. Technology Choices

- **Next.js (React)** — consistent with Resilion’s stack
- **Mermaid.js** — simple workflow diagrams
- **TailwindCSS** — fast styling
- **React Table** — for tabular job data
- **Axios / SWR** — for polling or manual refresh
- **JSONViewer (React component)** — for formatted JSON enrichment facts

---

## 6. Wireframe Sketch (Textual)

```
[ Job Trigger Panel ]
------------------------------------------
| Domain: [ acme.com ]   [ Start Button ] |
------------------------------------------

[ Workflow Visualization Diagram (Mermaid) ]
------------------------------------------
crawl -> chunk -> embed -> extract -> score -> persist -> finalize
------------------------------------------

[ Job Status Table ]
------------------------------------------
| domain | job ID | status | start | end |
------------------------------------------

[ Fact Viewer Panel ]
------------------------------------------
| confidence | site name | city | evidence text | link |
------------------------------------------

[ Error Panel ]
------------------------------------------
| job ID | error reason | retry button |
------------------------------------------

```

---

## 7. Future Considerations

- Add drag-and-drop workflow editors if enrichment chains grow more complex
- Add advanced filtering of enrichment jobs
- Add real-time socket updates instead of polling
- Integrate user role-based permissions

---