"""
Gemini LLM extraction module.
Uses structured Gemini prompts with JSON output to extract
visa data, job postings, and candidate profiles from raw HTML/text.
"""

import os
import json
import logging
from enum import Enum
from typing import Optional

import google.generativeai as genai

logger = logging.getLogger("crawl4ai.extractor")

# ─── Configuration ───

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class ExtractionType(str, Enum):
    VISA = "visa"
    JOB = "job"
    CANDIDATE = "candidate"


def _get_model():
    """Create a Gemini GenerativeModel instance."""
    return genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.1,
            "max_output_tokens": 8192,
        },
    )


# ─── Visa data extraction ───

VISA_EXTRACTION_PROMPT = """You are an immigration law expert. Extract structured visa/immigration rule data from the following webpage content.

Country: {country}

Extract ALL visa types, work permits, and immigration pathways mentioned. For each visa type, extract:

Return a JSON object with this exact schema:
{{
  "visa_rules": [
    {{
      "visa_type": "string — e.g., H-1B, Blue Card, L Permit",
      "title": "string — full official name",
      "description": "string — brief description of the visa/permit",
      "sponsorship_required": true/false,
      "process_steps": [
        {{
          "order": 1,
          "title": "string",
          "description": "string",
          "duration_days": number or null,
          "required_documents": ["list", "of", "documents"],
          "notes": "string or null"
        }}
      ],
      "timeline_days_min": number or null,
      "timeline_days_max": number or null,
      "cost_usd": number or null,
      "fee_currency": "string — original currency code",
      "required_documents": ["list", "of", "all", "required", "documents"],
      "eligible_occupations": ["list", "of", "eligible", "occupations"],
      "min_salary": number or null,
      "min_experience_years": number or null,
      "education_requirements": "string or null",
      "quota_limited": true/false,
      "annual_quota": number or null,
      "notes": "string — any additional important notes",
      "source_url": "string — the original URL if mentioned"
    }}
  ],
  "country": "{country}",
  "last_updated": "string — date if mentioned on the page, else null",
  "confidence": number between 0 and 1
}}

If information is not found for a field, use null. Extract as many visa types as are described.

Webpage content:
{content}"""


async def extract_visa_data(html: str, country: str) -> dict:
    """
    Extract visa/immigration rules from HTML content using Gemini.

    Args:
        html: Raw HTML or extracted text from an immigration portal
        country: 2-letter country code (e.g., US, CH, DE)

    Returns:
        Structured visa data dictionary
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is required for extraction")

    # Truncate very long content to fit context window
    content = html[:50000] if len(html) > 50000 else html

    prompt = VISA_EXTRACTION_PROMPT.format(country=country, content=content)

    try:
        model = _get_model()
        response = await model.generate_content_async(prompt)

        if not response.text:
            logger.warning("Empty response from Gemini for visa extraction")
            return {"visa_rules": [], "country": country, "error": "Empty response"}

        data = json.loads(response.text)
        logger.info(
            "Extracted %d visa rules for %s",
            len(data.get("visa_rules", [])),
            country,
        )
        return data

    except json.JSONDecodeError as exc:
        logger.error("Failed to parse Gemini response as JSON: %s", exc)
        # Try to salvage partial JSON
        try:
            text = response.text if response and response.text else ""
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
        except Exception:
            pass
        return {"visa_rules": [], "country": country, "error": str(exc)}

    except Exception as exc:
        logger.exception("Visa extraction failed for %s", country)
        return {"visa_rules": [], "country": country, "error": str(exc)}


# ─── Job data extraction ───

JOB_EXTRACTION_PROMPT = """You are a recruitment data extraction expert. Extract structured job posting data from the following webpage content.

Return a JSON object with this exact schema:
{{
  "jobs": [
    {{
      "title": "string — job title",
      "company": "string or null",
      "description": "string — full job description",
      "requirements": ["list", "of", "requirements"],
      "nice_to_haves": ["list", "of", "nice", "to", "haves"],
      "skills_required": ["list", "of", "technical", "skills"],
      "job_type": "full-time | part-time | contract | freelance | internship",
      "work_mode": "remote | hybrid | onsite",
      "seniority": "string — junior, mid, senior, lead, etc.",
      "country": "string — 2-letter country code or null",
      "city": "string or null",
      "salary_min": number or null,
      "salary_max": number or null,
      "salary_currency": "string — e.g., USD, EUR, CHF",
      "visa_sponsorship": true/false,
      "experience_min": number or null,
      "experience_max": number or null,
      "education_level": "string or null",
      "industry": "string or null",
      "remote_ok": true/false,
      "application_url": "string or null"
    }}
  ],
  "confidence": number between 0 and 1
}}

Extract ALL job postings found on the page. If information is not available for a field, use null.

Webpage content:
{content}"""


async def extract_job_data(html: str) -> dict:
    """
    Extract job posting data from HTML content using Gemini.

    Args:
        html: Raw HTML or extracted text from a job board page

    Returns:
        Structured job data dictionary
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is required for extraction")

    content = html[:50000] if len(html) > 50000 else html
    prompt = JOB_EXTRACTION_PROMPT.format(content=content)

    try:
        model = _get_model()
        response = await model.generate_content_async(prompt)

        if not response.text:
            logger.warning("Empty response from Gemini for job extraction")
            return {"jobs": [], "error": "Empty response"}

        data = json.loads(response.text)
        logger.info("Extracted %d jobs", len(data.get("jobs", [])))
        return data

    except json.JSONDecodeError as exc:
        logger.error("Failed to parse Gemini response as JSON: %s", exc)
        try:
            text = response.text if response and response.text else ""
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
        except Exception:
            pass
        return {"jobs": [], "error": str(exc)}

    except Exception as exc:
        logger.exception("Job extraction failed")
        return {"jobs": [], "error": str(exc)}


# ─── Candidate data extraction ───

CANDIDATE_EXTRACTION_PROMPT = """You are a recruitment data extraction expert. Extract structured candidate/profile data from the following webpage content.

Return a JSON object with this exact schema:
{{
  "candidates": [
    {{
      "name": "string — full name",
      "email": "string or null",
      "phone": "string or null",
      "headline": "string — professional headline or null",
      "bio": "string — summary/about section or null",
      "skills": ["list", "of", "skills"],
      "location": "string or null",
      "country": "string — 2-letter country code or null",
      "city": "string or null",
      "experience_years": number or null,
      "education": [
        {{
          "institution": "string",
          "degree": "string",
          "field": "string",
          "start_year": number,
          "end_year": number or null
        }}
      ],
      "work_history": [
        {{
          "company": "string",
          "title": "string",
          "description": "string or null",
          "start_date": "YYYY-MM-DD",
          "end_date": "YYYY-MM-DD or null",
          "is_current": true/false,
          "skills": ["list", "of", "skills"]
        }}
      ],
      "languages": ["list", "of", "languages"],
      "certifications": ["list", "of", "certifications"],
      "visa_status": "string or null",
      "available_now": true/false,
      "open_to_relocation": true/false
    }}
  ],
  "confidence": number between 0 and 1
}}

Extract ALL candidate profiles found on the page. If information is not available for a field, use null.

Webpage content:
{content}"""


async def extract_candidate_data(html: str) -> dict:
    """
    Extract candidate/profile data from HTML content using Gemini.

    Args:
        html: Raw HTML or extracted text from a profile page

    Returns:
        Structured candidate data dictionary
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is required for extraction")

    content = html[:50000] if len(html) > 50000 else html
    prompt = CANDIDATE_EXTRACTION_PROMPT.format(content=content)

    try:
        model = _get_model()
        response = await model.generate_content_async(prompt)

        if not response.text:
            logger.warning("Empty response from Gemini for candidate extraction")
            return {"candidates": [], "error": "Empty response"}

        data = json.loads(response.text)
        logger.info("Extracted %d candidates", len(data.get("candidates", [])))
        return data

    except json.JSONDecodeError as exc:
        logger.error("Failed to parse Gemini response as JSON: %s", exc)
        try:
            text = response.text if response and response.text else ""
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
        except Exception:
            pass
        return {"candidates": [], "error": str(exc)}

    except Exception as exc:
        logger.exception("Candidate extraction failed")
        return {"candidates": [], "error": str(exc)}


# ─── Dispatcher ───


async def extract(
    html: str,
    extraction_type: ExtractionType,
    country: Optional[str] = None,
) -> dict:
    """
    Route extraction to the appropriate handler based on type.
    """
    match extraction_type:
        case ExtractionType.VISA:
            if not country:
                raise ValueError("Country is required for visa extraction")
            return await extract_visa_data(html, country)
        case ExtractionType.JOB:
            return await extract_job_data(html)
        case ExtractionType.CANDIDATE:
            return await extract_candidate_data(html)
        case _:
            raise ValueError(f"Unknown extraction type: {extraction_type}")
