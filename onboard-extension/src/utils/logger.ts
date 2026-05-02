import * as winston from 'winston';
import TransportStream = require('winston-transport');

let vscode: any;
try {
    vscode = require('vscode');
} catch (e) {
    // Ignore error when running outside of VS Code
}

// Define sensitive keys that should be redacted
const SENSITIVE_KEYS = [
    'BOB_API_KEY',
    'WATSONX_API_KEY',
    'apiKey',
    'token',
    'password',
    'secret'
];

class VSCodeOutputTransport extends TransportStream {
    private outputChannel: any;

    constructor(opts?: TransportStream.TransportStreamOptions) {
        super(opts);
        if (vscode) {
            this.outputChannel = vscode.window.createOutputChannel('Onboard');
        }
    }

    log(info: any, callback: () => void) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        const msg = info[Symbol.for('message')] || info.message;

        if (this.outputChannel) {
            this.outputChannel.appendLine(msg);
        }

        // Console output in debug mode or for errors/warnings, or if not in vscode
        if (!this.outputChannel || info.level === 'error' || info.level === 'warn' || process.env.ONBOARD_DEBUG === 'true' || process.env.ONBOARD_DEBUG === '1') {
            if (info.level === 'error') {console.error(msg);}
            else if (info.level === 'warn') {console.warn(msg);}
            else {console.debug(msg);}
        }

        callback();
    }
}
const redactFormat = winston.format((info) => {
    let msg: string;
    if (typeof info.message !== 'string') {
        try {
            msg = JSON.stringify(info.message, null, 2);
        } catch (e) {
            msg = String(info.message);
        }
    } else {
        msg = info.message;
    }

    // Redact bearer tokens
    msg = msg.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+/g, 'Bearer [REDACTED]');

    // Redact api keys in strings like apiKey=... or "apiKey": "..."
    msg = msg.replace(/([a-zA-Z0-9_]*key[a-zA-Z0-9_]*["']?\s*[:=]\s*["']?)[^"'\s,&]+/gi, '$1[REDACTED]');
    
    const bobKey = process.env.BOB_API_KEY;
    if (bobKey && bobKey.length > 0) {
        msg = msg.split(bobKey).join('[REDACTED]');
    }
    
    const watsonxKey = process.env.WATSONX_API_KEY;
    if (watsonxKey && watsonxKey.length > 0) {
        msg = msg.split(watsonxKey).join('[REDACTED]');
    }

    info.message = msg;
    return info;
});

const isDebug = process.env.ONBOARD_DEBUG === 'true' || process.env.ONBOARD_DEBUG === '1';

const winstonLogger = winston.createLogger({
    level: isDebug ? 'debug' : 'info',
    format: winston.format.combine(
        redactFormat(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports: [
        new VSCodeOutputTransport()
    ]
});

/**
 * Structured logger utility for the Onboard extension, utilizing Winston.
 */
export class Logger {
    private static combineParams(message: any, optionalParams: any[]): string {
        const parts = [message, ...optionalParams].map(p => {
            if (p instanceof Error) {
                return `${p.message}\n${p.stack || ''}`;
            }
            return typeof p === 'object' ? JSON.stringify(p) : String(p);
        });
        return parts.join(' ');
    }

    /**
     * Logs an informational message.
     * @param message The primary message.
     * @param optionalParams Additional parameters to log.
     */
    public static info(message: any, ...optionalParams: any[]) {
        winstonLogger.info(this.combineParams(message, optionalParams));
    }

    /**
     * Logs a warning message.
     * @param message The primary warning message.
     * @param optionalParams Additional parameters to log.
     */
    public static warn(message: any, ...optionalParams: any[]) {
        winstonLogger.warn(this.combineParams(message, optionalParams));
    }

    /**
     * Logs an error message.
     * @param message The primary error message.
     * @param optionalParams Additional parameters to log.
     */
    public static error(message: any, ...optionalParams: any[]) {
        winstonLogger.error(this.combineParams(message, optionalParams));
    }

    /**
     * Logs a debug message. Output is only generated if debug mode is enabled.
     * @param message The primary debug message.
     * @param optionalParams Additional parameters to log.
     */
    public static debug(message: any, ...optionalParams: any[]) {
        winstonLogger.debug(this.combineParams(message, optionalParams));
    }
}
