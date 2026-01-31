import { useState, useEffect, useRef } from 'react';
import { ClockWidget, WeatherWidget, QRCodeWidget, WebViewWidget, TextWidget } from './widgets';
import api from '../lib/api';
import './TemplateRenderer.css';

export default function TemplateRenderer({ template, duration, onComplete, apiUrl }) {
    const [mediaAssets, setMediaAssets] = useState({}); // Map of mediaAssetId -> asset data
    const [backgroundImageUrl, setBackgroundImageUrl] = useState(null);
    const timerRef = useRef(null);

    // Parse zones if they're a string
    const zones = Array.isArray(template.zones) 
        ? template.zones 
        : (typeof template.zones === 'string' ? JSON.parse(template.zones) : []);

    // Load background image if exists
    useEffect(() => {
        if (template.background_image_id) {
            // Fetch background image asset
            api.get('/content/assets', {
                params: { tenantId: null } // Will use token's tenantId
            })
            .then(response => {
                const assets = response.data.assets || [];
                const bgAsset = assets.find(a => a.id === template.background_image_id);
                if (bgAsset && bgAsset.url) {
                    setBackgroundImageUrl(`${apiUrl}${bgAsset.url}`);
                }
            })
            .catch(err => {
                console.error('Failed to load background image:', err);
            });
        }
    }, [template.background_image_id, apiUrl]);

    // Load media assets for media zones
    useEffect(() => {
        const mediaZoneIds = zones
            .filter(zone => zone.contentType === 'media' && zone.mediaAssetId)
            .map(zone => zone.mediaAssetId);

        if (mediaZoneIds.length === 0) return;

        // Fetch all assets and filter by IDs
        api.get('/content/assets', {
            params: { tenantId: null }
        })
        .then(response => {
            const assets = response.data.assets || [];
            const assetMap = {};
            mediaZoneIds.forEach(id => {
                const asset = assets.find(a => a.id === id);
                if (asset) {
                    assetMap[id] = asset;
                }
            });
            setMediaAssets(assetMap);
        })
        .catch(err => {
            console.error('Failed to load media assets:', err);
        });
    }, [zones]);

    // Timer for template duration
    useEffect(() => {
        if (duration && duration > 0) {
            timerRef.current = setTimeout(() => {
                if (onComplete) {
                    onComplete();
                }
            }, duration * 1000);
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [duration, onComplete]);

    // Sort zones by zIndex
    const sortedZones = [...zones].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    const containerStyle = {
        width: template.width || 1920,
        height: template.height || 1080,
        backgroundColor: template.background_color || '#ffffff',
        backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : null,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        overflow: 'hidden'
    };

    const renderZone = (zone) => {
        if (!zone.isVisible) return null;

        const zoneStyle = {
            position: 'absolute',
            left: `${zone.x || 0}px`,
            top: `${zone.y || 0}px`,
            width: `${zone.width || 100}px`,
            height: `${zone.height || 100}px`,
            zIndex: zone.zIndex || 0
        };

        // Media zone
        if (zone.contentType === 'media' && zone.mediaAssetId) {
            const asset = mediaAssets[zone.mediaAssetId];
            if (!asset) {
                return (
                    <div key={zone.id} className="template-zone" style={zoneStyle}>
                        <div className="zone-loading">Loading media...</div>
                    </div>
                );
            }

            const mediaUrl = `${apiUrl}${asset.url}`;
            const mediaFit = zone.mediaFit || 'cover';

            return (
                <div key={zone.id} className="template-zone template-zone-media" style={zoneStyle}>
                    {asset.fileType === 'image' ? (
                        <img
                            src={mediaUrl}
                            alt={asset.originalName}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: mediaFit
                            }}
                        />
                    ) : asset.fileType === 'video' ? (
                        <video
                            src={mediaUrl}
                            autoPlay
                            loop
                            muted
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: mediaFit
                            }}
                        />
                    ) : null}
                </div>
            );
        }

        // Widget zone
        if (zone.contentType === 'widget' && zone.widgetType) {
            const widgetConfig = zone.widgetConfig || {};

            return (
                <div key={zone.id} className="template-zone template-zone-widget" style={zoneStyle}>
                    {zone.widgetType === 'clock' && <ClockWidget config={widgetConfig} />}
                    {zone.widgetType === 'weather' && <WeatherWidget config={widgetConfig} />}
                    {zone.widgetType === 'qrcode' && <QRCodeWidget config={widgetConfig} />}
                    {zone.widgetType === 'webview' && <WebViewWidget config={widgetConfig} />}
                    {zone.widgetType === 'text' && <TextWidget config={widgetConfig} />}
                </div>
            );
        }

        // Text zone (legacy support)
        if (zone.contentType === 'text') {
            return (
                <div key={zone.id} className="template-zone template-zone-text" style={zoneStyle}>
                    <TextWidget config={{ content: zone.text || '', ...zone.textConfig }} />
                </div>
            );
        }

        return null;
    };

    return (
        <div className="template-renderer" style={containerStyle}>
            {sortedZones.map(zone => renderZone(zone))}
        </div>
    );
}
