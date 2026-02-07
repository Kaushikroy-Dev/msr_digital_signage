import { useState, useEffect } from 'react';
import './WebViewWidget.css';

// Simple URL validation
const isValidUrl = (string) => {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
};

export default function WebViewWidget({ config = {} }) {
    const {
        url = '',
        allowScrolling = true,
        sandbox = 'allow-same-origin allow-scripts allow-forms',
        updateInterval = null // Auto-refresh interval in ms
    } = config;

    const [validUrl, setValidUrl] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!url) {
            setError('No URL provided');
            setValidUrl('');
            return;
        }

        if (!isValidUrl(url)) {
            setError('Invalid URL format');
            setValidUrl('');
            return;
        }

        setValidUrl(url);
        setError(null);
    }, [url]);

    useEffect(() => {
        if (!updateInterval || !validUrl) return;

        const interval = setInterval(() => {
            const iframe = document.querySelector('.webview-iframe');
            if (iframe) {
                iframe.src = iframe.src; // Force reload
            }
        }, updateInterval);

        return () => clearInterval(interval);
    }, [updateInterval, validUrl]);

    if (error || !validUrl) {
        return (
            <div className="webview-widget">
                <div className="webview-error">{error || 'Web view unavailable'}</div>
            </div>
        );
    }

    return (
        <div className="webview-widget">
            <iframe
                src={validUrl}
                className="webview-iframe"
                scrolling={allowScrolling ? 'yes' : 'no'}
                sandbox={sandbox}
                title="Web View Widget"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
        </div>
    );
}
