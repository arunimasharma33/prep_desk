import json
from app.llm import call_mistral_json

SYSTEM_PROMPT = """You are an expert resume writer and ATS (Applicant Tracking System) optimization \
specialist. You rewrite and restructure resumes to be ATS-friendly, keyword-optimized for a specific \
job, and honest (never fabricate employers, dates, or skills the candidate never mentioned). You are \
also meticulous about resume length: a great resume fills exactly one A4 page - full and confident, \
never leaving noticeable empty white space, but never spilling onto a second page either. You always \
respond with STRICT JSON only, no prose, no markdown fences, matching exactly the schema requested."""

USER_TEMPLATE = """Rewrite and restructure the candidate's resume to be ATS-friendly and strongly \
tailored to the target job below, while remaining 100% truthful to the source material (you may \
rephrase, quantify, and reorder, but never invent employers, titles, dates, or unmentioned skills).

TARGET JOB TITLE: {job_title}

TARGET JOB DESCRIPTION:
\"\"\"{job_description}\"\"\"

SKILL GAPS TO BE MINDFUL OF (do NOT falsely claim these; only mention if candidate's source material \
actually supports them, otherwise omit): {missing_skills}

CANDIDATE'S SOURCE RESUME / PROFILE TEXT:
\"\"\"{resume_text}\"\"\"

Return STRICT JSON with exactly this schema:
{{
  "name": "<candidate name, or 'Your Name' if unknown>",
  "title": "<professional headline tailored to the target role>",
  "contact": {{"email": "", "phone": "", "location": "", "linkedin": "", "portfolio": ""}},
  "summary": "<3-4 line ATS-optimized professional summary tailored to the JD, using real keywords \
from the JD that genuinely apply>",
  "skills": ["<flat list of skills, ordered by relevance to the JD, pulled only from source material>"],
  "experience": [
    {{"company": "", "role": "", "duration": "", "bullets": ["<action-verb, quantified, ATS-friendly \
bullet>"]}}
  ],
  "projects": [
    {{"name": "", "bullets": ["<bullet>"]}}
  ],
  "education": [
    {{"school": "", "degree": "", "duration": ""}}
  ],
  "certifications": ["<certification>"],
  "suggestions": ["<3-6 specific, actionable tips for the candidate to further close the gap for this \
role, e.g. suggested certifications, projects to build, or phrasing improvements>"],
  "keywords_incorporated": ["<JD keywords now reflected in the resume>"]
}}

CRITICAL LENGTH REQUIREMENT - the resume must fill exactly ONE A4 page, fully:
- Do not leave the bottom third of the page looking empty. If the candidate's source material is on \
the thinner side, compensate honestly: write a fuller 3-4 sentence summary, use 4-6 substantive bullets \
per role instead of 2-3, elaborate truthfully on scope/impact/tools/collaboration for each bullet, add \
a "Projects" entry if anything project-like is mentioned or reasonably implied, and list all genuinely \
relevant skills rather than a minimal subset.
- If the candidate has extensive experience that would overflow one page, do the opposite: keep only \
the most recent and most relevant roles, cap bullets at 3-4 per role, and prioritize ruthlessly by \
relevance to the target job so the page stays full but never overflows.
- Never pad with generic filler, buzzwords without substance, or repeated phrasing just to take up space \
- every extra line must add real, truthful signal.
- Bullets should be concise but substantive, start with strong action verbs, and quantify impact wherever \
the source material allows a reasonable, non-fabricated inference.
- Keep formatting plain (no special unicode bullets/emoji) - this will be rendered into a clean ATS PDF.
- Respond with JSON only."""

EXPAND_TEMPLATE = """Here is a draft ATS resume as JSON:

{draft_json}

This draft is too sparse and would leave noticeable empty white space on a printed A4 page. Expand it \
so it fills the page fully and confidently, while staying 100% truthful to the same underlying facts \
(same employers, same dates, same skills - do not invent anything new):
- Flesh out the summary to 3-4 full sentences.
- Add more substantive, quantified bullets to each existing experience/project entry (aim for 4-6 per \
role where the source material can honestly support it).
- List any additional genuinely relevant skills, tools, or soft skills implied by the existing content \
that were left out.
- Do not add new employers, job titles, dates, degrees, or certifications that weren't already present.

Return the exact same JSON schema as the draft, fully filled out, JSON only - no prose, no markdown fences."""

DEFAULTS = {
    "name": "Your Name", "title": "", "contact": {}, "summary": "", "skills": [],
    "experience": [], "projects": [], "education": [], "certifications": [],
    "suggestions": [], "keywords_incorporated": [],
}

# Rough word-count floor below which a single A4 page (in our templates) would look
# visibly sparse. Below this, we ask the model for one truthful expansion pass.
MIN_TARGET_WORDS = 220


def _fill_defaults(result: dict) -> dict:
    for k, v in DEFAULTS.items():
        result.setdefault(k, v)
    return result


def _word_count(resume: dict) -> int:
    parts = [resume.get("title") or "", resume.get("summary") or ""]
    parts += resume.get("skills") or []
    for e in resume.get("experience") or []:
        parts.append(e.get("role") or "")
        parts.append(e.get("company") or "")
        parts += e.get("bullets") or []
    for p in resume.get("projects") or []:
        parts.append(p.get("name") or "")
        parts += p.get("bullets") or []
    for ed in resume.get("education") or []:
        parts.append(ed.get("degree") or "")
        parts.append(ed.get("school") or "")
    parts += resume.get("certifications") or []
    return len(" ".join(parts).split())


def improve_resume(job_title: str, job_description: str, resume_text: str | None,
                    missing_skills: list[str]) -> dict:
    prompt = USER_TEMPLATE.format(
        job_title=job_title,
        job_description=(job_description or "").strip() or "(not provided)",
        missing_skills=", ".join(missing_skills) if missing_skills else "(none listed)",
        resume_text=(resume_text or "").strip() or "(no resume provided - build a scaffold)",
    )
    result = _fill_defaults(call_mistral_json(SYSTEM_PROMPT, prompt, max_tokens=4500))

    # If there was real source material but the draft still came back sparse, give
    # the model one truthful pass to fill the page out properly.
    if (resume_text or "").strip() and _word_count(result) < MIN_TARGET_WORDS:
        try:
            expand_prompt = EXPAND_TEMPLATE.format(draft_json=json.dumps(result, ensure_ascii=False))
            expanded = _fill_defaults(call_mistral_json(SYSTEM_PROMPT, expand_prompt, max_tokens=4500))
            if _word_count(expanded) > _word_count(result):
                # keep suggestions/keywords from the original if the expand pass dropped them
                expanded.setdefault("suggestions", result.get("suggestions"))
                expanded.setdefault("keywords_incorporated", result.get("keywords_incorporated"))
                result = expanded
        except Exception:  # noqa: BLE001
            pass  # fall back to the original draft rather than fail the whole request

    return result
