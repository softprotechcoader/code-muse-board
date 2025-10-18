import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine the environment file path
const envPath = join(__dirname, '../../.env');
const templatePath = join(__dirname, '../../env.template');

// If .env doesn't exist, copy from template
if (!fs.existsSync(envPath) && fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, envPath);
}

// Load environment variables
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env file:', result.error);
}

// Debug environment variables
console.log('Environment file path:', envPath);
console.log('Environment file exists:', fs.existsSync(envPath));
if (fs.existsSync(envPath)) {
    console.log('Environment file contents:', fs.readFileSync(envPath, 'utf8'));
    console.log('All environment variables:', process.env);
    console.log('OPENAI_API_KEY value:', process.env.OPENAI_API_KEY);
    // Add detailed key parsing debug
    const apiKeys = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.split(',') : [];
    console.log('Number of API keys after splitting:', apiKeys.length);
    console.log('API keys array:', apiKeys.map(key => `${key.slice(0, 4)}...${key.slice(-4)}`));
}

export const config = {
    openai: {
        apiKeys: process.env.OPENAI_API_KEYS ? 
            process.env.OPENAI_API_KEYS.split(',') : 
            (process.env.OPENAI_API_KEY ? [process.env.OPENAI_API_KEY] : []),
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 200,
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7
    },
    providers: {
        useFreePriority: process.env.USE_FREE_PROVIDERS_FIRST === 'true',
        useAlternative: process.env.USE_ALTERNATIVE_PROVIDERS === 'true',
        cacheDuration: parseInt(process.env.CACHE_DURATION) || 3600
    },
    huggingface: {
        apiKey: process.env.HUGGINGFACE_API_KEY
    },
    anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY
    },
    cohere: {
        apiKey: process.env.COHERE_API_KEY
    },
    ollama: {
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434/api/generate',
        enabled: process.env.USE_OLLAMA === 'true'
    },
    local: {
        useLocalModels: process.env.USE_LOCAL_MODELS === 'true',
        modelsDir: process.env.LOCAL_MODELS_CACHE_DIR || './models'
    }
};