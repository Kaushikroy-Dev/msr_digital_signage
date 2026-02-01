import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, Activity, Power, RotateCw, Trash2, Wifi, WifiOff } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './Devices.css';

export default function Devices() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // Fetch devices
    const { data: devices } = useQuery({
        queryKey: ['devices', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/devices/devices', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.devices;
        },
        enabled: !!user?.tenantId,
        refetchInterval: 30000 // Refresh every 30 seconds
    });

    // Send command mutation
    const commandMutation = useMutation({
        mutationFn: async ({ deviceId, commandType }) => {
            const response = await api.post(`/devices/devices/${deviceId}/commands`, {
                commandType,
                userId: user.id
            });
            return response.data;
        },
        onSuccess: (data, variables) => {
            // No need to invalidate, WS will handle real-time state if needed
            // but for UI feedback we can show a toast or similar
            console.log(`Command ${variables.commandType} sent successfully`);
        }
    });

    // Delete device mutation
    const deleteMutation = useMutation({
        mutationFn: async (deviceId) => {
            await api.delete(`/devices/${deviceId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['devices']);
            alert('Device deleted successfully!');
        },
        onError: (err) => {
            console.error('Error deleting device:', err);
            alert(err.response?.data?.error || 'Failed to delete device');
        }
    });

    const [isRegistering, setIsRegistering] = useState(false);
    const [regMode, setRegMode] = useState('pair'); // 'manual' or 'pair'
    const [propertyId, setPropertyId] = useState('');
    const [pairingCode, setPairingCode] = useState(['', '', '', '', '', '', '', '']);
    const [formData, setFormData] = useState({
        name: '',
        deviceCode: '',
        zoneId: '',
        platform: 'android',
        orientation: 'landscape'
    });

    // Handle pairing code input focus
    const handleCodeChange = (index, value) => {
        if (value.length > 1) value = value.slice(-1);
        const newCode = [...pairingCode];
        newCode[index] = value.toUpperCase();
        setPairingCode(newCode);

        // Auto focus next
        if (value && index < 7) {
            const nextInput = document.getElementById(`code-input-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleCodeKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !pairingCode[index] && index > 0) {
            const prevInput = document.getElementById(`code-input-${index - 1}`);
            prevInput?.focus();
        }
    };

    // Fetch properties
    const { data: properties } = useQuery({
        queryKey: ['properties', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/devices/properties', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.properties;
        },
        enabled: isRegistering && !!user?.tenantId
    });

    // Fetch zones
    const { data: zones } = useQuery({
        queryKey: ['zones', propertyId],
        queryFn: async () => {
            const response = await api.get('/devices/zones', {
                params: { propertyId }
            });
            return response.data.zones;
        },
        enabled: isRegistering && !!propertyId
    });

    // Register mutation
    const registerMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post('/devices/devices', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['devices']);
            setIsRegistering(false);
            setFormData({
                name: '',
                deviceCode: '',
                zoneId: '',
                platform: 'android',
                orientation: 'landscape'
            });
        }
    });

    // Register mutation (Claim)
    const claimMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post('/devices/pairing/claim', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['devices']);
            setIsRegistering(false);
            setPairingCode(['', '', '', '', '', '', '', '']);
            setFormData({ name: '', deviceCode: '', zoneId: '', platform: 'android', orientation: 'landscape' });
        },
        onError: (err) => {
            alert(err.response?.data?.error || 'Failed to claim code');
        }
    });

    const handleRegister = (e) => {
        e.preventDefault();

        if (regMode === 'pair') {
            const code = pairingCode.join('');
            if (code.length < 8 || !formData.name || !formData.zoneId) {
                alert('Please fill in all fields and complete the pairing code');
                return;
            }
            claimMutation.mutate({
                code,
                name: formData.name,
                zoneId: formData.zoneId,
                platform: formData.platform
            });
        } else {
            if (!formData.name || !formData.deviceCode || !formData.zoneId) {
                alert('Please fill in all required fields');
                return;
            }
            registerMutation.mutate(formData);
        }
    };

    const handleCommand = (deviceId, commandType) => {
        const confirmMsg = {
            reboot: 'Are you sure you want to reboot this device?',
            screen_off: 'Are you sure you want to turn the display OFF?',
            screen_on: 'Are you sure you want to turn the display ON?',
            clear_cache: 'Clear device cache and reload?'
        };

        if (confirm(confirmMsg[commandType] || `Run ${commandType}?`)) {
            commandMutation.mutate({ deviceId, commandType });
        }
    };

    const handleDeleteDevice = (deviceId, name, e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        console.log(`[DevicesUI] Deletion requested for ${name} (${deviceId})`);
        // Using a non-blocking confirmation for better automation and UX
        if (window.confirm(`CRITICAL: Are you sure you want to delete "${name}"? This cannot be undone.`)) {
            console.log(`[DevicesUI] Confirmed deletion for ${deviceId}`);
            deleteMutation.mutate(deviceId);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'online': return '#10b981'; // Green
            case 'offline': return '#6b7280'; // Gray
            case 'error': return '#ef4444'; // Red
            default: return '#f59e0b'; // Amber
        }
    };

    return (
        <div className="devices-page">
            <div className="page-header">
                <div className="header-title">
                    <h1>Screens</h1>
                    <div className="breadcrumb">Dashboard / Screens</div>
                </div>
                <div className="header-actions">
                    <div className="stats-pills">
                        <div className="stat-pill">
                            <span className="pill-dot" style={{ background: '#10b981' }}></span>
                            <span className="pill-text"><b>{devices?.filter(d => d.status === 'online').length || 0}</b> Online</span>
                        </div>
                        <div className="stat-pill">
                            <span className="pill-dot" style={{ background: '#6b7280' }}></span>
                            <span className="pill-text"><b>{devices?.filter(d => d.status !== 'online').length || 0}</b> Offline</span>
                        </div>
                    </div>
                    {user?.role !== 'zone_admin' && (
                        <button className="btn btn-primary btn-with-icon" onClick={() => { setIsRegistering(true); setRegMode('pair'); }}>
                            <Monitor size={18} />
                            Add Screen
                        </button>
                    )}
                </div>
            </div>

            {isRegistering && (
                <div className="modal-overlay">
                    <div className="modal-content premium-modal">
                        <div className="modal-header">
                            <div>
                                <h2>Register New Device</h2>
                                <p>Onboard a new digital signage player</p>
                            </div>
                            <div className="tab-switcher">
                                <button
                                    className={`tab-btn ${regMode === 'pair' ? 'active' : ''}`}
                                    onClick={() => setRegMode('pair')}
                                >
                                    Pair Code
                                </button>
                                <button
                                    className={`tab-btn ${regMode === 'manual' ? 'active' : ''}`}
                                    onClick={() => setRegMode('manual')}
                                >
                                    Manual
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleRegister}>
                            {regMode === 'pair' ? (
                                <div className="pairing-container">
                                    <label>Registration Code</label>
                                    <div className="code-inputs">
                                        {pairingCode.map((char, i) => (
                                            <div key={i} className="code-field-wrapper">
                                                {i === 4 && <span className="code-split">-</span>}
                                                <input
                                                    id={`code-input-${i}`}
                                                    type="text"
                                                    value={char}
                                                    onChange={(e) => handleCodeChange(i, e.target.value)}
                                                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                                                    className="code-field"
                                                    maxLength={1}
                                                    autoComplete="off"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="field-hint">Enter the 8-digit code displayed on your screen</p>
                                </div>
                            ) : null}

                            <div className="form-sections">
                                <div className="form-group full-width">
                                    <label>Display Name</label>
                                    <input
                                        type="text"
                                        className="premium-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Reception Main Display"
                                        required
                                    />
                                </div>
                                {regMode === 'manual' && (
                                    <div className="form-group full-width">
                                        <label>Hardware Serial / ID</label>
                                        <input
                                            type="text"
                                            className="premium-input"
                                            value={formData.deviceCode}
                                            onChange={(e) => setFormData({ ...formData, deviceCode: e.target.value })}
                                            placeholder="Unique device identifier"
                                            required
                                        />
                                    </div>
                                )}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Property</label>
                                        <select
                                            className="premium-select"
                                            value={propertyId}
                                            onChange={(e) => setPropertyId(e.target.value)}
                                            required
                                        >
                                            <option value="">Select Location</option>
                                            {properties?.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Area</label>
                                        <select
                                            className="premium-select"
                                            value={formData.zoneId}
                                            onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
                                            disabled={!propertyId}
                                            required
                                        >
                                            <option value="">Select Area</option>
                                            {zones?.map(z => (
                                                <option key={z.id} value={z.id}>{z.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setIsRegistering(false)}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={claimMutation.isPending || registerMutation.isPending}
                                >
                                    {regMode === 'pair' ? 'Pair & Activate' : 'Register Display'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="devices-list">
                <div className="list-header">
                    <div className="col-status">Status</div>
                    <div className="col-info">Display Info</div>
                    <div className="col-location">Location</div>
                    <div className="col-health">Health</div>
                    <div className="col-actions">Actions</div>
                </div>

                {devices?.map((device) => (
                    <div key={device.id} className="device-row hover-card">
                        <div className="col-status">
                            <div className="status-indicator">
                                <div className={`status-dot ${device.status}`} style={{ background: getStatusColor(device.status) }}></div>
                                <span className="status-label">
                                    {device.status}
                                    {device.status === 'online' && !device.is_playing && <small style={{ display: 'block', opacity: 0.7 }}>(Paused)</small>}
                                </span>
                            </div>
                        </div>

                        <div className="col-info">
                            <div className="device-meta">
                                <div className="platform-tag">{device.platform}</div>
                                <h3 className="device-name">{device.device_name}</h3>
                                <span className={`device-id-tag ${!device.is_playing ? 'screen-off' : ''}`}>
                                    {device.is_playing ? `ID: ${device.id.slice(0, 8)}...` : 'DISPLAY OFF'}
                                </span>
                            </div>
                        </div>

                        <div className="col-location">
                            <div className="location-info">
                                <span className="property-main">{device.property_name || 'Unassigned'}</span>
                                <span className="zone-sub">{device.zone_name || 'No Area'}</span>
                            </div>
                        </div>

                        <div className="col-health">
                            <div className="health-metrics">
                                <div className="metric">
                                    <Activity size={12} />
                                    <span>{device.last_heartbeat ? 'Active' : 'Never Seen'}</span>
                                </div>
                                <div className="last-seen">
                                    {device.last_heartbeat ? new Date(device.last_heartbeat).toLocaleTimeString() : '--:--'}
                                </div>
                            </div>
                        </div>

                        <div className="col-actions">
                            <div className="button-group">
                                <button
                                    className={`icon-btn tooltip ${commandMutation.isPending && commandMutation.variables?.deviceId === device.id ? 'loading' : ''}`}
                                    onClick={() => handleCommand(device.id, 'reboot')}
                                    disabled={commandMutation.isPending}
                                    data-tooltip="Reboot Player"
                                >
                                    <RotateCw size={16} className={commandMutation.isPending && commandMutation.variables?.deviceId === device.id ? 'spin' : ''} />
                                </button>
                                <button
                                    className={`icon-btn tooltip ${commandMutation.isPending && commandMutation.variables?.deviceId === device.id ? 'loading' : ''}`}
                                    onClick={() => handleCommand(device.id, device.is_playing ? 'screen_off' : 'screen_on')}
                                    disabled={commandMutation.isPending}
                                    data-tooltip={device.is_playing ? "Turn Screen OFF" : "Turn Screen ON"}
                                >
                                    <Power size={16} color={device.is_playing ? '#10b981' : '#ef4444'} />
                                </button>
                                {user?.role !== 'zone_admin' && (
                                    <button
                                        className={`icon-btn tooltip delete ${deleteMutation.isPending && deleteMutation.variables === device.id ? 'loading' : ''}`}
                                        onClick={(e) => handleDeleteDevice(device.id, device.device_name, e)}
                                        disabled={deleteMutation.isPending && deleteMutation.variables === device.id}
                                        data-tooltip="Delete Display"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <button
                                    className="icon-btn tooltip primary"
                                    onClick={() => {
                                        const url = `${window.location.origin}/player/${device.id}`;
                                        window.open(url, '_blank');
                                    }}
                                    data-tooltip="Preview Player"
                                >
                                    <Monitor size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {(!devices || devices.length === 0) && (
                    <div className="empty-list-state">
                        <div className="empty-icon"><Monitor size={48} /></div>
                        <h3>No Displays Connected</h3>
                        <p>Pair your first hardware player or web-browser screen to get started.</p>
                        {user?.role !== 'zone_admin' && (
                            <button className="btn btn-primary" onClick={() => setIsRegistering(true)}>
                                Get Registration Code
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
