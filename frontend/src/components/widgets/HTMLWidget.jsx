import { useEffect, useRef } from 'react';
import './HTMLWidget.css';

export default function HTMLWidget({ config = {} }) {
    const {
        html = '',
        css = '',
        javascript = '',
        sandbox = true, // If true, use iframe for security
        allowScripts = false
    } = config;

    const containerRef = useRef(null);
    const iframeRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        if (sandbox && allowScripts) {
            // Use iframe for sandboxed execution
            if (!iframeRef.current) {
                const iframe = document.createElement('iframe');
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.border = 'none';
                iframe.sandbox = allowScripts ? 'allow-scripts allow-same-origin' : 'allow-same-origin';
                containerRef.current.appendChild(iframe);
                iframeRef.current = iframe;
            }

            const iframe = iframeRef.current;
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            
            iframeDoc.open();
            iframeDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>${css}</style>
                </head>
                <body>
                    ${html}
                    ${allowScripts ? `<script>${javascript}</script>` : ''}
                </body>
                </html>
            `);
            iframeDoc.close();
        } else {
            // Direct injection (less secure, but more flexible)
            containerRef.current.innerHTML = html;
            
            // Inject CSS
            if (css) {
                const styleId = 'html-widget-style';
                let styleEl = document.getElementById(styleId);
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    document.head.appendChild(styleEl);
                }
                styleEl.textContent = css;
            }

            // Inject JavaScript (only if allowed)
            if (javascript && allowScripts) {
                try {
                    // Use Function constructor for safer execution
                    const script = new Function(javascript);
                    script();
                } catch (error) {
                    console.error('HTML Widget JavaScript error:', error);
                }
            }
        }
    }, [html, css, javascript, sandbox, allowScripts]);

    return (
        <div 
            ref={containerRef}
            className="html-widget"
        />
    );
}
