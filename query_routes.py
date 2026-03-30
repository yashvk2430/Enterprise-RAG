from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from service.retriever import retrieve
from service.llm import genrate_answer
import service.db as db

router = APIRouter()

# ── In-memory conversation history ──────────────────────
# Simple list — server restart pe clear ho jaata hai (expected for dev)
_chat_history: List[dict] = []


class QueryRequest(BaseModel):
    q: str
    history: Optional[List[dict]] = []   # frontend se history aayegi


@router.post("/query")
async def query(req: QueryRequest):
    global _chat_history

    if db.vector_db is None:
        return {"error": "Koi document upload nahi hua — pehle PDF ya image upload karo"}

    # Relevant chunks retrieve karo
    docs = retrieve(db.vector_db, req.q, k=10)

    # Frontend history ya server-side history — jo bhi mile use karo
    history = req.history if req.history else _chat_history

    # LLM ko call karo — context + history + current question
    answer = genrate_answer(req.q, docs, history)

    # Server-side history update karo
    _chat_history.append({"role": "user",      "content": req.q})
    _chat_history.append({"role": "assistant", "content": answer})

    # History zyada badi na ho — last 20 turns (40 messages) rakhte hain
    if len(_chat_history) > 40:
        _chat_history = _chat_history[-40:]

    return {"answer": answer}


@router.post("/chat/clear")
async def clear_history():
    """Chat history reset karo"""
    global _chat_history
    _chat_history = []
    return {"message": "Chat history cleared"}