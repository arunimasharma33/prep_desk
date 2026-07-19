import io
from fastapi import HTTPException, UploadFile


def extract_text_from_upload(file: UploadFile, raw: bytes) -> str:
    filename = (file.filename or "").lower()

    if filename.endswith(".pdf"):
        try:
            from pypdf import PdfReader
        except ImportError:
            raise HTTPException(status_code=500, detail="pypdf is not installed on the server.")
        try:
            reader = PdfReader(io.BytesIO(raw))
            text = "\n".join((page.extract_text() or "") for page in reader.pages)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=400, detail=f"Could not read PDF: {exc}")

    elif filename.endswith(".docx"):
        try:
            import docx
        except ImportError:
            raise HTTPException(status_code=500, detail="python-docx is not installed on the server.")
        try:
            document = docx.Document(io.BytesIO(raw))
            text = "\n".join(p.text for p in document.paragraphs)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=400, detail=f"Could not read DOCX: {exc}")

    elif filename.endswith(".txt") or filename.endswith(".md"):
        text = raw.decode("utf-8", errors="ignore")

    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a .pdf, .docx, or .txt resume.",
        )

    text = text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="No readable text could be extracted from the file.")
    return text
