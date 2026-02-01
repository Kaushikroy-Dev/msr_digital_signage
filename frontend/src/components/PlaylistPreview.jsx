import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Play, Pause, RotateCcw, SkipForward, SkipBack, Layout, Video } from 'lucide-react';
import api from '../lib/api';
import MediaPlayer from './MediaPlayer';
import TemplateRenderer from './TemplateRenderer';
import './PlaylistPreview.css';

export default function PlaylistPreview({ playlistId, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);

    // Fetch playlist details
    const { data: playlistData, isLoading } = useQuery({
        queryKey: ['playlist-preview', playlistId],
        queryFn: async () => {
            const [playlistRes, itemsRes] = await Promise.all([
                api.get(`/schedules/playlists`, {
                    params: { tenantId: localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage'))?.state?.user?.tenantId : null }
                }),
                api.get(`/schedules/playlists/${playlistId}/items`, {
                    params: { tenantId: localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage'))?.state?.user?.tenantId : null }
                })
            ]);

            const playlist = playlistRes.data.playlists.find(p => p.id === playlistId);
            return {
                playlist,
                items: itemsRes.data.items || []
            };
        },
        enabled: !!playlistId
    });

    useEffect(() => {
        if (isPlaying && playlistData?.items?.length > 0) {
            setShowPlayer(true);
        } else if (!isPlaying) {
            setShowPlayer(false);
        }
    }, [isPlaying, playlistData]);

    // Auto-advance when playing (only if MediaPlayer doesn't handle it)
    useEffect(() => {
        if (!isPlaying || !playlistData?.items?.length || showPlayer) return;

        const currentItem = playlistData.items[currentIndex];
        if (!currentItem) return;

        // Only auto-advance for static previews, not when MediaPlayer is active
        const duration = currentItem.duration_ms || (currentItem.duration_seconds * 1000) || 10000;
        const timer = setTimeout(() => {
            if (isPlaying && !showPlayer) {
                const nextIndex = (currentIndex + 1) % playlistData.items.length;
                setCurrentIndex(nextIndex);
            }
        }, duration);

        return () => clearTimeout(timer);
    }, [isPlaying, currentIndex, playlistData, showPlayer]);

    const handlePlay = () => {
        if (playlistData?.items?.length > 0) {
            setIsPlaying(true);
            setCurrentIndex(0);
        }
    };

    const handlePause = () => {
        setIsPlaying(false);
        setShowPlayer(false);
    };

    const handleRestart = () => {
        setCurrentIndex(0);
        setIsPlaying(true);
    };

    const handleNext = () => {
        if (!playlistData?.items) return;

        const nextIndex = (currentIndex + 1) % playlistData.items.length;
        setCurrentIndex(nextIndex);
    };

    const handlePrevious = () => {
        if (!playlistData?.items) return;

        const prevIndex = currentIndex === 0
            ? playlistData.items.length - 1
            : currentIndex - 1;
        setCurrentIndex(prevIndex);
    };

    const handleMediaComplete = () => {
        if (playlistData?.items?.length > 0) {
            const nextIndex = (currentIndex + 1) % playlistData.items.length;
            setCurrentIndex(nextIndex);
            if (nextIndex === 0 && playlistData.items.length > 1) {
                // Loop back to start
                setIsPlaying(false);
                setShowPlayer(false);
            }
        }
    };

    const handleClosePlayer = () => {
        setShowPlayer(false);
        setIsPlaying(false);
    };

    if (isLoading || !playlistData) {
        return (
            <div className="playlist-preview-overlay">
                <div className="playlist-preview-container">
                    <div className="loading">Loading playlist...</div>
                </div>
            </div>
        );
    }

    const { playlist, items } = playlistData;
    const currentItem = items && items.length > 0 ? items[currentIndex] : null;

    // Prepare media object for MediaPlayer
    const currentMedia = currentItem && currentItem.content_type === 'media' ? {
        id: currentItem.content_id,
        name: currentItem.content_name || 'Media',
        original_name: currentItem.content_name || 'Media',
        file_type: currentItem.file_type || 'image',
        url: currentItem.url || currentItem.thumbnail_url || ''
    } : null;

    // Prepare template object
    const currentTemplate = currentItem && currentItem.content_type === 'template' ? {
        id: currentItem.content_id,
        name: currentItem.content_name || 'Template',
        zones: currentItem.template?.zones || [],
        width: currentItem.template?.width || 1920,
        height: currentItem.template?.height || 1080,
        background_color: currentItem.template?.background_color || '#000000',
        background_image_id: currentItem.template?.background_image_id
    } : null;

    return (
        <>
            <div className="playlist-preview-overlay">
                <div className="playlist-preview-container">
                    <div className="preview-header">
                        <div>
                            <h2>{playlist?.name}</h2>
                            <p>{items.length} items • {playlist?.transition_effect} transition</p>
                        </div>
                        <button onClick={onClose} className="close-btn">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="preview-content">
                        <div className="preview-display">
                            {currentItem ? (
                                <div className="current-item-preview">
                                    {currentItem.content_type === 'template' ? (
                                        <div className="template-preview">
                                            <div className="template-placeholder">
                                                <Layout size={48} />
                                                <p>Template: {currentItem.content_name || 'Template'}</p>
                                            </div>
                                        </div>
                                    ) : currentItem.file_type === 'video' ? (
                                        <div className="video-preview">
                                            <Video size={48} />
                                            <p>Video: {currentItem.content_name || 'Video'}</p>
                                        </div>
                                    ) : (
                                        <img
                                            src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${currentItem.url || currentItem.thumbnail_url || ''}`}
                                            alt={currentItem.content_name || 'Media'}
                                            className="preview-image"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.parentElement.innerHTML = '<div class="no-preview">Preview not available</div>';
                                            }}
                                        />
                                    )}
                                    <div className="item-info">
                                        <h3>{currentItem.content_name || `Item ${currentIndex + 1}`}</h3>
                                        <p>Duration: {(currentItem.duration_ms || (currentItem.duration_seconds * 1000) || 10000) / 1000}s</p>
                                        <p className="content-type">{currentItem.content_type === 'template' ? 'Template' : currentItem.file_type || 'Media'}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="no-items">
                                    <p>No items in playlist</p>
                                </div>
                            )}
                        </div>

                        <div className="preview-controls">
                            <button onClick={handlePrevious} className="control-btn" disabled={!items.length}>
                                <SkipBack size={20} />
                            </button>

                            {isPlaying ? (
                                <button onClick={handlePause} className="control-btn primary">
                                    <Pause size={24} />
                                </button>
                            ) : (
                                <button onClick={handlePlay} className="control-btn primary" disabled={!items.length}>
                                    <Play size={24} />
                                </button>
                            )}

                            <button onClick={handleNext} className="control-btn" disabled={!items.length}>
                                <SkipForward size={20} />
                            </button>

                            <button onClick={handleRestart} className="control-btn" disabled={!items.length}>
                                <RotateCcw size={20} />
                            </button>

                            <div className="progress-indicator">
                                {currentIndex + 1} / {items.length}
                            </div>
                        </div>

                        <div className="items-list">
                            <h3>Playlist Items</h3>
                            <div className="items-grid">
                                {items.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className={`item-card ${index === currentIndex ? 'active' : ''}`}
                                        onClick={() => setCurrentIndex(index)}
                                    >
                                        <div className="item-number">{index + 1}</div>
                                        <div className="item-details">
                                            <p className="item-name">{item.content_name || `Item ${index + 1}`}</p>
                                            <p className="item-duration">{(item.duration_ms || (item.duration_seconds * 1000) || 10000) / 1000}s</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showPlayer && currentItem && (
                <>
                    {currentItem.content_type === 'template' && currentTemplate ? (
                        <div className="playlist-preview-overlay" style={{ zIndex: 9999 }}>
                            <TemplateRenderer
                                template={currentTemplate}
                                duration={(currentItem.duration_ms || (currentItem.duration_seconds * 1000) || 10000) / 1000}
                                onComplete={handleMediaComplete}
                                apiUrl={import.meta.env.VITE_API_URL || 'http://localhost:3000'}
                            />
                            <button 
                                onClick={handleClosePlayer}
                                className="close-player-btn"
                                style={{
                                    position: 'absolute',
                                    top: '20px',
                                    right: '20px',
                                    background: 'rgba(0, 0, 0, 0.7)',
                                    border: 'none',
                                    color: 'white',
                                    padding: '10px',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    zIndex: 10000
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>
                    ) : currentMedia ? (
                        <MediaPlayer
                            media={currentMedia}
                            onClose={handleClosePlayer}
                            autoPlay={true}
                            duration={(currentItem.duration_ms || (currentItem.duration_seconds * 1000) || 10000) / 1000}
                            transitionEffect={playlist?.transition_effect || 'fade'}
                            onComplete={handleMediaComplete}
                        />
                    ) : null}
                </>
            )}
        </>
    );
}
