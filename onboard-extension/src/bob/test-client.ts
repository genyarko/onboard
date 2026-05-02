/**
 * Simple test script to verify Bob client can be imported and used
 * Run with: npx ts-node src/bob/test-client.ts
 */

import { ask } from './client';
import { Logger } from '../utils/logger';

async function testBobClient() {
    Logger.info('Testing Bob client...\n');

    // Test 1: Check if API key is set
    if (!process.env.BOB_API_KEY) {
        Logger.info('⚠️  BOB_API_KEY environment variable is not set');
        Logger.info('   Set it with: $env:BOB_API_KEY = "your-api-key"\n');
        return;
    }

    Logger.info('✓ BOB_API_KEY is set\n');

    // Test 2: Make a simple API call
    Logger.info('Making test API call to Bob...');
    const response = await ask('Hello Bob, please respond with a simple greeting.');

    if (response.success) {
        Logger.info('✓ Bob API call successful!');
        Logger.info('Response:', response.data);
    } else {
        Logger.info('✗ Bob API call failed');
        Logger.info('Error:', response.error);
    }
}

testBobClient().catch(err => Logger.error(err));
