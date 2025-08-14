// Data transformation functions for ImportCSV

// ============== Data Models ==============

// Validation rule structure for different data types
class ValidationRule {
  type string
  rule string
  pattern string?
  regex string?  // Actual regex pattern used for validation
  regex_description string?  // Human-readable description of the regex
  valid_examples string[]
  invalid_examples string[]
  common_fixes map<string, string>
}

// Error information from validation
class ValidationError {
  row_index int
  column_key string
  value string
  error_message string
}

// Row data structure
class RowData {
  row_index int
  data map<string, string>
}

// Single transformation
class Transformation {
  row_index int
  column string
  old_value string
  new_value string
  confidence float
}

// Result containing all transformations
class TransformationResult {
  transformations Transformation[]
}

// ============== Functions ==============

// Function to identify relevant columns for transformation
function IdentifyRelevantColumns(
  prompt: string,
  available_columns: string[]
) -> string[] {
  client "openai/gpt-4.1"
  prompt #"
    Given this user request: "{{ prompt }}"
    And these available columns: {{ available_columns }}

    Which columns are relevant for this transformation?

    Return ONLY the column names that are needed for the requested transformation.
    Be selective - only include columns that are directly relevant.

    {{ ctx.output_format }}
  "#
}

// Main function to fix validation errors with structured rules
// Note: validation_rules are passed from Python based on the error types detected
// No additional LLM call needed - rules are predefined in the application
function FixValidationErrors(
  user_prompt: string,
  validation_errors: ValidationError[],
  row_data: RowData[],
  validation_rules: map<string, ValidationRule>
) -> TransformationResult {
  client "openai/gpt-4o-mini"
  prompt #"
    Fix ONLY these rows with validation errors:

    Errors to fix:
    {{ validation_errors }}

    Data for error rows:
    {{ row_data }}

    VALIDATION RULES:
    {% for error_type, rule in validation_rules.items() %}
    For '{{ error_type }}':
    - Rule: {{ rule.rule }}
    - Pattern: {{ rule.pattern }}
    {% if rule.regex %}
    - Regex Pattern: {{ rule.regex }}
    - Format Description: {{ rule.regex_description }}
    {% endif %}
    - Valid examples: {{ rule.valid_examples }}
    - Invalid examples: {{ rule.invalid_examples }}
    - Common fixes:
      {% for pattern, fix in rule.common_fixes.items() %}
      * {{ pattern }}: {{ fix }}
      {% endfor %}
    {% endfor %}

    User request: {{ user_prompt }}

    IMPORTANT:
    - ONLY fix the rows listed above
    - Each row should be fixed according to its error message and validation rules
    - Return transformations ONLY for rows with errors
    - Do NOT change any other rows
    - You MUST fix ALL {{ validation_errors | length }} rows listed in the errors above
    - Generate exactly {{ validation_errors | length }} transformations, one for each error

    {{ ctx.output_format }}
  "#
}

// General transformation function for data without validation errors
function TransformDataGeneral(
  user_prompt: string,
  row_data: RowData[]
) -> TransformationResult {
  client "openai/gpt-4.1"
  prompt #"
    Transform this data according to the user's request.

    User request: {{ user_prompt }}

    Data to transform:
    {{ row_data }}

    Return transformations for the data based on the user's request.
    Be confident in your transformations and set confidence scores appropriately.

    {{ ctx.output_format }}
  "#
}

// ============== Test Cases ==============

// Test the function with a sample transformation request
test identify_email_columns {
  functions [IdentifyRelevantColumns]
  args {
    prompt "Fix all email addresses with an error"
    available_columns [
      "name",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "zip",
      "country",
      "date_joined",
      "last_login"
    ]
  }
}

