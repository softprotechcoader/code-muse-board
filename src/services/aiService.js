import OpenAI from 'openai';
import { config } from '../config/environment.js';
import { keyManager } from './aiKeyManager.js';
import { fallbackService } from './aiFallbackService.js';
import { aiProviders } from './aiProviders.js';
import { freeAIProviders } from './freeAIProviders.js';

class AIService {
    constructor() {
        // Initialize OpenAI client with the first available key
        const initialKey = config.openai.apiKeys[0];
        if (initialKey) {
            this.openai = new OpenAI({
                apiKey: initialKey
            });
        }
        this.techKeywords = [
            'JavaScript', 'Python', 'Java', 'React', 'Angular', 'Vue', 'Node.js',
            'TypeScript', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GraphQL', 'REST',
            'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch', 'Git',
            'AI', 'Machine Learning', 'Blockchain', 'IoT', 'Cloud', 'DevOps',
            'Microservices', 'API', 'Framework', 'Library', 'SDK', 'CLI'
        ];
    }

    extractTechnologies(text) {
        const pattern = new RegExp('\\b(' + this.techKeywords.join('|') + ')\\b', 'gi');
        return [...new Set(text.match(pattern) || [])];
    }

    async generateDetailedAnalysis(article) {
        // Try free providers first if enabled
        if (config.providers.useFreePriority) {
            const freeAnalysis = await freeAIProviders.getFreeAnalysis(article);
            if (freeAnalysis) {
                const technologies = this.extractTechnologies(article.description);
                return JSON.stringify({
                    ...freeAnalysis,
                    technologies
                });
            }
        }

        try {
            this.ensureOpenAIClient();
            
            const prompt = `
Analyze this tech news article and provide a detailed explanation:

Title: ${article.title}
Content: ${article.description}

Please provide:
1. Summary: A clear explanation of the news
2. Technical Impact: How this affects the tech industry
3. Use Cases: Practical applications and examples
4. Related Technologies: Connected technologies and frameworks
5. Key Takeaways: Main points for developers
6. Future Implications: Potential future impacts

Format the response in markdown.
`;

            const completion = await this.openai.chat.completions.create({
                model: config.openai.model,
                messages: [
                    {
                        role: "system",
                        content: "You are an expert tech analyst providing detailed explanations of tech news. Focus on practical implications, real-world applications, and technical details."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: config.openai.temperature,
                max_tokens: config.openai.maxTokens
            });

            const result = {
                content: completion.choices[0].message.content,
                technologies: this.extractTechnologies(article.description),
                provider: 'openai',
                model: config.openai.model
            };
            return JSON.stringify(result);

        } catch (error) {
            console.error('Error generating AI analysis:', error);
            
            // If it's an API key error, try switching keys
            if (error?.response?.status === 401 || error?.response?.status === 429) {
                keyManager.markKeyAsFailed(this.openai.apiKey);
                const nextKey = keyManager.getNextKey();
                if (nextKey) {
                    this.openai = new OpenAI({ apiKey: nextKey });
                    // Retry with new key
                    return this.generateDetailedAnalysis(article);
                }
            }

            // Try alternative providers
            if (config.providers.useAlternative) {
                const alternativeResult = await aiProviders.getAlternativeAnalysis(article.description);
                if (alternativeResult) return JSON.stringify(alternativeResult);
            }
            
            // Fall back to basic analysis
            return JSON.stringify(this.generateFallbackAnalysis(article));
        }
    }

    generateFallbackAnalysis(article) {
        const technologies = this.extractTechnologies(article.description);
        
        return {
            content: `# ${article.title}

## Summary
${article.description}

## Technical Details
${technologies.length > 0 ? `
### Related Technologies
${technologies.map(tech => `- ${tech}`).join('\n')}

### Potential Applications
These technologies are commonly used in:
${technologies.map(tech => `- ${tech} implementations and integrations`).join('\n')}
` : 'No specific technologies identified in this article.'}

## Key Points
- News Category: ${article.category || 'Technology'}
- Type: ${article.type || 'Update'}
- Source: ${article.source || 'Not specified'}

*Note: This is an automated summary generated without AI assistance.*`,
            technologies,
            provider: 'local-fallback',
            fallback: true
        };
    }

    async generateTechStackAnalysis(technologies) {
        try {
            const prompt = `
Analyze these technologies and provide insights:
${technologies.join(', ')}

Please provide:
1. Integration Possibilities
2. Common Use Cases
3. Best Practices
4. Potential Challenges
5. Alternative Solutions

Format the response in markdown.
`;

            const completion = await this.openai.chat.completions.create({
                model: config.openai.model,
                messages: [
                    {
                        role: "system",
                        content: "You are a senior software architect providing technical analysis and recommendations."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: config.openai.temperature,
                max_tokens: config.openai.maxTokens
            });

            return {
                content: completion.choices[0].message.content,
                provider: 'openai',
                model: config.openai.model
            };

        } catch (error) {
            console.error('Error generating tech stack analysis:', error);
            return null;
        }
    }

    // Ensure we have a valid OpenAI client
    ensureOpenAIClient() {
        if (!this.openai) {
            const key = keyManager.getNextKey();
            if (key) {
                this.openai = new OpenAI({
                    apiKey: key
                });
            } else {
                throw new Error('No valid OpenAI API key available');
            }
        }
    }

    // Get current provider status
    getStatus() {
        return {
            openai: {
                available: Boolean(this.openai),
                model: config.openai.model,
                activeKeys: keyManager.apiKeys.length - keyManager.failedKeys.size
            },
            free: freeAIProviders.getStatus(),
            paid: aiProviders.getStatus()
        };
    }
}

export const aiService = new AIService();