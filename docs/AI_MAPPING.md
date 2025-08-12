# LLM-Enhanced Column Mapping

## Overview

The ImportCSV importer now includes optional AI-powered column mapping that intelligently maps CSV columns to your template fields. This feature is completely invisible to users - they just see better automatic mappings.

## How It Works

1. **Fallback Design**: String similarity matching happens first (instant)
2. **AI Enhancement**: If configured, AI suggestions enhance the mappings
3. **Graceful Degradation**: If AI is unavailable, the importer works normally

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
pip install -r requirements.txt  # Already includes openai
```

### 4. Test the Setup

```bash
cd backend
python test_ai_mapping.py
```

You should see mapping suggestions with confidence scores.

## How Mapping Works

The AI service considers:
- Column names
- Sample data from the first row
- Required vs optional fields
- Common naming patterns

Example mappings:
- `Email Address` → `email` (95% confidence)
- `Full Name` → `firstName` + `lastName` (suggested split)
- `Phone` → `phoneNumber` (90% confidence)
- `Company` → `organization` (85% confidence)

## Cost

- Uses GPT-3.5-turbo (cheapest model)
- ~$0.0001 per import (very low cost)
- Results are cached to avoid repeated API calls

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
     |                          AI Enhancement
     |                          (async, 100-500ms)
     |                              ↓
     |                           OpenAI API
     |                              ↓
     | (enhanced mappings)      (if available)
     | <----------------------------|
```

## Without AI Configuration

If `OPENAI_API_KEY` is not set:
- The importer works exactly as before
- Uses string similarity matching (90% threshold)
- No errors or warnings shown to users
- No degradation in performance

## Monitoring

Check backend logs for AI mapping activity:
```bash
tail -f backend/logs/app.log | grep "AI mapping"
```

## Future Improvements

- Support for other AI providers (Anthropic, Llama)
- Edge deployment with Cloudflare Workers AI
- User-specific mapping history
- Fine-tuning on your data patterns