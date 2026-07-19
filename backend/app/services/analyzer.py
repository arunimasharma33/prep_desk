from app.llm import call_mistral_json

SYSTEM_PROMPT = """You are an expert technical recruiter and interview coach with 15+ years of \
experience hiring for software, data, and product roles. You analyze a job description against a \
candidate's resume (or profile description) and produce a rigorous, honest assessment plus a set of \
interview questions the candidate is most likely to face. You always respond with STRICT JSON only, \
no prose before or after, matching exactly the schema described in the user message. Never wrap the \
JSON in markdown code fences."""

USER_TEMPLATE = """Analyze the following job and candidate profile.

JOB TITLE: {job_title}
COMPANY: {company}

JOB DESCRIPTION:
\"\"\"{job_description}\"\"\"

CANDIDATE RESUME / PROFILE (may be empty if not provided):
\"\"\"{resume_text}\"\"\"

Return STRICT JSON with exactly this schema:
{{
  "match_score": <integer 0-100, or null if resume/profile is empty>,
  "score_explanation": "<2-3 sentence honest explanation of the score>",
  "matched_skills": ["<skills/requirements from the JD that the candidate demonstrably has>"],
  "missing_skills": ["<important skills/requirements from the JD the candidate is missing or hasn't shown>"],
  "strengths": ["<3-5 candidate strengths relevant to this specific role>"],
  "improvement_areas": ["<3-5 concrete areas the candidate should improve for this role>"],
  "technical_questions": [
    {{"question": "<question text>", "topic": "<short topic label>", "difficulty": "easy|medium|hard"}}
  ],
  "behavioral_questions": [
    {{"question": "<question text>", "competency": "<e.g. leadership, conflict resolution, ownership>"}}
  ]
}}

Requirements:
- Produce 10-14 technical_questions covering the core skills/tools in the JD, weighted toward the \
candidate's missing_skills and the JD's most emphasized requirements, ranging across difficulty.
- Produce 8-10 behavioral_questions relevant to the seniority and nature of this role, covering a \
range of competencies (teamwork, conflict, failure, leadership, ambiguity, ownership, communication).
- If resume/profile is empty, set match_score to null, still infer matched_skills as empty, \
missing_skills as the full set of key JD requirements, and still produce full question lists based on the JD alone.
- Be specific to THIS job description; do not produce generic filler questions.
- Respond with JSON only."""


def analyze(job_title: str, company: str | None, job_description: str, resume_text: str | None) -> dict:
    prompt = USER_TEMPLATE.format(
        job_title=job_title,
        company=company or "N/A",
        job_description=job_description.strip(),
        resume_text=(resume_text or "").strip() or "(none provided)",
    )
    result = call_mistral_json(SYSTEM_PROMPT, prompt, max_tokens=4500)

    # Defensive normalization so the API contract always holds even if the model
    # deviates slightly.
    result.setdefault("match_score", None)
    result.setdefault("score_explanation", "")
    result.setdefault("matched_skills", [])
    result.setdefault("missing_skills", [])
    result.setdefault("strengths", [])
    result.setdefault("improvement_areas", [])
    result.setdefault("technical_questions", [])
    result.setdefault("behavioral_questions", [])
    return result
