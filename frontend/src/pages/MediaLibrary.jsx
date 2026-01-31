import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Image as ImageIcon, Video, FileText, Trash2, Search } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './MediaLibrary.css';

export default function MediaLibrary() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch media assets
    const { data: assets, isLoading } = useQuery({
        queryKey: ['media-assets', user?.tenantId, filter],
        queryFn: async () => {
            const params = { tenantId: user?.tenantId };
            if (filter !== 'all') params.fileType = filter;

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

            // Direct connection to content service
            const CONTENT_SERVICE_URL = import.meta.env.VITE_CONTENT_SERVICE_URL || 'http://localhost:3002';
            const uploadUrl = `${CONTENT_SERVICE_URL}/upload`;
            
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
            if (canManageMedia) uploadMutation.mutate(files);
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
                                </div>
                            </div>
                            {canManageMedia && (
                                <button
                                    className="media-delete"
                                    onClick={() => deleteMutation.mutate(asset.id)}
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
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
        </div>
    );
}
