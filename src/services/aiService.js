import OpenAI from 'openai';
import { AzureOpenAI } from 'openai';
import fetch from 'node-fetch';
import { config } from '../config/environment.js';
import { keyManager } from './aiKeyManager.js';

class AIService {
    constructor() {
        // Initialize Azure OpenAI client from config if available
        const { apiKey, endpoint, modelName, deploymentName, apiVersion } = config.azureOpenAI || {};
        if (apiKey && endpoint) {
            try {
                this.openai = new AzureOpenAI({
                    apiKey,
                    endpoint,
                    deployment: deploymentName,
                    apiVersion
                });
            } catch (err) {
                console.warn('Failed to initialize AzureOpenAI client:', err.message || err);
                this.openai = null;
            }
        } else {
            this.openai = null;
        }
        this.modelName = modelName || (config.openai && config.openai.model) || 'gpt-4o-mini';
        this.techKeywords = [
            'JavaScript', 'Python', 'Java', 'React', 'Angular', 'Vue', 'Node.js',
            'TypeScript', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GraphQL', 'REST',
            'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch', 'Git',
            'AI', 'Machine Learning', 'Blockchain', 'IoT', 'Cloud', 'DevOps',
            'Microservices', 'API', 'Framework', 'Library', 'SDK', 'CLI'
        ];
    }

    extractTechnologies(text) {
        const safe = typeof text === 'string' ? text : (text ? String(text) : '');
        const pattern = new RegExp('\\b(' + this.techKeywords.join('|') + ')\\b', 'gi');
        return [...new Set((safe.match(pattern) || []))];
    }

    /**
     * Call Claude (Anthropic) API using the Messages endpoint
     * @param {string} prompt
     * @param {number} maxTokens
     * @param {number} temperature
     * @returns {Promise<string>}
     */
    async callClaude(prompt, maxTokens = 300, temperature = 0.2) {
        if (!config.claude || !config.claude.enabled || !config.claude.apiKey) {
            throw new Error('Claude is not enabled or missing API key');
        }

        const body = {
            model: config.claude.model || 'claude-3-5-sonnet-20241022',
            max_tokens: maxTokens,
            temperature,
            messages: [
                { role: 'user', content: prompt }
            ]
        };

        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.claude.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Claude API error: ${res.status} ${text}`);
        }

        const json = await res.json();
        // Messages API returns content array with text blocks
        if (json && json.content && json.content[0]) {
            return json.content[0].text || '';
        }
        // fallback: stringify full response
        return JSON.stringify(json);
    }

    async generateDetailedAnalysis(article) {
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

        const temperature = (config.openai && config.openai.temperature) || 0.7;
        const maxTokens = (config.openai && config.openai.maxTokens) || 1024;

        // Try Azure OpenAI first
        if (this.openai) {
            try {
                // For Azure OpenAI, don't pass model - it uses the deployment
                const completion = await this.openai.chat.completions.create({
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
                    temperature,
                    max_tokens: maxTokens
                });

                const result = {
                    content: completion.choices[0].message.content,
                    technologies: this.extractTechnologies(article.description),
                    provider: 'azure-openai',
                    model: config.azureOpenAI?.deploymentName || 'gpt-4'
                };
                return JSON.stringify(result);
            } catch (err) {
                console.warn('Azure OpenAI call failed, will try Claude if enabled:', err?.message || err);
            }
        }

        // Try Claude if enabled
        if (config.claude && config.claude.enabled && config.claude.apiKey) {
            try {
                const claudePrompt = `You are an expert tech analyst. ${prompt}`;
                const claudeResp = await this.callClaude(claudePrompt, Math.min(maxTokens, 1000), temperature);
                const result = {
                    content: claudeResp,
                    technologies: this.extractTechnologies(article.description),
                    provider: 'claude',
                    model: config.claude.model
                };
                return JSON.stringify(result);
            } catch (err) {
                console.warn('Claude call failed, falling back to local analysis:', err?.message || err);
            }
        }

        // Fallback to local analysis
        return JSON.stringify(this.generateFallbackAnalysis(article));
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

            // For Azure OpenAI, don't pass model parameter
            const completion = await this.openai.chat.completions.create({
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
                temperature: 0.7,
                max_tokens: 300
            });

            return {
                content: completion.choices[0].message.content,
                provider: 'azure-openai',
                model: config.azureOpenAI?.deploymentName || 'gpt-4'
            };

        } catch (error) {
            console.error('Error generating tech stack analysis:', error);
            return null;
        }
    }

    /**
     * Generate a personalized learning roadmap for a given topic and user profile.
     * Falls back to a simple heuristic roadmap if the AI call fails.
     * @param {string} topic
     * @param {{level?: string, weeks?: number, goals?: string}} profile
     */
    async generateRoadmap(topic, profile = {}) {
        const level = profile.level || 'Intermediate';
        const weeks = profile.weeks || 6;
        const goals = profile.goals || 'Become proficient and build a project';

        const temperature = (config.openai && config.openai.temperature) || 0.7;
        const prompt = `Generate a ${weeks}-week learning roadmap for a developer to learn ${topic}. Target level: ${level}. Goals: ${goals}. Provide weekly milestones, suggested resources, and estimated time per week.`;

        // Attempt Azure first
        if (this.openai) {
            try {
                // For Azure OpenAI, don't pass model parameter
                const completion = await this.openai.chat.completions.create({
                    messages: [
                        { role: 'system', content: 'You are an expert learning coach designing practical, project-based roadmaps for software developers.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature,
                    max_tokens: 800
                });

                const content = completion.choices[0].message.content;
                return { provider: 'azure-openai', content };
            } catch (err) {
                console.warn('Azure roadmap call failed, will try Claude if enabled:', err?.message || err);
            }
        }

        // Try Claude
        if (config.claude && config.claude.enabled && config.claude.apiKey) {
            try {
                const claudeResp = await this.callClaude(prompt, 800, temperature);
                return { provider: 'claude', content: claudeResp };
            } catch (err) {
                console.warn('Claude roadmap call failed:', err?.message || err);
            }
        }

        console.error('Roadmap generation failed, returning fallback roadmap');
        // Simple fallback: create a naive roadmap
        const fallback = {
            provider: 'fallback',
            content: `Week-by-week roadmap for ${topic} (approx ${weeks} weeks):\n${Array.from({ length: weeks }).map((_, i) => `Week ${i+1}: Core topics and exercises`).join('\n')}`
        };
        return fallback;
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
            azureOpenAI: {
                available: Boolean(this.openai),
                model: this.modelName
            }
        };
    }
}

export const aiService = new AIService();