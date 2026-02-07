import { useState, useEffect } from 'react';
import './RSSWidget.css';

export default function RSSWidget({ config = {} }) {
    const {
        feedUrl = '',
        maxItems = 5,
        scrollSpeed = 50, // pixels per second
        direction = 'horizontal', // 'horizontal' or 'vertical'
        showTitle = true,
        showDescription = true,
        updateInterval = 300000, // 5 minutes
        font = { family: 'Arial', size: 16, color: '#000000', weight: 'normal' },
        titleFont = { family: 'Arial', size: 18, color: '#000000', weight: 'bold' },
        backgroundColor = '#ffffff',
        itemSpacing = 20
    } = config;

    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [scrollPosition, setScrollPosition] = useState(0);

    const fetchRSS = async () => {
        if (!feedUrl) {
            setError('No RSS feed URL provided');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Use CORS proxy for RSS feeds (in production, use your own proxy)
            const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();

            if (data.status === 'ok' && data.items) {
                setItems(data.items.slice(0, maxItems));
            } else {
                setError('Failed to parse RSS feed');
            }
        } catch (err) {
            console.error('RSS fetch error:', err);
            setError('Failed to fetch RSS feed');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRSS();
        const interval = setInterval(fetchRSS, updateInterval);
        return () => clearInterval(interval);
    }, [feedUrl, maxItems, updateInterval]);

    useEffect(() => {
        if (items.length === 0) return;

        const scrollInterval = setInterval(() => {
            setScrollPosition(prev => {
                const containerWidth = 1000; // Approximate, will be calculated
                const contentWidth = items.length * 400; // Approximate item width
                const maxScroll = Math.max(0, contentWidth - containerWidth);
                
                if (prev >= maxScroll) {
                    return 0; // Reset to start
                }
                return prev + (scrollSpeed / 60); // 60fps
            });
        }, 1000 / 60); // 60fps

        return () => clearInterval(scrollInterval);
    }, [items, scrollSpeed]);

    if (isLoading && items.length === 0) {
        return (
            <div className="rss-widget rss-loading" style={{ color: font.color }}>
                Loading RSS feed...
            </div>
        );
    }

    if (error) {
        return (
            <div className="rss-widget rss-error" style={{ color: font.color }}>
                {error}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="rss-widget rss-empty" style={{ color: font.color }}>
                No items available
            </div>
        );
    }

    const containerStyle = {
        backgroundColor,
        fontFamily: font.family || 'Arial',
        fontSize: `${font.size || 16}px`,
        color: font.color || '#000000',
        fontWeight: font.weight || 'normal'
    };

    const titleStyle = {
        fontFamily: titleFont.family || 'Arial',
        fontSize: `${titleFont.size || 18}px`,
        color: titleFont.color || '#000000',
        fontWeight: titleFont.weight || 'bold'
    };

    if (direction === 'vertical') {
        return (
            <div className="rss-widget rss-vertical" style={containerStyle}>
                {items.map((item, index) => (
                    <div key={index} className="rss-item" style={{ marginBottom: `${itemSpacing}px` }}>
                        {showTitle && item.title && (
                            <div className="rss-title" style={titleStyle}>{item.title}</div>
                        )}
                        {showDescription && item.description && (
                            <div className="rss-description" dangerouslySetInnerHTML={{ __html: item.description }} />
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // Horizontal scrolling
    return (
        <div className="rss-widget rss-horizontal" style={containerStyle}>
            <div 
                className="rss-scroll-container"
                style={{
                    transform: `translateX(-${scrollPosition}px)`,
                    transition: 'transform 0.1s linear'
                }}
            >
                {items.map((item, index) => (
                    <div 
                        key={index} 
                        className="rss-item rss-item-horizontal"
                        style={{ marginRight: `${itemSpacing}px` }}
                    >
                        {showTitle && item.title && (
                            <div className="rss-title" style={titleStyle}>{item.title}</div>
                        )}
                        {showDescription && item.description && (
                            <div className="rss-description" dangerouslySetInnerHTML={{ __html: item.description }} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
