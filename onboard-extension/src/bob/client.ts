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
            const apiKey = process.env.BOB_API_KEY;
            const apiEndpoint = process.env.BOB_API_ENDPOINT || 'https://api.bob.ibm.com/v1/chat';

            if (!apiKey) {
                throw new Error('BOB_API_KEY environment variable is not set. Please configure your Bob API credentials.');
            }

            // Build the request payload
            const payload = {
                prompt,
                context: context || {},
                temperature: 0.7,
                max_tokens: 4000,
            };

            // Make the API request
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Bob API error (${response.status}): ${errorText}`);
            }

            const responseData = await response.json() as any;
            
            // Extract the response content
            const content = responseData.choices?.[0]?.message?.content || responseData.content || responseData.response;
            
            if (!content) {
                throw new Error('No content in Bob API response');
            }

            // Try to parse as JSON if it looks like JSON
            let parsedData: T;
            const trimmedContent = content.trim();
            
            if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
                try {
                    parsedData = JSON.parse(trimmedContent) as T;
                } catch {
                    // If JSON parsing fails, return raw content
                    parsedData = content as T;
                }
            } else {
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
            if (lastError.message.includes('BOB_API_KEY')) {
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
