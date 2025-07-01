# Resilion Enrichment Fact Viewer - Development Plan

This document outlines the engineering milestones for building the Resilion Enrichment Fact Viewer.

---

### **Milestone 1: Data Modeling & API Foundation**

*   **Status**: In Progress
*   **Timeline**: 1 Week
*   **Objective**: Establish the project structure, database schema, and basic API for the core `organization` data within the existing Next.js application.
*   **Deliverable Features**:
    *   **Data Structures**: Create TypeScript interfaces in `apps/web/lib/types/` that precisely match the hierarchical JSON data model (`Organization`, `Site`, `Evidence`, etc.).
    *   **API Route**: Create `apps/web/app/api/organization/[domain]/route.ts` to serve a valid, hardcoded mock JSON object for a single organization.
    *   **UI Components**: Set up the page at `apps/web/app/viewer/[domain]/page.tsx` to fetch and display the organization's top-level details in a `shadcn/Card`.
*   **Acceptance Criteria**:
    *   Navigating to `/viewer/stepan.com` displays the mock organization's details.
    *   TypeScript types enforce the data structure correctly.
    *   The basic page layout with placeholders is in place.
*   **Project Management**:
    *   **Branch**: `feature/M1-api-foundation`
    *   **Status Updates**: The status of this milestone will be updated from `Not Started` to `In Progress` upon commencement and to `Completed` upon meeting all acceptance criteria.
    *   **Final Commit**: All work will be committed with the message: `feat(viewer): complete M1 - data modeling and API foundation`.

---

### **Milestone 2: Interactive Map & Site Details**

*   **Status**: Not Started
*   **Timeline**: 1.5 Weeks
*   **Objective**: Implement the interactive map and the detailed site view card.
*   **Deliverable Features**:
    *   **Map Component**: Create a `SiteMap.tsx` component using React Leaflet that renders geocoded sites from the API, with pins styled by `siteType` and `operatingStatus`.
    *   **Site Detail Card**: Create a `SiteDetailCard.tsx` component, displayed in a `shadcn/Drawer` on pin click, showing comprehensive site details. Use `Accordion` for evidence lists.
*   **Acceptance Criteria**:
    *   The map correctly displays pins for all geocoded sites.
    *   Clicking a pin opens a drawer with the correct, detailed site information.
    *   The UI is responsive.
*   **Project Management**:
    *   **Branch**: `feature/M2-interactive-map`
    *   **Status Updates**: The status will be updated from `Not Started` to `In Progress` and then to `Completed`.
    *   **Final Commit**: All work will be committed with the message: `feat(viewer): complete M2 - interactive map and site details`.

---

### **Milestone 3: Data Table & Live Data Integration**

*   **Status**: Not Started
*   **Timeline**: 2 Weeks
*   **Objective**: Implement the filterable data table and switch the API from mock data to live data from the database.
*   **Deliverable Features**:
    *   **Data Table**: Create a `SitesDataTable.tsx` component using `tanstack/react-table` to display all sites, with client-side filtering and sorting.
    *   **API Enhancement**: Modify the `api/organization/[domain]/route.ts` to fetch and transform real data from the Postgres database into the required hierarchical JSON structure.
    *   **UI Integration**: Connect the map and data table to the live API data. Clicking a table row should interact with the map.
*   **Acceptance Criteria**:
    *   The viewer page displays live, enriched data from the database.
    *   The data table shows all sites and is filterable and sortable.
    *   The map and table are in sync.
*   **Project Management**:
    *   **Branch**: `feature/M3-live-data-integration`
    *   **Status Updates**: The status will be updated from `Not Started` to `In Progress` and then to `Completed`.
    *   **Final Commit**: All work will be committed with the message: `feat(viewer): complete M3 - data table and live data integration`.

---

### **Milestone 4: Job Status Visualization & Final Polish**

*   **Status**: Not Started
*   **Timeline**: 1 Week
*   **Objective**: Add the ability to view the status of enrichment jobs and polish the UI.
*   **Deliverable Features**:
    *   **Job Status Page**: Create a new page at `/jobs/[jobId]` to display job status.
    *   **Mermaid Diagrams**: Implement a component that renders a Mermaid diagram to visualize the enrichment workflow.
    *   **UI Polish**: Add loading states, error handling, and ensure a consistent, clean user experience.
    *   **Deployment**: Finalize the CI/CD pipeline for deployment to DigitalOcean.
*   **Acceptance Criteria**:
    *   A user can view the status of an enrichment job, including a visual workflow diagram.
    *   The application handles loading and error states gracefully.
    *   The project is successfully deployed and functional on DigitalOcean.
*   **Project Management**:
    *   **Branch**: `feature/M4-job-visualization`
    *   **Status Updates**: The status will be updated from `Not Started` to `In Progress` and then to `Completed`.
    *   **Final Commit**: All work will be committed with the message: `feat(viewer): complete M4 - job visualization and final polish`.
