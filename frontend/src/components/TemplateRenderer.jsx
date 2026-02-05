import { useState, useEffect, useRef, useMemo } from 'react';
import {
    ClockWidget,
    WeatherWidget,
    QRCodeWidget,
    WebViewWidget,
    TextWidget,
    CountdownWidget,
    RSSWidget,
    ImageGalleryWidget,
    ShapeWidget,
    SocialMediaWidget,
    ChartWidget,
    HTMLWidget
} from './widgets';
import api from '../lib/api';
import './TemplateRenderer.css';

export default function TemplateRenderer({
    template,
    zones: zonesProp,
    mediaAssets: mediaAssetsProp,
    duration,
    onComplete,
    apiUrl,
    variableValues = {},
    tenantId = null // For public access (player routes)
}) {
    const [mediaAssets, setMediaAssets] = useState(mediaAssetsProp || {}); // Map of mediaAssetId -> asset data
    const [backgroundImageUrl, setBackgroundImageUrl] = useState(null);
    const timerRef = useRef(null);

    // Parse zones - use zonesProp if provided, otherwise from template
    const zones = zonesProp || (Array.isArray(template.zones)
        ? template.zones
        : (typeof template.zones === 'string' ? JSON.parse(template.zones) : []));

    // Load background image and media assets in parallel for better performance
    useEffect(() => {
        // If mediaAssets are provided as prop, use them and only load background image
        if (mediaAssetsProp && Object.keys(mediaAssetsProp).length > 0) {
            setMediaAssets(mediaAssetsProp);
            
            // Still need to load background image if it exists
            if (template.background_image_id && tenantId) {
                api.get('/content/assets', {
                    params: { tenantId: tenantId }
                })
                    .then(response => {
                        const assets = response.data.assets || [];
                        const bgAsset = assets.find(a => a.id === template.background_image_id);
                        if (bgAsset && bgAsset.url) {
                            const img = new Image();
                            img.src = `${apiUrl}${bgAsset.url}`;
                            img.onload = () => {
                                setBackgroundImageUrl(`${apiUrl}${bgAsset.url}`);
                            };
                        }
                    })
                    .catch(err => {
                        console.error('[TemplateRenderer] Failed to load background image:', err);
                    });
            } else if (!template.background_image_id) {
                setBackgroundImageUrl(null);
            }
            return;
        }

        // Skip if tenantId is missing (for public routes, tenantId is required)
        if (!tenantId) {
            console.warn('[TemplateRenderer] Skipping asset loads - tenantId missing');
            if (!template.background_image_id) {
                setBackgroundImageUrl(null);
            }
            return;
        }

        // Get media zone IDs that need to be loaded
        const mediaZoneIds = zones
            .filter(zone => {
                const contentType = zone.contentType || zone.content_type;
                const mediaAssetId = zone.mediaAssetId || zone.media_asset_id;
                return contentType === 'media' && mediaAssetId;
            })
            .map(zone => zone.mediaAssetId || zone.media_asset_id);

        // Determine what needs to be loaded
        const needsBackground = !!template.background_image_id;
        const needsMediaAssets = mediaZoneIds.length > 0;

        // If nothing to load, reset and return
        if (!needsBackground && !needsMediaAssets) {
            setBackgroundImageUrl(null);
            return;
        }

        // Load all assets in parallel using a single API call
        // This is more efficient than multiple sequential calls
        const loadAssets = async () => {
            try {
                const response = await api.get('/content/assets', {
                    params: { tenantId: tenantId }
                });
                const assets = response.data.assets || [];

                // Process background image in parallel
                if (needsBackground) {
                    const bgAsset = assets.find(a => a.id === template.background_image_id);
                    if (bgAsset && bgAsset.url) {
                        // Preload image
                        const img = new Image();
                        img.src = `${apiUrl}${bgAsset.url}`;
                        img.onload = () => {
                            setBackgroundImageUrl(`${apiUrl}${bgAsset.url}`);
                        };
                        img.onerror = () => {
                            console.error('[TemplateRenderer] Failed to load background image');
                        };
                    }
                } else {
                    setBackgroundImageUrl(null);
                }

                // Process media assets in parallel
                if (needsMediaAssets) {
                    const assetMap = {};
                    mediaZoneIds.forEach(id => {
                        const asset = assets.find(a => a.id === id);
                        if (asset) {
                            assetMap[id] = asset;
                        }
                    });
                    setMediaAssets(assetMap);
                }
            } catch (err) {
                console.error('[TemplateRenderer] Failed to load assets:', err);
            }
        };

        loadAssets();
    }, [template.background_image_id, zones, mediaAssetsProp, tenantId, apiUrl]);

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
        // Support both camelCase and snake_case
        const isVisible = zone.isVisible !== false && zone.is_visible !== false;
        if (!isVisible) return null;

        const zoneStyle = {
            position: 'absolute',
            left: `${zone.x || 0}px`,
            top: `${zone.y || 0}px`,
            width: `${zone.width || 100}px`,
            height: `${zone.height || 100}px`,
            zIndex: zone.zIndex || zone.z_index || 0
        };

        // Support both camelCase and snake_case for contentType
        const contentType = zone.contentType || zone.content_type;
        const mediaAssetId = zone.mediaAssetId || zone.media_asset_id;
        const widgetType = zone.widgetType || zone.widget_type;
        const widgetConfig = zone.widgetConfig || zone.widget_config || {};

        // Media zone
        if (contentType === 'media' && mediaAssetId) {
            const asset = mediaAssets[mediaAssetId];
            if (!asset) {
                return (
                    <div key={zone.id} className="template-zone" style={zoneStyle}>
                        <div className="zone-loading">Loading media...</div>
                    </div>
                );
            }

            const mediaUrl = `${apiUrl}${asset.url}`;
            const mediaFit = zone.mediaFit || zone.media_fit || 'cover';

            return (
                <div key={zone.id} className="template-zone template-zone-media" style={zoneStyle}>
                    {(asset.fileType === 'image' || asset.file_type === 'image') ? (
                        <img
                            src={mediaUrl}
                            alt={asset.originalName || asset.original_name || 'Media'}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: mediaFit
                            }}
                        />
                    ) : (asset.fileType === 'video' || asset.file_type === 'video') ? (
                        <video
                            src={mediaUrl}
                            autoPlay={zone.autoPlay !== false && zone.auto_play !== false}
                            loop={zone.loop !== false}
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
        if (contentType === 'widget' && widgetType) {
            return (
                <div key={zone.id} className="template-zone template-zone-widget" style={zoneStyle}>
                    {widgetType === 'clock' && <ClockWidget config={widgetConfig} />}
                    {widgetType === 'weather' && <WeatherWidget config={widgetConfig} />}
                    {widgetType === 'qrcode' && <QRCodeWidget config={widgetConfig} />}
                    {widgetType === 'webview' && <WebViewWidget config={widgetConfig} />}
                    {widgetType === 'text' && <TextWidget config={widgetConfig} variableValues={variableValues} />}
                    {widgetType === 'countdown' && <CountdownWidget config={widgetConfig} />}
                    {widgetType === 'rss' && <RSSWidget config={widgetConfig} />}
                    {widgetType === 'imagegallery' && <ImageGalleryWidget config={widgetConfig} />}
                    {widgetType === 'shape' && <ShapeWidget config={widgetConfig} />}
                    {widgetType === 'socialmedia' && <SocialMediaWidget config={widgetConfig} />}
                    {widgetType === 'chart' && <ChartWidget config={widgetConfig} />}
                    {widgetType === 'html' && <HTMLWidget config={widgetConfig} />}
                </div>
            );
        }

        // Text zone (legacy support)
        if (contentType === 'text') {
            return (
                <div key={zone.id} className="template-zone template-zone-text" style={zoneStyle}>
                    <TextWidget config={{ content: zone.text || zone.textContent || '', ...(zone.textConfig || {}) }} variableValues={variableValues} />
                </div>
            );
        }

        return null;
    };

    // Only render visible zones for performance
    const visibleZones = useMemo(() => {
        return sortedZones.filter(zone => zone.isVisible !== false);
    }, [sortedZones]);

    return (
        <div className="template-renderer" style={containerStyle}>
            {visibleZones.map(zone => renderZone(zone))}
        </div>
    );
}
