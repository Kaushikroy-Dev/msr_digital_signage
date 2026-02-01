import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './PropertyZoneSelector.css';

export default function PropertyZoneSelector({
    selectedPropertyId,
    selectedZoneId,
    onPropertyChange,
    onZoneChange,
    required = true,
    showZone = true,
    disabled = false
}) {
    const { user } = useAuthStore();
    const [localPropertyId, setLocalPropertyId] = useState(selectedPropertyId || '');
    const [localZoneId, setLocalZoneId] = useState(selectedZoneId || '');

    // Fetch properties
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

    // Fetch zones for selected property (or all zones for zone_admin)
    const { data: zones } = useQuery({
        queryKey: ['zones', localPropertyId, user?.role, user?.tenantId],
        queryFn: async () => {
            if (user?.role === 'zone_admin') {
                // For zone_admin, fetch all assigned zones
                const response = await api.get('/devices/all-zones', {
                    params: { tenantId: user?.tenantId }
                });
                return response.data.zones || [];
            } else if (!localPropertyId) {
                return [];
            } else {
                const response = await api.get('/devices/zones', {
                    params: { propertyId: localPropertyId }
                });
                return response.data.zones;
            }
        },
        enabled: user?.role === 'zone_admin' ? !!user?.tenantId : !!localPropertyId
    });

    // Auto-assign property/zone for property_admin and zone_admin
    useEffect(() => {
        if (user?.role === 'property_admin' && properties && properties.length > 0 && !localPropertyId) {
            // Auto-select first assigned property
            const firstProperty = properties[0];
            setLocalPropertyId(firstProperty.id);
            onPropertyChange?.(firstProperty.id);
        }
    }, [user?.role, properties, localPropertyId, onPropertyChange]);

    useEffect(() => {
        if (user?.role === 'zone_admin' && zones && zones.length > 0) {
            // For zone_admin, auto-select their assigned zone and property
            const firstZone = zones[0];
            if (!localZoneId || localZoneId !== firstZone.id) {
                setLocalZoneId(firstZone.id);
                onZoneChange?.(firstZone.id);
            }
            if (!localPropertyId || localPropertyId !== firstZone.property_id) {
                setLocalPropertyId(firstZone.property_id);
                onPropertyChange?.(firstZone.property_id);
            }
        }
    }, [user?.role, zones, localZoneId, localPropertyId, onZoneChange, onPropertyChange]);

    // Sync with external changes
    useEffect(() => {
        if (selectedPropertyId !== localPropertyId) {
            setLocalPropertyId(selectedPropertyId || '');
            if (!selectedPropertyId) {
                setLocalZoneId('');
                onZoneChange?.('');
            }
        }
    }, [selectedPropertyId]);

    useEffect(() => {
        if (selectedZoneId !== localZoneId) {
            setLocalZoneId(selectedZoneId || '');
        }
    }, [selectedZoneId]);

    const handlePropertyChange = (propertyId) => {
        setLocalPropertyId(propertyId);
        setLocalZoneId(''); // Reset zone when property changes
        onPropertyChange?.(propertyId);
        onZoneChange?.('');
    };

    const handleZoneChange = (zoneId) => {
        setLocalZoneId(zoneId);
        onZoneChange?.(zoneId);
    };

    // For zone_admin, show read-only display
    if (user?.role === 'zone_admin') {
        // Get property from the first assigned zone
        const zone = zones?.[0];
        const property = zone ? properties?.find(p => p.id === zone.property_id) : null;

        return (
            <div className="property-zone-selector read-only">
                <div className="selector-item">
                    <Building2 size={16} />
                    <span className="label">Property:</span>
                    <span className="value">{property?.name || 'Auto-assigned'}</span>
                </div>
                {showZone && (
                    <div className="selector-item">
                        <MapPin size={16} />
                        <span className="label">Zone:</span>
                        <span className="value">{zone?.name || 'Auto-assigned'}</span>
                    </div>
                )}
            </div>
        );
    }

    // For property_admin, show property (read-only) and zone selector
    if (user?.role === 'property_admin') {
        const property = properties?.[0]; // First assigned property

        return (
            <div className="property-zone-selector">
                <div className="selector-group">
                    <label className="selector-label">
                        <Building2 size={16} />
                        Property
                    </label>
                    <div className="read-only-value">{property?.name || 'Loading...'}</div>
                </div>
                {showZone && (
                    <div className="selector-group">
                        <label className="selector-label">
                            <MapPin size={16} />
                            Zone {required && <span className="required">*</span>}
                        </label>
                        <select
                            value={localZoneId}
                            onChange={(e) => handleZoneChange(e.target.value)}
                            disabled={disabled || !localPropertyId}
                            required={required}
                            className="selector-select"
                        >
                            <option value="">Select Zone</option>
                            {zones?.map(zone => (
                                <option key={zone.id} value={zone.id}>
                                    {zone.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        );
    }

    // For super_admin, show both selectors
    return (
        <div className="property-zone-selector">
            <div className="selector-group">
                <label className="selector-label">
                    <Building2 size={16} />
                    Property {required && <span className="required">*</span>}
                </label>
                <select
                    value={localPropertyId}
                    onChange={(e) => handlePropertyChange(e.target.value)}
                    disabled={disabled}
                    required={required}
                    className="selector-select"
                >
                    <option value="">Select Property</option>
                    {properties?.map(property => (
                        <option key={property.id} value={property.id}>
                            {property.name}
                        </option>
                    ))}
                </select>
            </div>
            {showZone && (
                <div className="selector-group">
                    <label className="selector-label">
                        <MapPin size={16} />
                        Zone
                    </label>
                    <select
                        value={localZoneId}
                        onChange={(e) => handleZoneChange(e.target.value)}
                        disabled={disabled || !localPropertyId}
                        className="selector-select"
                    >
                        <option value="">All Zones (Property-wide)</option>
                        {zones?.map(zone => (
                            <option key={zone.id} value={zone.id}>
                                {zone.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}
