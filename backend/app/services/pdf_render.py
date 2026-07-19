import subprocess
import tempfile
import uuid
from pathlib import Path
from fastapi import HTTPException
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import settings

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates_resume"
VALID_TEMPLATES = {"classic", "modern", "compact"}

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATE_DIR)),
    autoescape=select_autoescape(["html"]),
)


def render_html(resume_json: dict, template: str = "classic") -> str:
    if template not in VALID_TEMPLATES:
        template = "classic"
    tpl = _env.get_template(f"{template}.html")
    return tpl.render(**resume_json)


def html_to_pdf(html: str, out_name: str | None = None) -> Path:
    """Write HTML to a temp file, invoke the node/puppeteer script, return the PDF path."""
    settings.GENERATED_PDF_DIR.mkdir(parents=True, exist_ok=True)
    out_name = out_name or f"resume_{uuid.uuid4().hex[:10]}"
    out_path = settings.GENERATED_PDF_DIR / f"{out_name}.pdf"

    node_script = settings.NODE_PDF_SCRIPT
    if not node_script.exists():
        raise HTTPException(status_code=500, detail=f"PDF generator script not found at {node_script}.")

    node_modules = node_script.parent / "node_modules" / "puppeteer"
    if not node_modules.exists():
        raise HTTPException(
            status_code=500,
            detail=(
                "Puppeteer isn't installed yet, so PDF export can't run. Fix: open a terminal, "
                f"run `cd {node_script.parent} && npm install`, then try downloading again. "
                "(This only needs to be done once, and needs internet access the first time to "
                "download Chromium.)"
            ),
        )

    with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False, encoding="utf-8") as f:
        f.write(html)
        html_path = f.name

    try:
        proc = subprocess.run(
            ["node", str(node_script), html_path, str(out_path)],
            capture_output=True, text=True, timeout=60,
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="Node.js is not installed or not on PATH. Install Node.js 18+ to enable PDF export.",
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="PDF generation timed out.")
    finally:
        Path(html_path).unlink(missing_ok=True)

    if proc.returncode != 0 or not out_path.exists():
        stderr = proc.stderr.strip()
        if "Could not find Chrome" in stderr or "Could not find browser" in stderr:
            detail = (
                "Puppeteer's bundled Chromium isn't installed. Fix: open a terminal, run "
                f"`cd {node_script.parent} && npx puppeteer browsers install chrome`, then try again."
            )
        elif "Cannot find module" in stderr:
            detail = (
                "Puppeteer isn't installed correctly. Fix: open a terminal, run "
                f"`cd {node_script.parent} && npm install`, then try again."
            )
        else:
            detail = f"PDF generation failed: {stderr or proc.stdout.strip()}"
        raise HTTPException(status_code=500, detail=detail)
    return out_path


def generate_resume_pdf(resume_json: dict, template: str = "classic", out_name: str | None = None) -> Path:
    html = render_html(resume_json, template)
    return html_to_pdf(html, out_name)
