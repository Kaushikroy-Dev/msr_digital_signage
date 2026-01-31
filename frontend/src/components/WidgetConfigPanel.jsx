import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './WidgetConfigPanel.css';

export default function WidgetConfigPanel({ zone, onConfigChange }) {
    const { user } = useAuthStore();
    const [config, setConfig] = useState(zone?.widgetConfig || {});

    useEffect(() => {
        setConfig(zone?.widgetConfig || {});
    }, [zone]);

    const handleConfigUpdate = (key, value) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        onConfigChange(newConfig);
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
                                value={config.textColor || '#000000'}
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
                            <label>Show Icon</label>
                            <input
                                type="checkbox"
                                checked={config.showIcon !== false}
                                onChange={(e) => handleConfigUpdate('showIcon', e.target.checked)}
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
                return (
                    <div className="widget-config-form">
                        <div className="form-group">
                            <label>Fit Mode</label>
                            <select
                                className="input"
                                value={config.fitMode || 'cover'}
                                onChange={(e) => handleConfigUpdate('fitMode', e.target.value)}
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
                                checked={config.autoPlay !== false}
                                onChange={(e) => handleConfigUpdate('autoPlay', e.target.checked)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Loop (Video)</label>
                            <input
                                type="checkbox"
                                checked={config.loop !== false}
                                onChange={(e) => handleConfigUpdate('loop', e.target.checked)}
                            />
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

    return (
        <div className="widget-config-panel">
            <div className="widget-config-header">
                <h3>{zone.name}</h3>
                <span className="widget-type-badge">{zone.widgetType}</span>
            </div>
            {renderConfig()}
        </div>
    );
}
