import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import AzureOpenAI
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
try:
    from azure.monitor.opentelemetry import configure_azure_monitor
except ImportError:
    configure_azure_monitor = None

load_dotenv()

if os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING") and configure_azure_monitor:
    configure_azure_monitor()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "https://open-ai-resource-rob.openai.azure.com/")
api_key = os.getenv("AZURE_OPENAI_API_KEY")
api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-08-01-preview")
chat_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o-mini")
embedding_deployment = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-large")

client = AzureOpenAI(
    azure_endpoint=endpoint,
    api_key=api_key,
    api_version=api_version
)

import asyncio
import time
from typing import Dict, List
from prompts import RABOBANK_SYSTEM_PROMPT

class ConversationManager:
    def __init__(self, max_history: int = 10, ttl_seconds: int = 3600):
        self.history: Dict[str, List[dict]] = {}
        self.last_access: Dict[str, float] = {}
        self.max_history = max_history
        self.ttl_seconds = ttl_seconds
        self.lock = asyncio.Lock()

    def _ensure_session(self, session_id: str):
        if session_id not in self.history:
            self.history[session_id] = [
                {"role": "system", "content": RABOBANK_SYSTEM_PROMPT}
            ]

    async def get_history(self, session_id: str) -> List[dict]:
        async with self.lock:
            self._cleanup()
            self._ensure_session(session_id)
            self.last_access[session_id] = time.time()
            return self.history[session_id]

    async def add_message(self, session_id: str, role: str, content: str):
        async with self.lock:
            self._ensure_session(session_id)
            
            self.history[session_id].append({"role": role, "content": content})
            
            self.history[session_id].append({"role": role, "content": content})
            
            if len(self.history[session_id]) > self.max_history + 1:
                self.history[session_id] = [self.history[session_id][0]] + self.history[session_id][-(self.max_history):]
            
            self.last_access[session_id] = time.time()

    def _cleanup(self):
        now = time.time()
        expired = [sid for sid, last in self.last_access.items() if now - last > self.ttl_seconds]
        for sid in expired:
            del self.history[sid]
            del self.last_access[sid]

conversation_manager = ConversationManager()

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

class EmbeddingRequest(BaseModel):
    text: str

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/chat")
async def chat(request: ChatRequest):
    print(f"DEBUG: Processing chat request (with robust memory) for session '{request.session_id}': {request.message[:50]}...")
    if not api_key:
        print("ERROR: Azure OpenAI API key is missing!")
        raise HTTPException(status_code=500, detail="Azure OpenAI API key not configured")
    
    await conversation_manager.add_message(request.session_id, "user", request.message)
    
    try:
        embedding_response = client.embeddings.create(
            model=embedding_deployment,
            input=request.message
        )
        embedding_vector = embedding_response.data[0].embedding
        embedding_vector = embedding_response.data[0].embedding

        history = await conversation_manager.get_history(request.session_id)
        print(f"DEBUG: sending {len(history)} messages to LLM...")
        
        chat_response = client.chat.completions.create(
            model=chat_deployment,
            messages=history
        )
        content = chat_response.choices[0].message.content
        content = chat_response.choices[0].message.content
        
        await conversation_manager.add_message(request.session_id, "assistant", content)

        return {
            "response": content,
            "embedding": embedding_vector
        }
    except Exception as e:
        print(f"ERROR: Azure OpenAI Call Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
