/**
 * Bob API Client
 * Single interface for all Bob API interactions
 */

export interface BobContext {
    files?: Array<{ path: string; content: string }>;
    gitHistory?: string;
    prDetails?: string;
    repoStructure?: string;
    [key: string]: any;
}

export interface BobResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    rawResponse?: string;
}

// Simple in-memory cache for the IAM token to avoid fetching it on every request
let cachedIamToken: { token: string; expiresAt: number } | null = null;

async function getIamToken(apiKey: string): Promise<string> {
    // Check if we have a valid cached token (with 60 seconds buffer)
    if (cachedIamToken && Date.now() < cachedIamToken.expiresAt - 60000) {
        return cachedIamToken.token;
    }

    const response = await fetch('https://iam.cloud.ibm.com/identity/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
        },
        body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${apiKey}`,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`IAM token exchange failed (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    
    // Cache the token
    cachedIamToken = {
        token: data.access_token,
        // Calculate expiration based on expires_in (seconds), convert to ms
        expiresAt: Date.now() + (data.expires_in * 1000),
    };

    return data.access_token;
}

/**
 * Main function to interact with Bob API
 * @param prompt The prompt to send to Bob
 * @param context Optional context to include with the prompt
 * @returns Promise with Bob's response
 */
export async function ask<T = any>(
    prompt: string,
    context?: BobContext
): Promise<BobResponse<T>> {
    const maxRetries = 1;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Get API credentials from environment variables
            let apiEndpoint = process.env.BOB_API_ENDPOINT || 'https://api.bob.ibm.com/v1/chat';
            const projectId = process.env.WATSONX_PROJECT_ID;
            // Watsonx needs an IBM Cloud IAM API key to exchange for a bearer token.
            // Bob shell tokens (bob_prod_...) are NOT valid IAM keys, so prefer WATSONX_API_KEY.
            const watsonxKey = process.env.WATSONX_API_KEY;
            const bobKey = process.env.BOB_API_KEY;
            const apiKey = projectId ? (watsonxKey || bobKey) : bobKey;

            if (!apiKey) {
                throw new Error(
                    projectId
                        ? 'WATSONX_API_KEY (or BOB_API_KEY) must be set when WATSONX_PROJECT_ID is configured.'
                        : 'BOB_API_KEY environment variable is not set. Please configure your Bob API credentials.'
                );
            }

            let response;

            // Check if we're using Watsonx (by presence of Project ID)
            if (projectId) {
                // Use the chat endpoint — it applies Llama's chat template automatically.
                // The legacy /ml/v1/text/generation endpoint does NOT, so Llama 3.3 sees
                // the prompt as raw text and emits EOS on token 1.
                const baseUrl = apiEndpoint
                    .replace(/\/ml\/v1\/text\/generation(\?[^]*)?$/, '')
                    .replace(/\/ml\/v1\/text\/chat(\?[^]*)?$/, '')
                    .replace(/\/$/, '');
                apiEndpoint = `${baseUrl}/ml/v1/text/chat?version=2023-05-29`;

                // 1. Get IAM Token
                const iamToken = await getIamToken(apiKey);

                // 2. Build Watsonx chat payload
                const payload = {
                    model_id: 'meta-llama/llama-3-3-70b-instruct',
                    project_id: projectId,
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 4000,
                    temperature: 0
                };

                // 3. Make the API request
                response = await fetch(apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${iamToken}`,
                    },
                    body: JSON.stringify(payload),
                });
            } else {
                // Fallback to the original logic for OpenAI-compatible endpoints
                const payload = {
                    prompt,
                    context: context || {},
                    temperature: 0.7,
                    max_tokens: 4000,
                };

                response = await fetch(apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify(payload),
                });
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Bob API error (${response.status}): ${errorText}`);
            }

            const responseData = await response.json() as any;

            if (process.env.ONBOARD_DEBUG) {
                console.error('Watsonx API Response:', JSON.stringify(responseData, null, 2));
            }
            
            // Extract the response content. The Watsonx chat endpoint and OpenAI-style
            // endpoints both return choices[0].message.content; legacy generation returns
            // results[0].generated_text (kept as a fallback in case the endpoint is forced).
            const content =
                responseData.choices?.[0]?.message?.content ??
                responseData.results?.[0]?.generated_text ??
                responseData.content ??
                responseData.response;
            
            if (!content) {
                console.error('No content found in response. Response keys:', Object.keys(responseData));
                throw new Error('No content in Bob API response');
            }

            // Try to parse as JSON if it looks like JSON
            let parsedData: T;
            
            // Remove markdown code block wrappers if they exist
            let cleanedContent = content.trim();
            if (cleanedContent.startsWith('```json')) {
                cleanedContent = cleanedContent.substring(7);
                if (cleanedContent.endsWith('```')) {
                    cleanedContent = cleanedContent.substring(0, cleanedContent.length - 3);
                }
            } else if (cleanedContent.startsWith('```')) {
                cleanedContent = cleanedContent.substring(3);
                if (cleanedContent.endsWith('```')) {
                    cleanedContent = cleanedContent.substring(0, cleanedContent.length - 3);
                }
            }
            cleanedContent = cleanedContent.trim();
            
            if (cleanedContent.startsWith('{') || cleanedContent.startsWith('[')) {
                try {
                    parsedData = JSON.parse(cleanedContent) as T;
                } catch (parseError) {
                    if (process.env.ONBOARD_DEBUG) {
                        console.error('JSON parsing failed. Content preview:', cleanedContent.substring(0, 500));
                    }
                    parsedData = content as T;
                }
            } else {
                if (process.env.ONBOARD_DEBUG) {
                    console.error('Response is not JSON. Content preview:', cleanedContent.substring(0, 500));
                }
                parsedData = content as T;
            }

            return {
                success: true,
                data: parsedData,
                rawResponse: content,
            };

        } catch (error) {
            lastError = error as Error;
            
            // Don't retry on authentication errors
            if (lastError.message.includes('BOB_API_KEY') || lastError.message.includes('IAM token exchange failed')) {
                break;
            }
            
            // Wait before retry (exponential backoff)
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
    }

    // All retries failed
    return {
        success: false,
        error: lastError?.message || 'Unknown error occurred',
    };
}

/**
 * Helper function to validate structured output against a schema
 * @param data The data to validate
 * @param validator A validation function (e.g., Zod schema parse)
 * @returns Validated data or throws error
 */
export function validateResponse<T>(
    data: any,
    validator: (data: any) => T
): T {
    try {
        return validator(data);
    } catch (error) {
        throw new Error(`Response validation failed: ${(error as Error).message}`);
    }
}
