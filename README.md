# Enterprise RAG

Enterprise RAG is an intelligent document intelligence platform. It allows users to upload multiple PDFs and images, processes them into a vector database, and leverages LLaMA 4 (via Groq) to answer questions based on the uploaded documents.

## Features

- **Multi-Document Support**: Upload multiple PDFs and Images at once.
- **Dynamic Merging**: Vector data from all uploaded documents is dynamically merged into a single FAISS index, ensuring you can query across all your files.
- **Cancelable Uploads**: Abort in-progress uploads at any time, instantly wiping any stale data to keep the database clean.
- **Conversational Memory**: Chat history is maintained so the assistant understands follow-up questions contextually.
- **Image Intelligence**: Analyzes uploaded images using LLaMA 4 Vision capabilities to extract contextual data, labels, and text.
- **Modern UI**: Polished, responsive HTML/JS/CSS frontend with a beautiful aesthetic, micro-animations, and real-time status updates.

## Tech Stack

### Backend
- **FastAPI**: High-performance API framework.
- **LangChain**: For orchestration of prompts, models, and retrieval.
- **FAISS**: Local, high-speed vector database for similarity search.
- **Groq API**: Lightning-fast inference using `meta-llama/llama-4-scout-17b-16e-instruct` and Vision models.
- **PyMuPDF (fitz)**: Fast and reliable PDF text extraction.
- **Sentence Transformers**: `all-MiniLM-L6-v2` for generating embeddings.

### Frontend
- HTML5, Vanilla JavaScript, and plain CSS.

## Setup & Installation

**1. Clone the repository and navigate to the project directory:**
```bash
git clone <repository-url>
cd Enterprise_RAG
```

**2. Create a virtual environment and activate it:**
```bash
python -m venv myenv
# For Windows:
myenv\Scripts\activate
# For Linux/Mac:
source myenv/bin/activate
```

**3. Install dependencies:**
```bash
pip install -r requirements.txt
```

**4. Setup Environment Variables:**
Create a `.env` file in the root directory and add your Groq API Key:
```env
GROQ_API_KEY=your_groq_api_key_here
```

**5. Run the Backend Server:**
```bash
uvicorn app.main:app --reload --port 8000
```

**6. Access the Application:**
Open `index.html` located in the `frontend` folder in any modern web browser to start using the platform.

## Usage Guide

1. **Upload Documents**: Drag and drop PDFs and Images into the respective drop zones. You can upload multiple files sequentially. 
2. **Chat**: Once your files are successfully uploaded and vectorized, scroll down to the chat interface to ask questions. The model will search across all your uploaded content.
3. **Reset State**: You can clear your current session using the "Reset All Data" option, which clears the database and lets you start fresh with new documents.
