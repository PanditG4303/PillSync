# 💊 PillSync: Intelligent Medicine Reminder & Tracking Platform
run the project, 
pip install -r requirements.txt
>> python -m uvicorn app:app --reload

frontend , npm run dev
PillSync is an AI-powered digital healthcare platform designed to automate medication adherence, predict stock depletion, and bridge communication between patients, caregivers, and administrators. 

<img width="667" height="588" alt="image" src="https://github.com/user-attachments/assets/02b24259-e3de-470e-8881-6990aee0a096" />


---

## 🏗️ System Architecture

GitHub supports natively rendering Mermaid diagrams. The layout below outlines the operational flow from user touchpoints through the secure API gateway to the underlying microservices and infrastructure layer:

```mermaid
---
config:
  layout: elk
---
graph TD
    A[Users & Roles] -->|Patient| B[Web/Mobile Application]
    A -->|Caregiver| B
    A -->|Administrator| B
    C[External Data Sources] -->|Medicine DB| B
    C -->|Disease APIs| B
    C -->|OCR/NLP| B
    B -->|HTTP/REST| D[API Gateway]
    D -->|JWT/OAuth2| E[Request Processing]
    E -->|Routing| F[Rate Limiting]
    F -->|Validation| G[Security Layer]
    G -->|Response| D
    D -->|Route| H[User Service]
    D -->|Route| I[Medication Service]
    D -->|Route| J[OCR Service]
    D -->|Route| K[Reminder Service]
    D -->|Route| L[Refill Engine]
    H -->|Store/Retrieve| M[PostgreSQL]
    I -->|Query| N[MongoDB]
    J -->|Process| O[File Storage]
    K -->|Cache| P[Redis]
    L -->|Analytics| M
    M -->|Persist| Q[Data & Storage Layer]
    N -->|Metadata| Q
    P -->|Sessions| Q
    O -->|Images| Q
    Q -->|Deploy| R[Docker Containers]
    R -->|Orchestrate| S[Kubernetes]
    S -->|Infrastructure| T[AWS/Azure]
    S -->|Pipeline| U[CI/CD]
    
    classDef userRole fill:#f0f9ff,stroke:#38bdf8
    classDef appLayer fill:#f0fdfa,stroke:#2dd4bf
    classDef apiGateway fill:#fdf4ff,stroke:#e879f9
    classDef microService fill:#f5f3ff,stroke:#a78bfa
    classDef dataStore fill:#fef2f2,stroke:#f87171
    classDef infrastructure fill:#f7fee7,stroke:#a3e635
    
    class A userRole
    class B appLayer
    class D apiGateway
    class H,I,J,K,L microService
    class M,N,O,P dataStore
    class Q,R,S,T,U infrastructure
