import { HfInference } from '@huggingface/inference';
import { pipeline } from '@xenova/transformers';
import fetch from 'node-fetch';
import { config } from '../config/environment.js';

class FreeAIProviders {
    constructor() {
        // Initialize Hugging Face (has free tier)
        this.hf = config.huggingface.apiKey ? 
            new HfInference(config.huggingface.apiKey) : null;
        
        // Local transformer models (completely free)
        this.localModel = null;
        if (config.local.useLocalModels) {
            this.initLocalModel();
        }

        // Ollama configuration (free, local)
        this.ollamaEndpoint = config.ollama.endpoint;
    }

    async initLocalModel() {
        try {
            // Initialize local transformer model (runs in-browser or Node.js)
            this.localModel = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
        } catch (error) {
            console.warn('Local model initialization failed:', error);
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
        if (!this.localModel) {
            await this.initLocalModel();
            if (!this.localModel) return null;
        }

        try {
            const result = await this.localModel(content);
            
            return {
                analysis: {
                    sentiment: result[0].label,
                    score: result[0].score,
                    text: content
                },
                provider: 'local-transformers',
                model: 'distilbert-sst2',
                cost: 'free'
            };
        } catch (error) {
            console.error('Local model error:', error);
            return null;
        }
    }

    async tryOllama(content) {
        try {
            const response = await fetch(this.ollamaEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama2', // or other free models
                    prompt: content,
                    stream: false
                })
            });

            if (!response.ok) throw new Error('Ollama request failed');

            const data = await response.json();
            return {
                analysis: data.response,
                provider: 'ollama',
                model: 'llama2',
                cost: 'free'
            };
        } catch (error) {
            console.error('Ollama error:', error);
            return null;
        }
    }

    // Try each free provider in sequence
    async getFreeAnalysis(content) {
        // Try HuggingFace first (has free tier but requires API key)
        const hfResult = await this.tryHuggingFace(content);
        if (hfResult) return hfResult;

        // Try Ollama (completely free, runs locally)
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
            ollama: {
                available: true,
                type: 'local'
            },
            localTransformers: {
                available: this.localModel !== null,
                type: 'local'
            }
        };
    }
}

export const freeAIProviders = new FreeAIProviders();