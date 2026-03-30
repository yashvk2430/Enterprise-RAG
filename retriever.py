from langchain_community.vectorstores import FAISS
from service.embedding import embeddings

def create_vector_store(chunks):
    return FAISS.from_texts(chunks, embeddings)

def add_to_vector_store(existing_store, chunks):
    """
    Existing FAISS store mein naye chunks merge karo.
    Multiple uploads accumulate hote hain — overwrite nahi hota.
    """
    if existing_store is None:
        return create_vector_store(chunks)
    new_store = create_vector_store(chunks)
    existing_store.merge_from(new_store)
    return existing_store

def retrieve(vector_store, query, k=10):
    """
    k=10 by default taaki multiple documents se bhi answers mile.
    Agar store mein k se kam documents hain to safely clamp karo.
    """
    try:
        total_docs = vector_store.index.ntotal
        safe_k = min(k, max(1, total_docs))
        return vector_store.similarity_search(query, k=safe_k)
    except Exception:
        return vector_store.similarity_search(query, k=3)

if __name__ == "__main__":
    print(retrieve(create_vector_store(["Hello World"]), "Hello World"))