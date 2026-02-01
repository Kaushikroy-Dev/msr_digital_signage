import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Eye, EyeOff, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './GlobalWidgetSettings.css';

export default function GlobalWidgetSettings({ isOpen, onClose }) {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('weather');
    const [settings, setSettings] = useState({});
    const [presets, setPresets] = useState({});

    const { data: widgetSettings, isLoading } = useQuery({
        queryKey: ['widget-settings', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/settings/widgets', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.settings || [];
        },
        enabled: !!user?.tenantId && isOpen,
        refetchOnWindowFocus: false
    });

    useEffect(() => {
        if (widgetSettings) {
            const settingsMap = {};
            widgetSettings.forEach(setting => {
                const key = setting.widget_type || 'global';
                if (!settingsMap[key]) {
                    settingsMap[key] = {};
                }
                settingsMap[key][setting.setting_key] = setting.setting_value;
            });
            setSettings(settingsMap);
        }
    }, [widgetSettings]);

    const updateSettingMutation = useMutation({
        mutationFn: async ({ key, value, widgetType }) => {
            const response = await api.put(`/settings/widgets/${key}`, {
                setting_value: value,
                widget_type: widgetType || null
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['widget-settings', user?.tenantId]);
        }
    });

    const handleSaveSetting = (key, value, widgetType = null) => {
        updateSettingMutation.mutate({ key, value, widgetType });
    };

    const handleApplyPreset = (widgetType, preset) => {
        const presetValue = presets[widgetType]?.[preset];
        if (presetValue) {
            Object.entries(presetValue).forEach(([settingKey, settingValue]) => {
                handleSaveSetting(settingKey, settingValue, widgetType);
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="global-widget-settings-overlay" onClick={onClose}>
            <div className="global-widget-settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <h2>Global Widget Settings</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="settings-tabs">
                    <button
                        className={`settings-tab ${activeTab === 'weather' ? 'active' : ''}`}
                        onClick={() => setActiveTab('weather')}
                    >
                        Weather
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'clock' ? 'active' : ''}`}
                        onClick={() => setActiveTab('clock')}
                    >
                        Clock
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'text' ? 'active' : ''}`}
                        onClick={() => setActiveTab('text')}
                    >
                        Text
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'presets' ? 'active' : ''}`}
                        onClick={() => setActiveTab('presets')}
                    >
                        Presets
                    </button>
                </div>

                <div className="settings-content">
                    {isLoading ? (
                        <div className="loading">Loading settings...</div>
                    ) : (
                        <>
                            {activeTab === 'weather' && (
                                <WeatherSettings
                                    settings={settings.weather || {}}
                                    onSave={handleSaveSetting}
                                />
                            )}
                            {activeTab === 'clock' && (
                                <ClockSettings
                                    settings={settings.clock || {}}
                                    onSave={handleSaveSetting}
                                />
                            )}
                            {activeTab === 'text' && (
                                <TextSettings
                                    settings={settings.text || {}}
                                    onSave={handleSaveSetting}
                                />
                            )}
                            {activeTab === 'presets' && (
                                <PresetsSettings
                                    presets={presets}
                                    onApply={handleApplyPreset}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function WeatherSettings({ settings, onSave }) {
    const [apiKey, setApiKey] = useState(settings.weather_api_key || '');
    const [showApiKey, setShowApiKey] = useState(false);

    const handleSave = () => {
        onSave('weather_api_key', apiKey, 'weather');
    };

    return (
        <div className="settings-section">
            <h3>Weather Widget Settings</h3>
            <div className="form-group">
                <label>OpenWeatherMap API Key</label>
                <div className="input-with-icon">
                    <input
                        type={showApiKey ? 'text' : 'password'}
                        className="input"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your OpenWeatherMap API key"
                    />
                    <button
                        className="icon-btn"
                        onClick={() => setShowApiKey(!showApiKey)}
                        title={showApiKey ? 'Hide' : 'Show'}
                    >
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
                <p className="help-text">
                    Get your API key from{' '}
                    <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer">
                        openweathermap.org
                    </a>
                </p>
            </div>
            <button className="btn btn-primary" onClick={handleSave}>
                <Save size={16} />
                Save Settings
            </button>
        </div>
    );
}

function ClockSettings({ settings, onSave }) {
    const [defaultStyle, setDefaultStyle] = useState(settings.default_style || {
        font: { family: 'Arial', size: 48, color: '#ffffff', weight: 'normal' },
        backgroundColor: '#000000',
        borderRadius: 0,
        padding: '10px'
    });

    const handleSave = () => {
        onSave('default_style', defaultStyle, 'clock');
    };

    return (
        <div className="settings-section">
            <h3>Clock Widget Default Style</h3>
            <div className="form-group">
                <label>Font Family</label>
                <select
                    className="input"
                    value={defaultStyle.font?.family || 'Arial'}
                    onChange={(e) => setDefaultStyle({
                        ...defaultStyle,
                        font: { ...defaultStyle.font, family: e.target.value }
                    })}
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
                    value={defaultStyle.font?.size || 48}
                    onChange={(e) => setDefaultStyle({
                        ...defaultStyle,
                        font: { ...defaultStyle.font, size: parseInt(e.target.value) }
                    })}
                    min="12"
                    max="200"
                />
            </div>
            <div className="form-group">
                <label>Text Color</label>
                <input
                    type="color"
                    className="input"
                    value={defaultStyle.font?.color || '#ffffff'}
                    onChange={(e) => setDefaultStyle({
                        ...defaultStyle,
                        font: { ...defaultStyle.font, color: e.target.value }
                    })}
                />
            </div>
            <button className="btn btn-primary" onClick={handleSave}>
                <Save size={16} />
                Save Settings
            </button>
        </div>
    );
}

function TextSettings({ settings, onSave }) {
    const [defaultStyle, setDefaultStyle] = useState(settings.default_style || {
        font: { family: 'Arial', size: 16, color: '#000000', weight: 'normal' },
        backgroundColor: '#ffffff',
        borderRadius: 0,
        padding: '10px'
    });

    const handleSave = () => {
        onSave('default_style', defaultStyle, 'text');
    };

    return (
        <div className="settings-section">
            <h3>Text Widget Default Style</h3>
            <div className="form-group">
                <label>Font Family</label>
                <select
                    className="input"
                    value={defaultStyle.font?.family || 'Arial'}
                    onChange={(e) => setDefaultStyle({
                        ...defaultStyle,
                        font: { ...defaultStyle.font, family: e.target.value }
                    })}
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
                    value={defaultStyle.font?.size || 16}
                    onChange={(e) => setDefaultStyle({
                        ...defaultStyle,
                        font: { ...defaultStyle.font, size: parseInt(e.target.value) }
                    })}
                    min="8"
                    max="72"
                />
            </div>
            <div className="form-group">
                <label>Text Color</label>
                <input
                    type="color"
                    className="input"
                    value={defaultStyle.font?.color || '#000000'}
                    onChange={(e) => setDefaultStyle({
                        ...defaultStyle,
                        font: { ...defaultStyle.font, color: e.target.value }
                    })}
                />
            </div>
            <button className="btn btn-primary" onClick={handleSave}>
                <Save size={16} />
                Save Settings
            </button>
        </div>
    );
}

function PresetsSettings({ presets, onApply }) {
    return (
        <div className="settings-section">
            <h3>Widget Presets</h3>
            <p className="help-text">Preset configurations will be available when creating new widgets.</p>
            <div className="presets-grid">
                {/* Presets will be loaded from settings */}
                <div className="preset-card">
                    <h4>Default Clock</h4>
                    <p>Standard clock style</p>
                    <button className="btn btn-sm btn-outline" onClick={() => onApply('clock', 'default')}>
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
}
