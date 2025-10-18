import OpenAI from 'openai';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { config } from '../src/config/environment.js';

// Load environment variables
dotenv.config();

async function checkRateLimit(apiKey) {
    const openai = new OpenAI({ apiKey });

    try {
        // Make a test request to check basic functionality
        const response = await openai.models.list();
        
        // Since we got a successful response, we're not rate limited
        return {
            success: true,
            usage: 0, // Start with assumption of no usage
            totalTokens: 0,
            message: 'API responding normally',
            isRateLimited: false
        };
    } catch (error) {
        // Only consider it rate limited if we get a specific 429 error
        if (error.status === 429) {
            return {
                success: false,
                error: 'Rate limit exceeded',
                isRateLimited: true,
                usage: -1,
                totalTokens: -1
            };
        }

        // For any other error, assume we're not rate limited
        return {
            success: false,
            error: error.message,
            message: 'Error checking API status',
            isRateLimited: false,
            usage: 0,
            totalTokens: 0
        };
    }
}

async function validateApiKey(apiKey) {
    const openai = new OpenAI({ apiKey });
    
    try {
        // Check rate limits first
        const usageData = await checkRateLimit(apiKey);
        
        // If we're already rate limited, return early
        if (!usageData.success && usageData.isRateLimited) {
            return {
                isValid: true, // Key is valid, just rate limited
                models: null,
                usage: usageData,
                error: {
                    message: 'Rate limit exceeded',
                    code: 429,
                    type: 'rate_limit_exceeded'
                }
            };
        }
        
        // If rate check succeeded or failed non-critically, check models
        const modelList = await openai.models.list();
        
        // Check available models
        const hasGPT35 = modelList.data.some(model => model.id.includes('gpt-3.5'));
        const hasGPT4 = modelList.data.some(model => model.id.includes('gpt-4'));
        
        return {
            isValid: true,
            models: {
                gpt35: hasGPT35,
                gpt4: hasGPT4
            },
            usage: usageData,
            error: null
        };
    } catch (error) {
        return {
            isValid: false,
            models: null,
            credits: null,
            error: {
                code: error.code || error.response?.status,
                message: error.message,
                type: error.type
            }
        };
    }
}

async function testApiKeyPerformance(apiKey) {
    const openai = new OpenAI({ apiKey });
    const testMessage = "Respond with 'OK' if you receive this message.";
    
    try {
        console.log(chalk.yellow('Testing API response...'));
        
        // Simple completion test
        const testStart = Date.now();
        
        const testCompletion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: testMessage }],
            max_tokens: 10
        });
        
        const testDuration = Date.now() - testStart;
        
        // If we got here, the API is working
        const isValidResponse = testCompletion.choices[0]?.message?.content?.includes('OK');
        
        return {
            responseTime: testDuration,
            success: isValidResponse,
            error: isValidResponse ? null : 'Unexpected response from API',
            rateLimit: {
                isLimited: false,
                requests: 1,
                tokens: testCompletion.usage?.total_tokens || 0
            }
        };
    } catch (error) {
        // Check for specific error types
        if (error.status === 429 || (error.error?.type === 'rate_limit_exceeded')) {
            return {
                responseTime: null,
                success: false,
                error: 'API rate limit exceeded',
                rateLimit: {
                    isLimited: true,
                    requests: -1,
                    tokens: -1
                }
            };
        }
        
        // For other errors, provide more context
        return {
            responseTime: null,
            success: false,
            error: `API Error: ${error.message}`,
            rateLimit: {
                isLimited: false,
                requests: 0,
                tokens: 0
            }
        };
    }
}

async function validateAllKeys() {
    console.log(chalk.blue('\n=== OpenAI API Key Validation ===\n'));
    
    const keys = process.env.OPENAI_API_KEY ? 
        process.env.OPENAI_API_KEY.split(',') : 
        (process.env.OPENAI_API_KEYS ? process.env.OPENAI_API_KEYS.split(',') : []);
    
    if (keys.length === 0) {
        console.log(chalk.red('❌ No API keys found in environment variables'));
        console.log(chalk.yellow('Make sure to set OPENAI_API_KEY or OPENAI_API_KEYS in your .env file'));
        return;
    }
    
    console.log(chalk.green(`Found ${keys.length} API key(s) to validate\n`));
    
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i].trim();
        console.log(chalk.yellow(`Testing Key ${i + 1}:`));
        console.log('Key ID:', chalk.cyan(`${key.slice(0, 4)}...${key.slice(-4)}`));
        
        // Validate key
        const validation = await validateApiKey(key);
        if (validation.isValid) {
            console.log(chalk.green('✓ Key is valid'));
            console.log('Available Models:');
            console.log(`  GPT-3.5: ${validation.models.gpt35 ? chalk.green('✓') : chalk.red('✗')}`);
            console.log(`  GPT-4: ${validation.models.gpt4 ? chalk.green('✓') : chalk.red('✗')}`);
            
            if (validation.credits) {
                console.log('Credit Status:');
                console.log(`  Total: $${validation.credits.total_granted}`);
                console.log(`  Used: $${validation.credits.total_used}`);
                console.log(`  Available: $${validation.credits.total_available}`);
            }
            
            // Test performance
            const performance = await testApiKeyPerformance(key);
            // Always show usage info first
            console.log(chalk.blue('Usage Statistics:'));
            if (validation.usage?.success) {
                console.log(chalk.blue(`  - API Calls: ${validation.usage.usage || 0} requests this month`));
                console.log(chalk.blue(`  - Total Tokens: ${validation.usage.totalTokens || 0} tokens used`));
            } else {
                console.log(chalk.yellow('  Unable to fetch detailed usage statistics'));
            }

            // Then show performance test results
            if (performance.success) {
                console.log(chalk.green(`✓ Performance test passed (${performance.responseTime}ms)`));
                if (performance.rateLimit) {
                    console.log(chalk.blue(`ℹ Current request:`));
                    console.log(chalk.blue(`  - Response time: ${performance.responseTime}ms`));
                    console.log(chalk.blue(`  - Status: Active and responding`));
                }
            } else {
                if (performance.rateLimit?.isLimited) {
                    console.log(chalk.yellow(`⚠ Rate limit exceeded - key temporarily unavailable`));
                } else if (performance.error?.includes('rate limit')) {
                    console.log(chalk.yellow(`⚠ ${performance.error}`));
                } else {
                    console.log(chalk.red(`✗ Performance test failed: ${performance.error}`));
                }
            }
        } else {
            console.log(chalk.red('✗ Key validation failed'));
            console.log('Error:', validation.error.message);
            if (validation.error.code) {
                console.log('Error Code:', validation.error.code);
            }
        }
        
        console.log('\n' + '='.repeat(50) + '\n');
    }
    
    console.log(chalk.blue('=== Validation Complete ===\n'));
}

// Run validation
validateAllKeys().catch(console.error);