import { HfInference } from '@huggingface/inference';
import { pipeline } from '@xenova/transformers';
import fetch from 'node-fetch';
import { config } from '../config/environment.js';

class FreeAIProviders {
    constructor() {
        // Initialize Hugging Face (has free tier)
        this.hf = config.huggingface.apiKey ? 
            new HfInference(config.huggingface.apiKey) : null;
        
        this.localModel = null;
    }

    async initLocalModel() {
        if (!this.localModel) {
            try {
                this.localModel = await pipeline('text2text-generation', 'Xenova/flan-t5-small');
            } catch (error) {
                console.error('Failed to initialize local model:', error);
            }
        }
    }

    async tryHuggingFace(content) {
        if (!this.hf) return null;

        try {
            // Use FLAN-T5 model (available in free tier)
            const response = await this.hf.textGeneration({
                model: 'google/flan-t5-small',
                inputs: content,
                parameters: {
                    max_length: 500,
                    temperature: 0.7
                }
            });

            return {
                analysis: response.generated_text,
                provider: 'huggingface',
                model: 'flan-t5-small',
                cost: 'free-tier'
            };
        } catch (error) {
            console.error('HuggingFace API error:', error);
            return null;
        }
    }

    async tryLocalModel(content) {
        await this.initLocalModel();
        if (!this.localModel) return null;

        try {
            const result = await this.localModel(content, { max_length: 500 });
            return {
                analysis: result[0].generated_text,
                provider: 'local',
                model: 'xenova-flan-t5-small',
                cost: 'free'
            };
        } catch (error) {
            console.error('Local model error:', error);
            return null;
        }
    }

    async tryOllama(content) {
        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama2',
                    prompt: content,
                    stream: false
                })
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    analysis: data.response,
                    provider: 'ollama',
                    model: 'llama2',
                    cost: 'free-local'
                };
            }
        } catch (error) {
            // Ollama not running, skip silently
            return null;
        }
    }

    // Try each free provider in sequence
    async getFreeAnalysis(content) {
        // Try HuggingFace first (has free tier but requires API key)
        const hfResult = await this.tryHuggingFace(content);
        if (hfResult) return hfResult;

        // Try Ollama if running locally
        const ollamaResult = await this.tryOllama(content);
        if (ollamaResult) return ollamaResult;

        // Try local transformer model (completely free)
        const localResult = await this.tryLocalModel(content);
        if (localResult) return localResult;

        return null;
    }

    // Get status of free providers
    getStatus() {
        return {
            huggingface: {
                available: this.hf !== null,
                tier: 'free'
            },
            local: {
                available: this.localModel !== null,
                tier: 'free'
            }
        };
    }
}

export const freeAIProviders = new FreeAIProviders();