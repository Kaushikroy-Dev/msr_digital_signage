import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import MediaPlayer from '../components/MediaPlayer';
import TemplateRenderer from '../components/TemplateRenderer';
import { detectPlatform, getDeviceInfo } from '../utils/platformDetection';
import { initTizen, preventScreenSaver, setupTizenLifecycle } from '../utils/tizenUtils';
import { initWebOS, setupWebOSLifecycle, requestWebOSFullscreen } from '../utils/webosUtils';
import { initKioskMode, isElectron } from '../utils/kioskUtils';
import { initTVRemote, initTizenRemote, initWebOSRemote } from '../utils/tvRemote';
import { applyPlatformOptimizations, initOptimizations } from '../utils/platformOptimizations';
import { initErrorHandling, log } from '../utils/platformLogger';
import './DevicePlayer.css';

export default function DevicePlayer() {
    const { deviceId: urlDeviceId } = useParams();
    // Only use localStorage deviceId if no URL param and we're not in pairing mode
    const [deviceId, setDeviceId] = useState(urlDeviceId || null);
    const [pairingCode, setPairingCode] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [hasInitialContent, setHasInitialContent] = useState(false);
    const [pairingError, setPairingError] = useState(null);

    // Persist deviceId to localStorage when we get it from URL
    useEffect(() => {
        if (urlDeviceId) {
            setDeviceId(urlDeviceId);
            localStorage.setItem('ds_device_id', urlDeviceId);
        }
    }, [urlDeviceId]);

    // Handle Pairing Mode - Always generate code if no deviceId
    useEffect(() => {
        if (!deviceId && !pairingCode) {
            // Generate pairing code
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
    }, [deviceId, pairingCode]);

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

    // Fetch current content for device
    const { data: playerData, refetch } = useQuery({
        queryKey: ['player-content', deviceId],
        queryFn: async () => {
            const response = await api.get(`/schedules/player/${deviceId}/content`);
            return response.data;
        },
        enabled: !!deviceId,
        refetchInterval: 60000
    });

    // WebSocket for real-time commands with auto-reconnect
    useEffect(() => {
        if (!deviceId) return;

        let ws = null;
        let reconnectAttempts = 0;
        let reconnectTimeout = null;
        const maxReconnectDelay = 30000; // 30 seconds max
        const baseReconnectDelay = 1000; // Start with 1 second

        const connect = () => {
            // Use environment variable with fallback, consistent with API client
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const wsUrl = apiUrl.replace(/^http/, 'ws').replace(/^https/, 'wss') + '/ws';
            console.log('[Player] Connecting to WebSocket:', wsUrl);

            try {
                ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    console.log('[Player] Connected to Gateway WS');
                    reconnectAttempts = 0; // Reset on successful connection
                    ws.send(JSON.stringify({ type: 'register', deviceId }));
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('[Player] WS Message received:', data);

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
    }, [deviceId, refetch]);

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

    const handleMediaComplete = () => {
        if (!playerData?.items) return;
        const nextIndex = (currentIndex + 1) % playerData.items.length;
        setCurrentIndex(nextIndex);
    };

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

    if (!playerData || !playerData.playlist) {
        return (
            <div className="device-player-container">
                <div className="no-content">
                    <h1>No Content Scheduled</h1>
                    <p>Device ID: {deviceId}</p>
                    <p>Waiting for content to be scheduled...</p>
                </div>
            </div>
        );
    }

    const { playlist, items } = playerData;
    const currentItem = items[currentIndex];

    if (!currentItem) {
        return (
            <div className="device-player-container">
                <div className="no-content">
                    <h1>Playlist Empty</h1>
                    <p>The scheduled playlist has no items</p>
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
                    apiUrl={import.meta.env.VITE_API_URL || 'http://localhost:3000'}
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
