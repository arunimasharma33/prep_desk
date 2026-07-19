from app.llm import call_mistral_json

SYSTEM_PROMPT = """You are an expert interview coach who designs day-by-day interview preparation \
plans. You always respond with STRICT JSON only, no prose, no markdown fences, matching exactly the \
schema requested."""

USER_TEMPLATE = """Build a personalised, day-by-day interview preparation plan.

JOB TITLE: {job_title}
DAYS AVAILABLE UNTIL THE INTERVIEW: {days}
AVAILABLE STUDY HOURS PER DAY: {hours_per_day}

JOB DESCRIPTION:
\"\"\"{job_description}\"\"\"

SKILLS THE CANDIDATE ALREADY HAS (light review only): {matched_skills}
SKILLS/GAPS THE CANDIDATE NEEDS TO BUILD UP (prioritize these): {missing_skills}

Return STRICT JSON with exactly this schema:
{{
  "overview": "<2-3 sentence summary of the overall strategy>",
  "days": [
    {{
      "day": <integer, 1-indexed>,
      "title": "<short theme for the day, e.g. 'System Design Fundamentals'>",
      "topics": ["<topic 1>", "<topic 2>"],
      "tasks": ["<concrete actionable task, e.g. 'Solve 5 array/string LeetCode mediums'>"],
      "estimated_hours": <number, should roughly match hours_per_day>
    }}
  ]
}}

Requirements:
- Produce EXACTLY {days} day entries, numbered 1 to {days} in order.
- Prioritize the missing/gap skills earlier and give them more days; use matched skills only for light \
refreshers.
- Always include, near the end of the plan, at least one dedicated day (or clearly labeled block within \
a day if days is very small) for a full mock interview and one for final revision/rest.
- If days is very small (1-3), compress intelligently and still cover the highest-leverage topics plus \
a mock interview.
- Tasks must be concrete and actionable (specific practice activities, not vague advice).
- Respond with JSON only."""


def generate_plan(job_title: str, job_description: str, days: int, hours_per_day: float,
                   matched_skills: list[str], missing_skills: list[str]) -> dict:
    prompt = USER_TEMPLATE.format(
        job_title=job_title,
        days=days,
        hours_per_day=hours_per_day,
        job_description=(job_description or "").strip() or "(not provided)",
        matched_skills=", ".join(matched_skills) if matched_skills else "(none listed)",
        missing_skills=", ".join(missing_skills) if missing_skills else "(none listed)",
    )
    result = call_mistral_json(SYSTEM_PROMPT, prompt, max_tokens=4500)
    result.setdefault("overview", "")
    result.setdefault("days", [])

    # Defensive: ensure day numbers are sane/sequential even if the model slips.
    fixed_days = []
    for i, d in enumerate(result["days"][:days], start=1):
        d["day"] = i
        d.setdefault("title", f"Day {i}")
        d.setdefault("topics", [])
        d.setdefault("tasks", [])
        d.setdefault("estimated_hours", hours_per_day)
        fixed_days.append(d)
    result["days"] = fixed_days
    return result
