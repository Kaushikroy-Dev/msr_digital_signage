/**
 * Platform-Specific Logging
 * Provides logging utilities tailored to each platform
 */

import { detectPlatform } from './platformDetection';

/**
 * Log levels
 */
export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4,
};

/**
 * Platform Logger Class
 */
class PlatformLogger {
    constructor() {
        this.platform = detectPlatform();
        this.logLevel = this.getLogLevel();
        this.logs = [];
        this.maxLogs = 100;
        this.remoteLoggingEnabled = false;
        this.remoteLoggingEndpoint = null;
    }

    /**
     * Get log level from environment or default
     */
    getLogLevel() {
        const envLevel = import.meta.env.VITE_LOG_LEVEL?.toLowerCase();
        switch (envLevel) {
            case 'debug':
                return LogLevel.DEBUG;
            case 'info':
                return LogLevel.INFO;
            case 'warn':
                return LogLevel.WARN;
            case 'error':
                return LogLevel.ERROR;
            default:
                return import.meta.env.PROD ? LogLevel.INFO : LogLevel.DEBUG;
        }
    }

    /**
     * Format log message
     */
    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const platform = this.platform;
        
        return {
            timestamp,
            platform,
            level,
            message,
            data: data || {},
        };
    }

    /**
     * Add log to buffer
     */
    addLog(formattedMessage) {
        this.logs.push(formattedMessage);
        
        // Keep only last N logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Send to remote if enabled
        if (this.remoteLoggingEnabled && this.remoteLoggingEndpoint) {
            this.sendRemoteLog(formattedMessage);
        }
    }

    /**
     * Send log to remote endpoint
     */
    async sendRemoteLog(logEntry) {
        try {
            await fetch(this.remoteLoggingEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(logEntry),
            });
        } catch (error) {
            // Silently fail remote logging
            console.warn('Remote logging failed:', error);
        }
    }

    /**
     * Debug log
     */
    debug(message, data) {
        if (this.logLevel > LogLevel.DEBUG) return;
        
        const formatted = this.formatMessage('DEBUG', message, data);
        console.debug(`[${this.platform}] ${message}`, data || '');
        this.addLog(formatted);
    }

    /**
     * Info log
     */
    info(message, data) {
        if (this.logLevel > LogLevel.INFO) return;
        
        const formatted = this.formatMessage('INFO', message, data);
        console.info(`[${this.platform}] ${message}`, data || '');
        this.addLog(formatted);
    }

    /**
     * Warning log
     */
    warn(message, data) {
        if (this.logLevel > LogLevel.WARN) return;
        
        const formatted = this.formatMessage('WARN', message, data);
        console.warn(`[${this.platform}] ${message}`, data || '');
        this.addLog(formatted);
    }

    /**
     * Error log
     */
    error(message, error, data) {
        if (this.logLevel > LogLevel.ERROR) return;
        
        const errorData = {
            ...data,
            error: {
                message: error?.message,
                stack: error?.stack,
                name: error?.name,
            },
        };
        
        const formatted = this.formatMessage('ERROR', message, errorData);
        console.error(`[${this.platform}] ${message}`, error, data || '');
        this.addLog(formatted);
    }

    /**
     * Get all logs
     */
    getLogs() {
        return [...this.logs];
    }

    /**
     * Clear logs
     */
    clearLogs() {
        this.logs = [];
    }

    /**
     * Enable remote logging
     */
    enableRemoteLogging(endpoint) {
        this.remoteLoggingEndpoint = endpoint;
        this.remoteLoggingEnabled = true;
    }

    /**
     * Disable remote logging
     */
    disableRemoteLogging() {
        this.remoteLoggingEnabled = false;
    }

    /**
     * Export logs as JSON
     */
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * Download logs as file
     */
    downloadLogs() {
        const blob = new Blob([this.exportLogs()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${this.platform}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Create singleton instance
const logger = new PlatformLogger();

/**
 * Platform-specific error reporting
 */
export function reportError(error, context = {}) {
    const platform = detectPlatform();
    
    // Log error
    logger.error('Application error', error, {
        platform,
        context,
        userAgent: navigator.userAgent,
        url: window.location.href,
    });

    // Platform-specific error reporting
    switch (platform) {
        case 'tizen':
            // Tizen-specific error reporting
            if (window.tizen && window.tizen.systeminfo) {
                window.tizen.systeminfo.getPropertyValue('BUILD', (info) => {
                    logger.debug('Tizen system info', info);
                });
            }
            break;
        case 'webos':
            // WebOS-specific error reporting
            if (window.webOS && window.webOS.service) {
                // Can send to WebOS service
            }
            break;
        case 'brightsign':
            // BrightSign-specific error reporting
            // BrightSign devices may have specific logging mechanisms
            break;
        default:
            // Default error reporting
            break;
    }
}

/**
 * Initialize error handling
 */
export function initErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
        reportError(event.error, {
            type: 'unhandled_error',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
        });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
        reportError(event.reason, {
            type: 'unhandled_promise_rejection',
        });
    });
}

// Export logger instance
export default logger;

// Export convenience functions
export const log = {
    debug: (message, data) => logger.debug(message, data),
    info: (message, data) => logger.info(message, data),
    warn: (message, data) => logger.warn(message, data),
    error: (message, error, data) => logger.error(message, error, data),
    getLogs: () => logger.getLogs(),
    clearLogs: () => logger.clearLogs(),
    exportLogs: () => logger.exportLogs(),
    downloadLogs: () => logger.downloadLogs(),
    enableRemoteLogging: (endpoint) => logger.enableRemoteLogging(endpoint),
    disableRemoteLogging: () => logger.disableRemoteLogging(),
};
