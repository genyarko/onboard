import { Logger } from '../utils/logger';
import { checkSecretsBeforeSending } from '../utils/scanner';

let vscode: any;
try {
    vscode = require('vscode');
} catch (e) {
    // Ignore error when running outside of VS Code
}

/**
 * Bob API Client
 * 
 * Single interface for all IBM Bob API interactions in the Onboard extension.
 * Provides resilient API calls with circuit breaker, exponential backoff, and caching.
 * 
 * @module bob/client
 * @see {@link https://www.ibm.com/bob/docs IBM Bob Documentation}
 */

/**
 * Context provided to the Bob API to assist with generating the response.
 * 
 * This interface allows you to provide additional context that helps Bob
 * generate more accurate and relevant responses. All fields are optional.
 * 
 * @example
 * ```typescript
 * const context: BobContext = {
 *   files: [
 *     { path: 'src/main.ts', content: '...' }
 *   ],
 *   gitHistory: 'commit abc123...',
 *   repoStructure: 'src/\n  main.ts\n  utils.ts'
 * };
 * ```
 */
export interface BobContext {
    /** Files related to the request, containing path and content. */
    files?: Array<{ path: string; content: string }>;
    /** Git history string relevant to the prompt. */
    gitHistory?: string;
    /** Details of a Pull Request associated with the prompt context. */
    prDetails?: string;
    /** Structure of the repository (e.g. tree output). */
    repoStructure?: string;
    /** Any additional key-value context pairs. */
    [key: string]: any;
}

/**
 * Standard response format returned by the Bob API interactions.
 * 
 * All Bob API calls return this standardized response format, which includes
 * success status, parsed data, error information, and caching metadata.
 * 
 * @template T - The type of the parsed data returned by Bob
 * 
 * @example
 * ```typescript
 * const response: BobResponse<RepoXRayAnalysis> = await ask(prompt);
 * if (response.success) {
 *   Logger.info('Analysis:', response.data);
 * } else {
 *   Logger.error('Error:', response.error);
 * }
 * ```
 */
export interface BobResponse<T = any> {
    /** True if the API call was successful. */
    success: boolean;
    /** The parsed data returned by the model, if successful. */
    data?: T;
    /** Error message if the API call failed. */
    error?: string;
    /** The raw, unparsed response string from the model. */
    rawResponse?: string;
    /** True if the response was served from the local cache. */
    isCached?: boolean;
}

// Simple in-memory cache for the IAM token to avoid fetching it on every request
let extContext: any = null;

export function initBobClient(context: any) {
    extContext = context;
}

async function getIamToken(apiKey: string): Promise<string> {
    let cachedTokenStr = undefined;
    if (extContext?.secrets) {
        try {
            cachedTokenStr = await extContext.secrets.get('cachedIamToken');
        } catch(e) { }
    }
    
    let cachedIamToken: { token: string; expiresAt: number } | null = null;
    
    if (cachedTokenStr) {
        try {
            cachedIamToken = JSON.parse(cachedTokenStr);
        } catch (e) {
            // Ignore parse error
        }
    }

    // Check if we have a valid cached token (with 60 seconds buffer)
    if (cachedIamToken && Date.now() < cachedIamToken.expiresAt - 60000) {
        return cachedIamToken.token;
    }

    const config = vscode?.workspace?.getConfiguration('onboard');
    const timeoutMs = config?.get('timeout', 90000) || 90000;

    const response = await fetch('https://iam.cloud.ibm.com/identity/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
        },
        body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${apiKey}`,
        signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
        const errorText = await response.text();
        const error: any = new Error(`IAM token exchange failed (${response.status}): ${errorText}`);
        if (response.status === 401 || response.status === 403) {
            error.isAuthError = true;
        }
        throw error;
    }

    const data = await response.json() as any;

    // Cache the token
    const newCache = {
        token: data.access_token,
        // Calculate expiration based on expires_in (seconds), convert to ms
        expiresAt: Date.now() + (data.expires_in * 1000),
    };
    
    if (extContext?.secrets) {
        await extContext.secrets.store('cachedIamToken', JSON.stringify(newCache));
    }

    return data.access_token;
}

// --- Error Handling & Resilience ---

// 1. Response Cache (Offline mode & graceful degradation)
interface CacheEntry {
    response: BobResponse<any>;
    timestamp: number;
}
const responseCache = new Map<string, CacheEntry>();

function getCacheTTL(): number {
    const config = vscode?.workspace?.getConfiguration('onboard');
    return config?.get('cacheTTL', 3600) * 1000 || 3600000;
}

function isCacheEnabled(): boolean {
    const config = vscode?.workspace?.getConfiguration('onboard');
    const val = config?.get('cacheEnabled', true);
    return val !== undefined ? val : true;
}

function getCacheKey(prompt: string, context?: BobContext): string {
    // Basic hash of prompt and context keys
    return JSON.stringify({ prompt, context: context ? Object.keys(context) : null });
}

// 2. Circuit Breaker
class CircuitBreaker {
    private failures = 0;
    private lastFailureTime = 0;
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    
    constructor(
        private failureThreshold = 5,
        private resetTimeout = 60000 // 1 minute
    ) {}

    async execute<T>(action: () => Promise<T>, fallback?: () => T): Promise<T> {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.resetTimeout) {
                this.state = 'HALF_OPEN';
            } else {
                if (fallback) {
                    return fallback();
                }
                throw new Error('Bob API is currently unavailable (Circuit breaker is OPEN). Please try again later.');
            }
        }

        try {
            const result = await action();
            if (this.state === 'HALF_OPEN') {
                this.reset();
            }
            return result;
        } catch (error: any) {
            // Don't count rate limits, auth errors, or cancellations against the circuit breaker
            if (!error.isAuthError && !error.isRateLimit && error.name !== 'CancellationError' && error.message !== 'Operation cancelled' && error.message !== 'Operation cancelled by user') {
                this.recordFailure();
            }
            throw error;
        }
    }

    private recordFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
            if (process.env.ONBOARD_DEBUG) {
                Logger.error('Circuit breaker tripped! Too many API failures.');
            }
        }
    }

    private reset() {
        this.failures = 0;
        this.state = 'CLOSED';
    }
}

const circuitBreaker = new CircuitBreaker();

// 3. Exponential Backoff with Jitter
function getBackoffTime(attempt: number, baseDelay = 1000): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = (Math.random() * 0.3 - 0.15) * exponentialDelay; // +/- 15% jitter
    return exponentialDelay + jitter;
}

// --- End Error Handling & Resilience ---

/**
 * Options for Bob API requests.
 * 
 * @property {BobContext} [context] - Additional context to help Bob generate better responses
 * @property {any} [token] - VS Code cancellation token for aborting requests
 * @property {Function} [onChunk] - Callback for streaming responses (receives text chunks)
 * 
 * @example
 * ```typescript
 * const options: BobOptions = {
 *   context: { files: [...], gitHistory: '...' },
 *   token: vscode.CancellationToken,
 *   onChunk: (chunk) => Logger.info(chunk)
 * };
 * ```
 */
export interface BobOptions {
    /** Additional context to help Bob generate better responses */
    context?: BobContext;
    /** VS Code cancellation token for aborting requests */
    token?: any;
    /** Callback for streaming responses (receives text chunks as they arrive) */
    onChunk?: (chunk: string) => void;
}

/**
 * Main function to interact with IBM Bob API.
 * 
 * This is the primary interface for all Bob API interactions. It handles:
 * - Authentication (API key or IAM token)
 * - Request retries with exponential backoff
 * - Circuit breaker pattern for resilience
 * - Response caching for offline support
 * - Streaming responses (when onChunk callback provided)
 * - Secret detection before sending
 * 
 * The function automatically parses JSON responses and provides structured error handling.
 * 
 * @template T - The expected type of the parsed response data
 * @param {string} prompt - The prompt to send to Bob (required)
 * @param {BobOptions} [options] - Optional configuration including context, cancellation token, and streaming
 * @returns {Promise<BobResponse<T>>} Promise resolving to Bob's response with success status and data
 * 
 * @throws {Error} If API key is not configured (isAuthError: true)
 * @throws {Error} If request is cancelled by user or timeout
 * @throws {Error} If circuit breaker is open (too many failures)
 * 
 * @example Basic usage
 * ```typescript
 * const response = await ask('Explain this code');
 * if (response.success) {
 *   Logger.info(response.data);
 * }
 * ```
 * 
 * @example With context
 * ```typescript
 * const response = await ask<RepoXRayAnalysis>(
 *   buildRepoXRayPrompt(context),
 *   {
 *     context: {
 *       files: [{ path: 'src/main.ts', content: '...' }],
 *       repoStructure: '...'
 *     }
 *   }
 * );
 * ```
 * 
 * @example With streaming
 * ```typescript
 * const response = await ask(
 *   'Generate documentation',
 *   {
 *     onChunk: (chunk) => outputChannel.append(chunk)
 *   }
 * );
 * ```
 * 
 * @example With cancellation
 * ```typescript
 * const response = await ask(
 *   'Analyze repository',
 *   {
 *     token: cancellationToken,
 *     context: { repoStructure: '...' }
 *   }
 * );
 * ```
 * 
 * @see {@link BobContext} for context options
 * @see {@link BobResponse} for response format
 * @see {@link BobOptions} for request options
 */
export async function ask<T = any>(
    prompt: string,
    options?: BobOptions
): Promise<BobResponse<T>> {
    const context = options?.context;
    const token = options?.token;
    const onChunk = options?.onChunk;
    
    const cacheKey = getCacheKey(prompt, context);
    
    const fallbackAction = (): BobResponse<T> => {
        if (!isCacheEnabled()) {
            return {
                success: false,
                error: 'Bob API is currently unavailable and cache is disabled.',
            };
        }
        const cached = responseCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < getCacheTTL()) {
            return {
                ...cached.response,
                isCached: true,
                error: 'Served from cache due to API unavailability.'
            };
        }
        return {
            success: false,
            error: 'Bob API is currently unavailable and no cached response exists.',
        };
    };

    // Check for secrets before sending
    let contentToScan = prompt;
    const contextString = context ? JSON.stringify(context) : '';
    if (contextString) {
        contentToScan += '\n' + contextString;
    }
    const isSafe = await checkSecretsBeforeSending(contentToScan, 'Request Context');
    if (!isSafe) {
        return {
            success: false,
            error: 'Operation cancelled: Secrets detected in prompt or context.'
        };
    }

    try {
        return await circuitBreaker.execute(async () => {
            const startTime = Date.now();
            const config = vscode?.workspace?.getConfiguration('onboard');
            const maxRetries = config?.get('maxRetries', 3) ?? 3;
            const timeoutMs = config?.get('timeout', 120000) ?? 120000;
            let lastError: any = null;

            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    if (token?.isCancellationRequested) {
                        const cancelError = new Error('Operation cancelled');
                        cancelError.name = 'CancellationError';
                        throw cancelError;
                    }

                    // Get API credentials from environment variables
                    let apiEndpoint = config?.get('bobApiEndpoint') || process.env.BOB_API_ENDPOINT || 'https://api.bob.ibm.com/v1/chat';
                    const projectId = config?.get('watsonxProjectId') || process.env.WATSONX_PROJECT_ID;
                    const configApiKey = config?.get('apiKey');
                    const watsonxKey = process.env.WATSONX_API_KEY;
                    const bobKey = process.env.BOB_API_KEY;
                    const apiKey = configApiKey || (projectId ? (watsonxKey || bobKey) : bobKey);

                    if (!apiKey) {
                        const error: any = new Error(
                            projectId
                                ? 'apiKey (or WATSONX_API_KEY/BOB_API_KEY env) must be set when WATSONX_PROJECT_ID is configured.'
                                : 'apiKey configuration or BOB_API_KEY environment variable is not set. Please configure your Bob API credentials.'
                        );
                        error.isAuthError = true;
                        throw error;
                    }

                    let response;
                    
                    const abortController = new AbortController();
                    const timeoutId = setTimeout(() => {
                        Logger.error(`[BobClient] Timeout of ${timeoutMs}ms reached! Aborting request.`);
                        const timeoutError = new Error('Operation cancelled due to timeout');
                        timeoutError.name = 'TimeoutError';
                        abortController.abort(timeoutError);
                    }, timeoutMs);
                    
                    try {
                        if (token) {
                            token.onCancellationRequested(() => {
                                if (process.env.ONBOARD_DEBUG) {
                                    Logger.debug(`[BobClient] Cancellation requested by token!`);
                                }
                                const cancelError = new Error('Operation cancelled by user');
                                cancelError.name = 'CancellationError';
                                abortController.abort(cancelError);
                            });
                        }
                        
                        if (process.env.ONBOARD_DEBUG) {
                            Logger.debug(`[BobClient] Executing fetch with timeoutMs: ${timeoutMs}`);
                        }

                        if (projectId) {
                            // Watsonx endpoint preparation
                            const baseUrl = apiEndpoint
                                .replace(/\/ml\/v1\/text\/generation(\?[^]*)?$/, '')
                                .replace(/\/ml\/v1\/text\/chat(\?[^]*)?$/, '')
                                .replace(/\/$/, '');
                            apiEndpoint = `${baseUrl}/ml/v1/text/chat?version=2023-05-29`;

                            const iamToken = await getIamToken(apiKey);

                            let fullPrompt = prompt;
                            if (contextString) {
                                // Append context strings efficiently
                                fullPrompt += '\n\nContext:\n' + contextString;
                            }

                            const payload: any = {
                                model_id: 'meta-llama/llama-3-3-70b-instruct',
                                project_id: projectId,
                                messages: [
                                    { role: 'user', content: fullPrompt }
                                ],
                                max_tokens: 4000,
                                temperature: 0
                            };
                            
                            if (onChunk) {
                                payload.stream = true;
                            }

                            response = await fetch(apiEndpoint, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${iamToken}`,
                                },
                                body: JSON.stringify(payload),
                                signal: abortController.signal as any
                            });
                        } else {
                            const payload: any = {
                                prompt,
                                context: context || {},
                                temperature: 0.7,
                                max_tokens: 4000,
                            };
                            
                            if (onChunk) {
                                payload.stream = true;
                            }

                            response = await fetch(apiEndpoint, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${apiKey}`,
                                },
                                body: JSON.stringify(payload),
                                signal: abortController.signal as any
                            });
                        }
                    } finally {
                        clearTimeout(timeoutId);
                    }

                    if (!response.ok) {
                        const errorText = await response.text();
                        const error: any = new Error(`Bob API error (${response.status}): ${errorText}`);
                        error.status = response.status;

                        if (response.status === 429) {
                            error.isRateLimit = true;
                            const retryAfter = response.headers.get('Retry-After');
                            if (retryAfter) {
                                error.retryAfterMs = parseInt(retryAfter, 10) * 1000;
                            }
                        }
                        if (response.status === 401 || response.status === 403) {
                            error.isAuthError = true;
                        }
                        throw error;
                    }
                    
                    let content = '';
                    
                    if (onChunk && response.body) {
                        // Handle streaming response
                        const reader = response.body.getReader();
                        const decoder = new TextDecoder('utf-8');
                        let done = false;
                        let buffer = '';
                        
                        while (!done) {
                            if (token?.isCancellationRequested) {
                                reader.cancel();
                                const cancelError = new Error('Operation cancelled');
                                cancelError.name = 'CancellationError';
                                throw cancelError;
                            }
                            
                            const { value, done: readerDone } = await reader.read();
                            done = readerDone;
                            
                            if (value) {
                                buffer += decoder.decode(value, { stream: true });
                                // Buffer simple parsing of SSE for JSON chunks (highly dependent on the actual API implementation)
                                const lines = buffer.split('\n');
                                buffer = lines.pop() || '';
                                for (const line of lines) {
                                    const trimmedLine = line.trim();
                                    if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
                                        try {
                                            const data = JSON.parse(trimmedLine.substring(6));
                                            const textChunk = data.choices?.[0]?.delta?.content || data.results?.[0]?.generated_text || '';
                                            if (textChunk) {
                                                content += textChunk;
                                                onChunk(textChunk);
                                            }
                                        } catch (e) {
                                            // Ignore parsing errors for partial chunks
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        const responseData = await response.json() as any;

                        if (process.env.ONBOARD_DEBUG) {
                            Logger.error('Watsonx API Response:', JSON.stringify(responseData, null, 2));
                        }

                        content =
                            responseData.choices?.[0]?.message?.content ??
                            responseData.results?.[0]?.generated_text ??
                            responseData.content ??
                            responseData.response;
                    }

                    if (!content) {
                        throw new Error('No content in Bob API response');
                    }

                    let parsedData: T;

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
                                Logger.error('JSON parsing failed. Content preview:', cleanedContent.substring(0, 500));
                            }
                            parsedData = content as T;
                        }
                    } else {
                        if (process.env.ONBOARD_DEBUG) {
                            Logger.error('Response is not JSON. Content preview:', cleanedContent.substring(0, 500));
                        }
                        parsedData = content as T;
                    }

                    const finalResponse: BobResponse<T> = {
                        success: true,
                        data: parsedData,
                        rawResponse: content,
                        isCached: false,
                    };

                    // Cache successful responses
                    if (isCacheEnabled()) {
                        responseCache.set(cacheKey, {
                            response: finalResponse,
                            timestamp: Date.now()
                        });
                    }

                    const durationMs = Date.now() - startTime;
                    Logger.info(`[Telemetry] Bob API request completed in ${durationMs}ms`);

                    return finalResponse;

                } catch (error: any) {
                    lastError = error;

                    if (error.name === 'CancellationError' || error.message === 'Operation cancelled' || error.message === 'Operation cancelled by user') {
                        if (process.env.ONBOARD_DEBUG) {
                            Logger.debug('Request cancelled by user or token.');
                        }
                        throw error; // Let circuit breaker catch and rethrow
                    }

                    if (error.name === 'AbortError') {
                        if (process.env.ONBOARD_DEBUG) {
                            Logger.debug('Request aborted.');
                        }
                        const cancelError = new Error('Operation cancelled by user');
                        cancelError.name = 'CancellationError';
                        throw cancelError; // Translate fetch AbortError to our CancellationError
                    }

                    if (error.isAuthError || (error.message && error.message.includes('IAM token exchange failed'))) {
                        error.isAuthError = true;
                        throw error; // Let circuit breaker catch and rethrow
                    }

                    if (attempt < maxRetries) {
                        let delay = getBackoffTime(attempt);
                        if (error.isRateLimit && error.retryAfterMs) {
                            delay = Math.max(delay, error.retryAfterMs);
                        }
                        if (process.env.ONBOARD_DEBUG) {
                            Logger.error(`API attempt ${attempt + 1} failed. Retrying in ${Math.round(delay)}ms...`);
                        }
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            // All retries failed
            // Check if we have a cache to fallback to
            if (isCacheEnabled()) {
                const cached = responseCache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < getCacheTTL()) {
                    if (process.env.ONBOARD_DEBUG) {
                        Logger.error(`All API retries failed. Serving from cache. Last error: ${lastError?.message}`);
                    }
                    return {
                        ...cached.response,
                        isCached: true,
                        error: `API error, served from cache: ${lastError?.message || 'Unknown error'}`
                    };
                }
            }

            return {
                success: false,
                error: lastError?.message || 'Unknown error occurred after multiple retries',
            };
        }, fallbackAction);
    } catch (error: any) {
        if (error.name === 'CancellationError' || error.message === 'Operation cancelled' || error.message === 'Operation cancelled by user') {
            return {
                success: false,
                error: 'Operation cancelled by user'
            };
        }
        // If the circuit breaker threw something else (e.g. breaker open), return it as a structured error
        return {
            success: false,
            error: error.message || 'An unexpected error occurred during the API request.'
        };
    }
}

/**
 * Helper function to validate structured output against a schema.
 * 
 * This utility validates Bob's response data against a provided validation function,
 * typically a Zod schema parser. It provides clear error messages when validation fails.
 * 
 * @template T - The expected type after validation
 * @param {any} data - The data to validate (typically from Bob's response)
 * @param {Function} validator - A validation function that throws on invalid data (e.g., Zod schema.parse)
 * @returns {T} The validated and typed data
 * @throws {Error} If validation fails, with details about what went wrong
 * 
 * @example With Zod schema
 * ```typescript
 * import { z } from 'zod';
 * 
 * const schema = z.object({
 *   title: z.string(),
 *   count: z.number()
 * });
 * 
 * const validated = validateResponse(bobData, schema.parse);
 * // validated is now typed as { title: string; count: number }
 * ```
 * 
 * @example In feature implementation
 * ```typescript
 * const response = await ask(prompt);
 * if (response.success) {
 *   const validated = validateResponse(
 *     response.data,
 *     RepoXRaySchema.parse
 *   );
 *   // Use validated data with full type safety
 * }
 * ```
 * 
 * @see {@link ask} for making Bob API requests
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