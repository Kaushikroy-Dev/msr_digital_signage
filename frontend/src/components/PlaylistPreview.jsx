import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Play, Pause, RotateCcw, SkipForward, SkipBack } from 'lucide-react';
import api from '../lib/api';
import MediaPlayer from './MediaPlayer';
import './PlaylistPreview.css';

export default function PlaylistPreview({ playlistId, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);

    // Fetch playlist details
    const { data: playlistData } = useQuery({
        queryKey: ['playlist-preview', playlistId],
        queryFn: async () => {
            const [playlistRes, itemsRes] = await Promise.all([
                api.get(`/schedules/playlists`),
                api.get(`/schedules/playlists/${playlistId}/items`)
            ]);

            const playlist = playlistRes.data.playlists.find(p => p.id === playlistId);
            return {
                playlist,
                items: itemsRes.data.items
            };
        },
        enabled: !!playlistId
    });

    useEffect(() => {
        if (isPlaying && playlistData?.items?.length > 0) {
            setShowPlayer(true);
        }
    }, [isPlaying, playlistData]);

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
        handleNext();
    };

    const handleClosePlayer = () => {
        setShowPlayer(false);
        setIsPlaying(false);
    };

    if (!playlistData) {
        return (
            <div className="playlist-preview-overlay">
                <div className="playlist-preview-container">
                    <div className="loading">Loading playlist...</div>
                </div>
            </div>
        );
    }

    const { playlist, items } = playlistData;
    const currentItem = items[currentIndex];

    // Prepare media object for MediaPlayer
    const currentMedia = currentItem ? {
        id: currentItem.content_id,
        name: currentItem.content_name,
        original_name: currentItem.content_name,
        file_type: currentItem.file_type || 'image',
        url: currentItem.url || currentItem.thumbnail_url || `/uploads/${currentItem.content_id}`
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
                                    <img
                                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${currentItem.url || currentItem.thumbnail_url || '/uploads/' + currentItem.content_id}`}
                                        alt={currentItem.content_name}
                                        className="preview-image"
                                    />
                                    <div className="item-info">
                                        <h3>{currentItem.content_name}</h3>
                                        <p>Duration: {currentItem.duration_ms / 1000}s</p>
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
                                            <p className="item-name">{item.content_name}</p>
                                            <p className="item-duration">{item.duration_ms / 1000}s</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showPlayer && currentMedia && (
                <MediaPlayer
                    media={currentMedia}
                    onClose={handleClosePlayer}
                    autoPlay={true}
                    duration={currentItem.duration_ms / 1000}
                    transitionEffect={playlist?.transition_effect}
                    onComplete={handleMediaComplete}
                />
            )}
        </>
    );
}
