"""
Column mapping service with optional LLM enhancement via LiteLLM.
"""

import os
import json
import logging
import hashlib
from typing import List, Dict, Optional
import litellm
import redis
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)

# Configure LiteLLM
litellm.set_verbose = False

# Initialize Redis client (optional, for caching)
try:
    redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
    redis_client.ping()
    redis_available = True
except (RedisError, Exception):
    redis_client = None
    redis_available = False
    logger.info("Redis not available, caching disabled")


async def enhance_column_mappings(
    upload_columns: List[Dict], template_columns: List[Dict]
) -> List[Dict]:
    """
    Enhance column mappings using LLM if available.
    Falls back gracefully if not configured.

    Args:
        upload_columns: List of upload column dicts with 'name' and optional 'sample_data'
        template_columns: List of template column dicts with 'key', 'name', and 'required'

    Returns:
        List of mapping suggestions with uploadIndex, templateKey, and confidence
    """
    # Check if LLM is configured
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "your-openai-api-key-here":
        logger.debug("OpenAI API key not configured, skipping LLM enhancement")
        return []

    # Check cache first if Redis is available
    if redis_available:
        cache_key = _get_cache_key(upload_columns, template_columns)
        try:
            cached = redis_client.get(cache_key)
            if cached:
                logger.info("Using cached mapping suggestions")
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Cache read failed: {e}")

    try:
        # Build prompt
        prompt = _build_mapping_prompt(upload_columns, template_columns)

        # Use LiteLLM with OpenAI (can easily switch providers later)
        response = await litellm.acompletion(
            model="gpt-4.1",
            messages=[
                {
                    "role": "system",
                    "content": "You are a data mapping expert. Return ONLY valid JSON array with no explanation or markdown.",
                },
                {"role": "user", "content": prompt},
            ],
            api_key=os.getenv("OPENAI_API_KEY"),
        )

        # Parse response
        content = response.choices[0].message.content
        mappings = _parse_llm_response(content)

        # Cache for 24 hours if Redis is available
        if mappings and redis_available:
            try:
                redis_client.setex(cache_key, 86400, json.dumps(mappings))
            except Exception as e:
                logger.warning(f"Cache write failed: {e}")

        logger.info(f"Generated {len(mappings)} mapping suggestions")
        return mappings

    except Exception as e:
        logger.error(f"LLM mapping enhancement failed: {e}")
        return []


def _get_cache_key(upload_cols: List[Dict], template_cols: List[Dict]) -> str:
    """Generate cache key from column structure."""
    data = {
        "upload": [c.get("name", "") for c in upload_cols],
        "template": [c.get("key", "") for c in template_cols],
    }
    data_str = json.dumps(data, sort_keys=True)
    return f"mapping:{hashlib.md5(data_str.encode()).hexdigest()}"


def _build_mapping_prompt(upload_cols: List[Dict], template_cols: List[Dict]) -> str:
    """Build prompt for LLM."""
    # Prepare upload column info with sample data
    upload_info = []
    for i, col in enumerate(upload_cols):
        info = {"index": i, "name": col.get("name", "")}
        # Add sample data if available
        sample_data = col.get("sample_data", [])
        if sample_data and len(sample_data) > 0 and sample_data[0]:
            info["sample"] = str(sample_data[0])
        upload_info.append(info)

    # Prepare template field info
    template_info = []
    for col in template_cols:
        template_info.append(
            {
                "key": col.get("key", ""),
                "name": col.get("name", ""),
                "required": col.get("required", False),
            }
        )

    return f"""Map these CSV columns to the template fields based on column names and sample data.

CSV columns:
{json.dumps(upload_info, indent=2)}

Template fields:
{json.dumps(template_info, indent=2)}

Return ONLY a JSON array of mappings. Each mapping should have:
- uploadIndex: the index of the CSV column (number)
- templateKey: the key of the template field (string)
- confidence: how confident you are in this mapping from 0 to 1 (number)

Example format:
[{{"uploadIndex": 0, "templateKey": "email", "confidence": 0.95}}]

Rules:
1. Only include mappings with confidence > 0.7
2. Each template field can only be mapped once
3. Consider both column names and sample data
4. Common variations should be recognized (e.g., "Email Address" -> "email")
5. Return empty array [] if no good matches found"""


def _parse_llm_response(content: str) -> List[Dict]:
    """Parse LLM response to extract mappings."""
    try:
        # Clean up content - remove markdown if present
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        # Try direct JSON parse
        mappings = json.loads(content)
        if isinstance(mappings, list):
            # Validate structure
            valid_mappings = []
            for mapping in mappings:
                if (
                    isinstance(mapping, dict)
                    and "uploadIndex" in mapping
                    and "templateKey" in mapping
                    and "confidence" in mapping
                ):
                    valid_mappings.append(
                        {
                            "uploadIndex": int(mapping["uploadIndex"]),
                            "templateKey": str(mapping["templateKey"]),
                            "confidence": float(mapping["confidence"]),
                        }
                    )
            return valid_mappings
    except json.JSONDecodeError:
        # Try to extract JSON array from text
        import re

        json_match = re.search(r"\[.*?\]", content, re.DOTALL)
        if json_match:
            try:
                mappings = json.loads(json_match.group())
                if isinstance(mappings, list):
                    # Validate and return
                    valid_mappings = []
                    for mapping in mappings:
                        if (
                            isinstance(mapping, dict)
                            and "uploadIndex" in mapping
                            and "templateKey" in mapping
                            and "confidence" in mapping
                        ):
                            valid_mappings.append(
                                {
                                    "uploadIndex": int(mapping["uploadIndex"]),
                                    "templateKey": str(mapping["templateKey"]),
                                    "confidence": float(mapping["confidence"]),
                                }
                            )
                    return valid_mappings
            except:
                pass
    except Exception as e:
        logger.error(f"Failed to parse LLM response: {e}")

    return []
