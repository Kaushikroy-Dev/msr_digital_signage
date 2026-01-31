import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Building2,
    MapPin,
    Plus,
    Edit2,
    Trash2,
    ChevronDown,
    ChevronRight,
    Monitor,
    MonitorSmartphone,
    Activity,
    Grid3x3,
    Settings,
    Map
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './Organization.css';

export default function Organization() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // UI State
    const [isAddingProperty, setIsAddingProperty] = useState(false);
    const [isAddingArea, setIsAddingArea] = useState(null);
    const [isAddingDevice, setIsAddingDevice] = useState(null); // zoneId
    const [editingProperty, setEditingProperty] = useState(null);
    const [expandedProperties, setExpandedProperties] = useState(new Set());
    const [expandedAreas, setExpandedAreas] = useState(new Set());

    // Form States
    const [propertyForm, setPropertyForm] = useState({
        name: '',
        address: '',
        city: '',
        state: '',
        country: '',
        timezone: 'Asia/Kolkata'
    });

    const [areaForm, setAreaForm] = useState({
        name: '',
        description: '',
        zone_type: 'lobby'
    });

    const [deviceForm, setDeviceForm] = useState({
        name: '',
        deviceCode: '',
        platform: 'android',
        orientation: 'landscape'
    });

    const [pairingCode, setPairingCode] = useState(['', '', '', '', '', '', '', '']);

    // Data Fetching
    const { data: properties, isLoading: loadingProperties } = useQuery({
        queryKey: ['properties', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/devices/properties', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.properties;
        },
        enabled: !!user?.tenantId
    });

    const { data: areasData, isLoading: loadingAreas } = useQuery({
        queryKey: ['all-zones', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/devices/all-zones', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.zones;
        },
        enabled: !!user?.tenantId
    });

    const { data: devicesData, isLoading: loadingDevices } = useQuery({
        queryKey: ['devices', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/devices/devices', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.devices;
        },
        enabled: !!user?.tenantId,
        refetchInterval: 10000
    });

    // Mutations
    const createPropertyMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post('/devices/properties', { ...data, tenantId: user.tenantId });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['properties']);
            setIsAddingProperty(false);
            setPropertyForm({ name: '', address: '', city: '', state: '', country: '', timezone: 'Asia/Kolkata' });
        }
    });

    const createAreaMutation = useMutation({
        mutationFn: async ({ propertyId, data }) => {
            const response = await api.post('/devices/zones', { ...data, propertyId });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['all-zones']);
            setIsAddingArea(null);
            setAreaForm({ name: '', description: '', zone_type: 'lobby' });
        }
    });

    const claimDeviceMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post('/devices/pairing/claim', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['devices']);
            setIsAddingDevice(null);
            setPairingCode(['', '', '', '', '', '', '', '']);
            setDeviceForm({ name: '', deviceCode: '', platform: 'android', orientation: 'landscape' });
        },
        onError: (err) => {
            alert(err.response?.data?.error || 'Failed to claim code');
        }
    });

    // Delete property mutation
    const deletePropertyMutation = useMutation({
        mutationFn: async (propertyId) => {
            await api.delete(`/devices/properties/${propertyId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['properties']);
            queryClient.invalidateQueries(['all-zones']);
        },
        onError: (err) => {
            alert(err.response?.data?.error || 'Failed to delete property');
        }
    });

    // Delete zone/area mutation
    const deleteZoneMutation = useMutation({
        mutationFn: async (zoneId) => {
            await api.delete(`/devices/zones/${zoneId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['all-zones']);
            queryClient.invalidateQueries(['devices']);
        },
        onError: (err) => {
            alert(err.response?.data?.error || 'Failed to delete area');
        }
    });

    // Handlers
    const toggleProperty = (id) => {
        const next = new Set(expandedProperties);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedProperties(next);
    };

    const toggleArea = (id) => {
        const next = new Set(expandedAreas);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedAreas(next);
    };

    const handleCodeChange = (index, value) => {
        if (value.length > 1) value = value.slice(-1);
        const newCode = [...pairingCode];
        newCode[index] = value.toUpperCase();
        setPairingCode(newCode);

        if (value && index < 7) {
            document.getElementById(`code-input-${index + 1}`)?.focus();
        }
    };

    const handleRegisterDevice = (e) => {
        e.preventDefault();
        const code = pairingCode.join('');
        if (code.length < 8) return alert('Please enter the full 8-digit pairing code');
        if (!deviceForm.name) return alert('Please enter a name for this screen');

        claimDeviceMutation.mutate({
            code,
            name: deviceForm.name,
            zoneId: isAddingDevice,
            platform: deviceForm.platform
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'online': return '#10b981';
            case 'offline': return '#6b7280';
            case 'error': return '#ef4444';
            default: return '#f59e0b';
        }
    };

    const handleDeleteProperty = (propertyId, propertyName) => {
        if (window.confirm(`Are you sure you want to delete "${propertyName}"? This will also delete all areas and devices within it. This action cannot be undone.`)) {
            deletePropertyMutation.mutate(propertyId);
        }
    };

    const handleDeleteZone = (zoneId, zoneName) => {
        if (window.confirm(`Are you sure you want to delete area "${zoneName}"? This will also delete all devices in this area. This action cannot be undone.`)) {
            deleteZoneMutation.mutate(zoneId);
        }
    };

    if (loadingProperties) return <div className="loading-container">Loading hierarchy...</div>;

    return (
        <div className="organization-page">
            <div className="page-header premium-header">
                <div>
                    <h1 className="premium-title">Organization Hierarchy</h1>
                    <p className="premium-subtitle">Manage your network structure, sites, and connected screens.</p>
                </div>
                <div className="header-actions">
                    {user?.role === 'super_admin' && (
                        <button className="btn btn-primary btn-premium" onClick={() => setIsAddingProperty(true)}>
                            <Plus size={20} />
                            Add New Site
                        </button>
                    )}
                </div>
            </div>

            <div className="hierarchy-container">
                {properties?.length === 0 ? (
                    <div className="empty-state-large">
                        <div className="empty-icon-wrapper">
                            <Building2 size={64} />
                        </div>
                        <h2>No Sites Yet</h2>
                        <p>Start by creating a property (e.g., "Grand Hotel NYC") to organize your displays.</p>
                        <button className="btn btn-primary" onClick={() => setIsAddingProperty(true)}>
                            Create First Site
                        </button>
                    </div>
                ) : (
                    <div className="properties-grid">
                        {properties?.map((property) => {
                            const areas = areasData?.filter(a => a.property_id === property.id) || [];
                            const isExpanded = expandedProperties.has(property.id);

                            return (
                                <div key={property.id} className={`property-card-nested ${isExpanded ? 'expanded' : ''}`}>
                                    <div className="property-main-row" onClick={() => toggleProperty(property.id)}>
                                        <div className="property-identity">
                                            <div className="property-icon-wrapper">
                                                <Building2 size={24} />
                                            </div>
                                            <div className="property-details">
                                                <h3>{property.name}</h3>
                                                <span className="location-text">
                                                    <MapPin size={12} />
                                                    {[property.city, property.country].filter(Boolean).join(', ') || 'No location set'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="property-stats">
                                            <div className="stat-group">
                                                <span className="stat-value">{areas.length}</span>
                                                <span className="stat-label">Areas</span>
                                            </div>
                                            <div className="stat-group">
                                                <span className="stat-value">
                                                    {devicesData?.filter(d => areas.some(a => a.id === d.zone_id)).length || 0}
                                                </span>
                                                <span className="stat-label">Screens</span>
                                            </div>
                                            {user?.role === 'super_admin' && (
                                                <button 
                                                    className="icon-btn-sm danger-hover" 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        handleDeleteProperty(property.id, property.name); 
                                                    }}
                                                    disabled={deletePropertyMutation.isPending}
                                                    title="Delete Property"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                            <div className="property-chevron">
                                                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                            </div>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="areas-sub-container">
                                            <div className="areas-header">
                                                <h4>Areas in {property.name}</h4>
                                                {(user?.role === 'super_admin' || user?.role === 'property_admin') && (
                                                    <button className="btn-add-text" onClick={(e) => { e.stopPropagation(); setIsAddingArea(property.id); }}>
                                                        <Plus size={14} /> Add Area
                                                    </button>
                                                )}
                                            </div>

                                            {areas.length === 0 ? (
                                                <div className="empty-areas-state">
                                                    <p>No areas defined yet (e.g., Lobby, Restaurant)</p>
                                                </div>
                                            ) : (
                                                <div className="areas-list-nested">
                                                    {areas.map((area) => {
                                                        const devices = devicesData?.filter(d => d.zone_id === area.id) || [];
                                                        const isAreaExpanded = expandedAreas.has(area.id);

                                                        return (
                                                            <div key={area.id} className={`area-item-nested ${isAreaExpanded ? 'active' : ''}`}>
                                                                <div className="area-row" onClick={(e) => { e.stopPropagation(); toggleArea(area.id); }}>
                                                                    <div className="area-info-main">
                                                                        {isAreaExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                                        <Grid3x3 size={16} />
                                                                        <span className="area-name">{area.name}</span>
                                                                    </div>
                                                                    <div className="area-info-stats">
                                                                        <span className="screen-count">{devices.length} screens</span>
                                                                        {(user?.role === 'super_admin' || user?.role === 'property_admin' || user?.role === 'zone_admin') && (
                                                                            <button className="icon-btn-sm primary-hover" onClick={(e) => { e.stopPropagation(); setIsAddingDevice(area.id); }}>
                                                                                <MonitorSmartphone size={14} />
                                                                            </button>
                                                                        )}
                                                                        {(user?.role === 'super_admin' || user?.role === 'property_admin') && (
                                                                            <button 
                                                                                className="icon-btn-sm danger-hover" 
                                                                                onClick={(e) => { 
                                                                                    e.stopPropagation(); 
                                                                                    handleDeleteZone(area.id, area.name); 
                                                                                }}
                                                                                disabled={deleteZoneMutation.isPending}
                                                                                title="Delete Area"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {isAreaExpanded && (
                                                                    <div className="devices-mini-grid">
                                                                        {devices.length === 0 ? (
                                                                            <div className="no-devices-text">
                                                                                No screens registered.
                                                                                <button className="link-btn" onClick={() => setIsAddingDevice(area.id)}>Pair now</button>
                                                                            </div>
                                                                        ) : (
                                                                            devices.map(device => (
                                                                                <div key={device.id} className="device-compact-tag">
                                                                                    <div className="status-indicator-mini" style={{ background: getStatusColor(device.status) }}></div>
                                                                                    <Monitor size={12} />
                                                                                    <span>{device.device_name}</span>
                                                                                </div>
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modals */}
            {isAddingProperty && (
                <div className="modal-overlay glass">
                    <div className="modal-content premium-modal">
                        <div className="modal-header">
                            <div>
                                <h2>Add New Site</h2>
                                <p>Define a property or organization location</p>
                            </div>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); createPropertyMutation.mutate(propertyForm); }}>
                            <div className="form-group">
                                <label>Site Name</label>
                                <input
                                    type="text"
                                    className="premium-input-field"
                                    value={propertyForm.name}
                                    onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                                    placeholder="e.g. London Office, Mumbai Hub"
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>City</label>
                                    <input
                                        type="text"
                                        className="premium-input-field"
                                        value={propertyForm.city}
                                        onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Timezone</label>
                                    <select
                                        className="premium-select-field"
                                        value={propertyForm.timezone}
                                        onChange={(e) => setPropertyForm({ ...propertyForm, timezone: e.target.value })}
                                    >
                                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                        <option value="Europe/London">Europe/London (GMT)</option>
                                        <option value="America/New_York">America/New_York (EST)</option>
                                        <option value="UTC">UTC</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setIsAddingProperty(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary btn-premium" disabled={createPropertyMutation.isPending}>
                                    {createPropertyMutation.isPending ? 'Creating...' : 'Create Site'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAddingArea && (
                <div className="modal-overlay glass">
                    <div className="modal-content premium-modal">
                        <div className="modal-header">
                            <div>
                                <h2>Add New Area</h2>
                                <p>Define a zone or section within the property</p>
                            </div>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); createAreaMutation.mutate({ propertyId: isAddingArea, data: areaForm }); }}>
                            <div className="form-group">
                                <label>Area Name</label>
                                <input
                                    type="text"
                                    className="premium-input-field"
                                    value={areaForm.name}
                                    onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })}
                                    placeholder="e.g. Main Lobby, Cafeteria"
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setIsAddingArea(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary btn-premium" disabled={createAreaMutation.isPending}>
                                    {createAreaMutation.isPending ? 'Creating...' : 'Create Area'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAddingDevice && (
                <div className="modal-overlay glass">
                    <div className="modal-content premium-modal-dark">
                        <div className="modal-header text-center">
                            <h2>Connect New Screen</h2>
                            <p>Enter the 8-digit registration code displayed on your screen, or add directly without pairing</p>
                        </div>
                        <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <p style={{ marginBottom: '12px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                                Need to add multiple devices quickly?
                            </p>
                            <button 
                                type="button"
                                onClick={async () => {
                                    const name = prompt('Enter device name:');
                                    if (name) {
                                        try {
                                            await api.post('/devices/devices', {
                                                name,
                                                zoneId: isAddingDevice,
                                                platform: 'android',
                                                orientation: 'landscape'
                                            });
                                            queryClient.invalidateQueries(['devices']);
                                            setIsAddingDevice(null);
                                            setPairingCode(['', '', '', '', '', '', '', '']);
                                            alert('Device added successfully!');
                                        } catch (err) {
                                            alert(err.response?.data?.error || 'Failed to add device');
                                        }
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(59, 130, 246, 0.2)',
                                    color: '#60a5fa',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}
                            >
                                + Add Device Directly (Skip Pairing Code)
                            </button>
                            <p style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                                Use this to quickly add multiple devices to the same area
                            </p>
                        </div>
                        <form onSubmit={handleRegisterDevice}>
                            <div className="pairing-entry">
                                <div className="pairing-inputs-row">
                                    {pairingCode.map((char, i) => (
                                        <input
                                            key={i}
                                            id={`code-input-${i}`}
                                            type="text"
                                            className="pairing-box"
                                            value={char}
                                            maxLength={1}
                                            onChange={(e) => handleCodeChange(i, e.target.value)}
                                            autoComplete="off"
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="form-group-spaced">
                                <label>Screen Identity Name</label>
                                <input
                                    type="text"
                                    className="premium-input-field light"
                                    value={deviceForm.name}
                                    onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                                    placeholder="e.g. Entrance OLED Left"
                                    required
                                />
                            </div>
                            <div className="modal-actions center">
                                <button type="button" className="btn btn-dark-ghost" onClick={() => setIsAddingDevice(null)}>Cancel</button>
                                <button type="submit" className="btn btn-success btn-premium" disabled={claimDeviceMutation.isPending}>
                                    {claimDeviceMutation.isPending ? 'Activating...' : 'Activate Screen Now'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
