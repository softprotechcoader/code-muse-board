import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

import { config } from '../config.js';
import { AzureOpenAI } from 'openai';

console.log('\n=== Testing Azure OpenAI Configuration ===\n');

console.log('Config:', {
    apiKey: config.azureOpenAI?.apiKey ? '***' + config.azureOpenAI.apiKey.slice(-4) : 'missing',
    endpoint: config.azureOpenAI?.endpoint,
    deployment: config.azureOpenAI?.deploymentName,
    apiVersion: config.azureOpenAI?.apiVersion
});

async function testAzureOpenAI() {
    const { apiKey, endpoint, deploymentName, apiVersion } = config.azureOpenAI || {};
    
    if (!apiKey || !endpoint) {
        console.error('❌ Azure OpenAI credentials missing');
        return;
    }

    try {
        console.log('\n🔧 Initializing Azure OpenAI client...');
        const client = new AzureOpenAI({
            apiKey,
            endpoint,
            deployment: deploymentName,
            apiVersion
        });

        console.log('✅ Client initialized successfully');
        
        console.log('\n📤 Making test API call...');
        // For Azure OpenAI, don't pass model parameter
        const completion = await client.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant."
                },
                {
                    role: "user",
                    content: "Say 'Hello, Azure OpenAI is working!' in one sentence."
                }
            ],
            temperature: 0.7,
            max_tokens: 50
        });

        console.log('\n✅ API call successful!');
        console.log('Response:', completion.choices[0].message.content);
        console.log('\nDeployment used:', deploymentName);
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.code) console.error('Error code:', error.code);
        if (error.status) console.error('Status:', error.status);
        if (error.response?.data) console.error('Response:', error.response.data);
    }
}

testAzureOpenAI().then(() => {
    console.log('\n=== Test Complete ===\n');
});
