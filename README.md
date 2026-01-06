# Rabobank AI Assistant

A secure, full-stack AI Assistant built for Rabobank, capable of answering questions about banking services and generating text embeddings.

**Live Demo:** [https://jan-frontend.jollyground-9984d166.westus2.azurecontainerapps.io/](https://jan-frontend.jollyground-9984d166.westus2.azurecontainerapps.io/)

---

## Key Features

*   **Azure OpenAI Integration**: Utilizes `gpt-4o-mini` for chat and `text-embedding-3-large` for vector generation.
*   **Strict Scope Enforcement**: System prompts ensure the AI *only* discusses Rabobank, Finance, and Agriculture.
   *   *Try asking: "Who is the best footballer?" -> It will politely refuse.*
*   **Robust Memory**: Maintains conversation context (history) per user session using a thread-safe sliding window.
*   **Typo Tolerance**: 
*   **Rich UI**: Markdown rendering support for bold text, lists, and headers.
*   **Monitoring**: Fully instrumented with **Azure Application Insights** for real-time telemetry.

## Technology Stack

*   **Frontend**: Next.js 16 (React), Tailwind CSS, TypeScript.
*   **Backend**: Python FastAPI, OpenAI SDK, Pydantic.
*   **Infrastructure**: Azure Container Apps (Serverless Containers), Azure Container Registry (ACR).
*   **Monitoring**: Azure Monitor / Application Insights.

## Architecture

1.  **Backend (`/backend`)**:
    *   Exposes `/chat` endpoint.
    *   Handles Prompt Engineering (`prompts.py`).
    *   Manages Session State.
2.  **Frontend (`/frontend`)**:
    *   Next.js App Router.
    *   API Proxy (`/api/chat`) to securely route requests to the backend (avoiding CORS issues and hiding upstream URLs locally).
3.  **Deployment**:
    *   Both services are containerized (Docker).
    *   Deployed to Azure Container Apps environment in `West US 2`.

## How to Run Locally

1.  **Clone the repo**:
    ```bash
    git clone <your-repo-url>
    cd jan-korczynski-TT
    ```

2.  **Run with Docker Compose** (Recommended):
    ```bash
    docker-compose up --build
    ```
    *   Frontend: `http://localhost:3000`
    *   Backend: `http://localhost:8000`

3.  **Manual Setup**:
    *   **Backend**:
        ```bash
        cd backend
        python -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        uvicorn main:app --reload --host 0.0.0.0 --port 8000
        ```
    *   **Frontend**:
        ```bash
        cd frontend
        npm install
        npm run dev
        ```

## Deployment Guide

A helper script `deploy.sh` is included to automate building and pushing to Azure.

1.  **Build & Push Images**:
    ```bash
    ./deploy.sh
    ```

2.  **Deploy to Azure Container Apps**:
    ```bash
    # Backend
    az containerapp up --name jan-backend ... --env-vars AZURE_OPENAI_API_KEY=...

    # Frontend
    az containerapp up --name jan-frontend ... --env-vars BACKEND_URL=...
    ```

## Design Decisions

*   **Separation of Concerns**: Backend handles ALL AI logic and state; Frontend is purely for display.
*   **Runtime Configuration**: Frontend uses `BACKEND_URL` env var to switch between Localhost and Azure dynamically.
*   **Security**: API Keys are never exposed to the frontend; they stay on the server. Code excludes `.env` files via `.gitignore`.
