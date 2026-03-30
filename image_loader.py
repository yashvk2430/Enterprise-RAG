import base64
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Groq client — BLIP local model completely hataya
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_caption(image_path: str) -> str:
    """
    Image ko Groq LLaMA 4 Vision API se describe karta hai.
    BLIP local model ki zaroorat nahi — sirf fast API call.
    """
    with open(image_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")

    # File extension se MIME type detect karo
    ext = image_path.lower().split(".")[-1]
    mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp", "gif": "image/gif"}
    mime_type = mime_map.get(ext, "image/jpeg")

    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_data}"
                        }
                    },
                    {
                        "type": "text",
                        "text": (
                            "Please describe this image in complete detail. "
                            "Extract ALL visible text, numbers, tables, charts, labels, headings, and any written content. "
                            "Describe what the image shows, its content, context, and any data it contains. "
                            "Be as thorough and detailed as possible so someone could answer questions about this image."
                        )
                    }
                ]
            }
        ],
        max_tokens=1024
    )

    return response.choices[0].message.content


if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\HP\Downloads\unnamed.jpg"
    print(generate_caption(path))
