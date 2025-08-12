# LLM-Enhanced Column Mapping

## Overview

ImportCSV now includes optional LLM-enhanced column mapping that intelligently maps CSV columns to your template fields using LiteLLM. This feature is completely invisible to users - they just see better automatic mappings.

## How It Works

1. **String Similarity First**: Basic matching happens instantly (client-side)
2. **LLM Enhancement**: If configured, LLM suggestions enhance the mappings asynchronously
3. **Graceful Degradation**: If LLM is unavailable, the importer works normally with string matching

## Setup

### 1. Get an OpenAI API Key

Sign up at [OpenAI Platform](https://platform.openai.com/api-keys) and create an API key.

### 2. Configure Backend

Add your OpenAI API key to the backend `.env` file:

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

### 3. Install Dependencies

```bash
cd backend
pip install -r requirements.txt  # Includes litellm and slowapi
```

### 4. Test the Setup

```bash
cd backend
python test_mapping.py
```

You should see mapping suggestions with confidence scores.

## How Mapping Works

The LLM service considers:
- Column names and variations
- Sample data from the first row
- Required vs optional fields
- Common naming patterns

Example mappings:
- `Email Address` → `email` (95% confidence)
- `Full Name` → could map to `name` or suggest split
- `Phone` → `phoneNumber` (90% confidence)
- `Company` → `organization` (85% confidence)

## Architecture

```
React Frontend                FastAPI Backend
     |                              |
     | (upload CSV)                 |
     |----------------------------> |
     | (get initial mappings)       |
     |                              |
     |                          String Similarity
     |                          (instant, 0ms)
     |                              |
     | <----------------------------|
     | (display mappings)           |
     |                              |
     |                          LLM Enhancement
     |                          (async, 100-500ms)
     |                              ↓
     |                        LiteLLM → OpenAI
     |                              ↓
     | (enhanced mappings)      (if available)
     | <----------------------------|
```

## Security & Performance

### Rate Limiting
- **20 requests/hour** per IP address
- Silent fallback when limit exceeded
- No error messages shown to users

### Caching
- Results cached in Redis for 24 hours
- Cache key based on column structure
- ~80% cache hit rate expected

### Cost Control
- Uses GPT-3.5-turbo (cheapest model)
- ~$0.0001 per unique import pattern
- Most requests served from cache (free)

## Without LLM Configuration

If `OPENAI_API_KEY` is not set:
- The importer works exactly as before
- Uses string similarity matching (90% threshold)
- No errors or warnings shown to users
- No degradation in performance

## Monitoring

Check backend logs for mapping activity:
```bash
# View all mapping logs
tail -f backend/logs/app.log | grep "mapping"

# Check cache hits
redis-cli
> KEYS mapping:*
```

## Provider Flexibility

Using LiteLLM allows easy provider switching:

```python
# Current (OpenAI)
model="gpt-3.5-turbo"

# Future options (just change model string)
model="claude-3-haiku"         # Anthropic
model="gemini-pro"             # Google
model="azure/gpt-35-turbo"     # Azure OpenAI
model="ollama/llama3"          # Local model
```

## API Endpoint

The mapping suggestions are available at:
```
POST /v1/imports/key/mapping-suggestions
{
  "importerKey": "your-key",
  "uploadColumns": [...],
  "templateColumns": [...]
}
```

Returns:
```json
{
  "success": true,
  "mappings": [
    {
      "uploadIndex": 0,
      "templateKey": "email",
      "confidence": 0.95
    }
  ]
}
```

## Future Improvements

- Increase rate limits for premium users
- Support for batch mapping requests
- User-specific mapping history
- Fine-tuning on your domain data
- Edge deployment with Cloudflare Workers AI