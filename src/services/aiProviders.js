import Anthropic from '@anthropic-ai/sdk';
import { CohereClient } from 'cohere-ai';
import { keyManager } from './aiKeyManager.js';
import { config } from '../config/environment.js';

class AIProviders {
    constructor() {
        this.anthropic = config.anthropic.apiKey ? 
            new Anthropic({ apiKey: config.anthropic.apiKey }) : null;
        this.cohere = config.cohere.apiKey ? 
            new CohereClient({ token: config.cohere.apiKey }) : null;
    }

    async tryAnthropicAnalysis(content) {
        if (!this.anthropic) return null;
        
        try {
            const message = await this.anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1024,
                messages: [{ role: 'user', content }]
            });
            
            return {
                analysis: message.content[0].text,
                provider: 'anthropic',
                model: 'claude-3-haiku'
            };
        } catch (error) {
            console.error('Anthropic API error:', error);
            return null;
        }
    }

    async tryCohereAnalysis(content) {
        if (!this.cohere) return null;
        
        try {
            const response = await this.cohere.generate({
                model: 'command',
                prompt: content,
                maxTokens: 500
            });
            
            return {
                analysis: response.generations[0].text,
                provider: 'cohere',
                model: 'command'
            };
        } catch (error) {
            console.error('Cohere API error:', error);
            return null;
        }
    }

    // Try each provider in sequence until one succeeds
    async getAlternativeAnalysis(content) {
        // Try Anthropic first
        const anthropicResult = await this.tryAnthropicAnalysis(content);
        if (anthropicResult) return anthropicResult;
        
        // Try Cohere second
        const cohereResult = await this.tryCohereAnalysis(content);
        if (cohereResult) return cohereResult;

        // Return null if all providers fail
        return null;
    }
}

export const aiProviders = new AIProviders();