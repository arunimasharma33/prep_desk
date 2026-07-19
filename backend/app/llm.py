import json
import re
import itertools
import threading
import httpx
from fastapi import HTTPException
from app.config import settings

MISTRAL_CHAT_URL = "https://api.mistral.ai/v1/chat/completions"

_key_cycle = None
_key_cycle_lock = threading.Lock()


def _ensure_enabled():
    if not settings.llm_enabled:
        raise HTTPException(
            status_code=400,
            detail=(
                "AI features are not enabled. Add your Mistral API key to "
                "backend/.env as MISTRAL_API_KEY=... (or MISTRAL_API_KEYS=key1,key2,... "
                "for multiple) and restart the server."
            ),
        )


def _next_key() -> str:
    """Round-robins across all configured keys so load - and rate limits - spread
    across them automatically, and lets a failed key be skipped on retry."""
    global _key_cycle
    with _key_cycle_lock:
        if _key_cycle is None:
            _key_cycle = itertools.cycle(settings.MISTRAL_API_KEYS)
        return next(_key_cycle)


def _extract_json(text: str):
    """Strip markdown code fences and pull out the first JSON object/array."""
    text = text.strip()
    text = re.sub(r"^```(json)?", "", text.strip(), flags=re.IGNORECASE).strip()
    text = re.sub(r"```$", "", text.strip()).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    for opener, closer in (("{", "}"), ("[", "]")):
        start = text.find(opener)
        end = text.rfind(closer)
        if start != -1 and end != -1 and end > start:
            candidate = text[start:end + 1]
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue
    raise HTTPException(status_code=502, detail="The AI response could not be parsed. Please try again.")


def call_mistral_json(system_prompt: str, user_prompt: str, max_tokens: int = 4000) -> dict:
    """Call the Mistral chat completions API in JSON mode and return the parsed dict.

    If multiple keys are configured (MISTRAL_API_KEYS=key1,key2,...), this rotates
    across them on every call (spreading load so no single key hits its rate limit
    as fast) and automatically fails over to the next key if one comes back
    rate-limited (429) or rejected (401) - handy for live demos.
    """
    _ensure_enabled()

    num_keys = len(settings.MISTRAL_API_KEYS)
    last_status = None
    last_detail = None

    for _ in range(num_keys):
        key = _next_key()
        payload = {
            "model": settings.MISTRAL_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "max_tokens": max_tokens,
            "temperature": 0.3,
        }
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=90) as client:
                resp = client.post(MISTRAL_CHAT_URL, json=payload, headers=headers)
        except httpx.RequestError as exc:
            last_status, last_detail = 502, f"Could not reach the Mistral API: {exc}"
            continue

        if resp.status_code == 429:
            last_status, last_detail = 429, "rate limited"
            continue  # try the next key, if any
        if resp.status_code == 401:
            last_status, last_detail = 401, "rejected this API key"
            continue  # this key may be bad/expired - try the next one

        if resp.status_code >= 400:
            detail = resp.text
            try:
                detail = resp.json().get("message", detail)
            except Exception:  # noqa: BLE001
                pass
            raise HTTPException(status_code=502, detail=f"Mistral API error ({resp.status_code}): {detail}")

        data = resp.json()
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError):
            raise HTTPException(status_code=502, detail="Unexpected response shape from Mistral API.")

        if not content or not content.strip():
            raise HTTPException(status_code=502, detail="The AI returned an empty response. Please try again.")

        return _extract_json(content)

    # Every configured key failed the same way
    if last_status == 429:
        raise HTTPException(
            status_code=429,
            detail=(
                f"All {num_keys} configured Mistral API key(s) are currently rate-limited. "
                "Add another key to MISTRAL_API_KEYS in backend/.env, or wait a bit and try again."
            ),
        )
    if last_status == 401:
        raise HTTPException(
            status_code=400,
            detail=f"None of the {num_keys} configured Mistral API key(s) were accepted. Check MISTRAL_API_KEYS in backend/.env.",
        )
    raise HTTPException(status_code=502, detail=last_detail or "Could not reach the Mistral API.")
