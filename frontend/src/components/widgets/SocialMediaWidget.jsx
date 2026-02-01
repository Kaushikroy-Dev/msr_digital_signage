import { useState, useEffect } from 'react';
import './SocialMediaWidget.css';

export default function SocialMediaWidget({ config = {} }) {
    const {
        platform = 'twitter', // 'twitter', 'instagram', 'facebook'
        username = '',
        hashtag = '',
        maxPosts = 5,
        updateInterval = 300000, // 5 minutes
        showImages = true,
        showTimestamp = true,
        font = { family: 'Arial', size: 14, color: '#000000', weight: 'normal' },
        backgroundColor = '#ffffff',
        cardStyle = true
    } = config;

    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Note: Social media APIs require authentication and have rate limits
        // This is a placeholder implementation that would need proper API integration
        const fetchPosts = async () => {
            if (!username && !hashtag) {
                setError('Username or hashtag required');
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                // In production, this would call your backend API which handles
                // social media API authentication and rate limiting
                // For now, return mock data
                const mockPosts = [
                    {
                        id: 1,
                        text: 'Sample post content from social media feed',
                        author: username || 'user',
                        timestamp: new Date().toISOString(),
                        image: null,
                        likes: 0,
                        shares: 0
                    }
                ];
                setPosts(mockPosts.slice(0, maxPosts));
            } catch (err) {
                console.error('Social media fetch error:', err);
                setError('Failed to fetch social media posts');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPosts();
        const interval = setInterval(fetchPosts, updateInterval);
        return () => clearInterval(interval);
    }, [username, hashtag, maxPosts, updateInterval]);

    if (isLoading && posts.length === 0) {
        return (
            <div className="social-media-widget social-loading" style={{ color: font.color }}>
                Loading {platform} feed...
            </div>
        );
    }

    if (error) {
        return (
            <div className="social-media-widget social-error" style={{ color: font.color }}>
                {error}
                <div className="social-help">
                    Configure API credentials in Global Widget Settings
                </div>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="social-media-widget social-empty" style={{ color: font.color }}>
                No posts available
            </div>
        );
    }

    const containerStyle = {
        backgroundColor,
        fontFamily: font.family || 'Arial',
        fontSize: `${font.size || 14}px`,
        color: font.color || '#000000',
        fontWeight: font.weight || 'normal'
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="social-media-widget" style={containerStyle}>
            <div className={`social-feed social-${platform}`}>
                {posts.map((post) => (
                    <div 
                        key={post.id} 
                        className={`social-post ${cardStyle ? 'social-card' : ''}`}
                    >
                        <div className="social-header">
                            <div className="social-author">
                                <span className="social-avatar">{post.author?.[0]?.toUpperCase() || 'U'}</span>
                                <span className="social-username">{post.author || username}</span>
                            </div>
                            {showTimestamp && post.timestamp && (
                                <span className="social-timestamp">{formatTimestamp(post.timestamp)}</span>
                            )}
                        </div>
                        {post.text && (
                            <div className="social-text">{post.text}</div>
                        )}
                        {showImages && post.image && (
                            <div className="social-image">
                                <img src={post.image} alt="Post" />
                            </div>
                        )}
                        <div className="social-actions">
                            <span className="social-likes">❤️ {post.likes || 0}</span>
                            <span className="social-shares">🔄 {post.shares || 0}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
