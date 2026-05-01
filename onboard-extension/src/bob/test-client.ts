/**
 * Simple test script to verify Bob client can be imported and used
 * Run with: npx ts-node src/bob/test-client.ts
 */

import { ask } from './client';

async function testBobClient() {
    console.log('Testing Bob client...\n');

    // Test 1: Check if API key is set
    if (!process.env.BOB_API_KEY) {
        console.log('⚠️  BOB_API_KEY environment variable is not set');
        console.log('   Set it with: $env:BOB_API_KEY = "your-api-key"\n');
        return;
    }

    console.log('✓ BOB_API_KEY is set\n');

    // Test 2: Make a simple API call
    console.log('Making test API call to Bob...');
    const response = await ask('Hello Bob, please respond with a simple greeting.');

    if (response.success) {
        console.log('✓ Bob API call successful!');
        console.log('Response:', response.data);
    } else {
        console.log('✗ Bob API call failed');
        console.log('Error:', response.error);
    }
}

testBobClient().catch(console.error);
