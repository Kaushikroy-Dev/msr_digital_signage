import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, Activity, Power, RotateCw, Trash2, Wifi, WifiOff, Plus, Grid, List, Search, Smartphone, Tablet, Globe } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './Devices.css';

export default function Devices() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // Fetch devices
    const { data: devices, error: devicesError, isLoading } = useQuery({
        queryKey: ['devices', user?.tenantId],
        queryFn: async () => {
            console.log('[Devices] Fetching devices for tenant:', user?.tenantId);
            const response = await api.get('/devices', {
                params: { tenantId: user?.tenantId }
            });
            console.log('[Devices] Received devices:', response.data.devices?.length || 0);
            return response.data.devices;
        },
        enabled: !!user?.tenantId,
        refetchInterval: 30000, // Refresh every 30 seconds
        onError: (error) => {
            console.error('[Devices] Failed to fetch devices:', error);
        }
    });

    // Send command mutation
    const commandMutation = useMutation({
        mutationFn: async ({ deviceId, commandType }) => {
            const response = await api.post(`/devices/${deviceId}/commands`, {
                commandType,
                userId: user.id
            });
            return response.data;
        },
        onSuccess: (data, variables) => {
            // Invalidate devices query to refresh status
            queryClient.invalidateQueries(['devices', user?.tenantId]);
            console.log(`[Devices] Command ${variables.commandType} sent successfully to ${variables.deviceId}`);
        },
        onError: (error, variables) => {
            console.error('[Devices] Command error:', error);
            const errorMsg = error.response?.data?.details || error.response?.data?.error || error.message;
            alert(`Failed to send ${variables?.commandType || 'command'}: ${errorMsg}`);
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

    const [viewMode, setViewMode] = useState('grid');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [propertyFilter, setPropertyFilter] = useState('all');
    const [platformFilter, setPlatformFilter] = useState('all');
    const [groupBy, setGroupBy] = useState('none');

    const [selectedDevices, setSelectedDevices] = useState([]);

    const toggleSelection = (id) => {
        setSelectedDevices(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = () => {
        if (window.confirm(`Delete ${selectedDevices.length} devices?`)) {
            Promise.all(selectedDevices.map(id => deleteMutation.mutateAsync(id)))
                .then(() => setSelectedDevices([]))
                .catch(err => console.error('Bulk delete error:', err));
        }
    };
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

    // ... handleCodeChange, handleCodeKeyDown logic remains same ...
    const handleCodeChange = (index, value) => {
        if (value.length > 1) value = value.slice(-1);
        const newCode = [...pairingCode];
        newCode[index] = value.toUpperCase();
        setPairingCode(newCode);
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

    // ... mutations and queries remain same ...
    const { data: properties } = useQuery({
        queryKey: ['properties', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/devices/properties', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.properties;
        },
        enabled: !!user?.tenantId
    });

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

    const registerMutation = useMutation({
        mutationFn: async (data) => api.post('/devices', data),
        onSuccess: () => {
            queryClient.invalidateQueries(['devices']);
            setIsRegistering(false);
            setFormData({ name: '', deviceCode: '', zoneId: '', platform: 'android', orientation: 'landscape' });
        }
    });

    const claimMutation = useMutation({
        mutationFn: async (data) => api.post('/devices/pairing/claim', data),
        onSuccess: () => {
            queryClient.invalidateQueries(['devices']);
            setIsRegistering(false);
            setPairingCode(['', '', '', '', '', '', '', '']);
            setFormData({ name: '', deviceCode: '', zoneId: '', platform: 'android', orientation: 'landscape' });
        },
        onError: (err) => alert(err.response?.data?.error || 'Failed to claim code')
    });

    const handleRegister = (e) => {
        e.preventDefault();
        if (regMode === 'pair') {
            const code = pairingCode.join('');
            if (code.length < 8 || !formData.name || !formData.zoneId) {
                alert('Please fill in all fields');
                return;
            }
            claimMutation.mutate({ code, name: formData.name, zoneId: formData.zoneId, platform: formData.platform });
        } else {
            if (!formData.name || !formData.deviceCode || !formData.zoneId) {
                alert('Please fill in all required fields');
                return;
            }
            registerMutation.mutate(formData);
        }
    };

    const handleCommand = (e, deviceId, commandType) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const confirmMsg = {
            reboot: 'Reboot this device?',
            screen_off: 'Turn display OFF?',
            screen_on: 'Turn display ON?',
            clear_cache: 'Clear cache and reload?'
        };
        if (window.confirm(confirmMsg[commandType] || `Run ${commandType}?`)) {
            commandMutation.mutate({ deviceId, commandType });
        }
    };

    const handleDeleteDevice = (deviceId, name, e) => {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
            deleteMutation.mutate(deviceId);
        }
    };

    // Filter Logic
    const filteredDevices = devices?.filter(d => {
        const matchesSearch = d.device_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'online' && d.status === 'online') ||
            (statusFilter === 'offline' && d.status !== 'online') ||
            (statusFilter === 'playing' && (d.is_playing || d.isPlaying));
        const matchesProperty = propertyFilter === 'all' || d.property_id === propertyFilter;
        const matchesPlatform = platformFilter === 'all' || d.platform?.toLowerCase() === platformFilter.toLowerCase();
        return matchesSearch && matchesStatus && matchesProperty && matchesPlatform;
    });

    const getGroupedDevices = () => {
        if (groupBy === 'none') return { 'All Devices': filteredDevices || [] };

        const groups = {};
        filteredDevices?.forEach(device => {
            let key = 'Other';
            if (groupBy === 'property') key = device.property_name || 'Unassigned Property';
            if (groupBy === 'platform') key = device.platform || 'General';

            if (!groups[key]) groups[key] = [];
            groups[key].push(device);
        });
        return groups;
    };

    const deviceGroups = getGroupedDevices();

    const counts = {
        total: devices?.length || 0,
        online: devices?.filter(d => d.status === 'online').length || 0,
        offline: devices?.filter(d => d.status !== 'online').length || 0,
        playing: devices?.filter(d => d.is_playing || d.isPlaying).length || 0
    };

    return (
        <div className="devices-page">
            <div className="page-header">
                <div className="header-title">
                    <h1>Devices</h1>
                    <div className="subtitle">{counts.total} devices • {counts.online} online • {counts.playing} playing</div>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-outline btn-with-icon"
                        style={{ padding: '0.75rem 1.25rem' }}
                        onClick={() => {
                            if (selectedDevices.length === filteredDevices?.length) {
                                setSelectedDevices([]);
                            } else {
                                setSelectedDevices(filteredDevices?.map(d => d.id) || []);
                            }
                        }}
                    >
                        <div style={{
                            border: '2px solid currentColor',
                            width: 14,
                            height: 14,
                            borderRadius: 3,
                            marginRight: 8,
                            background: selectedDevices.length > 0 ? 'var(--primary)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '10px'
                        }}>
                            {selectedDevices.length === filteredDevices?.length ? '✓' : selectedDevices.length > 0 ? '-' : ''}
                        </div>
                        {selectedDevices.length === filteredDevices?.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button className="btn btn-primary btn-with-icon" onClick={() => { setIsRegistering(true); setRegMode('pair'); }} style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, var(--primary), #2563eb)' }}>
                        <Plus size={20} />
                        Add Device
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon-wrapper primary"><Monitor size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{counts.total}</span>
                        <span className="stat-label">Total Devices</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrapper success"><Wifi size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{counts.online}</span>
                        <span className="stat-label">Online</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrapper accent"><Activity size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{counts.playing}</span>
                        <span className="stat-label">Playing</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrapper destructive"><WifiOff size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{counts.offline}</span>
                        <span className="stat-label">Offline</span>
                    </div>
                </div>
            </div>

            <div className="toolbar">
                <div className="segmented-control">
                    <button className={`segment-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>
                        All <span className="count">{counts.total}</span>
                    </button>
                    <button className={`segment-btn ${statusFilter === 'online' ? 'active' : ''}`} onClick={() => setStatusFilter('online')}>
                        Online <span className="count" style={{ color: '#106b4d' }}>{counts.online}</span>
                    </button>
                    <button className={`segment-btn ${statusFilter === 'offline' ? 'active' : ''}`} onClick={() => setStatusFilter('offline')}>
                        Offline <span className="count">{counts.offline}</span>
                    </button>
                    <button className={`segment-btn ${statusFilter === 'playing' ? 'active' : ''}`} onClick={() => setStatusFilter('playing')}>
                        Playing <span className="count">{counts.playing}</span>
                    </button>
                </div>

                <div className="dropdown-selects">
                    <select className="premium-select" style={{ width: '160px' }} value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)}>
                        <option value="all">All Properties</option>
                        {properties?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select className="premium-select" style={{ width: '160px' }} value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}>
                        <option value="all">All Platforms</option>
                        <option value="android">Android</option>
                        <option value="windows">Windows</option>
                        <option value="linux">Linux</option>
                        <option value="web">Web Player</option>
                    </select>
                    <select className="premium-select" style={{ width: '160px' }} value={groupBy} onChange={e => setGroupBy(e.target.value)}>
                        <option value="none">No Grouping</option>
                        <option value="property">Group by Property</option>
                        <option value="platform">Group by Platform</option>
                    </select>
                </div>

                <div className="view-toggle">
                    <button className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}><Grid size={18} /></button>
                    <button className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><List size={18} /></button>
                </div>
            </div>

            <div className="search-bar">
                <Search size={20} className="search-icon" />
                <input
                    type="text"
                    className="premium-input input"
                    placeholder="Search devices..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {selectedDevices.length > 0 && (
                <div className="bulk-actions-bar">
                    <div className="selection-info">
                        <span className="count">{selectedDevices.length}</span>
                        <span>devices selected</span>
                    </div>
                    <div className="bulk-buttons">
                        <button className="btn btn-outline-destructive" onClick={handleBulkDelete}>
                            <Trash2 size={16} /> Delete Selected
                        </button>
                        <button className="btn btn-ghost" onClick={() => setSelectedDevices([])}>Cancel</button>
                    </div>
                </div>
            )}

            {Object.entries(deviceGroups).map(([groupName, groupDevices]) => (
                <div key={groupName} className="device-group-section">
                    {groupBy !== 'none' && <h2 className="group-title">{groupName} <span className="group-count">({groupDevices.length})</span></h2>}

                    {viewMode === 'grid' ? (
                        <div className="devices-grid">
                            {groupDevices.map(device => (
                                <div
                                    key={device.id}
                                    className={`device-card ${selectedDevices.includes(device.id) ? 'selected' : ''}`}
                                    onClick={() => toggleSelection(device.id)}
                                >
                                    <div className="card-header">
                                        <div className={`device-icon-box ${device.status !== 'online' ? 'offline' : (device.is_playing || device.isPlaying) ? 'playing' : 'online'}`}>
                                            {device.platform?.toLowerCase() === 'android' ? <Smartphone size={32} /> : <Monitor size={32} />}
                                            <div className={`status-dot-indicator ${device.status === 'online' ? ((device.is_playing || device.isPlaying) ? 'playing' : 'online') : 'offline'}`}>
                                                {device.status === 'online' && <Wifi size={10} color="white" />}
                                            </div>
                                        </div>
                                        <div className="device-title-section">
                                            <h3 className="device-name">{device.device_name}</h3>
                                            <span className="device-code">DSP-{device.id.slice(0, 3)}</span>
                                        </div>
                                        <div className="quick-actions">
                                            <button
                                                className="icon-btn-sm primary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(`${window.location.origin}/player/${device.id}`, '_blank');
                                                }}
                                                title="View Live Player"
                                            >
                                                <Monitor size={14} />
                                            </button>
                                            <button className="icon-btn-sm" onClick={(e) => { e.stopPropagation(); handleCommand(e, device.id, 'reboot'); }} title="Reboot Device"><RotateCw size={14} /></button>
                                            <button className="icon-btn-sm" onClick={(e) => { e.stopPropagation(); handleCommand(e, device.id, (device.is_playing || device.isPlaying) ? 'screen_off' : 'screen_on'); }} title="Toggle Screen"><Power size={14} /></button>
                                            {user?.role !== 'zone_admin' && (
                                                <button className="icon-btn-sm delete" onClick={(e) => { e.stopPropagation(); handleDeleteDevice(device.id, device.device_name, e); }} title="Delete Device"><Trash2 size={14} /></button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="device-details-list">
                                        <div className="detail-item">
                                            <span className="detail-label">Location</span>
                                            <span className="detail-value">{device.zone_name || 'Front Desk'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Property</span>
                                            <span className="detail-value">{device.property_name || 'HQ Building'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Platform</span>
                                            <span className="detail-value platform">{device.platform || 'Android'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Last seen</span>
                                            <span className="detail-value time">
                                                {device.last_heartbeat ? 'Just now' : '1m ago'}
                                            </span>
                                        </div>
                                    </div>

                                    <hr className="card-divider" />

                                    <div className="card-footer">
                                        <div className="status-badges">
                                            <div className={`badge ${device.status === 'online' ? 'success' : 'outline'}`}>
                                                {device.status === 'online' ? 'Online' : 'Offline'}
                                            </div>
                                            {(device.is_playing || device.isPlaying) && (
                                                <div className="badge playing">
                                                    <Activity size={14} /> Playing
                                                </div>
                                            )}
                                            <div className="badge outline">Landscape</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="devices-list-view">
                            <div className="list-row header">
                                <div style={{ paddingLeft: 10 }}><input type="checkbox" /></div>
                                <div></div>
                                <div>Device Name</div>
                                <div>Property</div>
                                <div>Platform</div>
                                <div>Status</div>
                                <div>Actions</div>
                            </div>
                            {groupDevices.map(device => (
                                <div key={device.id} className={`list-row ${selectedDevices.includes(device.id) ? 'selected' : ''}`} onClick={() => toggleSelection(device.id)}>
                                    <div style={{ paddingLeft: 10 }}><input type="checkbox" checked={selectedDevices.includes(device.id)} readOnly /></div>
                                    <div className={`status-dot-indicator ${device.status === 'online' ? 'online' : 'offline'}`} style={{ position: 'relative', top: 0, right: 0 }}></div>
                                    <div className="detail-value">{device.device_name} <small style={{ color: 'var(--text-secondary)', display: 'block' }}>DSP-{device.id.slice(0, 3)}</small></div>
                                    <div className="detail-value">{device.property_name || 'HQ Building'}</div>
                                    <div><span className="detail-value platform">{device.platform}</span></div>
                                    <div className="status-badges">
                                        <div className={`badge ${device.status === 'online' ? 'success' : 'outline'}`}>{device.status}</div>
                                    </div>
                                    <div className="quick-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="icon-btn-sm primary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(`${window.location.origin}/player/${device.id}`, '_blank');
                                            }}
                                        >
                                            <Monitor size={14} />
                                        </button>
                                        <button className="icon-btn-sm" onClick={(e) => { e.stopPropagation(); handleCommand(e, device.id, 'reboot'); }}><RotateCw size={14} /></button>
                                        <button className="icon-btn-sm" onClick={(e) => { e.stopPropagation(); handleCommand(e, device.id, (device.is_playing || device.isPlaying) ? 'screen_off' : 'screen_on'); }}><Power size={14} /></button>
                                        {user?.role !== 'zone_admin' && (
                                            <button className="icon-btn-sm delete" onClick={(e) => { e.stopPropagation(); handleDeleteDevice(device.id, device.device_name, e); }}><Trash2 size={14} /></button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {
                filteredDevices?.length === 0 && (
                    <div className="empty-list-state" style={{ padding: '5rem' }}>
                        <Monitor size={64} color="var(--border)" style={{ marginBottom: '1.5rem' }} />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>No devices found</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your filters or search query.</p>
                    </div>
                )
            }

            {
                isRegistering && (
                    <div className="modal-overlay" onClick={() => setIsRegistering(false)}>
                        <div className="modal-content premium-modal pairing-modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header" style={{ border: 'none', background: 'transparent' }}>
                                <div style={{ textAlign: 'center', width: '100%' }}>
                                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Pair New Device</h2>
                                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Enter the pairing code displayed on your screen to connect it to your organization.</p>
                                </div>
                            </div>

                            <form onSubmit={handleRegister} style={{ padding: '0 2rem 2rem' }}>
                                <div className="pairing-code-display">
                                    {pairingCode.map((char, i) => (
                                        <div key={i} className="pairing-digit">
                                            <input
                                                id={`code-input-${i}`}
                                                type="text"
                                                value={char}
                                                onChange={(e) => handleCodeChange(i, e.target.value)}
                                                onKeyDown={(e) => handleCodeKeyDown(i, e)}
                                                style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', outline: 'none' }}
                                                maxLength={1}
                                                autoComplete="off"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="form-sections" style={{ padding: 0 }}>
                                    <div className="form-group">
                                        <label style={{ textAlign: 'left', display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Device Name</label>
                                        <input
                                            type="text"
                                            className="premium-input"
                                            style={{ background: 'var(--background)' }}
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. Main Lobby Display"
                                            required
                                        />
                                    </div>
                                    <div className="form-row" style={{ marginTop: '1rem' }}>
                                        <div className="form-group">
                                            <label style={{ textAlign: 'left', display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Property</label>
                                            <select className="premium-select" style={{ background: 'var(--background)' }} value={propertyId} onChange={(e) => setPropertyId(e.target.value)} required>
                                                <option value="">Select Property</option>
                                                {properties?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label style={{ textAlign: 'left', display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Area</label>
                                            <select className="premium-select" style={{ background: 'var(--background)' }} value={formData.zoneId} onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })} disabled={!propertyId} required>
                                                <option value="">Select Area</option>
                                                {zones?.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '2rem', fontSize: '1rem', fontWeight: 700, borderRadius: '1rem', background: 'linear-gradient(135deg, var(--primary), #2563eb)' }}>
                                    Connect Device
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
