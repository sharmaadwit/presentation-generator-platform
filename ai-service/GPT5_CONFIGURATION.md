# GPT-5 Configuration

This AI service is configured to use **GPT-5 with low thinking mode** for optimal performance and cost efficiency.

## Configuration Details

### Model Used
- **Model**: `gpt-5`
- **Thinking Mode**: `low` (configured via `extra_body` parameter)
- **Temperature**: `0.3` for analysis, `0.7` for content enhancement
- **Max Tokens**: `1000` for analysis, `500` for enhancement

### Usage in Code

The GPT-5 configuration is implemented in `services/content_matcher.py`:

```python
response = self.openai_client.chat.completions.create(
    model="gpt-5",
    messages=[{"role": "user", "content": prompt}],
    temperature=0.3,
    max_tokens=1000,
    extra_body={
        "thinking_mode": "low"
    }
)
```

### Features Using GPT-5

1. **Slide Analysis**: Analyzes slides for relevance to user requirements
2. **Content Enhancement**: Enhances slide content for better presentation quality

### Environment Variables

Make sure the following environment variable is set:
- `OPENAI_API_KEY`: Your OpenAI API key with GPT-5 access

### Testing

Run the test script to verify GPT-5 configuration:
```bash
cd ai-service
python test_gpt5.py
```

### Benefits of Low Thinking Mode

- **Faster Response Times**: Reduced processing time for quicker results
- **Cost Efficiency**: Lower costs compared to high thinking mode
- **Suitable for Analysis**: Perfect for slide analysis and content enhancement tasks
- **Consistent Quality**: Maintains high quality while being more efficient

### Logging

The service logs when GPT-5 is being used:
- "OpenAI client initialized successfully with GPT-5 low thinking mode"
- "Using GPT-5 with low thinking mode for slide analysis"
- "Using GPT-5 with low thinking mode for content enhancement"
