import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../lib/api';
import './MediaPlayer.css';

export default function MediaPlayer({
    media,
    onClose,
    autoPlay = false,
    duration = null,
    transitionEffect = 'fade',
    onComplete = null
}) {
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [progress, setProgress] = useState(0);
    const [isBuffering, setIsBuffering] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!autoPlay) {
            if (media?.file_type === 'video' && videoRef.current) {
                videoRef.current.pause();
            } else if (media?.file_type === 'image') {
                clearInterval(timerRef.current);
            }
            setIsPlaying(false);
        } else {
            if (media?.file_type === 'video' && videoRef.current) {
                videoRef.current.play().catch(() => { });
            } else if (media?.file_type === 'image' && duration) {
                startImageTimer();
            }
            setIsPlaying(true);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [media, autoPlay, duration]);

    const startImageTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        const durationMs = duration * 1000;
        const startTime = Date.now();

        timerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progressPercent = (elapsed / durationMs) * 100;

            if (progressPercent >= 100) {
                clearInterval(timerRef.current);
                setProgress(100);
                if (onComplete) {
                    onComplete();
                }
            } else {
                setProgress(progressPercent);
            }
        }, 100);
    };

    // Removed togglePlay and toggleFullscreen - not needed in TV mode

    const handleVideoTimeUpdate = () => {
        if (videoRef.current) {
            const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setProgress(percent);
        }
    };

    const handleVideoEnded = () => {
        setIsPlaying(false);
        if (onComplete) {
            onComplete();
        }
    };

    const handleCanPlayThrough = () => {
        // Video is ready to play without buffering
        setIsBuffering(false);
        setIsReady(true);
        console.log('[MediaPlayer] Video ready to play');
    };

    const handleWaiting = () => {
        // Video is buffering
        setIsBuffering(true);
        setIsReady(false);
        console.log('[MediaPlayer] Video buffering...');
    };

    const handlePlaying = () => {
        // Video started playing
        setIsBuffering(false);
        setIsReady(true);
        console.log('[MediaPlayer] Video playing');
    };

    const handleLoadStart = () => {
        // Video started loading
        setIsBuffering(true);
        setIsReady(false);
        console.log('[MediaPlayer] Video loading started');
    };

    const [loadError, setLoadError] = useState(null);

    if (!media) return null;

    const apiUrl = API_BASE_URL;
    const mediaUrl = `${apiUrl}${media.url}`;

    // Handle media loading errors
    const handleError = (error) => {
        console.error('[MediaPlayer] Error loading media:', {
            url: mediaUrl,
            error: error.message || 'Unknown error',
            mediaType: media.file_type
        });
        setLoadError('Failed to load media');
    };

    // Reset error when media changes
    useEffect(() => {
        setLoadError(null);
    }, [media.url]);

    // Auto-enter fullscreen on mount for TV mode
    useEffect(() => {
        if (autoPlay && containerRef.current && !document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(() => {
                // Ignore fullscreen errors (some browsers require user interaction)
                console.log('Fullscreen request failed (may require user interaction)');
            });
        }
    }, [autoPlay]);

    return (
        <div className={`media-player-overlay tv-mode ${transitionEffect}`} ref={containerRef}>
            <div className="media-player-content tv-content">
                {!autoPlay ? (
                    <div className="screen-off-overlay">
                        <div className="power-indicator">●</div>
                        <p>Display is Off</p>
                    </div>
                ) : media.file_type === 'image' ? (
                    <div className="media-stage">
                        <img
                            src={mediaUrl}
                            alt={media.name || media.original_name}
                            className="media-content tv-media"
                            onError={handleError}
                        />
                    </div>
                ) : media.file_type === 'video' ? (
                    <>
                        {loadError ? (
                            <div className="video-error-indicator" style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: 'white',
                                background: 'rgba(0, 0, 0, 0.7)'
                            }}>
                                <p style={{ fontSize: '18px', marginBottom: '10px' }}>Video failed to load</p>
                                <p style={{ fontSize: '14px', opacity: 0.7 }}>{loadError}</p>
                            </div>
                        ) : (
                            <div className="media-stage">
                                {isBuffering && (
                                    <div className="video-buffering-indicator">
                                        <div className="buffering-spinner"></div>
                                        <p>Loading...</p>
                                    </div>
                                )}
                                <video
                                    ref={videoRef}
                                    src={mediaUrl}
                                    className={`media-content tv-media ${isReady ? 'video-ready' : 'video-loading'}`}
                                    onTimeUpdate={handleVideoTimeUpdate}
                                    onEnded={handleVideoEnded}
                                    onCanPlayThrough={handleCanPlayThrough}
                                    onWaiting={handleWaiting}
                                    onPlaying={handlePlaying}
                                    onLoadStart={handleLoadStart}
                                    onError={handleError}
                                    autoPlay={autoPlay}
                                    preload="auto"
                                    playsInline
                                    muted={false}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="unsupported-media">
                        <p>Unsupported media type: {media.file_type}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
