import NodeCache from 'node-cache';
import { keyManager } from './aiKeyManager.js';
import { config } from '../config/environment.js';

class AIFallbackService {
    constructor() {
        // Initialize cache with configured TTL
        this.cache = new NodeCache({ stdTTL: config.providers.cacheDuration });
    }

    // Try to get cached response first
    getCachedResponse(prompt, type) {
        const cacheKey = `${type}:${prompt}`;
        return this.cache.get(cacheKey);
    }

    // Save response to cache
    cacheResponse(prompt, type, response) {
        const cacheKey = `${type}:${prompt}`;
        this.cache.set(cacheKey, response);
    }

    // Local fallback analysis without AI
    generateLocalAnalysis(content) {
        try {
            const analysis = {
                sentiment: this.basicSentimentAnalysis(content),
                keywords: this.extractKeywords(content),
                summary: this.generateBasicSummary(content),
                timestamp: new Date().toISOString()
            };
            return analysis;
        } catch (error) {
            console.error('Error in local analysis:', error);
            return null;
        }
    }

    // Basic sentiment analysis based on keyword matching
    basicSentimentAnalysis(text) {
        const positiveWords = ['success', 'breakthrough', 'innovation', 'growth', 'improve'];
        const negativeWords = ['failure', 'problem', 'issue', 'bug', 'error'];
        
        const words = text.toLowerCase().split(/\W+/);
        let score = 0;
        
        words.forEach(word => {
            if (positiveWords.includes(word)) score++;
            if (negativeWords.includes(word)) score--;
        });
        
        return {
            score,
            label: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral'
        };
    }

    // Extract potential keywords based on frequency
    extractKeywords(text) {
        const words = text.toLowerCase().split(/\W+/);
        const frequency = {};
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to']);
        
        words.forEach(word => {
            if (word.length > 3 && !stopWords.has(word)) {
                frequency[word] = (frequency[word] || 0) + 1;
            }
        });
        
        return Object.entries(frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word);
    }

    // Generate a basic summary by taking the first few sentences
    generateBasicSummary(text) {
        const sentences = text.split(/[.!?]+/).filter(Boolean);
        return sentences.slice(0, 2).join('. ') + '.';
    }
}

export const fallbackService = new AIFallbackService();