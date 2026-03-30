import fitz

def load_pdf(file_path):
    doc=fitz.open(file_path)
    text=""
    for page in doc:
        text+=page.get_text()
    return text

if __name__ == "__main__":
    print(load_pdf(r"C:\\Users\\HP\\Downloads\\1.pdf"))
