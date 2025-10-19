import { HfInference } from '@huggingface/inference';
import { pipeline } from '@xenova/transformers';
import fetch from 'node-fetch';
import { config } from '../config/environment.js';

class FreeAIProviders {
    constructor() {
        // Initialize Hugging Face (has free tier)
        this.hf = config.huggingface.apiKey ? 
            new HfInference(config.huggingface.apiKey) : null;
        

    }

    async initLocalModel() {

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


    async tryOllama(content) {



    // Try each free provider in sequence
    async getFreeAnalysis(content) {
        // Try HuggingFace first (has free tier but requires API key)
        const hfResult = await this.tryHuggingFace(content);
        if (hfResult) return hfResult;


        // Try local transformer model (completely free)

        return null;
    }

    // Get status of free providers
    getStatus() {
        return {
            huggingface: {
                available: this.hf !== null,
                tier: 'free'
            },
        };
    }
}

export const freeAIProviders = new FreeAIProviders();