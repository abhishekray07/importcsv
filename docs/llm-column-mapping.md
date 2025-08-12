# LLM-Enhanced Column Mapping

## Overview

The CSV importer now includes optional LLM-enhanced column mapping that intelligently maps CSV columns to template fields using AI. This feature is completely invisible to end users - it simply makes the column mapping more accurate.

## Features

- **Intelligent Mapping**: Uses GPT-3.5-turbo to analyze column names and sample data
- **Automatic Fallback**: Falls back to string similarity if LLM is unavailable
- **Redis Caching**: Caches mapping suggestions for 24 hours to reduce API calls
- **Rate Limiting**: Limits to 20 requests per hour per IP address (using Redis)
- **Frontend Optimization**: Only makes one API call per mapping session

## Configuration

### Backend Setup

1. **Set OpenAI API Key**:
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

2. **Ensure Redis is Running**:
   ```bash
   docker-compose up redis
   ```

3. **Install Dependencies**:
   ```bash
   pip install litellm==1.52.0 slowapi==0.1.9
   ```

### How It Works

1. When a user uploads a CSV file, the frontend sends column information to the backend
2. The backend uses LLM to analyze column names and sample data
3. Mapping suggestions with confidence scores are returned
4. Only suggestions with >70% confidence are automatically applied
5. Users can still manually adjust any mappings

## API Endpoint

### POST `/api/v1/imports/key/mapping-suggestions`

Rate limited to 20 requests per hour per IP address.

**Request Body**:
```json
{
  "importerKey": "uuid",
  "uploadColumns": [
    {
      "name": "column_name",
      "sample_data": ["sample1", "sample2"]
    }
  ],
  "templateColumns": [
    {
      "key": "field_key",
      "name": "Field Name",
      "required": true
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "mappings": [
    {
      "uploadIndex": 0,
      "templateKey": "field_key",
      "confidence": 0.95
    }
  ]
}
```

## Cost Optimization

- **Caching**: Results cached in Redis for 24 hours
- **Rate Limiting**: 20 requests/hour prevents abuse
- **Frontend Deduplication**: useRef ensures only one API call per session
- **Confidence Threshold**: Only high-confidence mappings are applied

## Fallback Behavior

If LLM enhancement is unavailable (no API key, rate limited, or error):
- System falls back to string similarity matching
- No user-visible errors
- Mapping still works, just less intelligently

## Security

- Rate limiting prevents abuse
- Importer key validation ensures authorized access
- No sensitive data is sent to OpenAI (only column names and sample data)
- All requests are logged for audit purposes

## Testing

Run the included test script to verify rate limiting:

```bash
python test_rate_limit.py
```

This will:
- Make 25 requests to test the 20/hour limit
- Verify Redis storage is being used
- Show when rate limiting kicks in

## Monitoring

The feature is completely transparent, but you can monitor:
- Redis cache hits: Check for `mapping:*` keys
- Rate limit status: Monitor 429 responses
- LLM API usage: Track OpenAI API dashboard

## Future Improvements

- Support for other LLM providers (Anthropic, Google, etc.)
- Adjustable confidence thresholds per importer
- Machine learning from user corrections
- Batch processing for large files