import { aiService } from '../src/services/aiService.js';
import { keyManager } from '../src/services/aiKeyManager.js';
import { freeAIProviders } from '../src/services/freeAIProviders.js';
import { config } from '../src/config/environment.js';
import chalk from 'chalk';

async function checkProviderStatus() {
    console.log(chalk.blue('\n=== AI Providers Status Check ===\n'));

    // Check OpenAI Keys
    console.log(chalk.yellow('OpenAI Configuration:'));
    const openaiKeys = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.split(',') : [];
    console.log(`Total API Keys: ${chalk.green(openaiKeys.length)}`);
    console.log(`Active Model: ${chalk.green(config.openai.model)}`);
    console.log(`Max Tokens: ${chalk.green(config.openai.maxTokens)}`);
    console.log(`Current Active Key Index: ${chalk.green(keyManager.currentKeyIndex)}`);
    
    // Show truncated keys for verification
    console.log('\nAPI Keys (first/last 4 chars):');
    openaiKeys.forEach((key, index) => {
        // Clean up any whitespace or newlines that might be in the key
        key = key.trim();
        const truncated = `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
        const isCurrent = index === keyManager.currentKeyIndex;
        const status = keyManager.failedKeys.has(key) 
            ? chalk.red('⚠ Failed')
            : (isCurrent ? chalk.green('✓ Current') : chalk.blue('✓ Available'));
        console.log(`${index + 1}. ${truncated} - ${status}`);
    });

    // Check Free Providers
    console.log(chalk.yellow('\nFree Providers:'));
    const freeStatus = freeAIProviders.getStatus();
    Object.entries(freeStatus).forEach(([provider, status]) => {
        const availability = status.available ? chalk.green('✓ Available') : chalk.red('✗ Not Available');
        console.log(`${provider}: ${availability} (${status.type || status.tier})`);
    });

    // Check Paid Alternative Providers
    console.log(chalk.yellow('\nPaid Alternative Providers:'));
    const anthropicAvailable = config.anthropic.apiKey ? chalk.green('✓ Configured') : chalk.red('✗ Not Configured');
    const cohereAvailable = config.cohere.apiKey ? chalk.green('✓ Configured') : chalk.red('✗ Not Configured');
    console.log(`Anthropic: ${anthropicAvailable}`);
    console.log(`Cohere: ${cohereAvailable}`);

    // Configuration Status
    console.log(chalk.yellow('\nConfiguration Status:'));
    console.log(`Free Providers First: ${chalk.green(config.providers.useFreePriority ? 'Yes' : 'No')}`);
    console.log(`Cache Duration: ${chalk.green(config.providers.cacheDuration)} seconds`);
    console.log(`Local Models: ${chalk.green(config.local.useLocalModels ? 'Enabled' : 'Disabled')}`);

    console.log(chalk.blue('\n=== Status Check Complete ===\n'));
}

// Run the status check
checkProviderStatus().catch(console.error);