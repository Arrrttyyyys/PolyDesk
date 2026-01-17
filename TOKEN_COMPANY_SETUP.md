# Token Company API Setup

## ✅ Integration Status

The Token Company API is fully integrated and ready to use with your API key.

## API Details

- **Model**: `bear-1` (free access)
- **Endpoint**: `https://api.thetokencompany.com/v1/compress`
- **Authentication**: Bearer token in Authorization header

## Request Format

```json
{
  "model": "bear-1",
  "text": "Your text to compress...",
  "compression_settings": {
    "aggressiveness": 0.7
  }
}
```

## Response Format

```json
{
  "output": "Compressed text...",
  "output_tokens": 150,
  "original_input_tokens": 500,
  "compression_time": 0.5
}
```

## Aggressiveness Levels

- **0.1-0.3**: Light compression (removes obvious filler)
- **0.4-0.6**: Moderate (good balance) ⭐ Recommended
- **0.7-0.9**: Aggressive (large savings, higher risk of losing nuance)

## Environment Variable

Make sure your `.env.local` has:

```env
TOKEN_COMPANY_API_KEY=your_api_key_here
TOKEN_COMPANY_API_URL=https://api.thetokencompany.com/v1
```

## Testing

You can test the compression API directly:

```bash
curl -X POST http://localhost:3000/api/compress \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a test article about prediction markets and trading strategies.",
    "aggressiveness": 0.7
  }'
```

## Usage in App

The compression API is automatically called:
1. **During "Fetch Research"**: Articles are compressed before being sent to the LLM
2. **In Trade Memo Builder**: Portfolio context is compressed before generating the memo

## Error Handling

The API route handles:
- Missing API key (returns 500)
- Invalid request format (returns 400)
- Token Company API errors (returns the API's status code)
- Network errors (returns 500 with error details)

## Notes

- Free access to bear-1 model
- No published rate limits (check your dashboard)
- Response includes compression metrics (tokens saved, compression time)

