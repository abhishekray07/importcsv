"""
Natural language data transformation service using LLM - Simplified version.
"""

import json
import logging
import os

import litellm

logger = logging.getLogger(__name__)

# Configure LiteLLM
litellm.set_verbose = False

# Constants
MIN_CONFIDENCE_THRESHOLD = 0.7

# Validation rule definitions to help LLM understand what makes data valid
VALIDATION_RULES = {
    "email must be a valid email address": {
        "type": "email",
        "rule": "Email must contain @ symbol, domain, and TLD (.com, .org, etc.)",
        "pattern": "username@domain.tld",
        "examples": {
            "valid": ["user@example.com", "john.doe@company.org", "info@website.co.uk"],
            "invalid": ["user[at]example.com", "user@example", "userexample.com",
                        "@.com", "user@sample"]
        },
        "common_fixes": {
            "[at]": "Replace [at] with @",
            "missing .com after @example": "Add .com to complete the domain",
            "missing @ symbol": "Add @ between username and domain",
            "@.com pattern": "Add domain name before .com",
            "@sample": "Replace with valid domain like @example.com"
        }
    },
    "must be a number": {
        "type": "number",
        "rule": "Value must be a valid number (integer or decimal)",
        "examples": {
            "valid": ["123", "45.67", "-100", "0.5"],
            "invalid": ["abc", "12.34.56", "1,234", "five"]
        },
        "common_fixes": {
            "letters": "Remove non-numeric characters",
            "multiple decimals": "Keep only one decimal point",
            "commas": "Remove comma separators"
        }
    },
    "must be a valid date": {
        "type": "date",
        "rule": "Date must be in a recognized format like YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY",
        "examples": {
            "valid": ["2024-01-15", "01/15/2024", "15/01/2024", "Jan 15, 2024"],
            "invalid": ["1234", "2024", "invalid-date", "32/13/2024"]
        },
        "common_fixes": {
            "year only": "Add month and day (e.g., 2024 → 2024-01-01)",
            "invalid format": "Reformat to YYYY-MM-DD or MM/DD/YYYY"
        }
    }
}


class TransformationResult:
    """Result of a transformation operation"""

    def __init__(self):
        self.changes: list[dict] = []
        self.summary: str = ""
        self.error: str | None = None
        self.tokens_used: int = 0

    def to_dict(self):
        return {
            "changes": self.changes,
            "summary": self.summary,
            "error": self.error,
            "tokens_used": self.tokens_used,
        }


async def generate_transformations(
    prompt: str,
    data: list[dict],
    column_mapping: dict[str, str],
    target_columns: list[str] | None = None,
    validation_errors: list[dict] | None = None,
    max_rows: int = 1000,
) -> TransformationResult:
    """
    Generate data transformations based on natural language prompt.

    Simplified version that:
    1. Identifies relevant columns
    2. Extracts data for those columns
    3. If validation errors exist, focuses on fixing those specific rows
    4. Returns transformations
    """
    result = TransformationResult()

    # Check if LLM is configured
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "your-openai-api-key-here":
        result.error = "OpenAI API key not configured"
        return result

    try:
        # Step 1: Identify relevant columns if not provided
        if not target_columns:
            target_columns = await _identify_relevant_columns(prompt, column_mapping, api_key)

        # Step 2: Determine which rows to process
        if validation_errors:
            # Extract row indices from validation errors
            rows_to_process = list({
                e.get("rowIndex", -1) for e in validation_errors
                if e.get("rowIndex", -1) >= 0
            })
            rows_to_process.sort()
            intent = "fix_errors"
            logger.info(f"Processing {len(rows_to_process)} rows with validation errors")
        else:
            # Process all rows (up to max_rows)
            rows_to_process = list(range(min(len(data), max_rows)))
            intent = "transform_all"
            logger.info(f"Processing all {len(rows_to_process)} rows")

        # Step 3: Extract data for target columns and specific rows
        data_for_llm = []
        col_indices = _get_column_indices(target_columns, column_mapping)

        for row_idx in rows_to_process:
            if row_idx < len(data):
                row = data[row_idx]
                row_data = {}

                # Extract values for each target column
                for col_name, col_idx in col_indices.items():
                    if isinstance(row, dict) and "values" in row:
                        values = row["values"]
                        if col_idx < len(values):
                            row_data[col_name] = values[col_idx]
                    elif hasattr(row, "values"):
                        values = row.values if not callable(row.values) else list(row.values())
                        if col_idx < len(values):
                            row_data[col_name] = values[col_idx]

                if row_data:
                    data_for_llm.append({"row_index": row_idx, "data": row_data})

        # Step 4: Build prompt for LLM
        llm_prompt = _build_simple_prompt(prompt, data_for_llm, validation_errors, intent)

        # Step 5: Call LLM for transformations
        response = await litellm.acompletion(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a data transformation expert. Generate specific "
                        "transformations for data rows. Return ONLY valid JSON. "
                        "You MUST fix ALL rows with errors, not just a subset."
                    )
                },
                {"role": "user", "content": llm_prompt}
            ],
            api_key=api_key,
            max_tokens=4000,  # Increase max tokens to handle more transformations
        )

        # Step 6: Parse response and build changes
        content = response.choices[0].message.content
        transformations = _parse_transformation_response(content)

        # Step 7: Convert to changes format with column indices
        result.changes = _build_changes(transformations, col_indices)
        result.summary = _generate_summary(result.changes)

        logger.info(f"Generated {len(result.changes)} transformations")

    except Exception as e:
        logger.error(f"Transformation failed: {e}")
        result.error = str(e)

    return result


async def _identify_relevant_columns(
    prompt: str, column_mapping: dict[str, str], api_key: str
) -> list[str]:
    """Identify which columns are relevant for the transformation."""
    # Extract column names
    available_columns = []
    for col_val in list(column_mapping.values()):
        if isinstance(col_val, dict):
            col_name = col_val.get("key") or col_val.get("name")
        else:
            col_name = col_val
        if col_name:
            available_columns.append(col_name)

    # Ask LLM which columns are relevant
    prompt_text = f"""
Given this user request: "{prompt}"
And these available columns: {json.dumps(available_columns)}

Which columns are relevant for this transformation?
Return ONLY a JSON array of column names, e.g., ["email"] or ["phone", "mobile"]
"""

    try:
        response = await litellm.acompletion(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Return only a JSON array of column names."},
                {"role": "user", "content": prompt_text}
            ],
            api_key=api_key,
        )

        content = response.choices[0].message.content.strip()
        # Parse JSON array
        if content.startswith("[") and content.endswith("]"):
            selected = json.loads(content)
            return [col for col in selected if col in available_columns]
    except Exception as e:
        logger.error(f"Column identification failed: {e}")

    # Fallback: return all columns
    return available_columns


def _get_column_indices(
    target_columns: list[str], column_mapping: dict[str, str]
) -> dict[str, int]:
    """Get column indices for target columns."""
    col_indices = {}
    for idx, col_info in column_mapping.items():
        col_name = None
        if isinstance(col_info, dict):
            col_name = col_info.get("key") or col_info.get("name")
        elif isinstance(col_info, str):
            col_name = col_info

        if col_name and col_name in target_columns:
            col_indices[col_name] = int(idx)

    return col_indices


def _build_simple_prompt(
    prompt: str, data_for_llm: list[dict], validation_errors: list[dict] | None, intent: str
) -> str:
    """Build a simple, clear prompt for the LLM."""

    if intent == "fix_errors" and validation_errors:
        # Build error summary and collect unique validation types
        error_summary = {}
        validation_types = set()

        for error in validation_errors:
            row_idx = error.get("rowIndex", -1)
            col_key = error.get("columnKey", "unknown")
            message = error.get("message", "")
            value = error.get("value", "")

            if col_key not in error_summary:
                error_summary[col_key] = []
            error_summary[col_key].append({
                "row": row_idx,
                "value": value,
                "error": message
            })

            # Check if this error type has a validation rule
            for rule_key in VALIDATION_RULES:
                if rule_key in message.lower():
                    validation_types.add(rule_key)

        # Build validation context section
        validation_context = ""
        if validation_types:
            validation_context = "\nVALIDATION RULES:\n"
            for rule_key in validation_types:
                rule = VALIDATION_RULES[rule_key]
                validation_context += f"\nFor '{rule_key}':\n"
                validation_context += f"- Rule: {rule['rule']}\n"
                validation_context += f"- Pattern: {rule.get('pattern', 'N/A')}\n"
                validation_context += f"- Valid examples: {', '.join(rule['examples']['valid'])}\n"
                invalid_examples = ", ".join(rule["examples"]["invalid"])
                validation_context += f"- Invalid examples: {invalid_examples}\n"
                validation_context += "- Common fixes:\n"
                for fix_pattern, fix_instruction in rule["common_fixes"].items():
                    validation_context += f"  * {fix_pattern}: {fix_instruction}\n"

        return f"""
Fix ONLY these rows with validation errors:

Errors to fix:
{json.dumps(error_summary, indent=2)}

Data for error rows:
{json.dumps(data_for_llm, indent=2)}
{validation_context}
User request: {prompt}

IMPORTANT:
- ONLY fix the rows listed above
- Each row should be fixed according to its error message and validation rules
- Return transformations ONLY for rows with errors
- Do NOT change any other rows
- You MUST fix ALL {len(validation_errors)} rows listed in the errors above
- Generate exactly {len(validation_errors)} transformations, one for each error

Return JSON in this format:
{{
  "transformations": [
    {{
      "row_index": 0,
      "column": "email",
      "old_value": "bad.email",
      "new_value": "bad.email@example.com",
      "confidence": 0.95
    }}
  ]
}}
"""
    return f"""
Transform this data according to the user's request.

User request: {prompt}

Data to transform:
{json.dumps(data_for_llm, indent=2)}

Return JSON in this format:
{{
  "transformations": [
    {{
      "row_index": 0,
      "column": "email",
      "old_value": "old@example.com",
      "new_value": "new@example.com",
      "confidence": 0.95
    }}
  ]
}}
"""


def _parse_transformation_response(content: str) -> list[dict]:
    """Parse LLM response to extract transformations."""
    try:
        # Clean up content
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        # Parse JSON
        data = json.loads(content)

        # Extract transformations
        if isinstance(data, dict) and "transformations" in data:
            return data["transformations"]
        if isinstance(data, list):
            return data
        return []
    except Exception as e:
        logger.error(f"Failed to parse response: {e}")
        return []


def _build_changes(transformations: list[dict], col_indices: dict[str, int]) -> list[dict]:
    """Convert transformations to changes format with column indices."""
    changes = []

    for trans in transformations:
        row_index = trans.get("row_index")
        column = trans.get("column")
        old_value = trans.get("old_value")
        new_value = trans.get("new_value")
        confidence = trans.get("confidence", 0.8)

        # Skip low confidence
        if confidence < MIN_CONFIDENCE_THRESHOLD:
            continue

        # Get column index
        column_index = col_indices.get(column)
        if column_index is None:
            continue

        # Create change record
        change = {
            "rowIndex": row_index,
            "columnKey": column,
            "columnIndex": column_index,
            "oldValue": old_value,
            "newValue": new_value,
            "confidence": confidence,
            "selected": True,
        }

        changes.append(change)

    return changes


def _generate_summary(changes: list[dict]) -> str:
    """Generate summary of changes."""
    if not changes:
        return "No transformations needed"

    # Group by column
    columns_affected = {}
    for change in changes:
        col = change.get("columnKey", "unknown")
        if col not in columns_affected:
            columns_affected[col] = 0
        columns_affected[col] += 1

    # Build summary
    if len(columns_affected) == 1:
        col = next(iter(columns_affected.keys()))
        count = columns_affected[col]
        return f"{count} {col} value{'s' if count > 1 else ''} will be transformed"

    total = len(changes)
    return f"{total} values across {len(columns_affected)} columns will be transformed"
