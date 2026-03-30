from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from dotenv import load_dotenv
import os

load_dotenv()

llm = ChatGroq(
    model_name='meta-llama/llama-4-scout-17b-16e-instruct',
    groq_api_key=os.getenv('GROQ_API_KEY')
)

def genrate_answer(query: str, docs: list, history: list = None) -> str:
    """
    history = [
      {"role": "user",      "content": "..."},
      {"role": "assistant", "content": "..."},
      ...
    ]
    """
    # Document context
    context = "\n\n".join(
        doc.page_content if hasattr(doc, "page_content") else str(doc)
        for doc in docs
    )

    # System message — role + document context
    system_msg = SystemMessage(content=(
        "You are a helpful RAG assistant. Answer questions based on the provided document context.\n"
        "If the answer is not in the context, say so clearly.\n\n"
        f"=== Document Context ===\n{context}\n========================"
    ))

    # Build message list: system + history + current question
    messages = [system_msg]

    if history:
        for turn in history:
            role = turn.get("role", "")
            content = turn.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))

    # Current question
    messages.append(HumanMessage(content=query))

    return llm.invoke(messages).content


if __name__ == "__main__":
    from langchain_core.documents import Document
    docs = [Document(page_content="Virat Kohli is the king of cricket.")]
    history = [
        {"role": "user",      "content": "Who is a famous cricketer?"},
        {"role": "assistant", "content": "Virat Kohli is a famous cricketer."},
    ]
    print(genrate_answer("What else do you know about him?", docs, history))