from fastapi import APIRouter, UploadFile, File
from service.pdf_loader import load_pdf
from service.image_loader import generate_caption
from service.text_chunk import chunk_text
from service.retriever import add_to_vector_store
from typing import Optional
import shutil
import threading
import tempfile
import os
import service.db as db

router = APIRouter()

# ── Shared state ──────────────────────────────────────
upload_status = {"status": "idle", "message": ""}

# Cancel flag — thread is_cancelled check karta hai vector_db save se PEHLE
_cancel_flag = threading.Event()   # set() = cancelled, clear() = running


def _process_in_background(file_type: str, file_path: str):
    """
    Background thread mein processing.
    Har important step se pehle _cancel_flag check karta hai.
    Agar cancel ho gaya to vector_db mein kuch nahi daalta.
    """
    global upload_status
    try:
        # Step 1 — file load / AI call
        if file_type == "pdf":
            upload_status = {"status": "processing", "message": "PDF padha ja raha hai..."}
            if _cancel_flag.is_set():
                return
            text = load_pdf(file_path)
            chunks = chunk_text(text)

        elif file_type == "image":
            upload_status = {"status": "processing", "message": "AI image analyze kar raha hai..."}
            if _cancel_flag.is_set():
                return
            caption = generate_caption(file_path)
            upload_status = {"status": "processing", "message": "Image content vectorize ho raha hai..."}
            if _cancel_flag.is_set():
                return
            chunks = chunk_text(caption)

        else:
            return

        # Step 2 — vector_db mein save — SIRF tab karo jab cancel nahi hua
        if _cancel_flag.is_set():
            upload_status = {"status": "idle", "message": ""}
            return

        db.vector_db = add_to_vector_store(db.vector_db, chunks)

        # Step 3 — final check after save (cancel ne overlap kiya?)
        if _cancel_flag.is_set():
            db.vector_db = None          # just saved data bhi hata do
            upload_status = {"status": "idle", "message": ""}
            return

        upload_status = {"status": "done", "message": f"{file_type.upper()} uploaded successfully!"}

    except Exception as e:
        if not _cancel_flag.is_set():
            upload_status = {"status": "error", "message": str(e)}
    finally:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass


# ── Routes ────────────────────────────────────────────

@router.post("/upload")
async def upload_file(
    pdf:   Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None)
):
    """
    File ko OS temp directory mein save karta hai (project folder mein NAHI).
    Uvicorn --reload trigger nahi hoga.
    """
    global upload_status

    # Naya upload shuru — cancel flag reset karo
    _cancel_flag.clear()

    if pdf:
        suffix = os.path.splitext(pdf.filename)[-1] or ".pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(pdf.file, tmp)
            tmp_path = tmp.name

        upload_status = {"status": "processing", "message": "PDF processing shuru..."}
        threading.Thread(target=_process_in_background, args=("pdf", tmp_path), daemon=True).start()
        return {"message": "PDF upload started", "processing": True}

    if image:
        suffix = os.path.splitext(image.filename)[-1] or ".jpg"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(image.file, tmp)
            tmp_path = tmp.name

        upload_status = {"status": "processing", "message": "Image processing shuru..."}
        threading.Thread(target=_process_in_background, args=("image", tmp_path), daemon=True).start()
        return {"message": "Image upload started", "processing": True}

    return {"error": "No file provided"}


@router.get("/upload/status")
async def get_upload_status():
    return upload_status


@router.post("/upload/cancel")
async def cancel_upload():
    """
    1. _cancel_flag set karo — background thread vector_db save NAHI karega
    2. Agar save ho bhi gaya to db.vector_db = None se clear
    3. Status idle pe wapas
    """
    global upload_status
    _cancel_flag.set()          # Thread ko signal — ruk ja
    db.vector_db = None         # Kuch bhi save hua ho — wipe
    upload_status = {"status": "idle", "message": ""}
    return {"message": "Cancelled — all data cleared"}