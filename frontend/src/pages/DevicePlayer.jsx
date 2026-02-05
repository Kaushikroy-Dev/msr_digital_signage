import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api, { API_BASE_URL } from '../lib/api';
import MediaPlayer from '../components/MediaPlayer';
import TemplateRenderer from '../components/TemplateRenderer';
import { detectPlatform, getDeviceInfo } from '../utils/platformDetection';
import { initTizen, preventScreenSaver, setupTizenLifecycle } from '../utils/tizenUtils';
import { initWebOS, setupWebOSLifecycle, requestWebOSFullscreen } from '../utils/webosUtils';
import { initKioskMode, isElectron } from '../utils/kioskUtils';
import { initTVRemote, initTizenRemote, initWebOSRemote } from '../utils/tvRemote';
import { applyPlatformOptimizations, initOptimizations } from '../utils/platformOptimizations';
import { initErrorHandling, log } from '../utils/platformLogger';
import { cacheMediaUrls } from '../utils/offlineCache';
import { saveDeviceIdToNative } from '../utils/webViewUtils';
import './DevicePlayer.css';

export default function DevicePlayer() {
    const { deviceId: urlDeviceId } = useParams();
    const [searchParams] = useSearchParams();
    
    // Read player_id from URL query params (for Android TV app)
    const playerIdFromQuery = searchParams.get('player_id');
    
    // Only use localStorage deviceId if no URL param and we're not in pairing mode
    const [deviceId, setDeviceId] = useState(urlDeviceId || null);
    const [playerId, setPlayerId] = useState(playerIdFromQuery || null);
    const [deviceToken, setDeviceToken] = useState(null);
    const [pairingCode, setPairingCode] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [hasInitialContent, setHasInitialContent] = useState(false);
    const [pairingError, setPairingError] = useState(null);
    const [initStatus, setInitStatus] = useState(null); // 'UNPAIRED', 'ACTIVE', 'DISABLED'

    // Persist deviceId to localStorage when we get it from URL
    useEffect(() => {
        if (urlDeviceId) {
            setDeviceId(urlDeviceId);
            localStorage.setItem('ds_device_id', urlDeviceId);
        }
    }, [urlDeviceId]);

    // Initialize device with player_id (for Android TV app)
    const { data: initData, isLoading: initLoading, error: initError } = useQuery({
        queryKey: ['device-init', playerId],
        queryFn: async () => {
            if (!playerId) return null;
            console.log('[Player] Initializing device with player_id:', playerId);
            const response = await api.post('/device/init', { player_id: playerId });
            return response.data;
        },
        enabled: !!playerId && !deviceId, // Only run if we have playerId and no deviceId yet
        retry: 3,
        retryDelay: 2000
    });

    // Handle device initialization result
    useEffect(() => {
        if (initData) {
            console.log('[Player] Device init result:', initData);
            setInitStatus(initData.status);
            
            if (initData.pairing_required) {
                // Device needs pairing
                setDeviceId(null);
                setPairingError(initData.message || 'Device not paired');
            } else if (initData.device_id) {
                // Device is paired - set deviceId and token
                setDeviceId(initData.device_id);
                setPlayerId(initData.player_id || initData.device_id);
                setDeviceToken(initData.device_token);
                localStorage.setItem('ds_device_id', initData.device_id);
                if (initData.device_token) {
                    localStorage.setItem('ds_device_token', initData.device_token);
                }
            }
        }
    }, [initData]);

    // Handle init error
    useEffect(() => {
        if (initError) {
            console.error('[Player] Device init error:', initError);
            setPairingError(initError.response?.data?.error || 'Failed to initialize device');
        }
    }, [initError]);

    // Handle Pairing Mode - Always generate code if no deviceId and no playerId flow
    useEffect(() => {
        if (!deviceId && !pairingCode && !playerId) {
            // Generate pairing code (legacy flow for non-Android TV devices)
            const fetchPairingCode = async () => {
                try {
                    setPairingError(null);
                    const detectedPlatform = detectPlatform();
                    const deviceInfo = getDeviceInfo();
                    const response = await api.post('/devices/pairing/generate', {
                        platform: detectedPlatform,
                        deviceInfo: deviceInfo
                    });
                    if (response.data && response.data.code) {
                        setPairingCode(response.data.code);
                        console.log('[Player] Pairing code generated:', response.data.code);
                    } else {
                        setPairingError('Failed to generate pairing code');
                    }
                } catch (err) {
                    console.error('[Player] Failed to generate pairing code:', err);
                    setPairingError(err.response?.data?.error || 'Failed to generate pairing code. Please refresh the page.');
                }
            };
            fetchPairingCode();
        }
    }, [deviceId, pairingCode, playerId]);

    // Poll for pairing status
    useEffect(() => {
        let pollInterval;
        if (pairingCode && !deviceId) {
            pollInterval = setInterval(async () => {
                try {
                    const response = await api.get(`/devices/pairing/status/${pairingCode}`);
                    if (response.data.assignedDeviceId) {
                        const newId = response.data.assignedDeviceId;
                        setDeviceId(newId);
                        localStorage.setItem('ds_device_id', newId);
                        clearInterval(pollInterval);
                    }
                } catch (err) {
                    // Not paired yet, ignore 404
                }
            }, 5000);
        }
        return () => clearInterval(pollInterval);
    }, [pairingCode, deviceId]);

    // Save deviceId to native app (WebView) and localStorage (browser) when obtained
    useEffect(() => {
        if (deviceId) {
            // Always save to localStorage (for browser fallback)
            localStorage.setItem('ds_device_id', deviceId);
            
            // Save to native app if running in WebView
            saveDeviceIdToNative(deviceId);
        }
    }, [deviceId]);

    // Update URL when deviceId changes (from any source: WebSocket, polling, or init)
    useEffect(() => {
        if (deviceId && !window.location.pathname.includes(deviceId)) {
            const newUrl = `/player/${deviceId}`;
            window.history.pushState({}, '', newUrl);
            console.log('[Player] URL updated to:', newUrl);
        }
    }, [deviceId]);

    // Fetch device config (for Android TV app flow)
    const { data: deviceConfig } = useQuery({
        queryKey: ['device-config', playerId, deviceToken],
        queryFn: async () => {
            if (!playerId) return null;
            const headers = deviceToken ? { 'x-device-token': deviceToken } : {};
            const response = await api.get('/device/config', {
                params: { player_id: playerId },
                headers
            });
            return response.data;
        },
        enabled: !!playerId && !!deviceId && !initData?.pairing_required,
        refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes (reduced from 1 minute)
        staleTime: 4 * 60 * 1000, // Consider data stale after 4 minutes
        cacheTime: 10 * 60 * 1000 // Keep in cache for 10 minutes
    });

    // Fetch current content for device
    const { data: playerData, refetch, error: playerDataError } = useQuery({
        queryKey: ['player-content', deviceId],
        queryFn: async () => {
            const response = await api.get(`/schedules/player/${deviceId}/content`);
            console.log('[Player] Content response:', {
                hasPlaylist: !!response.data?.playlist,
                itemsCount: response.data?.items?.length || 0,
                items: response.data?.items,
                tenantId: response.data?.tenantId
            });
            return response.data;
        },
        enabled: !!deviceId,
        refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes (reduced from 1 minute)
        staleTime: 4 * 60 * 1000, // Consider data stale after 4 minutes
        cacheTime: 10 * 60 * 1000 // Keep in cache for 10 minutes
    });

    // WebSocket for real-time commands with auto-reconnect
    // Connect even with playerId (before deviceId is available)
    useEffect(() => {
        if (!deviceId && !playerId) return;

        let ws = null;
        let reconnectAttempts = 0;
        let reconnectTimeout = null;
        const maxReconnectDelay = 30000; // 30 seconds max
        const baseReconnectDelay = 1000; // Start with 1 second

        const connect = () => {
            // Use environment variable with fallback, consistent with API client
            const apiUrl = API_BASE_URL;
            const wsUrl = apiUrl.replace(/^http/, 'ws').replace(/^https/, 'wss') + '/ws';
            console.log('[Player] Connecting to WebSocket:', wsUrl);

            try {
                ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    console.log('[Player] Connected to Gateway WS');
                    reconnectAttempts = 0; // Reset on successful connection
                    
                    // Register with playerId first if deviceId not available
                    if (playerId && !deviceId) {
                        ws.send(JSON.stringify({ type: 'register_player', playerId }));
                        console.log('[Player] Registered with playerId:', playerId);
                    } else if (deviceId) {
                        ws.send(JSON.stringify({ type: 'register', deviceId }));
                        console.log('[Player] Registered with deviceId:', deviceId);
                    }
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('[Player] WS Message received:', data);

                        // Handle device_paired notification
                        if (data.type === 'device_paired' && data.deviceId) {
                            console.log('[Player] Device paired notification received:', data.deviceId);
                            
                            // Update state
                            setDeviceId(data.deviceId);
                            localStorage.setItem('ds_device_id', data.deviceId);
                            
                            // Update URL to include deviceId
                            const newUrl = `/player/${data.deviceId}`;
                            window.history.pushState({}, '', newUrl);
                            console.log('[Player] URL updated to:', newUrl);
                            
                            // Re-register WebSocket with deviceId
                            if (ws && ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({ type: 'register', deviceId: data.deviceId }));
                                console.log('[Player] Re-registered with deviceId:', data.deviceId);
                            }
                            
                            // Content will automatically refetch due to deviceId change
                            return;
                        }

                        if (data.type === 'command') {
                            console.log(`[Player] Executing command: ${data.command}`);

                            switch (data.command) {
                                case 'reboot':
                                    console.log('[Player] Rebooting player...');
                                    // Send acknowledgment before reboot
                                    ws.send(JSON.stringify({
                                        type: 'command_ack',
                                        command: 'reboot',
                                        deviceId
                                    }));
                                    setTimeout(() => window.location.reload(), 500);
                                    break;

                                case 'screen_off':
                                    console.log('[Player] Turning screen off (stopping playback)...');
                                    setIsPlaying(false);
                                    // Send acknowledgment
                                    ws.send(JSON.stringify({
                                        type: 'command_ack',
                                        command: 'screen_off',
                                        deviceId
                                    }));
                                    break;

                                case 'screen_on':
                                    console.log('[Player] Turning screen on (resuming playback)...');
                                    setIsPlaying(true);
                                    // Send acknowledgment
                                    ws.send(JSON.stringify({
                                        type: 'command_ack',
                                        command: 'screen_on',
                                        deviceId
                                    }));
                                    break;

                                case 'clear_cache':
                                    console.log('[Player] Clearing cache and reloading...');
                                    ws.send(JSON.stringify({
                                        type: 'command_ack',
                                        command: 'clear_cache',
                                        deviceId
                                    }));
                                    localStorage.clear();
                                    setTimeout(() => window.location.reload(), 500);
                                    break;

                                case 'refresh':
                                    console.log('[Player] Refreshing content...');
                                    refetch();
                                    ws.send(JSON.stringify({
                                        type: 'command_ack',
                                        command: 'refresh',
                                        deviceId
                                    }));
                                    break;

                                default:
                                    console.log('[Player] Unknown command:', data.command);
                            }
                        }
                    } catch (err) {
                        console.error('[Player] WS parse error:', err);
                    }
                };

                ws.onerror = (error) => {
                    console.error('[Player] WebSocket error:', error);
                };

                ws.onclose = () => {
                    console.log('[Player] Disconnected from Gateway WS');

                    // Calculate exponential backoff delay
                    const delay = Math.min(
                        baseReconnectDelay * Math.pow(2, reconnectAttempts),
                        maxReconnectDelay
                    );

                    reconnectAttempts++;
                    console.log(`[Player] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})...`);

                    reconnectTimeout = setTimeout(() => {
                        connect();
                    }, delay);
                };
            } catch (error) {
                console.error('[Player] Failed to create WebSocket:', error);
                // Retry connection
                reconnectTimeout = setTimeout(() => {
                    connect();
                }, baseReconnectDelay);
            }
        };

        connect();

        return () => {
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
            if (ws) {
                ws.close();
            }
        };
    }, [deviceId, playerId, refetch]);

    // Initialize platform-specific features
    useEffect(() => {
        const platform = detectPlatform();

        // Initialize error handling
        initErrorHandling();

        // Initialize platform optimizations
        initOptimizations();

        // Initialize TV remote control
        initTVRemote();

        if (platform === 'tizen') {
            initTizen();
            initTizenRemote();
            preventScreenSaver();
            setupTizenLifecycle({
                onHide: () => {
                    log.info('[Tizen] App hidden');
                },
                onShow: () => {
                    log.info('[Tizen] App shown');
                    setIsPlaying(true);
                },
            });
        } else if (platform === 'webos') {
            initWebOS();
            initWebOSRemote();
            requestWebOSFullscreen();
            setupWebOSLifecycle({
                onHide: () => {
                    log.info('[WebOS] App hidden');
                },
                onShow: () => {
                    log.info('[WebOS] App shown');
                    setIsPlaying(true);
                },
                onBack: () => {
                    log.info('[WebOS] Back button pressed - prevented in kiosk mode');
                },
            });
        } else if (platform === 'windows' || platform === 'linux') {
            // Initialize kiosk mode for Windows/Linux (Electron)
            if (isElectron()) {
                initKioskMode();
            }
        }

        log.info('Platform initialized', { platform });
    }, []);

    // Heartbeat reporting with isPlaying state
    useEffect(() => {
        if (!deviceId) return;

        const sendHeartbeat = async () => {
            try {
                await api.post(`/devices/${deviceId}/heartbeat`, {
                    cpuUsage: Math.random() * 20 + 5, // Simulation
                    memoryUsage: Math.random() * 30 + 40,
                    networkStatus: 'online',
                    isPlaying: isPlaying
                });
                console.log(`[Player] Heartbeat sent - isPlaying: ${isPlaying}`);
            } catch (err) {
                console.error('[Player] Heartbeat failed:', err);
            }
        };

        sendHeartbeat(); // Initial
        const interval = setInterval(sendHeartbeat, 30000);
        return () => clearInterval(interval);
    }, [deviceId, isPlaying]); // Added isPlaying dependency

    // Auto-play on initial content load, but don't override remote screen-off later
    useEffect(() => {
        if (playerData?.items?.length > 0 && !hasInitialContent) {
            setIsPlaying(true);
            setHasInitialContent(true);
            setCurrentIndex(0);
        }
    }, [playerData, hasInitialContent]);

    // Cache media URLs when playlist is loaded for faster access
    useEffect(() => {
        if (playerData?.items && playerData.items.length > 0) {
            const mediaItems = playerData.items
                .filter(item => item.url && (item.file_type === 'video' || item.file_type === 'image'))
                .map(item => ({
                    id: item.content_id || item.id,
                    url: item.url
                }));
            
            if (mediaItems.length > 0) {
                cacheMediaUrls(mediaItems, API_BASE_URL).catch(err => {
                    console.warn('[Player] Failed to cache media URLs:', err);
                });
            }
        }
    }, [playerData]);

    const handleMediaComplete = () => {
        if (!playerData?.items) return;
        const nextIndex = (currentIndex + 1) % playerData.items.length;
        setCurrentIndex(nextIndex);
    };

    // Video preloading: Preload next 1-2 videos while current video plays
    useEffect(() => {
        if (!playerData?.items || !isPlaying) return;
        
        const preloadedVideos = [];
        const maxPreload = 2; // Preload next 2 items
        
        // Preload next videos (up to maxPreload items)
        for (let i = 1; i <= maxPreload; i++) {
            const nextIndex = (currentIndex + i) % playerData.items.length;
            const nextItem = playerData.items[nextIndex];
            
            // Only preload videos (not images or templates)
            if (nextItem?.file_type === 'video' && nextItem?.url) {
                const preloadVideo = document.createElement('video');
                preloadVideo.preload = 'auto';
                preloadVideo.src = `${API_BASE_URL}${nextItem.url}`;
                preloadVideo.style.display = 'none';
                preloadVideo.style.position = 'absolute';
                preloadVideo.style.width = '1px';
                preloadVideo.style.height = '1px';
                preloadVideo.style.opacity = '0';
                preloadVideo.style.pointerEvents = 'none';
                
                // Add to document for preloading
                document.body.appendChild(preloadVideo);
                preloadedVideos.push(preloadVideo);
                
                console.log(`[Player] Preloading next video ${i}: ${nextItem.name || nextItem.url}`);
            }
        }
        
        // Cleanup function: remove preloaded videos when component unmounts or dependencies change
        return () => {
            preloadedVideos.forEach(video => {
                if (video.parentNode) {
                    video.parentNode.removeChild(video);
                }
            });
        };
    }, [currentIndex, playerData, isPlaying, API_BASE_URL]);

    // Pairing Mode UI
    if (!deviceId) {
        if (pairingError) {
            return (
                <div className="device-pairing-container">
                    <div className="pairing-card">
                        <div className="logo-placeholder">
                            <img src="/logo.svg" alt="Digital Signedge" className="pairing-logo" />
                        </div>
                        <h1>Registration Error</h1>
                        <p style={{ color: '#ef4444', marginBottom: '24px' }}>{pairingError}</p>
                        <button
                            onClick={() => {
                                setPairingError(null);
                                setPairingCode(null);
                            }}
                            style={{
                                padding: '12px 24px',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '16px'
                            }}
                        >
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        if (pairingCode) {
            const formattedCode = `${pairingCode.slice(0, 4)}-${pairingCode.slice(4)}`;
            return (
                <div className="device-pairing-container">
                    <div className="pairing-card">
                        <div className="logo-placeholder">
                            <img src="/logo.svg" alt="Digital Signedge" className="pairing-logo" />
                        </div>
                        <h1>Register Your Screen</h1>
                        <p>Enter this code in your cloud portal to pair this screen.</p>
                        <div className="pairing-code-display">
                            {formattedCode.split('').map((char, i) => (
                                <span key={i} className={char === '-' ? 'separator' : 'char'}>
                                    {char}
                                </span>
                            ))}
                        </div>
                        <div className="pairing-footer">
                            <div className="loading-spinner"></div>
                            <span>Waiting for pairing...</span>
                        </div>
                        <p className="device-info-hint">Device ID: {navigator.userAgent.slice(0, 20)}...</p>
                        <button
                            onClick={() => {
                                localStorage.removeItem('ds_device_id');
                                setPairingCode(null);
                            }}
                            style={{
                                marginTop: '24px',
                                padding: '8px 16px',
                                background: 'transparent',
                                color: 'rgba(255,255,255,0.7)',
                                border: '1px solid rgba(255,255,255,0.3)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Reset & Generate New Code
                        </button>
                    </div>
                </div>
            );
        }

        // Loading state
        return (
            <div className="device-pairing-container">
                <div className="pairing-card">
                    <div className="logo-placeholder">
                        <img src="/logo.svg" alt="Digital Signedge" className="pairing-logo" />
                    </div>
                    <h1>Register Your Screen</h1>
                    <div className="pairing-footer">
                        <div className="loading-spinner"></div>
                        <span>Generating pairing code...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Show error if API call failed
    if (playerDataError) {
        console.error('[Player] Error fetching content:', playerDataError);
        return (
            <div className="device-player-container">
                <div className="no-content">
                    <h1>Error Loading Content</h1>
                    <p>Device ID: {deviceId}</p>
                    <p>Failed to fetch playlist content. Please check device assignment.</p>
                    <button onClick={() => refetch()} style={{ marginTop: '16px', padding: '8px 16px' }}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Check if we have valid player data
    if (!playerData) {
        return (
            <div className="device-player-container">
                <div className="no-content">
                    <h1>Loading Content...</h1>
                    <p>Device ID: {deviceId}</p>
                    <p>Fetching playlist content...</p>
                </div>
            </div>
        );
    }

    // Check if playlist exists
    if (!playerData.playlist) {
        return (
            <div className="device-player-container">
                <div className="no-content">
                    <h1>No Content Scheduled</h1>
                    <p>Device ID: {deviceId}</p>
                    <p>No playlist assigned to this device</p>
                </div>
            </div>
        );
    }

    const { playlist, items } = playerData;

    // Check if items array exists and has content
    if (!items || !Array.isArray(items) || items.length === 0) {
        return (
            <div className="device-player-container">
                <div className="no-content">
                    <h1>Playlist Empty</h1>
                    <p>The scheduled playlist "{playlist.name || 'Unknown'}" has no items</p>
                    <p>Please add content to the playlist in the admin portal</p>
                </div>
            </div>
        );
    }

    const currentItem = items[currentIndex];

    if (!currentItem) {
        return (
            <div className="device-player-container">
                <div className="no-content">
                    <h1>Playlist Empty</h1>
                    <p>The scheduled playlist has no valid items</p>
                </div>
            </div>
        );
    }

    // Check if current item is a template
    if (currentItem.content_type === 'template' && currentItem.template) {
        return (
            <div className="device-player-container tv-mode">
                <TemplateRenderer
                    template={currentItem.template}
                    duration={currentItem.duration_seconds}
                    onComplete={handleMediaComplete}
                    apiUrl={API_BASE_URL}
                    tenantId={playerData?.tenantId} // Pass tenantId for public asset access
                />
            </div>
        );
    }

    // Default to media player
    const currentMedia = {
        id: currentItem.content_id,
        name: currentItem.name,
        original_name: currentItem.name,
        file_type: currentItem.file_type,
        url: currentItem.url
    };

    return (
        <div className="device-player-container tv-mode">
            <MediaPlayer
                media={currentMedia}
                onClose={() => { }}
                autoPlay={isPlaying}
                duration={currentItem.duration_seconds}
                transitionEffect={playlist.transition_effect}
                onComplete={handleMediaComplete}
            />
        </div>
    );
}
