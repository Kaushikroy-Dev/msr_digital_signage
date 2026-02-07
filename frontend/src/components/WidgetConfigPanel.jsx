import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Palette, Zap, Settings, Eye, Link as LinkIcon } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import ColorPicker from './ColorPicker';
import './WidgetConfigPanel.css';

export default function WidgetConfigPanel({ zone, onConfigChange, allZones = [], templateId, onDataBindingClick }) {
    const { user } = useAuthStore();
    const [config, setConfig] = useState(zone?.widgetConfig || {});
    const [activeTab, setActiveTab] = useState('content');
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        // Transform widget config from renderer format back to designer format for editing
        const designerConfig = transformConfigForDesigner(zone?.widgetType, zone?.widgetConfig || {});
        setConfig(designerConfig);
    }, [zone]);

    // Transform config from widget renderer format to designer format for editing
    const transformConfigForDesigner = (widgetType, config) => {
        switch (widgetType) {
            case 'clock':
                return {
                    timeFormat: config.format || '24h',
                    timezone: config.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                    showDate: config.showDate !== false,
                    showSeconds: config.showSeconds !== false,
                    fontSize: config.font?.size || 48,
                    textColor: config.font?.color || '#ffffff',
                    fontFamily: config.font?.family || 'Arial',
                    fontWeight: config.font?.weight || 'normal',
                    dateFormat: config.dateFormat || 'short'
                };
            
            case 'weather':
                return {
                    location: config.location || 'New York, US',
                    units: config.units === 'C' ? 'metric' : config.units === 'F' ? 'imperial' : (config.units || 'metric'),
                    apiKey: config.apiKey || '',
                    updateInterval: config.updateInterval || 600000,
                    fontSize: config.font?.size || 24,
                    textColor: config.font?.color || '#ffffff',
                    fontFamily: config.font?.family || 'Arial',
                    showIcon: config.showIcon !== false,
                    showDescription: config.showDescription !== false
                };
            
            case 'text':
                return {
                    text: config.content || config.text || '',
                    html: config.html || false,
                    fontSize: config.style?.fontSize || 24,
                    color: config.style?.color || '#000000',
                    fontFamily: config.style?.fontFamily || 'Arial',
                    fontWeight: config.style?.fontWeight || 'normal',
                    alignment: config.style?.textAlign || 'left',
                    lineHeight: config.style?.lineHeight || 1.5,
                    padding: config.style?.padding || '10px',
                    backgroundColor: config.style?.backgroundColor,
                    borderRadius: config.style?.borderRadius,
                    border: config.style?.border
                };
            
            case 'qrcode':
                return {
                    url: config.text || config.url || '',
                    size: config.size || 200,
                    errorCorrectionLevel: config.errorCorrection || 'M',
                    margin: config.margin || 1,
                    foregroundColor: config.color?.dark || '#000000',
                    backgroundColor: config.color?.light || '#ffffff'
                };
            
            case 'webview':
                return {
                    url: config.url || '',
                    refreshInterval: config.refreshInterval || 60,
                    allowJavaScript: config.allowJavaScript !== false
                };
            
            case 'countdown':
            case 'rss':
            case 'imagegallery':
            case 'shape':
            case 'socialmedia':
            case 'chart':
            case 'html':
                // For new widgets, return config as-is (they use the same format)
                return config;
            
            default:
                return config;
        }
    };

    const handleConfigUpdate = (key, value) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        
        // Transform config to match widget expectations before passing to parent
        const transformedConfig = transformConfigForWidget(zone.widgetType, newConfig);
        onConfigChange(transformedConfig);
    };

    // Transform config from designer format to widget renderer format
    const transformConfigForWidget = (widgetType, config) => {
        switch (widgetType) {
            case 'clock':
                return {
                    format: config.timeFormat || config.format || '24h',
                    timezone: config.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                    showDate: config.showDate !== false,
                    showSeconds: config.showSeconds !== false,
                    font: {
                        family: config.fontFamily || config.font?.family || 'Arial',
                        size: config.fontSize || config.font?.size || 48,
                        color: config.textColor || config.font?.color || '#ffffff',
                        weight: config.fontWeight || config.font?.weight || 'normal'
                    },
                    dateFormat: config.dateFormat || 'short'
                };
            
            case 'weather':
                return {
                    location: config.location || 'New York, US',
                    units: config.units === 'metric' ? 'C' : config.units === 'imperial' ? 'F' : (config.units || 'C'),
                    apiKey: config.apiKey || '',
                    updateInterval: config.updateInterval || 600000,
                    font: {
                        family: config.fontFamily || config.font?.family || 'Arial',
                        size: config.fontSize || config.font?.size || 24,
                        color: config.textColor || config.font?.color || '#ffffff'
                    },
                    showIcon: config.showIcon !== false,
                    showDescription: config.showDescription !== false
                };
            
            case 'text':
                return {
                    content: config.text || config.content || '',
                    html: config.html || false,
                    style: {
                        fontFamily: config.fontFamily || config.style?.fontFamily || 'Arial',
                        fontSize: config.fontSize || config.style?.fontSize || 24,
                        color: config.color || config.textColor || config.style?.color || '#000000',
                        fontWeight: config.fontWeight || config.style?.fontWeight || 'normal',
                        textAlign: config.alignment || config.style?.textAlign || 'left',
                        lineHeight: config.lineHeight || config.style?.lineHeight || 1.5,
                        padding: config.padding || config.style?.padding || '10px',
                        backgroundColor: config.backgroundColor || config.style?.backgroundColor,
                        borderRadius: config.borderRadius || config.style?.borderRadius,
                        border: config.border || config.style?.border,
                        borderWidth: config.borderWidth || config.style?.borderWidth,
                        borderColor: config.borderColor || config.style?.borderColor,
                        shadow: config.shadow || config.style?.shadow,
                        opacity: config.opacity || config.style?.opacity,
                        gradient: config.gradient || config.style?.gradient
                    },
                    animation: {
                        entrance: config.entranceAnimation,
                        exit: config.exitAnimation,
                        duration: config.animationDuration,
                        delay: config.animationDelay,
                        easing: config.animationEasing,
                        loop: config.loopAnimation
                    },
                    responsive: {
                        behavior: config.responsiveBehavior,
                        minWidth: config.minWidth,
                        maxWidth: config.maxWidth
                    },
                    zIndex: config.zIndex,
                    customClass: config.customClass,
                    customCSS: config.customCSS
                };
            
            case 'qrcode':
                return {
                    text: config.url || config.text || '',
                    size: config.size || 200,
                    errorCorrection: config.errorCorrectionLevel || config.errorCorrection || 'M',
                    margin: config.margin || 1,
                    color: {
                        dark: config.foregroundColor || config.color?.dark || '#000000',
                        light: config.backgroundColor || config.color?.light || '#ffffff'
                    }
                };
            
            case 'webview':
                return {
                    url: config.url || '',
                    refreshInterval: config.refreshInterval || 60,
                    allowJavaScript: config.allowJavaScript !== false
                };
            
            default:
                return config;
        }
    };

    if (!zone || zone.contentType !== 'widget') {
        return (
            <div className="widget-config-panel">
                <div className="widget-config-empty">Select a widget to configure</div>
            </div>
        );
    }

    const renderConfig = () => {
        switch (zone.widgetType) {
            case 'clock':
                return (
                    <div className="widget-config-form">
                        <div className="form-group">
                            <label>Time Format</label>
                            <select
                                className="input"
                                value={config.timeFormat || '12h'}
                                onChange={(e) => handleConfigUpdate('timeFormat', e.target.value)}
                            >
                                <option value="12h">12 Hour (3:45 PM)</option>
                                <option value="24h">24 Hour (15:45)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Timezone</label>
                            <input
                                type="text"
                                className="input"
                                value={config.timezone || 'UTC'}
                                onChange={(e) => handleConfigUpdate('timezone', e.target.value)}
                                placeholder="UTC, America/New_York, etc."
                            />
                        </div>
                        <div className="form-group">
                            <label>Show Date</label>
                            <input
                                type="checkbox"
                                checked={config.showDate !== false}
                                onChange={(e) => handleConfigUpdate('showDate', e.target.checked)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Show Seconds</label>
                            <input
                                type="checkbox"
                                checked={config.showSeconds !== false}
                                onChange={(e) => handleConfigUpdate('showSeconds', e.target.checked)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Date Format</label>
                            <select
                                className="input"
                                value={config.dateFormat || 'short'}
                                onChange={(e) => handleConfigUpdate('dateFormat', e.target.value)}
                            >
                                <option value="short">Short (Jan 31, 2026)</option>
                                <option value="long">Long (Monday, January 31, 2026)</option>
                                <option value="numeric">Numeric (01/31/2026)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Font Family</label>
                            <select
                                className="input"
                                value={config.fontFamily || 'Arial'}
                                onChange={(e) => handleConfigUpdate('fontFamily', e.target.value)}
                            >
                                <option value="Arial">Arial</option>
                                <option value="Helvetica">Helvetica</option>
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Courier New">Courier New</option>
                                <option value="Verdana">Verdana</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Font Size</label>
                            <input
                                type="number"
                                className="input"
                                value={config.fontSize || 48}
                                onChange={(e) => handleConfigUpdate('fontSize', parseInt(e.target.value))}
                                min="12"
                                max="200"
                            />
                        </div>
                        <div className="form-group">
                            <label>Font Weight</label>
                            <select
                                className="input"
                                value={config.fontWeight || 'normal'}
                                onChange={(e) => handleConfigUpdate('fontWeight', e.target.value)}
                            >
                                <option value="normal">Normal</option>
                                <option value="bold">Bold</option>
                                <option value="lighter">Light</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Text Color</label>
                            <input
                                type="color"
                                className="input"
                                value={config.textColor || '#ffffff'}
                                onChange={(e) => handleConfigUpdate('textColor', e.target.value)}
                            />
                        </div>
                    </div>
                );

            case 'weather':
                return (
                    <div className="widget-config-form">
                        <div className="form-group">
                            <label>Location</label>
                            <input
                                type="text"
                                className="input"
                                value={config.location || ''}
                                onChange={(e) => handleConfigUpdate('location', e.target.value)}
                                placeholder="City, Country"
                            />
                        </div>
                        <div className="form-group">
                            <label>Units</label>
                            <select
                                className="input"
                                value={config.units || 'metric'}
                                onChange={(e) => handleConfigUpdate('units', e.target.value)}
                            >
                                <option value="metric">Celsius</option>
                                <option value="imperial">Fahrenheit</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>API Key</label>
                            <input
                                type="text"
                                className="input"
                                value={config.apiKey || ''}
                                onChange={(e) => handleConfigUpdate('apiKey', e.target.value)}
                                placeholder="OpenWeatherMap API Key"
                            />
                        </div>
                        <div className="form-group">
                            <label>Update Interval (minutes)</label>
                            <input
                                type="number"
                                className="input"
                                value={config.updateInterval ? config.updateInterval / 60000 : 10}
                                onChange={(e) => handleConfigUpdate('updateInterval', parseInt(e.target.value) * 60000)}
                                min="1"
                                max="60"
                            />
                        </div>
                        <div className="form-group">
                            <label>Font Family</label>
                            <select
                                className="input"
                                value={config.fontFamily || 'Arial'}
                                onChange={(e) => handleConfigUpdate('fontFamily', e.target.value)}
                            >
                                <option value="Arial">Arial</option>
                                <option value="Helvetica">Helvetica</option>
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Courier New">Courier New</option>
                                <option value="Verdana">Verdana</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Font Size</label>
                            <input
                                type="number"
                                className="input"
                                value={config.fontSize || 24}
                                onChange={(e) => handleConfigUpdate('fontSize', parseInt(e.target.value))}
                                min="12"
                                max="72"
                            />
                        </div>
                        <div className="form-group">
                            <label>Text Color</label>
                            <input
                                type="color"
                                className="input"
                                value={config.textColor || '#ffffff'}
                                onChange={(e) => handleConfigUpdate('textColor', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Show Icon</label>
                            <input
                                type="checkbox"
                                checked={config.showIcon !== false}
                                onChange={(e) => handleConfigUpdate('showIcon', e.target.checked)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Show Description</label>
                            <input
                                type="checkbox"
                                checked={config.showDescription !== false}
                                onChange={(e) => handleConfigUpdate('showDescription', e.target.checked)}
                            />
                        </div>
                    </div>
                );

            case 'qrcode':
                return (
                    <div className="widget-config-form">
                        <div className="form-group">
                            <label>URL</label>
                            <input
                                type="url"
                                className="input"
                                value={config.url || ''}
                                onChange={(e) => handleConfigUpdate('url', e.target.value)}
                                placeholder="https://example.com"
                            />
                        </div>
                        <div className="form-group">
                            <label>Error Correction Level</label>
                            <select
                                className="input"
                                value={config.errorCorrectionLevel || 'M'}
                                onChange={(e) => handleConfigUpdate('errorCorrectionLevel', e.target.value)}
                            >
                                <option value="L">Low (7%)</option>
                                <option value="M">Medium (15%)</option>
                                <option value="Q">Quartile (25%)</option>
                                <option value="H">High (30%)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Background Color</label>
                            <input
                                type="color"
                                className="input"
                                value={config.backgroundColor || '#ffffff'}
                                onChange={(e) => handleConfigUpdate('backgroundColor', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Foreground Color</label>
                            <input
                                type="color"
                                className="input"
                                value={config.foregroundColor || '#000000'}
                                onChange={(e) => handleConfigUpdate('foregroundColor', e.target.value)}
                            />
                        </div>
                    </div>
                );

            case 'webview':
                return (
                    <div className="widget-config-form">
                        <div className="form-group">
                            <label>URL</label>
                            <input
                                type="url"
                                className="input"
                                value={config.url || ''}
                                onChange={(e) => handleConfigUpdate('url', e.target.value)}
                                placeholder="https://example.com"
                            />
                        </div>
                        <div className="form-group">
                            <label>Refresh Interval (seconds)</label>
                            <input
                                type="number"
                                className="input"
                                value={config.refreshInterval || 60}
                                onChange={(e) => handleConfigUpdate('refreshInterval', parseInt(e.target.value))}
                                min="10"
                                max="3600"
                            />
                        </div>
                        <div className="form-group">
                            <label>Allow JavaScript</label>
                            <input
                                type="checkbox"
                                checked={config.allowJavaScript !== false}
                                onChange={(e) => handleConfigUpdate('allowJavaScript', e.target.checked)}
                            />
                        </div>
                    </div>
                );

            case 'text':
                return (
                    <div className="widget-config-form">
                        <div className="form-group">
                            <label>Text Content</label>
                            <textarea
                                className="input"
                                value={config.text || ''}
                                onChange={(e) => handleConfigUpdate('text', e.target.value)}
                                placeholder="Enter text..."
                                rows="4"
                            />
                        </div>
                        <div className="form-group">
                            <label>Font Family</label>
                            <select
                                className="input"
                                value={config.fontFamily || 'Arial'}
                                onChange={(e) => handleConfigUpdate('fontFamily', e.target.value)}
                            >
                                <option value="Arial">Arial</option>
                                <option value="Helvetica">Helvetica</option>
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Courier New">Courier New</option>
                                <option value="Verdana">Verdana</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Font Size</label>
                            <input
                                type="number"
                                className="input"
                                value={config.fontSize || 16}
                                onChange={(e) => handleConfigUpdate('fontSize', parseInt(e.target.value))}
                                min="8"
                                max="72"
                            />
                        </div>
                        <div className="form-group">
                            <label>Text Color</label>
                            <input
                                type="color"
                                className="input"
                                value={config.color || '#000000'}
                                onChange={(e) => handleConfigUpdate('color', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Text Alignment</label>
                            <select
                                className="input"
                                value={config.alignment || 'left'}
                                onChange={(e) => handleConfigUpdate('alignment', e.target.value)}
                            >
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                                <option value="justify">Justify</option>
                            </select>
                        </div>
                    </div>
                );

            case 'media':
                // For media zones, config is stored directly on zone as mediaFit, not in widgetConfig
                const mediaFit = zone.mediaFit || 'cover';
                return (
                    <div className="widget-config-form">
                        <div className="form-group">
                            <label>Fit Mode</label>
                            <select
                                className="input"
                                value={mediaFit}
                                onChange={(e) => {
                                    // Update zone directly, not widgetConfig
                                    const updatedZone = { ...zone, mediaFit: e.target.value };
                                    onConfigChange(updatedZone);
                                }}
                            >
                                <option value="cover">Cover</option>
                                <option value="contain">Contain</option>
                                <option value="fill">Fill</option>
                                <option value="none">None</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Auto Play (Video)</label>
                            <input
                                type="checkbox"
                                checked={zone.autoPlay !== false}
                                onChange={(e) => {
                                    const updatedZone = { ...zone, autoPlay: e.target.checked };
                                    onConfigChange(updatedZone);
                                }}
                            />
                        </div>
                        <div className="form-group">
                            <label>Loop (Video)</label>
                            <input
                                type="checkbox"
                                checked={zone.loop !== false}
                                onChange={(e) => {
                                    const updatedZone = { ...zone, loop: e.target.checked };
                                    onConfigChange(updatedZone);
                                }}
                            />
                        </div>
                    </div>
                );

            case 'countdown':
                return (
                    <div className="widget-config-form">
                        <div className="form-group">
                            <label>Target Date & Time</label>
                            <input
                                type="datetime-local"
                                className="input"
                                value={config.targetDate ? new Date(config.targetDate).toISOString().slice(0, 16) : ''}
                                onChange={(e) => handleConfigUpdate('targetDate', new Date(e.target.value).toISOString())}
                            />
                        </div>
                        <div className="form-group">
                            <label>Format</label>
                            <select
                                className="input"
                                value={config.format || 'full'}
                                onChange={(e) => handleConfigUpdate('format', e.target.value)}
                            >
                                <option value="full">Full (Days:Hours:Minutes:Seconds)</option>
                                <option value="compact">Compact (d:h:m:s)</option>
                                <option value="days-only">Days Only</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Show Labels</label>
                            <input
                                type="checkbox"
                                checked={config.showLabels !== false}
                                onChange={(e) => handleConfigUpdate('showLabels', e.target.checked)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Completed Text</label>
                            <input
                                type="text"
                                className="input"
                                value={config.completedText || 'Event has started!'}
                                onChange={(e) => handleConfigUpdate('completedText', e.target.value)}
                            />
                        </div>
                    </div>
                );

            case 'rss':
                return (
                    <div className="widget-config-form">
                        <div className="form-group">
                            <label>RSS Feed URL</label>
                            <input
                                type="url"
                                className="input"
                                value={config.feedUrl || ''}
                                onChange={(e) => handleConfigUpdate('feedUrl', e.target.value)}
                                placeholder="https://example.com/feed.xml"
                            />
                        </div>
                        <div className="form-group">
                            <label>Max Items</label>
                            <input
                                type="number"
                                className="input"
                                min="1"
                                max="20"
                                value={config.maxItems || 5}
                                onChange={(e) => handleConfigUpdate('maxItems', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Direction</label>
                            <select
                                className="input"
                                value={config.direction || 'horizontal'}
                                onChange={(e) => handleConfigUpdate('direction', e.target.value)}
                            >
                                <option value="horizontal">Horizontal Scroll</option>
                                <option value="vertical">Vertical List</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Scroll Speed (px/s)</label>
                            <input
                                type="number"
                                className="input"
                                min="10"
                                max="200"
                                value={config.scrollSpeed || 50}
                                onChange={(e) => handleConfigUpdate('scrollSpeed', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                );

            case 'imagegallery':
                return (
                    <div className="widget-config-form">
                        <div className="form-group">
                            <label>Transition Type</label>
                            <select
                                className="input"
                                value={config.transitionType || 'fade'}
                                onChange={(e) => handleConfigUpdate('transitionType', e.target.value)}
                            >
                                <option value="fade">Fade</option>
                                <option value="slide">Slide</option>
                                <option value="zoom">Zoom</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Display Duration (ms)</label>
                            <input
                                type="number"
                                className="input"
                                min="1000"
                                max="30000"
                                step="1000"
                                value={config.displayDuration || 5000}
                                onChange={(e) => handleConfigUpdate('displayDuration', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Show Indicators</label>
                            <input
                                type="checkbox"
                                checked={config.showIndicators !== false}
                                onChange={(e) => handleConfigUpdate('showIndicators', e.target.checked)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Auto Play</label>
                            <input
                                type="checkbox"
                                checked={config.autoplay !== false}
                                onChange={(e) => handleConfigUpdate('autoplay', e.target.checked)}
                            />
                        </div>
                    </div>
                );

            case 'shape':
                return (
                    <div className="widget-config-form">
                        <div className="form-group">
                            <label>Shape Type</label>
                            <select
                                className="input"
                                value={config.shapeType || 'rectangle'}
                                onChange={(e) => handleConfigUpdate('shapeType', e.target.value)}
                            >
                                <option value="rectangle">Rectangle</option>
                                <option value="circle">Circle</option>
                                <option value="ellipse">Ellipse</option>
                                <option value="line">Line</option>
                                <option value="triangle">Triangle</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Background Color</label>
                            <input
                                type="color"
                                className="input"
                                value={config.backgroundColor || '#1976d2'}
                                onChange={(e) => handleConfigUpdate('backgroundColor', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Border Width</label>
                            <input
                                type="number"
                                className="input"
                                min="0"
                                max="20"
                                value={config.borderWidth || 0}
                                onChange={(e) => handleConfigUpdate('borderWidth', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Border Radius</label>
                            <input
                                type="number"
                                className="input"
                                min="0"
                                max="50"
                                value={config.borderRadius || 0}
                                onChange={(e) => handleConfigUpdate('borderRadius', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                );

            case 'socialmedia':
                return (
                    <div className="widget-config-form">
                        <div className="form-group">
                            <label>Platform</label>
                            <select
                                className="input"
                                value={config.platform || 'twitter'}
                                onChange={(e) => handleConfigUpdate('platform', e.target.value)}
                            >
                                <option value="twitter">Twitter</option>
                                <option value="instagram">Instagram</option>
                                <option value="facebook">Facebook</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                className="input"
                                value={config.username || ''}
                                onChange={(e) => handleConfigUpdate('username', e.target.value)}
                                placeholder="@username"
                            />
                        </div>
                        <div className="form-group">
                            <label>Max Posts</label>
                            <input
                                type="number"
                                className="input"
                                min="1"
                                max="20"
                                value={config.maxPosts || 5}
                                onChange={(e) => handleConfigUpdate('maxPosts', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                );

            case 'chart':
                return (
                    <div className="widget-config-form">
                        <div className="form-group">
                            <label>Chart Type</label>
                            <select
                                className="input"
                                value={config.chartType || 'bar'}
                                onChange={(e) => handleConfigUpdate('chartType', e.target.value)}
                            >
                                <option value="bar">Bar Chart</option>
                                <option value="line">Line Chart</option>
                                <option value="pie">Pie Chart</option>
                                <option value="doughnut">Doughnut Chart</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Chart Data (JSON)</label>
                            <textarea
                                className="input"
                                rows="6"
                                value={JSON.stringify(config.data || [], null, 2)}
                                onChange={(e) => {
                                    try {
                                        const parsed = JSON.parse(e.target.value);
                                        handleConfigUpdate('data', parsed);
                                    } catch (err) {
                                        // Invalid JSON, ignore
                                    }
                                }}
                                placeholder='[{"label": "Item 1", "value": 10}, {"label": "Item 2", "value": 20}]'
                            />
                        </div>
                        <div className="form-group">
                            <label>Show Legend</label>
                            <input
                                type="checkbox"
                                checked={config.showLegend !== false}
                                onChange={(e) => handleConfigUpdate('showLegend', e.target.checked)}
                            />
                        </div>
                    </div>
                );

            case 'html':
                return (
                    <div className="widget-config-form">
                        <div className="form-group">
                            <label>HTML Content</label>
                            <textarea
                                className="input"
                                rows="8"
                                value={config.html || ''}
                                onChange={(e) => handleConfigUpdate('html', e.target.value)}
                                placeholder="<div>Your HTML here</div>"
                            />
                        </div>
                        <div className="form-group">
                            <label>CSS</label>
                            <textarea
                                className="input"
                                rows="6"
                                value={config.css || ''}
                                onChange={(e) => handleConfigUpdate('css', e.target.value)}
                                placeholder=".my-class { color: red; }"
                            />
                        </div>
                        <div className="form-group">
                            <label>JavaScript</label>
                            <textarea
                                className="input"
                                rows="6"
                                value={config.javascript || ''}
                                onChange={(e) => handleConfigUpdate('javascript', e.target.value)}
                                placeholder="console.log('Hello');"
                            />
                        </div>
                        <div className="form-group">
                            <label>Allow Scripts</label>
                            <input
                                type="checkbox"
                                checked={config.allowScripts || false}
                                onChange={(e) => handleConfigUpdate('allowScripts', e.target.checked)}
                            />
                            <small style={{ display: 'block', marginTop: '4px', opacity: 0.7 }}>
                                Warning: Enabling scripts may pose security risks
                            </small>
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="widget-config-empty">
                        No configuration available for this widget type
                    </div>
                );
        }
    };

    const handleCopyStyle = () => {
        const styleToCopy = {
            font: config.font || {},
            fontSize: config.fontSize,
            textColor: config.textColor,
            fontFamily: config.fontFamily,
            fontWeight: config.fontWeight,
            backgroundColor: config.backgroundColor,
            border: config.border,
            borderRadius: config.borderRadius,
            padding: config.padding,
            shadow: config.shadow,
            opacity: config.opacity
        };
        localStorage.setItem('copiedWidgetStyle', JSON.stringify(styleToCopy));
        alert('Style copied! Select another widget and click "Paste Style"');
    };

    const handlePasteStyle = () => {
        const copiedStyle = localStorage.getItem('copiedWidgetStyle');
        if (!copiedStyle) {
            alert('No style copied. Copy a style first.');
            return;
        }
        try {
            const style = JSON.parse(copiedStyle);
            const newConfig = { ...config, ...style };
            setConfig(newConfig);
            const transformedConfig = transformConfigForWidget(zone.widgetType, newConfig);
            onConfigChange(transformedConfig);
        } catch (error) {
            alert('Failed to paste style');
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'content':
                return renderConfig();
            case 'style':
                return renderStyleTab();
            case 'animation':
                return renderAnimationTab();
            case 'advanced':
                return renderAdvancedTab();
            default:
                return renderConfig();
        }
    };

    const renderStyleTab = () => {
        return (
            <div className="widget-config-form">
                <div className="form-group">
                    <label>Background Color</label>
                    <ColorPicker
                        value={config.backgroundColor || config.style?.backgroundColor || '#ffffff'}
                        onChange={(color) => handleConfigUpdate('backgroundColor', color)}
                    />
                </div>
                <div className="form-group">
                    <label>Opacity</label>
                    <input
                        type="range"
                        className="input"
                        min="0"
                        max="1"
                        step="0.1"
                        value={config.opacity || config.style?.opacity || 1}
                        onChange={(e) => handleConfigUpdate('opacity', parseFloat(e.target.value))}
                    />
                    <span className="range-value">{Math.round((config.opacity || 1) * 100)}%</span>
                </div>
                <div className="form-group">
                    <label>Border Width</label>
                    <input
                        type="number"
                        className="input"
                        min="0"
                        max="20"
                        value={config.borderWidth || config.style?.borderWidth || 0}
                        onChange={(e) => handleConfigUpdate('borderWidth', parseInt(e.target.value))}
                    />
                </div>
                <div className="form-group">
                    <label>Border Color</label>
                    <ColorPicker
                        value={config.borderColor || config.style?.borderColor || '#000000'}
                        onChange={(color) => handleConfigUpdate('borderColor', color)}
                    />
                </div>
                <div className="form-group">
                    <label>Border Radius</label>
                    <input
                        type="number"
                        className="input"
                        min="0"
                        max="50"
                        value={config.borderRadius || config.style?.borderRadius || 0}
                        onChange={(e) => handleConfigUpdate('borderRadius', parseInt(e.target.value))}
                    />
                </div>
                <div className="form-group">
                    <label>Box Shadow</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="0px 2px 4px rgba(0,0,0,0.1)"
                        value={config.shadow || config.style?.shadow || ''}
                        onChange={(e) => handleConfigUpdate('shadow', e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Padding</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="10px or 10px 20px"
                        value={config.padding || config.style?.padding || '10px'}
                        onChange={(e) => handleConfigUpdate('padding', e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Gradient Background</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="linear-gradient(45deg, #ff0000, #0000ff)"
                        value={config.gradient || config.style?.gradient || ''}
                        onChange={(e) => handleConfigUpdate('gradient', e.target.value)}
                    />
                </div>
            </div>
        );
    };

    const renderAnimationTab = () => {
        return (
            <div className="widget-config-form">
                <div className="form-group">
                    <label>Entrance Animation</label>
                    <select
                        className="input"
                        value={config.entranceAnimation || 'none'}
                        onChange={(e) => handleConfigUpdate('entranceAnimation', e.target.value)}
                    >
                        <option value="none">None</option>
                        <option value="fadeIn">Fade In</option>
                        <option value="slideInLeft">Slide In Left</option>
                        <option value="slideInRight">Slide In Right</option>
                        <option value="slideInUp">Slide In Up</option>
                        <option value="slideInDown">Slide In Down</option>
                        <option value="zoomIn">Zoom In</option>
                        <option value="rotateIn">Rotate In</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Animation Duration (ms)</label>
                    <input
                        type="number"
                        className="input"
                        min="0"
                        max="5000"
                        step="100"
                        value={config.animationDuration || 500}
                        onChange={(e) => handleConfigUpdate('animationDuration', parseInt(e.target.value))}
                    />
                </div>
                <div className="form-group">
                    <label>Animation Delay (ms)</label>
                    <input
                        type="number"
                        className="input"
                        min="0"
                        max="5000"
                        step="100"
                        value={config.animationDelay || 0}
                        onChange={(e) => handleConfigUpdate('animationDelay', parseInt(e.target.value))}
                    />
                </div>
                <div className="form-group">
                    <label>Animation Easing</label>
                    <select
                        className="input"
                        value={config.animationEasing || 'ease'}
                        onChange={(e) => handleConfigUpdate('animationEasing', e.target.value)}
                    >
                        <option value="ease">Ease</option>
                        <option value="ease-in">Ease In</option>
                        <option value="ease-out">Ease Out</option>
                        <option value="ease-in-out">Ease In Out</option>
                        <option value="linear">Linear</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Loop Animation</label>
                    <input
                        type="checkbox"
                        checked={config.loopAnimation || false}
                        onChange={(e) => handleConfigUpdate('loopAnimation', e.target.checked)}
                    />
                </div>
                <div className="form-group">
                    <label>Exit Animation</label>
                    <select
                        className="input"
                        value={config.exitAnimation || 'none'}
                        onChange={(e) => handleConfigUpdate('exitAnimation', e.target.value)}
                    >
                        <option value="none">None</option>
                        <option value="fadeOut">Fade Out</option>
                        <option value="slideOutLeft">Slide Out Left</option>
                        <option value="slideOutRight">Slide Out Right</option>
                        <option value="zoomOut">Zoom Out</option>
                    </select>
                </div>
            </div>
        );
    };

    const renderAdvancedTab = () => {
        return (
            <div className="widget-config-form">
                <div className="form-group">
                    <label>Responsive Behavior</label>
                    <select
                        className="input"
                        value={config.responsiveBehavior || 'scale'}
                        onChange={(e) => handleConfigUpdate('responsiveBehavior', e.target.value)}
                    >
                        <option value="scale">Scale</option>
                        <option value="fixed">Fixed Size</option>
                        <option value="hide">Hide on Small Screens</option>
                        <option value="stack">Stack Vertically</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Min Width (px)</label>
                    <input
                        type="number"
                        className="input"
                        min="0"
                        value={config.minWidth || ''}
                        onChange={(e) => handleConfigUpdate('minWidth', e.target.value ? parseInt(e.target.value) : null)}
                    />
                </div>
                <div className="form-group">
                    <label>Max Width (px)</label>
                    <input
                        type="number"
                        className="input"
                        min="0"
                        value={config.maxWidth || ''}
                        onChange={(e) => handleConfigUpdate('maxWidth', e.target.value ? parseInt(e.target.value) : null)}
                    />
                </div>
                <div className="form-group">
                    <label>Z-Index</label>
                    <input
                        type="number"
                        className="input"
                        value={config.zIndex || zone.zIndex || 0}
                        onChange={(e) => handleConfigUpdate('zIndex', parseInt(e.target.value))}
                    />
                </div>
                <div className="form-group">
                    <label>Custom CSS Class</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="custom-class"
                        value={config.customClass || ''}
                        onChange={(e) => handleConfigUpdate('customClass', e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Custom CSS</label>
                    <textarea
                        className="input"
                        rows="4"
                        placeholder=".widget { ... }"
                        value={config.customCSS || ''}
                        onChange={(e) => handleConfigUpdate('customCSS', e.target.value)}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="widget-config-panel">
            <div className="widget-config-header">
                <div>
                    <h3>{zone.name}</h3>
                    <span className="widget-type-badge">{zone.widgetType}</span>
                </div>
                <div className="widget-config-actions">
                    <button
                        className="btn-icon"
                        onClick={() => setShowPreview(!showPreview)}
                        title="Toggle Preview"
                    >
                        <Eye size={16} />
                    </button>
                </div>
            </div>
            
            <div className="widget-config-tabs">
                <button
                    className={`config-tab ${activeTab === 'content' ? 'active' : ''}`}
                    onClick={() => setActiveTab('content')}
                >
                    <Palette size={14} />
                    Content
                </button>
                <button
                    className={`config-tab ${activeTab === 'style' ? 'active' : ''}`}
                    onClick={() => setActiveTab('style')}
                >
                    <Palette size={14} />
                    Style
                </button>
                <button
                    className={`config-tab ${activeTab === 'animation' ? 'active' : ''}`}
                    onClick={() => setActiveTab('animation')}
                >
                    <Zap size={14} />
                    Animation
                </button>
                <button
                    className={`config-tab ${activeTab === 'advanced' ? 'active' : ''}`}
                    onClick={() => setActiveTab('advanced')}
                >
                    <Settings size={14} />
                    Advanced
                </button>
                <button
                    className={`config-tab ${activeTab === 'databinding' ? 'active' : ''}`}
                    onClick={() => {
                        if (onDataBindingClick) {
                            onDataBindingClick();
                        } else {
                            setActiveTab('databinding');
                        }
                    }}
                >
                    <LinkIcon size={14} />
                    Data Binding
                </button>
            </div>

            <div className="widget-config-toolbar">
                <button
                    className="btn btn-sm btn-outline"
                    onClick={handleCopyStyle}
                    title="Copy Style"
                >
                    <Copy size={14} />
                    Copy Style
                </button>
                <button
                    className="btn btn-sm btn-outline"
                    onClick={handlePasteStyle}
                    title="Paste Style"
                >
                    <Copy size={14} style={{ transform: 'rotate(180deg)' }} />
                    Paste Style
                </button>
            </div>

            {showPreview && (
                <div className="widget-preview">
                    <div className="preview-label">Live Preview</div>
                    <div className="preview-content">
                        <div style={{
                            padding: '20px',
                            background: config.backgroundColor || '#ffffff',
                            borderRadius: `${config.borderRadius || 0}px`,
                            border: config.borderWidth ? `${config.borderWidth}px solid ${config.borderColor || '#000000'}` : 'none',
                            boxShadow: config.shadow || 'none',
                            opacity: config.opacity || 1
                        }}>
                            Preview: {zone.widgetType}
                        </div>
                    </div>
                </div>
            )}

            <div className="widget-config-content">
                {renderTabContent()}
            </div>
        </div>
    );
}
