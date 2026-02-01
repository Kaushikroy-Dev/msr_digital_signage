import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2, Save, Globe, Database, Clock, Zap, Filter, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './DataBindingPanel.css';

const DATA_SOURCE_TYPES = [
    { id: 'api', name: 'External API', icon: Globe, color: '#1976d2' },
    { id: 'database', name: 'Database Query', icon: Database, color: '#00acc1' },
    { id: 'scheduled', name: 'Scheduled Content', icon: Clock, color: '#7c4dff' },
    { id: 'websocket', name: 'WebSocket Stream', icon: Zap, color: '#43a047' }
];

export default function DataBindingPanel({ zone, templateId, isOpen, onClose }) {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [selectedSourceType, setSelectedSourceType] = useState('api');
    const [bindingConfig, setBindingConfig] = useState({
        sourceId: null,
        dataPath: '', // JSONPath or field name
        transform: {
            type: 'none', // 'none', 'format', 'filter', 'map'
            config: {}
        },
        refreshInterval: 60,
        fallbackValue: ''
    });

    const { data: dataSources } = useQuery({
        queryKey: ['data-sources', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/templates/data-sources', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.sources || [];
        },
        enabled: !!user?.tenantId && isOpen
    });

    const createDataSourceMutation = useMutation({
        mutationFn: async (sourceData) => {
            const response = await api.post('/templates/data-sources', sourceData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['data-sources', user?.tenantId]);
        }
    });

    const saveBindingMutation = useMutation({
        mutationFn: async (bindingData) => {
            const response = await api.put(`/templates/templates/${templateId}/zones/${zone.id}/data-binding`, bindingData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['templates', user?.tenantId]);
            onClose();
        }
    });

    useEffect(() => {
        // Load existing binding if any
        if (zone?.dataBinding) {
            setBindingConfig(zone.dataBinding);
        }
    }, [zone, isOpen]);

    const handleSaveBinding = () => {
        if (!bindingConfig.sourceId) {
            alert('Please select a data source');
            return;
        }
        saveBindingMutation.mutate(bindingConfig);
    };

    const handleTestConnection = async () => {
        if (!bindingConfig.sourceId) {
            alert('Please select a data source first');
            return;
        }
        try {
            const response = await api.post(`/templates/data-sources/${bindingConfig.sourceId}/test`);
            alert(`Connection successful!\n\nSample data:\n${JSON.stringify(response.data.sample, null, 2)}`);
        } catch (error) {
            alert(`Connection failed: ${error.response?.data?.error || error.message}`);
        }
    };

    if (!isOpen || !zone) return null;

    const SourceTypeIcon = DATA_SOURCE_TYPES.find(t => t.id === selectedSourceType)?.icon || Globe;

    return (
        <div className="data-binding-overlay" onClick={onClose}>
            <div className="data-binding-modal" onClick={(e) => e.stopPropagation()}>
                <div className="data-binding-header">
                    <h3>Data Binding: {zone.name}</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="data-binding-content">
                    {/* Data Source Selection */}
                    <div className="binding-section">
                        <h4>Data Source</h4>
                        <div className="source-type-selector">
                            {DATA_SOURCE_TYPES.map(type => {
                                const Icon = type.icon;
                                return (
                                    <button
                                        key={type.id}
                                        className={`source-type-btn ${selectedSourceType === type.id ? 'active' : ''}`}
                                        onClick={() => setSelectedSourceType(type.id)}
                                    >
                                        <Icon size={20} />
                                        {type.name}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="form-group">
                            <label>Select Data Source</label>
                            <select
                                className="input"
                                value={bindingConfig.sourceId || ''}
                                onChange={(e) => setBindingConfig({ ...bindingConfig, sourceId: e.target.value })}
                            >
                                <option value="">Choose a data source...</option>
                                {dataSources?.filter(s => s.source_type === selectedSourceType).map(source => (
                                    <option key={source.id} value={source.id}>
                                        {source.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                className="btn btn-sm btn-outline mt-2"
                                onClick={() => {
                                    // Open create data source modal (simplified - would be a separate component)
                                    const name = prompt('Enter data source name:');
                                    if (name) {
                                        createDataSourceMutation.mutate({
                                            name,
                                            source_type: selectedSourceType,
                                            config: {},
                                            tenantId: user?.tenantId
                                        });
                                    }
                                }}
                            >
                                <Plus size={14} /> Create New
                            </button>
                        </div>
                    </div>

                    {/* Data Path Configuration */}
                    <div className="binding-section">
                        <h4>Data Path</h4>
                        <div className="form-group">
                            <label>JSONPath or Field Name</label>
                            <input
                                type="text"
                                className="input"
                                value={bindingConfig.dataPath}
                                onChange={(e) => setBindingConfig({ ...bindingConfig, dataPath: e.target.value })}
                                placeholder="$.data.items[0].title or items.0.title"
                            />
                            <small>Use JSONPath syntax to extract specific data from the response</small>
                        </div>
                    </div>

                    {/* Data Transformation */}
                    <div className="binding-section">
                        <h4>Data Transformation</h4>
                        <div className="form-group">
                            <label>Transformation Type</label>
                            <select
                                className="input"
                                value={bindingConfig.transform.type}
                                onChange={(e) => setBindingConfig({
                                    ...bindingConfig,
                                    transform: { ...bindingConfig.transform, type: e.target.value }
                                })}
                            >
                                <option value="none">None</option>
                                <option value="format">Format (Date, Number, etc.)</option>
                                <option value="filter">Filter</option>
                                <option value="map">Map/Transform</option>
                            </select>
                        </div>

                        {bindingConfig.transform.type === 'format' && (
                            <div className="form-group">
                                <label>Format Pattern</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={bindingConfig.transform.config.pattern || ''}
                                    onChange={(e) => setBindingConfig({
                                        ...bindingConfig,
                                        transform: {
                                            ...bindingConfig.transform,
                                            config: { ...bindingConfig.transform.config, pattern: e.target.value }
                                        }
                                    })}
                                    placeholder="YYYY-MM-DD, $0.00, etc."
                                />
                            </div>
                        )}

                        {bindingConfig.transform.type === 'filter' && (
                            <div className="form-group">
                                <label>Filter Condition</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={bindingConfig.transform.config.condition || ''}
                                    onChange={(e) => setBindingConfig({
                                        ...bindingConfig,
                                        transform: {
                                            ...bindingConfig.transform,
                                            config: { ...bindingConfig.transform.config, condition: e.target.value }
                                        }
                                    })}
                                    placeholder="item.price > 100"
                                />
                            </div>
                        )}
                    </div>

                    {/* Refresh Settings */}
                    <div className="binding-section">
                        <h4>Refresh Settings</h4>
                        <div className="form-group">
                            <label>Refresh Interval (seconds)</label>
                            <input
                                type="number"
                                className="input"
                                min="10"
                                max="3600"
                                value={bindingConfig.refreshInterval}
                                onChange={(e) => setBindingConfig({ ...bindingConfig, refreshInterval: parseInt(e.target.value) })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Fallback Value</label>
                            <input
                                type="text"
                                className="input"
                                value={bindingConfig.fallbackValue}
                                onChange={(e) => setBindingConfig({ ...bindingConfig, fallbackValue: e.target.value })}
                                placeholder="Value to show if data source fails"
                            />
                        </div>
                    </div>

                    {/* Test Connection */}
                    <div className="binding-section">
                        <button
                            className="btn btn-outline"
                            onClick={handleTestConnection}
                            disabled={!bindingConfig.sourceId}
                        >
                            <RefreshCw size={16} />
                            Test Connection
                        </button>
                    </div>
                </div>

                <div className="data-binding-footer">
                    <button className="btn btn-outline" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSaveBinding}
                        disabled={saveBindingMutation.isLoading || !bindingConfig.sourceId}
                    >
                        <Save size={16} />
                        {saveBindingMutation.isLoading ? 'Saving...' : 'Save Binding'}
                    </button>
                </div>
            </div>
        </div>
    );
}
