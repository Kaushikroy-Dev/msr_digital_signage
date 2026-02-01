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

    // Auto-advance when playing (only if MediaPlayer doesn't handle it)
    useEffect(() => {
        if (!isPlaying || !playlistData?.items?.length) return;

        const currentItem = playlistData.items[currentIndex];
        if (!currentItem) return;

        // Auto-advance for static content (images). Videos and templates handle their own onComplete.
        if (currentItem.content_type === 'media' && currentItem.file_type !== 'video') {
            const duration = currentItem.duration_ms || (currentItem.duration_seconds * 1000) || 10000;
            const timer = setTimeout(() => {
                const nextIndex = (currentIndex + 1) % playlistData.items.length;
                setCurrentIndex(nextIndex);
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [isPlaying, currentIndex, playlistData]);

    const handlePlay = () => {
        if (playlistData?.items?.length > 0) {
            setIsPlaying(true);
        }
    };

    const handlePause = () => {
        setIsPlaying(false);
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
        }
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

    // Scale calculation for TV frame
    const renderWidth = 1920;
    const renderHeight = 1080;
    const maxWidth = 800;
    const maxHeight = 450;
    const scaleFactor = Math.min(maxWidth / renderWidth, maxHeight / renderHeight);

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

    if (isLoading || !playlistData) {
        return (
            <div className="playlist-preview-overlay">
                <div className="loading-wrapper">
                    <div className="loading-spinner"></div>
                    <p>Loading playlist details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="playlist-preview-overlay">
            <div className="playlist-preview-container">
                <div className="preview-header">
                    <div className="header-info">
                        <h2>{playlist?.name}</h2>
                        <p>
                            <Layout size={14} /> {items.length} items
                            <span style={{ opacity: 0.3 }}>|</span>
                            <RotateCcw size={14} /> {playlist?.transition_effect} transition
                        </p>
                    </div>
                    <button onClick={onClose} className="close-btn" title="Close Preview">
                        <X size={20} />
                    </button>
                </div>

                <div className="preview-layout">
                    <div className="preview-main">
                        <div className="tv-frame-container">
                            <div className="tv-frame">
                                <div className="tv-screen" style={{ width: renderWidth * scaleFactor, height: renderHeight * scaleFactor }}>
                                    <div className="screen-reflection"></div>
                                    <div className="scaler-wrapper" style={{ transform: `scale(${scaleFactor})` }}>
                                        {currentItem ? (
                                            currentItem.content_type === 'template' && currentTemplate ? (
                                                <TemplateRenderer
                                                    template={currentTemplate}
                                                    duration={(currentItem.duration_ms || (currentItem.duration_seconds * 1000) || 10000) / 1000}
                                                    onComplete={isPlaying ? handleMediaComplete : null}
                                                    apiUrl={import.meta.env.VITE_API_URL || 'http://localhost:3000'}
                                                />
                                            ) : currentItem.file_type === 'video' ? (
                                                <video
                                                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${currentItem.url}`}
                                                    autoPlay={isPlaying}
                                                    loop={!isPlaying}
                                                    muted
                                                    onEnded={isPlaying ? handleMediaComplete : null}
                                                    style={{ width: renderWidth, height: renderHeight, objectFit: 'contain' }}
                                                />
                                            ) : (
                                                <img
                                                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${currentItem.url || currentItem.thumbnail_url}`}
                                                    alt={currentItem.content_name}
                                                    style={{ width: renderWidth, height: renderHeight, objectFit: 'contain' }}
                                                />
                                            )
                                        ) : (
                                            <div className="preview-placeholder">
                                                <Video size={64} />
                                                <p>No content in this playlist segment</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="main-controls">
                            <button onClick={handlePrevious} className="control-btn" disabled={!items.length}>
                                <SkipBack size={20} />
                            </button>

                            <button
                                onClick={isPlaying ? handlePause : handlePlay}
                                className="control-btn play-pause"
                                disabled={!items.length}
                            >
                                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
                            </button>

                            <button onClick={handleNext} className="control-btn" disabled={!items.length}>
                                <SkipForward size={20} />
                            </button>

                            <div className="progress-info">
                                {currentIndex + 1} / {items.length}
                            </div>

                            <button onClick={handleRestart} className="control-btn" title="Restart Playlist">
                                <RotateCcw size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="preview-sidebar">
                        <div className="sidebar-title">
                            <h3>Queue</h3>
                            <span className="item-count">{items.length} Files</span>
                        </div>
                        <div className="playlist-items-scroll">
                            {items.map((item, index) => (
                                <div
                                    key={item.id}
                                    className={`item-card ${index === currentIndex ? 'active' : ''}`}
                                    onClick={() => {
                                        setCurrentIndex(index);
                                        // If user manually clicks, maybe pause auto-play or just jump?
                                        // Let's just jump and keep playing state as is
                                    }}
                                >
                                    <div className="item-thumb">
                                        {item.content_type === 'template' ? (
                                            <Layout size={20} />
                                        ) : item.file_type === 'video' ? (
                                            <Video size={20} />
                                        ) : (
                                            <img
                                                src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${item.thumbnail_url || item.url}`}
                                                alt=""
                                            />
                                        )}
                                    </div>
                                    <div className="item-meta">
                                        <p className="item-meta-name">{item.content_name || `Untitled Item`}</p>
                                        <p className="item-meta-sub">
                                            <span>{(item.duration_ms || (item.duration_seconds * 1000) || 10000) / 1000}s</span>
                                            <span style={{ opacity: 0.3 }}>•</span>
                                            <span>{item.content_type}</span>
                                        </p>
                                    </div>
                                    <div className="item-status">
                                        <Play size={14} fill="currentColor" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
