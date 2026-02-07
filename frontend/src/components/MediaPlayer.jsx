import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../lib/api';
import { TRANSITION_EFFECT_VALUES, DEFAULT_TRANSITION_EFFECT } from '../constants/transitions';
import './MediaPlayer.css';

export default function MediaPlayer({
    media,
    onClose,
    autoPlay = false,
    duration = null,
    transitionEffect = 'fade',
    transitionDurationMs = 500,
    onComplete = null
}) {
    const effect = transitionEffect === 'none' || !TRANSITION_EFFECT_VALUES.includes(transitionEffect)
        ? (transitionEffect === 'none' ? 'none' : DEFAULT_TRANSITION_EFFECT)
        : transitionEffect;
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [progress, setProgress] = useState(0);
    const [isBuffering, setIsBuffering] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const timerRef = useRef(null);
    const videoDurationTimerRef = useRef(null);

    const startImageTimer = (durationSec) => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        const sec = (durationSec != null && durationSec > 0) ? durationSec : 5;
        const durationMs = sec * 1000;
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
            } else if (media?.file_type === 'image') {
                startImageTimer(duration);
            }
            setIsPlaying(true);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [media, autoPlay, duration]);

    // Removed togglePlay and toggleFullscreen - not needed in TV mode

    const handleVideoTimeUpdate = () => {
        if (videoRef.current) {
            const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setProgress(percent);
        }
    };

    const handleVideoEnded = () => {
        if (videoDurationTimerRef.current) {
            clearTimeout(videoDurationTimerRef.current);
            videoDurationTimerRef.current = null;
        }
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
    const [imageRetryKey, setImageRetryKey] = useState(0);
    const retryCountRef = useRef(0);
    const [cachedVideoUrl, setCachedVideoUrl] = useState(null);

    // Check for cached video and get blob URL
    useEffect(() => {
        if (media?.file_type !== 'video' || !media?.id) return;

        // Clean up previous blob URL
        if (cachedVideoUrl) {
            URL.revokeObjectURL(cachedVideoUrl);
            setCachedVideoUrl(null);
        }

        // Try to get cached video
        import('../utils/videoCache').then(({ getCachedVideoUrl }) => {
            getCachedVideoUrl(media.id).then(blobUrl => {
                if (blobUrl) {
                    console.log('[MediaPlayer] Using cached video for:', media.id);
                    setCachedVideoUrl(blobUrl);
                } else {
                    console.log('[MediaPlayer] No cached video, will stream:', media.id);
                }
            }).catch(err => {
                console.warn('[MediaPlayer] Failed to get cached video:', err);
            });
        });

        // Cleanup blob URL on unmount
        return () => {
            if (cachedVideoUrl) {
                URL.revokeObjectURL(cachedVideoUrl);
            }
        };
    }, [media?.id, media?.file_type]);

    if (!media) return null;

    const baseUrl = (API_BASE_URL || '').replace(/\/$/, '');
    const path = (media.url || '').startsWith('/') ? media.url : `/${media.url || ''}`;
    const streamUrl = `${baseUrl}${path}`;
    
    // Use cached blob URL if available, otherwise stream from server
    const mediaUrl = (media.file_type === 'video' && cachedVideoUrl) ? cachedVideoUrl : streamUrl;

    // Handle media loading errors with one retry for transient failures
    const handleError = (error) => {
        console.warn('[MediaPlayer] Error loading media:', media.file_type, mediaUrl);

        if (retryCountRef.current >= 1) {
            setLoadError('Failed to load media');
            return;
        }
        retryCountRef.current += 1;

        if (media.file_type === 'video' && videoRef.current) {
            setLoadError(null);
            const src = videoRef.current.src;
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.src = '';
                    videoRef.current.src = src;
                    videoRef.current.load();
                }
            }, 1500);
        } else if (media.file_type === 'image') {
            setLoadError(null);
            setImageRetryKey((k) => k + 1);
        } else {
            setLoadError('Failed to load media');
        }
    };

    // Video: respect playlist duration_seconds – advance after N seconds even if video is longer
    // Use ref for onComplete to avoid re-triggering effect when parent re-renders
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        const effectiveSec = (duration != null && duration > 0) ? duration : 5;
        // console.log(`[MediaPlayer] render effect. url=${media?.url}, type=${media?.file_type}, autoPlay=${autoPlay}, dur=${effectiveSec}`);

        if (media?.file_type !== 'video' || !autoPlay || effectiveSec <= 0) {
            return;
        }
        const durationMs = effectiveSec * 1000;
        videoDurationTimerRef.current = setTimeout(() => {
            videoDurationTimerRef.current = null;
            if (videoRef.current) {
                videoRef.current.pause();
            }
            if (onCompleteRef.current) {
                onCompleteRef.current();
            }
        }, durationMs);
        return () => {
            if (videoDurationTimerRef.current) {
                clearTimeout(videoDurationTimerRef.current);
                videoDurationTimerRef.current = null;
            }
        };
    }, [media?.url, media?.file_type, autoPlay, duration]);

    // Reset error, retry count and image retry key when media changes
    useEffect(() => {
        setLoadError(null);
        setImageRetryKey(0);
        retryCountRef.current = 0;
    }, [media.url]);

    // When load fails after retry, auto-advance after 2s so playlist does not get stuck (e.g. 404)
    useEffect(() => {
        if (!loadError || !onComplete) return;
        const t = setTimeout(() => onComplete(), 2000);
        return () => clearTimeout(t);
    }, [loadError, onComplete]);

    // Do not auto-request fullscreen: browsers/WebView require a user gesture.
    // Native TV apps can enable fullscreen themselves if needed.

    const overlayStyle = effect === 'none'
        ? { animation: 'none' }
        : { animationDuration: `${transitionDurationMs}ms` };

    return (
        <div
            className={`media-player-overlay tv-mode ${effect}`}
            style={overlayStyle}
            ref={containerRef}
        >
            <div className="media-player-content tv-content">
                {!autoPlay ? (
                    <div className="screen-off-overlay">
                        <div className="power-indicator">●</div>
                        <p>Display is Off</p>
                    </div>
                ) : media.file_type === 'image' ? (
                    <div className="media-stage">
                        <img
                            key={imageRetryKey}
                            src={mediaUrl}
                            alt={media.name || media.original_name}
                            className="media-content tv-media"
                            onError={handleError}
                            crossOrigin="anonymous"
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
                                <p style={{ fontSize: '18px', marginBottom: '10px' }}>Media failed to load</p>
                                <p style={{ fontSize: '14px', opacity: 0.7 }}>Advancing in 2s. If 404: add persistent storage to content service (see docs).</p>
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
                                    crossOrigin="anonymous"
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
