import { Logger } from './logger';

let vscode: any;
try {
    vscode = require('vscode');
} catch (e) {
    // Ignore error when running outside of VS Code
}

/**
 * Basic secret scanner to detect potentially exposed secrets in code or configuration
 * before sending data to external APIs.
 *
 * NOTE: This is a basic scanner and does not replace a comprehensive security tool like Checkov or TruffleHog.
 */

const SECRET_PATTERNS = [
    { name: 'Generic API Key', regex: /(?:api_?key|apikey|secret|token|password)[\s:=]+["']?[a-zA-Z0-9\-_]{16,}["']?/i },
    { name: 'Bearer Token', regex: /Bearer\s+[a-zA-Z0-9\-\._~\+\/]{20,}/i },
    { name: 'RSA Private Key', regex: /-----BEGIN RSA PRIVATE KEY-----/ },
    { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
    { name: 'GitHub Token', regex: /gh[p|u|s|r|o]_[a-zA-Z0-9]{36}/ },
    { name: 'Slack Token', regex: /xox[baprs]-[0-9a-zA-Z]{10,48}/ }
];

export interface SecretScanResult {
    hasSecrets: boolean;
    findings: { type: string; line: number; match: string }[];
}

export function scanForSecrets(content: string): SecretScanResult {
    const findings: { type: string; line: number; match: string }[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const pattern of SECRET_PATTERNS) {
            const match = line.match(pattern.regex);
            if (match) {
                // To avoid logging the actual secret, we just take a substring or redact
                const redactedMatch = match[0].substring(0, Math.min(10, match[0].length)) + '...[REDACTED]';
                findings.push({
                    type: pattern.name,
                    line: i + 1,
                    match: redactedMatch
                });
            }
        }
    }

    return {
        hasSecrets: findings.length > 0,
        findings
    };
}

/**
 * Checks content and shows a warning if secrets are found.
 * @param content The content to scan
 * @param sourceName The name of the file or source being scanned
 * @returns true if it's safe to proceed (or user ignored warning), false to abort
 */
export async function checkSecretsBeforeSending(content: string, sourceName: string): Promise<boolean> {
    const result = scanForSecrets(content);

    if (result.hasSecrets) {
        const summary = result.findings.map(f => `- ${f.type} at line ${f.line}`).join('\n');
        if (vscode && vscode.window) {
            const action = await vscode.window.showWarningMessage(
                `Potential secrets found in ${sourceName}. Do you want to send this to the AI anyway?\n\n${summary}`,
                { modal: true },
                'Yes, Send Anyway',
                'Cancel'
            );

            return action === 'Yes, Send Anyway';
        } else {
            Logger.warn(`[WARNING] Potential secrets found in ${sourceName}. Aborting because window is not available to confirm.\n${summary}`);
            return false; // Fail-secure if no VSCode window
        }
    }

    return true;
}
