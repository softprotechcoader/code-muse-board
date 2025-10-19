import OpenAI from 'openai';
import { config } from '../config/environment.js';

class AIKeyManager {
    // Deprecated: All multi-key and rotation logic removed. Use Azure OpenAI config only.
}

export const keyManager = new AIKeyManager();