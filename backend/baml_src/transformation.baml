// Data transformation functions for ImportCSV

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

// Test the function with a sample transformation request
test email_transformation {
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