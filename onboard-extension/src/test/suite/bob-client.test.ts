import * as assert from 'assert';
import { ask, validateResponse } from '../../bob/client';

suite('Bob Client Test Suite', () => {
    const originalFetch = global.fetch;
    const originalEnv = { ...process.env };

    teardown(() => {
        // Restore original fetch and environment
        global.fetch = originalFetch;
        process.env = { ...originalEnv };
    });

    test('ask() should throw error when BOB_API_KEY is not set', async () => {
        delete process.env.BOB_API_KEY;
        delete process.env.WATSONX_API_KEY;
        delete process.env.WATSONX_PROJECT_ID;

        try {
            await ask('test prompt');
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert.ok((error as Error).message.includes('BOB_API_KEY'));
        }
    });

    test('ask() should handle successful OpenAI-style response', async () => {
        process.env.BOB_API_KEY = 'test-key';
        delete process.env.WATSONX_PROJECT_ID;

        global.fetch = async () => ({
            ok: true,
            status: 200,
            json: async () => ({
                content: 'Test response from Bob',
            }),
        }) as Response;

        const result = await ask('successful openai prompt');
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.data, 'Test response from Bob');
    });

    test('ask() should handle successful Watsonx chat response', async () => {
        process.env.WATSONX_API_KEY = 'test-watsonx-key';
        process.env.WATSONX_PROJECT_ID = 'test-project-id';

        let fetchCallCount = 0;
        global.fetch = async (url: string | URL | Request) => {
            fetchCallCount++;
            const urlString = url.toString();

            // First call: IAM token exchange
            if (urlString.includes('iam.cloud.ibm.com')) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        access_token: 'test-iam-token',
                        expires_in: 3600,
                    }),
                } as Response;
            }

            // Second call: Watsonx chat API
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    choices: [
                        {
                            message: {
                                content: 'Test response from Watsonx',
                            },
                        },
                    ],
                }),
            } as Response;
        };

        const result = await ask('successful watsonx prompt');
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.data, 'Test response from Watsonx');
        assert.strictEqual(fetchCallCount, 2); // IAM + Chat API
    });

    test('ask() should parse JSON responses', async () => {
        process.env.BOB_API_KEY = 'test-key';
        delete process.env.WATSONX_PROJECT_ID;

        global.fetch = async () => ({
            ok: true,
            status: 200,
            json: async () => ({
                content: '{"key": "value", "number": 42}',
            }),
        }) as Response;

        const result = await ask<{ key: string; number: number }>('json prompt');
        assert.strictEqual(result.success, true);
        assert.deepStrictEqual(result.data, { key: 'value', number: 42 });
    });

    test('ask() should handle JSON wrapped in markdown code blocks', async () => {
        process.env.BOB_API_KEY = 'test-key';
        delete process.env.WATSONX_PROJECT_ID;

        global.fetch = async () => ({
            ok: true,
            status: 200,
            json: async () => ({
                content: '```json\n{"key": "value"}\n```',
            }),
        }) as Response;

        const result = await ask<{ key: string }>('markdown json prompt');
        assert.strictEqual(result.success, true);
        assert.deepStrictEqual(result.data, { key: 'value' });
    });

    test('ask() should handle API errors', async () => {
        process.env.BOB_API_KEY = 'test-key';
        delete process.env.WATSONX_PROJECT_ID;

        global.fetch = async () => ({
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error',
        }) as Response;

        const result = await ask('error prompt');
        assert.strictEqual(result.success, false);
        assert.ok(result.error?.includes('Bob API error'));
    });

    test('ask() should retry on transient errors', async () => {
        process.env.BOB_API_KEY = 'test-key';
        delete process.env.WATSONX_PROJECT_ID;

        let callCount = 0;
        global.fetch = async () => {
            callCount++;
            if (callCount === 1) {
                throw new Error('Network error');
            }
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    content: 'Success after retry',
                }),
            } as Response;
        };

        const result = await ask('retry prompt');
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.data, 'Success after retry');
        assert.strictEqual(callCount, 2);
    });

    test('ask() should not retry on authentication errors', async () => {
        process.env.BOB_API_KEY = 'test-key';
        delete process.env.WATSONX_PROJECT_ID;

        let callCount = 0;
        global.fetch = async () => {
            callCount++;
            return {
                ok: false,
                status: 401,
                text: async () => 'BOB_API_KEY is invalid',
            } as Response;
        };

        try {
            await ask('auth error prompt');
            assert.fail('Should have thrown an auth error');
        } catch (error) {
            assert.ok((error as Error).message.includes('401'));
            assert.strictEqual(callCount, 1); // Should not retry
        }
    });

    test('validateResponse() should validate correct data', () => {
        const validator = (data: any) => {
            if (typeof data.name !== 'string') {
                throw new Error('name must be a string');
            }
            return data;
        };

        const result = validateResponse({ name: 'test' }, validator);
        assert.deepStrictEqual(result, { name: 'test' });
    });

    test('validateResponse() should throw on invalid data', () => {
        const validator = (data: any) => {
            if (typeof data.name !== 'string') {
                throw new Error('name must be a string');
            }
            return data;
        };

        assert.throws(
            () => validateResponse({ name: 123 }, validator),
            /Response validation failed/
        );
    });

    test('ask() should include context in request', async () => {
        process.env.BOB_API_KEY = 'test-key';
        delete process.env.WATSONX_PROJECT_ID;

        let capturedBody: any;
        global.fetch = async (_url: string | URL | Request, options?: any) => {
            capturedBody = JSON.parse(options.body);
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    content: 'Response with context',
                }),
            } as Response;
        };

        const context = {
            files: [{ path: 'test.ts', content: 'console.log("test");' }],
            gitHistory: 'commit abc123',
        };

        await ask('test prompt', { context });
        assert.deepStrictEqual(capturedBody.context, context);
    });
});
