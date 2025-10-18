import OpenAI from 'openai';
import { config } from '../config/environment.js';

class AIKeyManager {
    constructor() {
        this.apiKeys = config.openai.apiKeys;
        this.currentKeyIndex = 0;
        this.failedKeys = new Set();
    }

    // Get next available API key
    getNextKey() {
        const initialIndex = this.currentKeyIndex;
        
        do {
            this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
            if (!this.failedKeys.has(this.apiKeys[this.currentKeyIndex])) {
                return this.apiKeys[this.currentKeyIndex];
            }
        } while (this.currentKeyIndex !== initialIndex && this.apiKeys.length > 0);
        
        return null; // All keys failed
    }

    // Mark a key as failed
    markKeyAsFailed(key) {
        this.failedKeys.add(key);
        // Reset failed keys after 1 hour to retry
        setTimeout(() => {
            this.failedKeys.delete(key);
        }, 3600000); // 1 hour
    }

    // Create OpenAI configuration with current key
    createOpenAIConfig() {
        const key = this.apiKeys[this.currentKeyIndex];
        // Check if current key is failed, try to get next working key
        if (this.failedKeys.has(key)) {
            const nextKey = this.getNextKey();
            if (nextKey) {
                return new OpenAI({
                    apiKey: nextKey
                });
            }
        }
        return new OpenAI({
            apiKey: key
        });
    }

    // Reset failed keys status
    resetFailedKeys() {
        this.failedKeys.clear();
    }
}

export const keyManager = new AIKeyManager();