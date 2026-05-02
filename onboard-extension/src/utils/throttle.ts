import * as vscode from 'vscode';

/**
 * Creates a throttled version of an asynchronous command handler.
 * If the command is currently running, subsequent calls will be ignored (or show a warning).
 * 
 * @param commandId The ID of the command (for logging/messages)
 * @param fn The asynchronous function to execute
 * @param debounceMs Minimum time between allowed executions
 * @returns A wrapped function that enforces rate limiting
 */
export function withThrottle<T extends (...args: any[]) => Promise<any>>(
    commandId: string, 
    fn: T, 
    debounceMs = 2000
): (...args: Parameters<T>) => Promise<ReturnType<T> | void> {
    let isRunning = false;
    let lastRunTime = 0;

    return async (...args: Parameters<T>) => {
        const now = Date.now();
        
        if (isRunning) {
            vscode.window.showWarningMessage(`${commandId} is already running. Please wait for it to finish.`);
            return;
        }
        
        if (now - lastRunTime < debounceMs) {
            const waitTime = Math.ceil((debounceMs - (now - lastRunTime)) / 1000);
            vscode.window.showWarningMessage(`Please wait ${waitTime}s before running ${commandId} again.`);
            return;
        }

        isRunning = true;
        try {
            return await fn(...args);
        } finally {
            isRunning = false;
            lastRunTime = Date.now();
        }
    };
}
