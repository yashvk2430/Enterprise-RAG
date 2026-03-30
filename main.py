from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.upload_route import router as upload_router
from routes.query_routes import router as query_router

app = FastAPI(title="Enterprise RAG API", version="1.0.0")

# Allow frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Enterprise RAG API Running 🚀"}

# include routes
app.include_router(upload_router)
app.include_router(query_router)
