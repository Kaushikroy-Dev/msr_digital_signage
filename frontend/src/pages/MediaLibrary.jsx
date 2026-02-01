import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Image as ImageIcon, Video, FileText, Trash2, Search, Share2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import PropertyZoneSelector from '../components/PropertyZoneSelector';
import ContentShareModal from '../components/ContentShareModal';
import './MediaLibrary.css';

export default function MediaLibrary() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPropertyId, setSelectedPropertyId] = useState('');
    const [selectedZoneId, setSelectedZoneId] = useState('');
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [sharingAsset, setSharingAsset] = useState(null);

    // Auto-select property/zone for property_admin and zone_admin
    useEffect(() => {
        if (user?.role === 'property_admin' || user?.role === 'zone_admin') {
            // Property/zone will be auto-selected by PropertyZoneSelector
            // We just need to ensure the query runs
        }
    }, [user?.role]);

    // Fetch media assets
    const { data: assets, isLoading } = useQuery({
        queryKey: ['media-assets', user?.tenantId, filter, selectedPropertyId, selectedZoneId],
        queryFn: async () => {
            const params = { tenantId: user?.tenantId };
            if (filter !== 'all') params.fileType = filter;
            if (user?.role === 'super_admin') {
                if (selectedPropertyId) params.propertyId = selectedPropertyId;
                if (selectedZoneId) params.zoneId = selectedZoneId;
            }

            const response = await api.get('/content/assets', { params });
            return response.data.assets;
        },
        enabled: !!user?.tenantId
    });

    // Upload mutation - RESTRUCTURED FOR RELIABILITY
    const uploadMutation = useMutation({
        mutationFn: async (files) => {
            if (!files || files.length === 0) {
                throw new Error('No file selected');
            }

            if (!user || !user.tenantId) {
                throw new Error('User not authenticated');
            }

            // Get auth token from zustand store
            const authStorage = localStorage.getItem('auth-storage');
            let token = null;

            try {
                if (authStorage) {
                    const parsed = JSON.parse(authStorage);
                    token = parsed?.state?.token || null;
                }
            } catch (e) {
                console.error('[Upload] Error parsing auth storage:', e);
            }

            if (!token) {
                throw new Error('Authentication token not found. Please log in again.');
            }

            const formData = new FormData();
            formData.append('file', files[0]);
            formData.append('tenantId', user.tenantId);
            formData.append('userId', user.id || user.userId);

            // Add property/zone for super_admin
            if (user.role === 'super_admin') {
                if (!selectedPropertyId || selectedPropertyId === '') {
                    console.error('[Upload] Super admin missing propertyId:', selectedPropertyId);
                    throw new Error('Please select a property before uploading');
                }
                console.log('[Upload] Appending propertyId:', selectedPropertyId);
                formData.append('propertyId', selectedPropertyId);
                if (selectedZoneId && selectedZoneId !== '') {
                    console.log('[Upload] Appending zoneId:', selectedZoneId);
                    formData.append('zoneId', selectedZoneId);
                }
            } else if (user.role === 'property_admin') {
                // Property is auto-assigned, but zone needs to be provided
                if (!selectedZoneId || selectedZoneId === '') {
                    console.error('[Upload] Property admin missing zoneId:', selectedZoneId);
                    throw new Error('Please select a zone before uploading');
                }
                console.log('[Upload] Appending zoneId for property_admin:', selectedZoneId);
                formData.append('zoneId', selectedZoneId);
            }
            // zone_admin and content_editor will have property/zone auto-assigned by backend
            
            console.log('[Upload] FormData contents:', {
                hasFile: files[0] ? true : false,
                fileName: files[0]?.name,
                tenantId: user.tenantId,
                userId: user.id || user.userId,
                propertyId: user.role === 'super_admin' ? selectedPropertyId : 'auto-assigned',
                zoneId: user.role === 'super_admin' ? selectedZoneId : (user.role === 'property_admin' ? selectedZoneId : 'auto-assigned')
            });

            // Use API gateway for upload
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const uploadUrl = `${API_URL}/api/content/upload`;

            console.log('[Upload] Starting upload:', {
                url: uploadUrl,
                fileName: files[0].name,
                fileSize: files[0].size,
                tenantId: user.tenantId,
                hasToken: !!token
            });

            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Don't set Content-Type - browser will set it with boundary for multipart/form-data
                },
                body: formData
            });

            const responseText = await response.text();
            let responseData;

            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                console.error('[Upload] Invalid JSON response:', responseText);
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }

            if (!response.ok) {
                console.error('[Upload] Upload failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: responseData
                });
                throw new Error(responseData.error || responseData.details || `Upload failed: ${response.status}`);
            }

            console.log('[Upload] Upload successful:', responseData);
            return responseData;
        },
        onSuccess: (data) => {
            console.log('[Upload] Success callback:', data);
            queryClient.invalidateQueries(['media-assets']);
        },
        onError: (error) => {
            console.error('[Upload] Upload error:', error);
            const errorMessage = error.message || 'Upload failed. Please try again.';
            alert(`Upload failed: ${errorMessage}`);
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (assetId) => {
            await api.delete(`/content/assets/${assetId}`, {
                params: { tenantId: user.tenantId, userId: user.id }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['media-assets']);
        }
    });

    const canManageMedia = user?.role !== 'viewer';

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (files) => {
            if (!canManageMedia) return;
            
            // Validate property/zone selection before upload
            if (user?.role === 'super_admin' && !selectedPropertyId) {
                alert('Please select a property before uploading');
                return;
            }
            if (user?.role === 'property_admin' && !selectedZoneId) {
                alert('Please select a zone before uploading');
                return;
            }
            
            uploadMutation.mutate(files);
        },
        disabled: !canManageMedia,
        accept: {
            'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
            'video/*': ['.mp4', '.webm', '.mov'],
            'application/pdf': ['.pdf'],
            'application/vnd.ms-powerpoint': ['.ppt'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
        }
    });

    const filteredAssets = assets?.filter(asset =>
        asset.originalName.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const getFileIcon = (fileType) => {
        switch (fileType) {
            case 'image': return <ImageIcon size={24} />;
            case 'video': return <Video size={24} />;
            default: return <FileText size={24} />;
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="media-library">
            <div className="media-header">
                <h1>Media Library</h1>
                <p>Manage your images, videos, and documents</p>
            </div>

            {user?.role === 'super_admin' && (
                <PropertyZoneSelector
                    selectedPropertyId={selectedPropertyId}
                    selectedZoneId={selectedZoneId}
                    onPropertyChange={setSelectedPropertyId}
                    onZoneChange={setSelectedZoneId}
                    required={false}
                />
            )}

            {(user?.role === 'property_admin' || user?.role === 'zone_admin') && (
                <PropertyZoneSelector
                    selectedPropertyId={selectedPropertyId}
                    selectedZoneId={selectedZoneId}
                    onPropertyChange={setSelectedPropertyId}
                    onZoneChange={setSelectedZoneId}
                    required={user?.role === 'property_admin'}
                />
            )}

            <div className="media-toolbar">
                <div className="media-search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search media..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input"
                    />
                </div>

                <div className="media-filters">
                    {['all', 'image', 'video', 'document'].map((type) => (
                        <button
                            key={type}
                            className={`filter-btn ${filter === type ? 'active' : ''}`}
                            onClick={() => setFilter(type)}
                        >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {canManageMedia && (
                <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'active' : ''}`}>
                    <input {...getInputProps()} />
                    <Upload size={48} />
                    <h3>Drop files here or click to upload</h3>
                    <p>Supports: Images, Videos, PDF, PowerPoint</p>
                    {uploadMutation.isPending && <p className="uploading">Uploading...</p>}
                </div>
            )}

            {isLoading ? (
                <div className="loading">Loading media...</div>
            ) : (
                <div className="media-grid">
                    {filteredAssets.map((asset) => (
                        <div key={asset.id} className="media-card">
                            <div className="media-preview">
                                {asset.fileType === 'image' ? (
                                    <img
                                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${asset.thumbnailUrl || asset.url}`}
                                        alt={asset.originalName}
                                        onError={(e) => {
                                            // Fallback to original image if thumbnail fails
                                            if (asset.thumbnailUrl && e.target.src !== asset.url) {
                                                e.target.src = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${asset.url}`;
                                            }
                                        }}
                                    />
                                ) : asset.fileType === 'video' && asset.thumbnailUrl ? (
                                    <img
                                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${asset.thumbnailUrl}`}
                                        alt={asset.originalName}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => {
                                            // Fallback to video icon if thumbnail fails
                                            e.target.style.display = 'none';
                                            e.target.parentElement.innerHTML = `<div class="media-icon">${getFileIcon(asset.fileType)}</div>`;
                                        }}
                                    />
                                ) : (
                                    <div className="media-icon">
                                        {getFileIcon(asset.fileType)}
                                    </div>
                                )}
                            </div>
                            <div className="media-info">
                                <div className="media-name" title={asset.originalName}>
                                    {asset.originalName}
                                </div>
                                <div className="media-meta">
                                    {formatFileSize(asset.fileSize)}
                                    {asset.width && ` · ${asset.width}x${asset.height}`}
                                    {asset.isShared && (
                                        <span className="shared-badge" title="Shared with other properties">
                                            <Share2 size={12} /> Shared
                                        </span>
                                    )}
                                </div>
                            </div>
                            {canManageMedia && (
                                <div className="media-actions">
                                    {user?.role === 'super_admin' && (
                                        <button
                                            className="media-share"
                                            onClick={() => {
                                                setSharingAsset(asset);
                                                setShareModalOpen(true);
                                            }}
                                            title="Share"
                                        >
                                            <Share2 size={16} />
                                        </button>
                                    )}
                                    <button
                                        className="media-delete"
                                        onClick={() => deleteMutation.mutate(asset.id)}
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {filteredAssets.length === 0 && !isLoading && (
                <div className="empty-state">
                    <ImageIcon size={64} />
                    <h3>No media found</h3>
                    <p>Upload your first media file to get started</p>
                </div>
            )}

            {shareModalOpen && sharingAsset && (
                <ContentShareModal
                    isOpen={shareModalOpen}
                    onClose={() => {
                        setShareModalOpen(false);
                        setSharingAsset(null);
                    }}
                    contentId={sharingAsset.id}
                    contentType="media"
                    currentSharedProperties={sharingAsset.sharedWithProperties || []}
                    isShared={sharingAsset.isShared || false}
                />
            )}
        </div>
    );
}
