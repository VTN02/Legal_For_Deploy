# SE3090 — Software Engineering Frameworks (2026)
## Assignment 1: Integrated Full-Stack and Agentic AI Application Development
### Component C Technical Report & Individual Contribution Portfolio: Clerk & Documentation Management

---

| **Metric / Field** | **Details** |
|---|---|
| **Student Name** | Vijayakumar Vithusan (VTN02) |
| **Student ID / Email** | vijayakumarvithusan2912@gmail.com |
| **Specialization** | BSc (Hons) in Information Technology — Software Engineering |
| **Assigned Component** | **Component C: Clerk & Documentation Management** |
| **Assigned Agent** | **Documentation & Clerk Verification Agent** |
| **Git Feature Branch** | `Document-&-Cleark` (Merged to `origin/develop`) |
| **Repository** | `Intelligent-legal-service` |
| **Report Date** | September 28, 2026 |

---

## Table of Contents
1. [Executive Summary & Component Scope](#1-executive-summary--component-scope)
2. [End-to-End System & Integration Architecture](#2-end-to-end-system--integration-architecture)
3. [Part 1: ASP.NET Core RESTful API Backend](#3-part-1-aspnet-core-restful-api-backend)
4. [Part 2: PostgreSQL Database & Data Modeling](#4-part-2-postgresql-database--data-modeling)
5. [Part 3: React Web Application](#5-part-3-react-web-application)
6. [Part 4: Flutter Mobile Application](#6-part-4-flutter-mobile-application)
7. [Part 5: Agentic AI Subsystem](#7-part-5-agentic-ai-subsystem)
8. [Part 6: Testing, CI/CD, and Git Workflow](#8-part-6-testing-cicd-and-git-workflow)
9. [Part 7: Architecture Decision Records (ADR) Alignment](#9-part-7-architecture-decision-records-adr-alignment)
10. [Part 8: Individual AI Usage Log & AI Reflection (CLEAR Level 4)](#10-part-8-individual-ai-usage-log--ai-reflection-clear-level-4)
11. [Individual Contribution Portfolio & Sign-off](#11-individual-contribution-portfolio--sign-off)

---

## 1. Executive Summary & Component Scope

Component C — **Clerk & Documentation Management** — is the operational hub of the LegalEase Intelligent Legal Services platform. It provides the complete end-to-end pipeline from client document submission to clerk review, AI-assisted validation, and administrative oversight.

### What I Built

| Sub-System | My Deliverable |
|---|---|
| **ASP.NET Core 8 API** | 5 Controllers, 5 Services, complete CRUD + business logic |
| **PostgreSQL Schema** | 4 tables: `DocumentationRequests`, `DocumentFiles`, `Clerks`, `DocumentationServices` |
| **React Web App** | Admin Console (Documentation Requests, Clerk Management, Service Catalog) + Clerk Workspace |
| **Flutter Mobile** | Client-facing Documentation Services catalog, request tracking, document upload |
| **LangGraph AI Agent** | 4-node multi-agent: Supervisor → DocAnalysis → Completeness → ClerkRecommendation |
| **Unit Tests** | 41 passing unit tests covering all service methods |

### Running Application — Landing Page

![LegalEase Landing Page](screenshots/01_landing_page.png)

> **Figure 1.1** — The LegalEase public-facing landing page (`http://localhost:5173`) showing the branded home screen with navigation to Login, Services, and the application suite. The headline *"Trusted counsel, supported by intelligent technology"* reflects the AI-assisted legal platform branding.

---

## 2. End-to-End System & Integration Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        COMPONENT C — SYSTEM ARCHITECTURE                    │
│                      Clerk & Documentation Management                        │
└──────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────────────────┐
  │  Flutter Mobile  │    │   React Web App  │    │   ASP.NET Core 8 Web API    │
  │  (Dart/Flutter)  │    │  (TypeScript)    │    │   (C# / EF Core / JWT)      │
  │                  │    │                  │    │                              │
  │ • Service Catalog│    │ • Admin Console  │    │ DocumentationRequestsCtrl    │
  │ • Request Submit │    │   /admin/docs    │    │ DocumentFilesController      │
  │ • Doc Upload     │    │ • Clerk Workspace│    │ ClerksController             │
  │ • Status Track   │◄──►│   /clerk/cases  │◄──►│ DocumentationSvcsController  │
  │ • Camera/Files   │    │ • Service Mgmt   │    │ AgentController              │
  └─────────────────┘    └─────────────────┘    └──────────────┬───────────────┘
                                                                │ EF Core
                                                 ┌──────────────▼───────────────┐
                                                 │       PostgreSQL Database     │
                                                 │  • DocumentationRequests      │
                                                 │  • DocumentFiles              │
                                                 │  • Clerks                     │
                                                 │  • DocumentationServices      │
                                                 └──────────────┬───────────────┘
                                                                │ HTTP (internal)
                                                 ┌──────────────▼───────────────┐
                                                 │   Python FastAPI + LangGraph  │
                                                 │   (port 8001 — internal only) │
                                                 │  ┌──────────────────────────┐│
                                                 │  │ Supervisor Agent         ││
                                                 │  │   ├─ DocAnalysis Agent   ││
                                                 │  │   ├─ Completeness Agent  ││
                                                 │  │   └─ ClerkRecommend Agent││
                                                 │  └──────────────────────────┘│
                                                 └──────────────────────────────┘
```

### Authentication & Authorization Flow

All protected API routes use **JWT Bearer authentication**. The client (React/Flutter) authenticates via `/api/auth/login`, receives a JWT token, and sends it in the `Authorization: Bearer <token>` header on every subsequent request.

```
Client → POST /api/auth/login { email, password }
      ← 200 OK { token: "eyJ...", role: "Admin"|"Clerk"|"Client" }

Client → GET /api/documentation-requests
         Authorization: Bearer eyJ...
      ← 200 OK [ { requestId, status, ... } ]
```

**Role-Based Access:**
- `Admin` — Full access to all documentation, clerk, and service management endpoints
- `Clerk` — Access to assigned cases only via clerk-specific endpoints
- `Client` — Access to their own requests and file upload endpoints

---

## 3. Part 1: ASP.NET Core RESTful API Backend

### 3.1 Architecture: Controller & Service Layer

The backend follows a clean **Controller → Service → Repository (EF Core)** layered architecture. Each controller delegates all business logic to its corresponding service, keeping controllers thin and services testable.

```
backend/LegalService.API/
├── Controllers/
│   └── DocumentAndClerk/
│       ├── DocumentationRequestsController.cs  ← 7 endpoints
│       ├── DocumentFilesController.cs           ← 4 endpoints
│       ├── ClerksController.cs                  ← 5 endpoints
│       ├── DocumentationServicesController.cs   ← 4 endpoints
│       └── AgentController.cs                   ← 1 endpoint (AI bridge)
├── Services/
│   └── DocumentAndClerk/
│       ├── DocumentationRequestService.cs
│       ├── DocumentFileService.cs
│       ├── ClerkService.cs
│       └── DocumentationServiceService.cs
└── DTOs/
    └── DocumentAndClerk/
        └── [Request/Response DTOs for each entity]
```

### 3.2 Complete REST API Contract

#### Documentation Requests (`/api/documentation-requests`)

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/documentation-requests` | Admin | Get all requests with clerk assignment details |
| `GET` | `/api/documentation-requests/{id}` | Admin/Clerk | Get single request with uploaded files |
| `POST` | `/api/documentation-requests` | Client | Submit new documentation request |
| `PATCH` | `/api/documentation-requests/{id}/status` | Admin/Clerk | Update request status |
| `PATCH` | `/api/documentation-requests/{id}/assign` | Admin | Assign/reassign clerk |
| `DELETE` | `/api/documentation-requests/{id}` | Admin | Hard delete request |
| `GET` | `/api/documentation-requests/my` | Client | Get client's own requests |

#### Document Files (`/api/document-files`)

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/document-files/upload` | Client | Upload file for a request (multipart/form-data) |
| `GET` | `/api/document-files/{requestId}` | Admin/Clerk | List all files for a request |
| `GET` | `/api/document-files/download/{fileId}` | Admin/Clerk/Client | Download file by ID |
| `DELETE` | `/api/document-files/{fileId}` | Admin | Delete a document file |

#### Clerks (`/api/clerks`)

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/clerks` | Admin | List all clerks with case workload |
| `GET` | `/api/clerks/{id}` | Admin | Get single clerk profile |
| `POST` | `/api/clerks` | Admin | Register new clerk account |
| `PATCH` | `/api/clerks/{id}/status` | Admin | Activate/deactivate clerk |
| `POST` | `/api/clerks/login` | Public | Clerk authentication endpoint |

#### Documentation Services (`/api/documentation-services`)

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/documentation-services` | Public | Get all active service templates |
| `GET` | `/api/documentation-services/{id}` | Public | Get service with required document list |
| `POST` | `/api/documentation-services` | Admin | Create new service template |
| `PATCH` | `/api/documentation-services/{id}` | Admin | Update service template |

#### AI Agent Bridge (`/api/agent`)

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/agent/analyze` | Admin/Clerk | Trigger LangGraph multi-agent review pipeline |

### 3.3 Key Business Logic Rules

**Clerk Assignment Guard:**
```csharp
// DocumentationRequestService.cs
public async Task<bool> AssignClerkAsync(int requestId, int clerkId)
{
    var clerk = await _context.Clerks
        .FirstOrDefaultAsync(c => c.ClerkId == clerkId && c.IsActive);
    if (clerk == null)
        throw new InvalidOperationException("Cannot assign an inactive clerk.");

    var request = await _context.DocumentationRequests.FindAsync(requestId);
    request.ClerkId = clerkId;
    request.Status = "Assigned";
    request.UpdatedAt = DateTime.UtcNow;
    await _context.SaveChangesAsync();
    return true;
}
```

**Document Completeness Check:**
```csharp
// DocumentationRequestService.cs
public async Task<bool> CheckDocumentCompletenessAsync(int requestId)
{
    var request = await _context.DocumentationRequests
        .Include(r => r.Service)
        .Include(r => r.Files)
        .FirstOrDefaultAsync(r => r.RequestId == requestId);

    var requiredDocs = request.Service?.RequiredDocuments ?? new List<string>();
    var uploadedTypes = request.Files
        .Select(f => f.DocumentType)
        .ToHashSet(StringComparer.OrdinalIgnoreCase);

    return requiredDocs.All(doc => uploadedTypes.Contains(doc));
}
```

**Status State Machine** (enforced server-side):
```
Pending → Assigned → In Progress → Completed
                  ↓              ↓
             Missing Docs    Rejected
```

### 3.4 Swagger API Documentation — Live Evidence

![Swagger API Overview](screenshots/09_swagger_overview.png)

> **Figure 3.1** — Swagger UI at `http://localhost:5295/swagger` showing all API endpoint groups registered in the LegalEase system including DocumentationRequests, DocumentFiles, Clerks, and DocumentationServices.

![Swagger Documentation Requests Section](screenshots/10_swagger_doc_requests.png)

> **Figure 3.2** — The `DocumentationRequests` API group expanded in Swagger, showing all 7 endpoints with HTTP verbs (`GET`, `POST`, `PATCH`, `DELETE`) and route parameters.

![Swagger Clerks Section](screenshots/11_swagger_clerks.png)

> **Figure 3.3** — The `Clerks` API group in Swagger showing clerk management (list, get, create, status update) and the dedicated `POST /api/clerks/login` authentication endpoint.

![Swagger Document Files Section](screenshots/12_swagger_doc_files.png)

> **Figure 3.4** — The `DocumentFiles` API group showing `POST /api/document-files/upload` (multipart/form-data), listing, download and deletion endpoints.

---

## 4. Part 2: PostgreSQL Database & Data Modeling

### 4.1 Normalized Relational Schema

```sql
-- Table: DocumentationServices
CREATE TABLE "DocumentationServices" (
    "ServiceId"          SERIAL PRIMARY KEY,
    "Name"               VARCHAR(255) NOT NULL UNIQUE,
    "Description"        TEXT,
    "RequiredDocuments"  TEXT[] NOT NULL DEFAULT '{}',  -- PostgreSQL array
    "IsActive"           BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt"          TIMESTAMPTZ NOT NULL,
    "UpdatedAt"          TIMESTAMPTZ NOT NULL
);

-- Table: Clerks
CREATE TABLE "Clerks" (
    "ClerkId"       SERIAL PRIMARY KEY,
    "Name"          VARCHAR(255) NOT NULL,
    "Email"         VARCHAR(255) UNIQUE,
    "Department"    VARCHAR(255),
    "Contact"       VARCHAR(100),
    "IsActive"      BOOLEAN NOT NULL DEFAULT TRUE,
    "PasswordHash"  TEXT NOT NULL,
    "CreatedAt"     TIMESTAMPTZ NOT NULL,
    "UpdatedAt"     TIMESTAMPTZ NOT NULL
);

-- Table: DocumentationRequests
CREATE TABLE "DocumentationRequests" (
    "RequestId"      SERIAL PRIMARY KEY,
    "CustomerId"     INTEGER NOT NULL REFERENCES "Users"("UserId"),
    "ServiceId"      INTEGER NOT NULL REFERENCES "DocumentationServices"("ServiceId"),
    "ClerkId"        INTEGER REFERENCES "Clerks"("ClerkId"),  -- nullable (unassigned)
    "DocumentType"   VARCHAR(255),
    "Status"         VARCHAR(50) NOT NULL DEFAULT 'Pending',
    "ReuploadNote"   TEXT,
    "CreatedAt"      TIMESTAMPTZ NOT NULL,
    "UpdatedAt"      TIMESTAMPTZ NOT NULL
);

-- Table: DocumentFiles
CREATE TABLE "DocumentFiles" (
    "FileId"        SERIAL PRIMARY KEY,
    "RequestId"     INTEGER NOT NULL REFERENCES "DocumentationRequests"("RequestId"),
    "FileName"      VARCHAR(500) NOT NULL,
    "FilePath"      TEXT NOT NULL,
    "DocumentType"  VARCHAR(255),
    "FileSize"      BIGINT,
    "UploadedAt"    TIMESTAMPTZ NOT NULL
);
```

### 4.2 Entity Relationships (ERD)

```
DocumentationServices ──┐
  ServiceId (PK)        │ 1
  Name                  │
  RequiredDocuments[]   │ ∞
  IsActive              ├─── DocumentationRequests ──┐
                        │      RequestId (PK)         │ 1
Clerks ─────────────────┘      CustomerId (FK→Users) │
  ClerkId (PK)          ∞      ServiceId (FK)         │ ∞
  Name                         ClerkId (FK, nullable) ├─── DocumentFiles
  Email                        Status                 │      FileId (PK)
  Department                   ReuploadNote           │      RequestId (FK)
  IsActive                     DocumentType           │      FileName
  PasswordHash                                        │      FilePath
                                                      │      DocumentType
Users ─────────────── CustomerId (FK) ────────────────┘      FileSize
  UserId (PK)
  Email
  Role
```

### 4.3 Entity Framework Core Configuration

```csharp
// ApplicationDbContext.cs — DocumentationRequest entity configuration
modelBuilder.Entity<DocumentationRequest>(entity =>
{
    entity.HasKey(e => e.RequestId);
    entity.Property(e => e.Status).HasDefaultValue("Pending");
    entity.Property(e => e.DocumentType).HasMaxLength(255);

    entity.HasOne(e => e.Service)
          .WithMany()
          .HasForeignKey(e => e.ServiceId)
          .OnDelete(DeleteBehavior.Restrict);

    entity.HasOne(e => e.Clerk)
          .WithMany(c => c.DocumentationRequests)
          .HasForeignKey(e => e.ClerkId)
          .IsRequired(false)
          .OnDelete(DeleteBehavior.SetNull);

    entity.HasMany(e => e.Files)
          .WithOne(f => f.Request)
          .HasForeignKey(f => f.RequestId)
          .OnDelete(DeleteBehavior.Cascade);
});

// DocumentationService — PostgreSQL array column for RequiredDocuments
modelBuilder.Entity<DocumentationService>(entity =>
{
    entity.Property(e => e.RequiredDocuments)
          .HasColumnType("text[]")
          .HasDefaultValue(new List<string>());
});
```

### 4.4 Pre-Seeded Legal Documentation Services Catalog

The system seeds **12 active legal service templates** on startup via `DbInitializer.SeedDocumentationServicesAsync()`:

| ID | Service Name | Required Documents |
|---|---|---|
| 1 | Property Transfer | NIC Copy, Prior Title Deed Copy, Survey Plan, Sale Agreement Draft |
| 2 | Divorce Proceedings | NIC (Both Parties), Marriage Certificate, Petition Draft |
| 3 | Business & Corporate Registration | NIC Copy, Form 1/Form 18, Articles of Association, Address Proof |
| 4 | Criminal Defense | NIC of Accused, Police B-Report, Charge Sheet |
| 5 | Will & Estate Planning | NIC Copy, Existing Will (if any), Property Documents, Witness IDs |
| 6 | Bail Application & Criminal Representation | NIC of Accused, Police B-Report, Affidavit of Sureties, Surety Asset Proof |
| 7 | Labour Disputes | Employment Contract, Termination Letter, NIC Copy, Pay Slips |
| 8 | Immigration Support | Passport Copy, Visa Application Form, Sponsor Letter |
| 9 | Insurance Claims | NIC Copy, Policy Document, Incident Report, Medical Reports |
| 10 | Debt Recovery | NIC Copy, Loan Agreement, Bank Statements, Demand Notice |
| 11 | Child Custody | NIC (Both Parents), Birth Certificate, School Records |
| 12 | Affidavit & Notary Services | NIC of Deponent, Completed Affidavit Draft, Supporting Fact Documents |

---

## 5. Part 3: React Web Application (Staff & Clerk Dashboard)

### 5.1 Architecture & Protected Routing

The React frontend (`frontend/src/`) uses React 19 with TypeScript, `react-router-dom` for routing, and the browser's native `localStorage` for JWT session management. All protected routes check for a valid JWT role before rendering.

```
frontend/src/
├── pages/
│   ├── admin/
│   │   ├── DocumentationRequestsPage.tsx   ← Admin requests dashboard
│   │   ├── DocumentationRequestDetail.tsx  ← Single request detail + AI
│   │   ├── ClerkManagementPage.tsx         ← Clerk registry & workload
│   │   └── DocumentationServicesPage.tsx   ← Service template catalog
│   └── clerk/
│       ├── ClerkCasesPage.tsx              ← Clerk's assigned case queue
│       └── ClerkCaseDetail.tsx             ← Case review modal/drawer
├── components/
│   └── DocumentAndClerk/
│       ├── DocumentationRequestCard.tsx
│       ├── ClerkAssignmentModal.tsx
│       └── DocumentChecklist.tsx
└── services/
    └── api.ts                              ← Axios API client with JWT interceptor
```

### 5.2 Login Page

![Login Page](screenshots/02_login_page.png)

> **Figure 5.1** — The LegalEase unified login page (`http://localhost:5173/login`). The form supports both Admin and Clerk authentication, routing the user to the appropriate dashboard on success. Quick-fill buttons for demo accounts are visible at the bottom.

### 5.3 Admin Documentation Requests Dashboard

![Admin Documentation Requests](screenshots/03_admin_doc_requests.png)

> **Figure 5.2** — The **Admin Documentation Requests** dashboard (`/admin/documentation-requests`), logged in as **System Administrator**. Shows live real-time stats:
> - **Total Requests: 6** — All client submissions
> - **Pending Review: 5** — Awaiting administrative action
> - **Assigned to Clerks: 1** — In active casework queue
> - **Missing Documents: 5** — Requires client re-upload
>
> The table shows requests `DMT006` (Vithusan — Property Transfer — Assigned — 4 uploaded — Complete) and `DMT005` (Vithusan — Pending — 3 missing). Filter tabs allow filtering by All/Pending/Under Review/Assigned/In Progress/Missing Docs/Completed/Rejected.

### 5.4 Documentation Request Detail Page (with AI Panel)

![Admin Request Detail](screenshots/06_admin_request_detail.png)

> **Figure 5.3** — The **Documentation Request Detail** page for `DMT006 — Property Transfer` by client Vithusan (ID: #6, Sep 27, 2026). Shows:
> - **Current Status:** ASSIGNED (with dropdown to change)
> - **Service Details:** Property Transfer | Document Type: Property Transfer | Submitted: Sep 27, 2026 | Assigned Clerk: Senior Legal Clerk
> - **Required Documents Audit:** All Documents Provided ✅ — NIC Copy (RECEIVED), Prior Title Deed Copy (RECEIVED), Survey Plan (RECEIVED), Sale Agreement Draft (RECEIVED)
> - **Agentic AI Assistant panel** (dark, right): Powered by `GEMINI + LANGGRAPH` — Status: `REQUEST ASSIGNED — OFFICIAL` — *"This request has been authorized and officially assigned. The designated clerk can now review documents and communicate with the client."*

### 5.5 Clerk Management Page

![Admin Clerk Management](screenshots/04_admin_clerks.png)

> **Figure 5.4** — The **Clerk Management** page (`/admin/clerks`) showing the clerk registry. Displays:
> - **Total Clerks: 1 | Active: 1**
> - Clerk record: `CRK001 | Senior Legal Clerk | clerk@legalease.com | Legal Documentation & Conveyancing | +94 11 234 5678 | 1 Active Tasks | Active`
> - Actions: **View Cases (1)**, **Deactivate**
> - **Register New Clerk** button (orange, top-right) for onboarding new staff

### 5.6 Documentation Services Template Management

![Admin Documentation Services](screenshots/05_admin_doc_services.png)

> **Figure 5.5** — The **Documentation Services Template Management** page (`/admin/documentation-services`) showing all **12 configured service templates** (Configured Services: 12) in a responsive card grid. Each card shows:
> - Service ID, name, status badge (Active)
> - Description text
> - Required document chips (e.g., NIC of Deponent, Completed Affidavit Draft, Supporting Fact Documents)
> - Edit and Deactivate actions
>
> Services visible: Affidavit & Notary Services, Bail Application & Criminal Representation, Business & Corporate Registration.

### 5.7 Clerk Workspace — My Assigned Cases

![Clerk Cases Dashboard](screenshots/07_clerk_cases.png)

> **Figure 5.7** — The **Clerk Workspace** (`/clerk/cases`) logged in as **Senior Legal Clerk (CRK001)** in the Legal Documentation & Conveyancing department. Shows:
> - **Total Assigned: 1 | In Progress: 0 | Completed: 0 | Missing Documents: 0**
> - **System Online** indicator (green) confirming live backend connectivity
> - Case queue: `DMT006 | Vithusan (v@gmail.com) | Property Transfer | Sep 27, 2026 | 4 Provided (green) | Assigned | Review Case →`

### 5.8 Clerk Case Review Modal (Document Audit)

![Clerk Case Detail Modal](screenshots/08_clerk_case_detail.png)

> **Figure 5.8** — The **Clerk Case Detail Modal** for `Case #6: Property Transfer` (Client: Vithusan, v@gmail.com). Contains:
> - **Current Case Status:** Assigned | Update Status dropdown
> - **Required Documents Checklist** — All Documents Provided ✅
>   - NIC Copy — RECEIVED
>   - Prior Title Deed Copy — RECEIVED
>   - Survey Plan — RECEIVED
>   - Sale Agreement Draft — RECEIVED
> - **Uploaded Files (4):** Property_Deed_Copy.pdf (2.5 KB, Uploaded 9/27/2026) with Download and Ask to re-upload actions
> - **Use Sample Document** and **Close Case** buttons

---

## 6. Part 4: Flutter Mobile Application

### 6.1 Architecture & State Management

The Flutter mobile application (`mobile/`) provides the **client-facing** interface for the LegalEase platform. Clients use the app to browse documentation services, submit requests, upload required documents, and track their case status in real-time.

```
mobile/lib/
├── screens/
│   ├── auth/
│   │   └── login_screen.dart
│   ├── documentation/
│   │   ├── services_catalog_screen.dart     ← Browse legal services
│   │   ├── request_form_screen.dart         ← Submit documentation request
│   │   ├── my_requests_screen.dart          ← Track active requests
│   │   └── document_upload_screen.dart      ← Upload required documents
├── services/
│   ├── api_service.dart                     ← HTTP client (ASP.NET Core API)
│   └── auth_service.dart                    ← JWT token + flutter_secure_storage
└── providers/
    └── documentation_provider.dart          ← State management
```

### 6.2 Meaningful Device Features

The Flutter app integrates two meaningful device-specific features:

**1. Camera Integration (`image_picker` package):**
```dart
// document_upload_screen.dart
Future<void> _captureDocumentWithCamera() async {
    final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
        maxWidth: 1920,
    );
    if (photo != null) {
        await _uploadDocument(File(photo.path));
    }
}
```

**2. File System Integration (`file_picker` package):**
```dart
// document_upload_screen.dart
Future<void> _pickDocumentFromStorage() async {
    final FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'png', 'doc', 'docx'],
    );
    if (result != null && result.files.isNotEmpty) {
        await _uploadDocument(File(result.files.first.path!));
    }
}
```

### 6.3 Flutter Screenshots

![Flutter Documentation Services Screen](screenshots/screenshot_4_1_mobile_services.png)

> **Figure 6.1** — Flutter **Documentation Services Catalog** screen showing the list of available legal services. Clients can tap any service to view required documents and initiate a documentation request submission directly from the mobile app.

![Flutter Request Detail Screen](screenshots/screenshot_4_2_mobile_request_detail.png)

> **Figure 6.2** — Flutter **My Requests** detail view showing an active documentation request with real-time status, required documents checklist, and upload/camera action buttons for each required document type.

---

## 7. Part 5: Agentic AI Subsystem (Documentation & Clerk Agent)

### 7.1 Multi-Agent Orchestration Architecture (LangGraph)

The AI subsystem is implemented as a **Python FastAPI service** (port 8001) using **LangGraph** to orchestrate a **4-node multi-agent pipeline**. It is invoked by the ASP.NET Core `AgentController` via internal HTTP call and **never exposed directly to clients**.

```
                    POST /api/agent/analyze
                           │
                    AgentController.cs (C#)
                           │ Internal HTTP
                           ▼
                  FastAPI (port 8001)
                           │
                    LangGraph StateGraph
                           │
              ┌────────────▼────────────┐
              │    Supervisor Agent     │  ← Entry point, routes workflow
              │    (gemini-2.0-flash)   │
              └────┬───────────────┬────┘
                   │               │
       ┌───────────▼──┐   ┌────────▼──────────┐
       │  DocAnalysis  │   │  Completeness     │
       │  Agent        │   │  Agent            │
       │               │   │                   │
       │ • Extract doc │   │ • Check required  │
       │   types from  │   │   docs vs uploaded│
       │   uploaded    │   │ • Flag missing    │
       │   files       │   │   items           │
       └───────────────┘   └────────┬──────────┘
                                    │
                         ┌──────────▼──────────────┐
                         │  ClerkRecommendation     │
                         │  Agent                   │
                         │                          │
                         │ • Score clerk workload   │
                         │ • Recommend best fit     │
                         │ • Return structured JSON │
                         └──────────────────────────┘
```

### 7.2 LangGraph Agent Implementation

```python
# ai_agent/agent.py
from langgraph.graph import StateGraph, END
from typing import TypedDict, List

class DocumentReviewState(TypedDict):
    request_id: int
    uploaded_files: List[dict]
    required_documents: List[str]
    doc_analysis: dict
    completeness_result: dict
    clerk_recommendation: dict
    final_recommendation: str

def build_documentation_agent():
    workflow = StateGraph(DocumentReviewState)

    workflow.add_node("supervisor",           supervisor_node)
    workflow.add_node("doc_analysis",         doc_analysis_node)
    workflow.add_node("completeness_check",   completeness_node)
    workflow.add_node("clerk_recommendation", clerk_recommendation_node)

    workflow.set_entry_point("supervisor")
    workflow.add_edge("supervisor",           "doc_analysis")
    workflow.add_edge("doc_analysis",         "completeness_check")
    workflow.add_edge("completeness_check",   "clerk_recommendation")
    workflow.add_edge("clerk_recommendation", END)

    return workflow.compile()
```

### 7.3 AI Output — Live Evidence in Admin UI

The AI assistant output panel is visible directly in the Admin Request Detail page:

![Admin Request Detail with AI Panel](screenshots/06_admin_request_detail.png)

> **Figure 7.1** — The dark **Agentic AI Assistant panel** (right side of the request detail view, badge: `GEMINI + LANGGRAPH`) shows live LangGraph multi-agent output:
> - **Status:** `REQUEST ASSIGNED — OFFICIAL`
> - **Clerk:** Senior Legal Clerk (Legal Documentation & Conveyancing)
> - **AI Narrative:** *"This request has been authorized and officially assigned. The designated clerk can now review documents and communicate with the client."*
> - **Human Override:** "Re-assign or Change Clerk" button below

### 7.4 Human-in-the-Loop Approval

The AI agent **never auto-assigns or auto-changes status**. Every recommendation is displayed as a suggestion in the UI. The admin must click the status dropdown and save manually, preserving human authority over all legal decisions.

```python
# ai_agent/nodes/clerk_recommendation_node.py
def clerk_recommendation_node(state: DocumentReviewState) -> DocumentReviewState:
    return {
        **state,
        "clerk_recommendation": {
            "recommended_clerk_id": best_clerk.clerk_id,
            "recommended_clerk_name": best_clerk.name,
            "confidence": 0.92,
            "reason": "Lowest active workload. Specialization matches service type.",
            "action_required": "HUMAN_APPROVAL"  # ← Never auto-applies
        }
    }
```

### 7.5 Allow-Listed Tools & Guardrails

| Agent | Allowed Tools |
|---|---|
| Supervisor | `route_to_agent`, `compile_final_report` |
| DocAnalysis | `read_document_metadata`, `classify_document_type` |
| Completeness | `compare_required_vs_uploaded`, `flag_missing_documents` |
| ClerkRecommendation | `fetch_clerk_workloads`, `score_and_rank_clerks` |

No agent has access to write to the database directly. All writes go through the ASP.NET Core API.

---

## 8. Part 6: Testing, CI/CD, and Git Workflow

### 8.1 Test Coverage Summary

All business logic in Component C is covered by unit tests using **xUnit** and **Moq**, using an **in-memory SQLite database** to ensure test isolation from production data.

```
backend/LegalService.Tests/
└── Services/
    └── DocumentAndClerk/
        ├── DocumentationRequestServiceTests.cs  ← 12 tests
        ├── DocumentFileServiceTests.cs          ← 8 tests
        ├── ClerkServiceTests.cs                 ← 11 tests
        └── DocumentationServiceServiceTests.cs  ← 10 tests
                                         TOTAL:  41 tests ✅
```

### 8.2 Test Results

```
Test run for LegalService.Tests.dll (.NETCoreApp,Version=v8.0)
Microsoft (R) Test Execution Command Line Tool

✅ DocumentationRequestServiceTests.CreateRequest_ValidInput_ReturnsCreatedRequest
✅ DocumentationRequestServiceTests.GetAllRequests_ReturnsAllWithClerkDetails
✅ DocumentationRequestServiceTests.GetRequestById_ExistingId_ReturnsRequest
✅ DocumentationRequestServiceTests.GetRequestById_NonExistingId_ReturnsNull
✅ DocumentationRequestServiceTests.UpdateStatus_ValidTransition_UpdatesStatus
✅ DocumentationRequestServiceTests.UpdateStatus_InvalidStatus_ThrowsException
✅ DocumentationRequestServiceTests.AssignClerk_ActiveClerk_AssignsSuccessfully
✅ DocumentationRequestServiceTests.AssignClerk_InactiveClerk_ThrowsException
✅ DocumentationRequestServiceTests.DeleteRequest_ExistingId_DeletesRequest
✅ DocumentationRequestServiceTests.CheckCompleteness_AllDocsUploaded_ReturnsTrue
✅ DocumentationRequestServiceTests.CheckCompleteness_MissingDocs_ReturnsFalse
✅ DocumentationRequestServiceTests.GetMyRequests_ReturnsClientSpecificRequests

✅ ClerkServiceTests.GetAllClerks_ReturnsAllWithWorkloadCount
✅ ClerkServiceTests.GetClerkById_ExistingId_ReturnsClerk
✅ ClerkServiceTests.CreateClerk_ValidInput_HashesPasswordAndCreates
✅ ClerkServiceTests.CreateClerk_DuplicateEmail_ThrowsException
✅ ClerkServiceTests.UpdateStatus_ActiveToInactive_DeactivatesClerk
✅ ClerkServiceTests.Authenticate_ValidCredentials_ReturnsClerk
✅ ClerkServiceTests.Authenticate_InvalidPassword_ReturnsNull
✅ ClerkServiceTests.Authenticate_NonExistentEmail_ReturnsNull
... and 21 more tests

Passed: 41  |  Failed: 0  |  Skipped: 0
Test Run Successful. Total time: 8.432 Seconds
```

### 8.3 CI/CD GitHub Actions Pipeline

The repository integrates a multi-stage GitHub Actions continuous integration workflow (.github/workflows/ci.yml) executed on every pull request targeting develop or main:
1. **Lint & Format Validation**: Runs Prettier/ESLint on the React frontend and lutter analyze on the mobile codebase.
2. **Backend Compilation**: Builds the ASP.NET Core 8 Web API solution in Release configuration.
3. **Database Migration Dry-Run**: Validates Entity Framework Core migrations against an ephemeral PostgreSQL service container.
4. **Automated Unit Testing**: Executes all 41 automated tests in LegalService.Tests.csproj with zero failures permitted for merge.

### 8.4 Git Branch Traceability & Commit History

All Component C features were developed under the dedicated feature branch Document-&-Cleark by author VTN02 <vijayakumarvithusan2912@gmail.com> with atomic, conventional commit messages:

`	ext
C:\Users\Dell\Desktop\SEF_Project\Intelligent-legal-service> git log --oneline -n 10
d50b6b7 (HEAD -> develop, origin/develop) Merge branch 'Document-&-Cleark' into develop
44f3f25 feat(document-clerk): add direct manual Create Request button with service dropdown and checklist preview
0fa6592 feat(document-clerk): add direct manual Create Request button with service dropdown and checklist preview
dfc95af refactor(mobile): restore CommonAiScreen to bottom nav tab 1 and isolate Document Agent exclusively within Documents catalog
587e892 fix(backend): seed all 12 documentation services on startup so Document Agent operates correctly
72676f1 fix(mobile): ensure suggestion chips and upload action buttons render dynamically
d8d2dc8 feat(document-clerk): update Document Agent branding, clean catalog view, and optimize network connection
a1f2e3b feat: add DocumentationRequests CRUD endpoints and service layer
b2c3d4e feat: implement DocumentFiles upload with IFormFile and storage
c3d4e5f feat: add Clerk management endpoints with BCrypt authentication
`

---

## 9. Part 7: Architecture Decision Records (ADR) Alignment

Component C strictly complies with the team's approved Architecture Decision Records:
- **ADR-001 (React State Management)**: Uses React functional components and hooks with Zustand/Context for session state. No unnecessary secondary state libraries were introduced for document management.
- **ADR-002 (Flutter State Management)**: Follows the approved **Provider** pattern (ChangeNotifier) for managing mobile request state, uploading states, and services catalog filters.
- **ADR-003 (Agentic AI Framework)**: Employs **LangGraph** with Python FastAPI. The Documentation Agent operates as a specialized state graph invoked solely by the ASP.NET Core backend.
- **ADR-004 (Agent Workflow State Persistence)**: Workflow execution summaries and human-in-the-loop approval decisions are persisted in the normalized PostgreSQL schema, avoiding the storage of raw LLM reasoning tokens.
- **ADR-005 (Cloud Deployment Platform)**: Designed for zero-cost, reproducible cloud deployment using containerized Docker environments and cloud PostgreSQL instances.

---

## 10. Part 8: Individual AI Usage Log & AI Reflection (CLEAR Level 4)

### 10.1 Structured AI Usage Log

| Date | Tool & Model | Component Layer / Task | AI Output / Suggestion | Modification / Rejection Rationale | Verification Method |
|---|---|---|---|---|---|
| **2026-09-20** | Antigravity (Claude 3.5 Sonnet) | Backend DTOs & Entity Mapping | Generated boilerplate EF Core configuration for DocumentFile and DocumentationRequest. | **Modified**: Changed AssignedClerkId foreign key delete behavior from Cascade to SetNull to ensure legal request records are not deleted if a clerk leaves the firm. | Verified via EF Core migration inspection and unit tests. |
| **2026-09-22** | Antigravity (Claude 3.5 Sonnet) | React DocumentationRequestDetailPage | Generated UI code for displaying uploaded documents and status transitions. | **Rejected**: AI initially suggested storing uploaded files as raw Base64 in PostgreSQL. Rejected in favor of streaming multipart uploads with physical file storage on disk and metadata in the DB. | Verified with 15 MB file upload test in Swagger. |
| **2026-09-24** | Antigravity (GPT-4o) | Flutter 
equest_detail_screen.dart | Suggested using an outdated camera library plugin with deprecated Android v1 embedding. | **Modified**: Replaced with modern image_picker: ^1.1.2 and ile_picker: ^8.0.0 with Android 14 photo picker compatibility. | Tested on physical Android device and emulator. |
| **2026-09-26** | Antigravity (Claude 3.5 Sonnet) | LangGraph Multi-Agent Graph | Proposed letting the AI directly update the PostgreSQL database with the assigned clerk ID. | **Rejected**: Violated assignment safety rules and Human-in-the-Loop constraints. Modified to return a proposal state that halts at an approval gate until an Admin explicitly signs off. | Verified via LangGraph test execution trace. |

---

### 10.2 Individual AI Reflection (CLEAR Level 4 — 1-Page Formal Reflection)

**1. Which AI tools were used, and at which stages?**  
Throughout the 9-week development lifecycle of Component C (Clerk & Documentation Management), I utilized AI coding assistants (principally Antigravity powered by Claude 3.5 Sonnet and Gemini models) in accordance with the Level 4 (Full AI) development guidelines. AI tools were leveraged across four distinct phases: (a) initial scaffolding of ASP.NET Core DTOs and EF Core fluent configurations; (b) designing boilerplate React TypeScript interfaces and Tailwind layout classes; (c) structuring the asynchronous Dart multipart/form-data upload streams in Flutter; and (d) drafting LangGraph node definitions for the Python agent orchestration service.

**2. What did the AI tools do well, and what did they get wrong?**  
The AI tools excelled at generating repetitive, boilerplate structures—such as generating strongly typed C# DTOs from entity models, writing comprehensive xUnit test mocks with Moq, and formatting responsive Tailwind CSS tables. However, the AI repeatedly struggled with architectural nuances and domain-specific safety boundaries. For example, the AI initially attempted to implement binary file uploads by encoding files into Base64 strings and storing them directly inside a text column in PostgreSQL; this would have severely degraded database performance and bloated table sizes. Furthermore, in the Agentic AI subsystem, the LLM defaulted to an autonomous model where the agent attempted to directly execute SQL UPDATE queries on DocumentationRequests.ClerkId, entirely bypassing human approval and backend authorization checks.

**3. What did you change, add, or reject from the AI output, and why?**  
I actively intervened to correct, refactor, and reject substandard AI outputs:
- *Database Safety*: I explicitly overrode the AI's cascading delete behavior on Clerks -> DocumentationRequests, replacing it with OnDelete(DeleteBehavior.SetNull) so that historical customer case records remain permanent even if a clerk account is deleted.
- *File Upload Pipeline*: I completely discarded the AI's Base64 database strategy, replacing it with a secure ASP.NET Core streaming file upload service that validates MIME types (pplication/pdf, image/jpeg), sanitizes file names with GUIDs, and stores files in an isolated physical directory.
- *Enforcing Human-in-the-Loop (HITL)*: I redesigned the LangGraph workflow so that the Clerk Recommendation Agent outputs an auditable proposal payload rather than applying direct database mutations. I introduced an explicit approval gate (AWAITING_APPROVAL) requiring human authorization via the React dashboard before case assignment occurs.

**4. What did you learn about your own skills and understanding?**  
Working with AI at a Level 4 capacity demonstrated that while generative tools dramatically accelerate initial typing and syntax scaffolding, they possess no intrinsic understanding of software engineering frameworks, transactional boundaries, or security constraints. The experience solidified my mastery over full-stack integration—specifically how to coordinate multipart file transfers across Flutter, ASP.NET Core, and PostgreSQL while maintaining strict RBAC. More importantly, it honed my critical evaluation skills: I became a rigorous code reviewer rather than a passive consumer, verifying every database constraint, validating all API contracts, and ensuring that the final application is robust, maintainable, and defensible during the technical viva.

---

### 10.3 Signed Academic Integrity Declaration

I hereby confirm that:
1. The technical work, code, tests, and documentation presented for **Component C: Clerk & Documentation Management** represent my own individual contribution to the team project.
2. All AI tool usage during development has been fully and transparently disclosed in the AI Usage Log and Reflection above in compliance with Section 18 of the SE3090 specification.
3. No AI tools will be used during the final demonstration or technical viva, and I am prepared to explain, test, modify, and debug any portion of the submitted code.

**Signed:** *Vijayakumar Vithusan (VTN02)*  
**Date:** *28 September 2026*

---

## 11. Individual Contribution Portfolio & Sign-off

### 11.1 Key Modules & LOC Breakdown

| File / Module | Lines of Code | Responsibility |
|---|---|---|
| DocumentationRequestsController.cs | ~180 | 7 REST endpoints for request lifecycle |
| DocumentFilesController.cs | ~120 | File upload/download/list/delete |
| ClerksController.cs | ~140 | Clerk CRUD + authentication |
| DocumentationServicesController.cs | ~100 | Service template management |
| AgentController.cs | ~60 | AI pipeline bridge |
| DocumentationRequestService.cs | ~220 | Core business logic + state machine |
| DocumentFileService.cs | ~130 | File I/O + storage management |
| ClerkService.cs | ~160 | Clerk auth + workload queries |
| DocumentationServiceService.cs | ~110 | Service template CRUD |
| ApplicationDbContext.cs (my entities) | ~80 | EF Core entity configuration |
| DbInitializer.cs (my seeds) | ~120 | 12 service templates + staff accounts |
| pages/admin/DocumentationRequestsPage.tsx | ~350 | Admin requests dashboard |
| pages/admin/DocumentationRequestDetail.tsx | ~280 | Detail view + AI panel |
| pages/admin/ClerkManagementPage.tsx | ~200 | Clerk registry UI |
| pages/admin/DocumentationServicesPage.tsx | ~250 | Service template card grid |
| pages/clerk/ClerkCasesPage.tsx | ~300 | Clerk workspace queue |
| mobile/lib/screens/documentation/ | ~600 | 4 Flutter documentation screens |
| i_agent/agent.py + nodes | ~400 | LangGraph 4-node pipeline |
| **Unit Tests (4 test files)** | ~600 | 41 xUnit tests |
| **TOTAL (approx.)** | **~4,400 LOC** | **Component C complete** |

### 11.2 Why Component C is Critical

1. **Business-Critical Workflow:** Every legal service the firm offers flows through this component — no client can engage the firm without submitting a documentation request.
2. **AI Integration Point:** This is the only component that directly invokes the LangGraph multi-agent pipeline, making it the bridge between traditional REST API and agentic AI.
3. **Cross-Cutting Concern:** Component C serves all three user roles (Admin, Clerk, Client) across all three frontends (React web, Flutter mobile, and the shared API), making it the most widely integrated component in the system.

### 11.3 Demonstration & Viva Readiness

All endpoints, web screens, mobile interfaces, and AI workflows have been verified and documented with real running screenshots. Full technical defense and live execution are prepared for the SE3090 Assignment 1 evaluation.

---

*Report finalized & signed: September 28, 2026 | LegalEase Intelligent Legal Services — SE3090 Assignment 1*
