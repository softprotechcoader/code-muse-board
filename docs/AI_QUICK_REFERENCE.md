# AI Providers Quick Reference

## Quick Start

1. **Basic Setup**
```bash
# Clone and install
git clone https://github.com/softprotechcoader/code-muse-board
cd code-muse-board
npm install

# Set up environment
cp env.template .env
```

2. **Configure Free Providers**
```env
USE_FREE_PROVIDERS_FIRST=true
USE_LOCAL_MODELS=true
OLLAMA_ENDPOINT=http://localhost:11434/api/generate
```

3. **Install Ollama**
```bash
# Windows users: Download from https://ollama.ai/
# Start Ollama and pull model
ollama serve
ollama pull llama2
```

## Provider Priority

1. Free Providers (if enabled):
   - Ollama (local)
   - Hugging Face
   - Local Transformers

2. Paid Providers (fallback):
   - OpenAI (with key rotation)
   - Anthropic
   - Cohere

3. Local Fallback (last resort):
   - Rule-based analysis
   - Keyword extraction
   - Basic sentiment analysis

## Common Commands

```bash
# Check provider status
npm run check-providers

# Clear cache
npm run clear-cache

# Update models
npm run update-models

# Run diagnostics
npm run diagnostics
```

## Monitoring

Access metrics dashboard:
```bash
npm run metrics
# Open http://localhost:9090
```

## Support

- Docs: `/docs/AI_PROVIDERS_GUIDE.md`
- Issues: GitHub Issues
- Chat: Discord Community