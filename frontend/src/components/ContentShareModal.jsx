import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Share2, Building2 } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './ContentShareModal.css';

export default function ContentShareModal({
    isOpen,
    onClose,
    contentId,
    contentType, // 'media', 'template', 'playlist'
    currentSharedProperties = [],
    isShared = false
}) {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [selectedProperties, setSelectedProperties] = useState([]);

    // Fetch all properties (for super_admin)
    const { data: properties } = useQuery({
        queryKey: ['properties', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/devices/properties', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.properties;
        },
        enabled: !!user?.tenantId && isOpen && user?.role === 'super_admin'
    });

    useEffect(() => {
        if (isOpen) {
            setSelectedProperties(currentSharedProperties || []);
        }
    }, [isOpen, currentSharedProperties]);

    const shareMutation = useMutation({
        mutationFn: async ({ propertyIds, isShared }) => {
            let endpoint;
            if (contentType === 'media') {
                endpoint = `/content/assets/${contentId}/share`;
            } else if (contentType === 'template') {
                endpoint = `/templates/templates/${contentId}/share`;
            } else if (contentType === 'playlist') {
                endpoint = `/schedules/playlists/${contentId}/share`;
            } else {
                throw new Error(`Unknown content type: ${contentType}`);
            }
            
            if (isShared && propertyIds.length > 0) {
                return await api.post(endpoint, { propertyIds });
            } else {
                // Unshare all
                return await api.delete(endpoint);
            }
        },
        onSuccess: () => {
            // Invalidate relevant queries
            queryClient.invalidateQueries([`${contentType}s`]);
            queryClient.invalidateQueries([`${contentType}`, contentId]);
            onClose();
        },
        onError: (error) => {
            alert(error.response?.data?.error || 'Failed to update sharing settings');
        }
    });

    const handleToggleProperty = (propertyId) => {
        setSelectedProperties(prev => {
            if (prev.includes(propertyId)) {
                return prev.filter(id => id !== propertyId);
            } else {
                return [...prev, propertyId];
            }
        });
    };

    const handleSave = () => {
        const isShared = selectedProperties.length > 0;
        shareMutation.mutate({
            propertyIds: selectedProperties,
            isShared
        });
    };

    if (!isOpen || user?.role !== 'super_admin') return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="content-share-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        <Share2 size={20} />
                        <h2>Share {contentType.charAt(0).toUpperCase() + contentType.slice(1)}</h2>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-content">
                    <p className="share-description">
                        Select properties that can access this {contentType}. 
                        The {contentType} will be visible in those properties' content libraries.
                    </p>

                    <div className="properties-list">
                        {properties?.map(property => {
                            const isSelected = selectedProperties.includes(property.id);
                            return (
                                <label key={property.id} className="property-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleProperty(property.id)}
                                    />
                                    <Building2 size={16} />
                                    <span>{property.name}</span>
                                </label>
                            );
                        })}
                    </div>

                    {properties?.length === 0 && (
                        <div className="empty-state">
                            <p>No properties available</p>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={handleSave}
                        disabled={shareMutation.isPending}
                    >
                        {shareMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
