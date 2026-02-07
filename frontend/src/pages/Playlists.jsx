import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Trash2, GripVertical, Image, Video, Eye, Monitor, X, Edit2, Layout, Share2, Search, Settings, ChevronRight } from 'lucide-react';
import api, { API_BASE_URL } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import PlaylistPreview from '../components/PlaylistPreview';
import PropertyZoneSelector from '../components/PropertyZoneSelector';
import { TRANSITION_EFFECTS } from '../constants/transitions';
import './Playlists.css';

export default function Playlists() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [previewPlaylist, setPreviewPlaylist] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [contentTab, setContentTab] = useState('media');
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
    const [assigningPlaylist, setAssigningPlaylist] = useState(null);
    const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [selectedPropertyId, setSelectedPropertyId] = useState('');
    const [selectedZoneId, setSelectedZoneId] = useState('');

    // Debug: Log when isCreatingPlaylist changes
    useEffect(() => {
        console.log('[Create Playlist] Modal state changed:', isCreatingPlaylist);
    }, [isCreatingPlaylist]);

    // Editor States (local feedback before mutation)
    const [localPlaylistData, setLocalPlaylistData] = useState({
        name: '',
        description: '',
        transitionEffect: 'fade',
        transitionDuration: 1000,
        isShared: false
    });

    // Queries
    const { data: playlists } = useQuery({
        queryKey: ['playlists', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/schedules/playlists', { params: { tenantId: user?.tenantId } });
            return response.data.playlists;
        },
        enabled: !!user?.tenantId
    });

    const { data: mediaAssets } = useQuery({
        queryKey: ['media-assets', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/content/assets', { params: { tenantId: user?.tenantId } });
            return response.data.assets;
        },
        enabled: isMediaModalOpen
    });

    const { data: templates } = useQuery({
        queryKey: ['templates', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/templates', { params: { tenantId: user?.tenantId } });
            return response.data.templates || [];
        },
        enabled: isMediaModalOpen
    });

    const { data: playlistItems } = useQuery({
        queryKey: ['playlist-items', selectedPlaylist?.id],
        queryFn: async () => {
            const response = await api.get(`/schedules/playlists/${selectedPlaylist.id}/items`);
            return response.data.items;
        },
        enabled: !!selectedPlaylist?.id
    });

    // Device Assignment Queries
    const { data: allDevices } = useQuery({
        queryKey: ['all-devices', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/devices/devices', { params: { tenantId: user?.tenantId } });
            return response.data.devices;
        },
        enabled: !!assigningPlaylist
    });

    const { data: assignedDevices } = useQuery({
        queryKey: ['playlist-devices', assigningPlaylist],
        queryFn: async () => {
            const response = await api.get(`/schedules/playlists/${assigningPlaylist}/devices`);
            return response.data.devices;
        },
        enabled: !!assigningPlaylist
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data) => {
            const payload = { ...data, tenantId: user.tenantId };

            console.log('[Create Playlist] Mutation called with:', {
                data,
                selectedPropertyId,
                selectedZoneId,
                role: user.role
            });

            // Add propertyId and zoneId based on user role
            if (user.role === 'super_admin') {
                if (!selectedPropertyId) {
                    const error = new Error('Please select a property');
                    console.error('[Create Playlist] Validation failed:', error.message);
                    throw error;
                }
                payload.propertyId = selectedPropertyId;
                if (selectedZoneId) {
                    payload.zoneId = selectedZoneId;
                }
            } else if (user.role === 'property_admin') {
                if (!selectedZoneId) {
                    const error = new Error('Please select a zone');
                    console.error('[Create Playlist] Validation failed:', error.message);
                    throw error;
                }
                payload.zoneId = selectedZoneId;
            }
            // For zone_admin and content_editor, backend will auto-assign

            console.log('[Create Playlist] Sending payload:', payload);
            const response = await api.post('/schedules/playlists', payload);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['playlists']);
            setSelectedPlaylist(data);
            setIsCreatingPlaylist(false);
            setNewPlaylistName('');
            setSelectedPropertyId('');
            setSelectedZoneId('');
        },
        onError: (error) => {
            console.error('[Create Playlist] Mutation Error:', error);
            console.error('[Create Playlist] Error Response:', error.response);
            console.error('[Create Playlist] Error Data:', error.response?.data);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to create playlist';
            alert(`Error creating playlist: ${errorMessage}`);
        }
    });

    const updatePlaylistMutation = useMutation({
        mutationFn: async ({ playlistId, data }) => {
            await api.put(`/schedules/playlists/${playlistId}`, data);
        },
        onSuccess: () => queryClient.invalidateQueries(['playlists'])
    });

    const deletePlaylistMutation = useMutation({
        mutationFn: async (playlistId) => {
            await api.delete(`/schedules/playlists/${playlistId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['playlists']);
            setSelectedPlaylist(null);
        }
    });

    const addItemMutation = useMutation({
        mutationFn: async ({ playlistId, assetId, duration }) => {
            await api.post(`/schedules/playlists/${playlistId}/items`, {
                contentType: 'media',
                contentId: assetId,
                duration: duration * 1000,
                tenantId: user.tenantId
            });
        },
        onSuccess: () => queryClient.invalidateQueries(['playlist-items'])
    });

    const addTemplateMutation = useMutation({
        mutationFn: async ({ playlistId, templateId, duration }) => {
            await api.post(`/schedules/playlists/${playlistId}/items`, {
                contentType: 'template',
                contentId: templateId,
                duration: duration,
                tenantId: user.tenantId
            });
        },
        onSuccess: () => queryClient.invalidateQueries(['playlist-items'])
    });

    const deleteItemMutation = useMutation({
        mutationFn: async (itemId) => {
            await api.delete(`/schedules/playlists/${selectedPlaylist.id}/items/${itemId}`);
        },
        onSuccess: () => queryClient.invalidateQueries(['playlist-items'])
    });

    const updateItemMutation = useMutation({
        mutationFn: async ({ itemId, data }) => {
            await api.put(`/schedules/playlists/${selectedPlaylist.id}/items/${itemId}`, data);
        },
        onSuccess: () => queryClient.invalidateQueries(['playlist-items'])
    });

    const assignPlaylistMutation = useMutation({
        mutationFn: async ({ playlistId, deviceIds }) => {
            await api.post(`/schedules/playlists/${playlistId}/assign-devices`, { deviceIds });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['playlist-devices']);
            queryClient.invalidateQueries(['playlists']);
        }
    });

    const formatDurationSeconds = (seconds) => {
        if (!seconds) return '0s';
        if (seconds < 60) return `${seconds}s`;
        return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    };

    const calculateTotalDuration = (items) => {
        if (!items || items.length === 0) return '0s';
        const totalMs = items.reduce((acc, item) => acc + (item.duration_ms || item.duration_seconds * 1000 || 0), 0);
        return formatDurationSeconds(Math.floor(totalMs / 1000));
    };

    const handleLocalPropertyChange = (key, value) => {
        const newData = { ...localPlaylistData, [key]: value };
        setLocalPlaylistData(newData);
        updatePlaylistMutation.mutate({
            playlistId: selectedPlaylist.id,
            data: {
                name: newData.name,
                description: newData.description,
                transitionEffect: newData.transitionEffect,
                transitionDuration: newData.transitionDuration,
                isShared: newData.isShared
            }
        });
    };

    const filteredPlaylists = playlists?.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        if (selectedPlaylist) {
            setLocalPlaylistData({
                name: selectedPlaylist.name,
                description: selectedPlaylist.description || '',
                transitionEffect: selectedPlaylist.transition_effect || 'fade',
                transitionDuration: selectedPlaylist.transition_duration_ms || 1000,
                isShared: selectedPlaylist.is_shared || false
            });
        }
    }, [selectedPlaylist]);

    // Render Logic
    return (
        <div className="playlists-page">
            {selectedPlaylist ? (
                <div className="playlist-editor-new">
                    <div className="editor-header">
                        <div className="back-header">
                            <button className="back-btn" onClick={() => setSelectedPlaylist(null)}>
                                <ChevronRight style={{ transform: 'rotate(180deg)' }} />
                            </button>
                            <div className="header-info">
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Edit Playlist</h1>
                                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Configure your playlist content and settings</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button className="btn btn-outline"
                                onClick={() => setPreviewPlaylist(selectedPlaylist)}>
                                <Play size={16} /> Preview
                            </button>
                            <button className="btn btn-primary" onClick={() => setSelectedPlaylist(null)}>
                                Save Playlist
                            </button>
                        </div>
                    </div>

                    <div className="editor-grid">
                        <div className="sidebar-panel">
                            <div className="panel-card">
                                <h4>General Settings</h4>
                                <div className="form-group">
                                    <label>Playlist Name *</label>
                                    <input
                                        className="input"
                                        value={localPlaylistData.name}
                                        onChange={(e) => handleLocalPropertyChange('name', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        className="input"
                                        style={{ minHeight: '80px', resize: 'none' }}
                                        value={localPlaylistData.description}
                                        onChange={(e) => handleLocalPropertyChange('description', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Transition Effect</label>
                                    <select className="input"
                                        value={localPlaylistData.transitionEffect}
                                        onChange={(e) => handleLocalPropertyChange('transitionEffect', e.target.value)}>
                                        {TRANSITION_EFFECTS.map(({ value, label }) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <label style={{ margin: 0 }}>Transition Duration</label>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{localPlaylistData.transitionDuration}ms</span>
                                    </div>
                                    <input type="range" className="range-slider" min="100" max="2000" step="100"
                                        value={localPlaylistData.transitionDuration}
                                        onChange={(e) => handleLocalPropertyChange('transitionDuration', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                    <label style={{ margin: 0 }}>Share with organization</label>
                                    <label className="switch">
                                        <input type="checkbox" checked={localPlaylistData.isShared}
                                            onChange={(e) => handleLocalPropertyChange('isShared', e.target.checked)} />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            </div>

                            <div className="panel-card summary-grid">
                                <div className="summary-item">
                                    <span className="summary-val">{playlistItems?.length || 0}</span>
                                    <span className="summary-lbl">Items</span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-val">{calculateTotalDuration(playlistItems)}</span>
                                    <span className="summary-lbl">Duration</span>
                                </div>
                            </div>
                        </div>

                        <div className="items-panel">
                            <div className="panel-header">
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Playlist Items</h3>
                                <button className="btn btn-primary" onClick={() => setIsMediaModalOpen(true)}>
                                    <Plus size={18} /> Add Media
                                </button>
                            </div>
                            <div className="items-list-container">
                                {playlistItems?.map((item, idx) => (
                                    <div className="item-row" key={item.id}>
                                        <GripVertical size={20} className="drag-grip" />
                                        <span className="row-index">{idx + 1}</span>
                                        {item.thumbnail_url ? (
                                            <img
                                                src={`${API_BASE_URL}${item.thumbnail_url}`}
                                                className="row-thumb"
                                                alt=""
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                            />
                                        ) : null}
                                        <div className="row-thumb-placeholder" style={{ display: item.thumbnail_url ? 'none' : 'flex' }}>
                                            {item.content_type === 'template' ? <Layout size={20} /> : <Image size={20} />}
                                        </div>
                                        <div className="row-info">
                                            <p className="row-name" style={{ color: 'var(--text-primary)' }}>{item.content_name || 'Untitled Content'}</p>
                                            <div className="row-type">
                                                {item.content_type === 'template' ? <Layout size={12} /> : <Image size={12} />}
                                                <span>{item.content_type === 'template' ? 'Template' : (item.file_type || 'Media')}</span>
                                            </div>
                                        </div>
                                        <div className="row-duration">
                                            <input
                                                type="number"
                                                className="duration-input"
                                                value={(item.duration_ms || item.duration_seconds * 1000) / 1000}
                                                onChange={(e) => updateItemMutation.mutate({ itemId: item.id, data: { duration: parseInt(e.target.value) * 1000 } })}
                                            />
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>sec</span>
                                        </div>
                                        <div className="row-options" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Play in loop">
                                                <input
                                                    type="checkbox"
                                                    checked={item.play_in_loop !== false} 
                                                    onChange={(e) => updateItemMutation.mutate({
                                                        itemId: item.id,
                                                        data: { play_in_loop: e.target.checked }
                                                    })}
                                                    style={{ width: '16px', height: '16px' }}
                                                />
                                                Loop
                                            </label>
                                        </div>
                                        <div className="row-actions">
                                            <button className="btn-row-action delete" onClick={() => {
                                                if (confirm('Remove this item?')) deleteItemMutation.mutate(item.id);
                                            }}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {(!playlistItems || playlistItems.length === 0) && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                                        <Layout size={64} strokeWidth={1} style={{ marginBottom: '1rem' }} />
                                        <p>No content added to this playlist yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="page-header">
                        <div className="header-title">
                            <h1 style={{ color: 'var(--text-primary)', background: 'none', WebkitTextFillColor: 'initial' }}>Playlists</h1>
                            <p style={{ color: 'var(--text-secondary)' }}>{playlists?.length || 0} active playlists • Manage sequential playback</p>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('[Create Playlist] Button clicked, opening modal');
                                setIsCreatingPlaylist(true);
                            }}
                            type="button"
                        >
                            <Plus size={20} /> Create Playlist
                        </button>
                    </div>

                    <div className="search-container">
                        <input
                            className="input"
                            placeholder="Search by playlist name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingLeft: '2.8rem' }}
                        />
                        <div className="search-icon"><Search size={18} /></div>
                    </div>

                    <div className="playlists-grid">
                        {filteredPlaylists?.map((playlist) => (
                            <div key={playlist.id} className="playlist-card" onClick={() => setSelectedPlaylist(playlist)}>
                                <div className="card-thumbnail-container collage-2">
                                    <img src={playlist.thumbnails?.[0] ? `${API_BASE_URL}${playlist.thumbnails[0]}` : `https://picsum.photos/seed/${playlist.id}1/400/300`} className="thumb-img" alt="" />
                                    <img src={playlist.thumbnails?.[1] ? `${API_BASE_URL}${playlist.thumbnails[1]}` : `https://picsum.photos/seed/${playlist.id}2/400/300`} className="thumb-img" alt="" />
                                    <div className="item-count-badge">{playlist.itemCount || 0} items</div>
                                    <div className="card-actions-overlay" onClick={e => e.stopPropagation()}>
                                        <button className="action-btn-sm" onClick={() => setAssigningPlaylist(playlist.id)} title="Assign to Devices"><Monitor size={16} /></button>
                                        <button className="action-btn-sm" onClick={() => setPreviewPlaylist(playlist)} title="Preview"><Eye size={16} /></button>
                                        <button className="action-btn-sm" onClick={() => {
                                            if (confirm('Delete this playlist permanent?')) deletePlaylistMutation.mutate(playlist.id);
                                        }} title="Delete"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <h3 style={{ color: 'var(--text-primary)' }}>{playlist.name}</h3>
                                    <p style={{ color: 'var(--text-secondary)' }}>{playlist.description || 'Global sequential content for digital signage nodes.'}</p>
                                    <div className="card-footer" style={{ borderTopColor: 'var(--border)' }}>
                                        <div className="footer-tag" style={{ background: 'var(--background)', color: 'var(--text-secondary)' }}><Play size={12} /> {formatDurationSeconds(playlist.totalDuration)}</div>
                                        <div className="footer-tag" style={{ background: 'var(--background)', color: 'var(--text-secondary)' }}>{playlist.transition_effect}</div>
                                        {playlist.is_shared && <div className="footer-tag shared" style={{ background: 'rgba(25, 118, 210, 0.1)', color: 'var(--primary)' }}><Share2 size={12} /> Shared</div>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Modals - Shared between views */}
            {isMediaModalOpen && selectedPlaylist && (
                <div className="modal-overlay" onClick={() => setIsMediaModalOpen(false)}>
                    <div className="modal-content modern-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Select Media Asset</h2>
                            <button className="btn-icon" onClick={() => setIsMediaModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="tab-container">
                            <button className={`tab-btn ${contentTab === 'media' ? 'active' : ''}`} onClick={() => setContentTab('media')}>Assets</button>
                            <button className={`tab-btn ${contentTab === 'templates' ? 'active' : ''}`} onClick={() => setContentTab('templates')}>Templates</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '70vh' }}>
                            <div className="asset-selection-grid">
                                {contentTab === 'media' ? (
                                    mediaAssets?.map(asset => (
                                        <div
                                            key={asset.id}
                                            className="asset-card-select"
                                            onClick={() => addItemMutation.mutate({
                                                playlistId: selectedPlaylist.id,
                                                assetId: asset.id,
                                                duration: asset.fileType === 'video' ? 30 : 10
                                            })}
                                        >
                                            {asset.thumbnailUrl ? (
                                                <img src={`${API_BASE_URL}${asset.thumbnailUrl}`} className="asset-thumb-small" alt="" />
                                            ) : (
                                                <div className="asset-thumb-small" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
                                                    {asset.fileType === 'video' ? <Video size={32} color="var(--border)" /> : <Image size={32} color="var(--border)" />}
                                                </div>
                                            )}
                                            <div className="asset-info-small">
                                                <span className="asset-name-small" style={{ color: 'var(--text-primary)' }}>{asset.originalName}</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{asset.fileType}</span>
                                            </div>
                                            <div className="select-indicator"><Plus size={12} /></div>
                                        </div>
                                    ))
                                ) : (
                                    templates?.map(tpl => (
                                        <div
                                            key={tpl.id}
                                            className="asset-card-select"
                                            onClick={() => addTemplateMutation.mutate({ playlistId: selectedPlaylist.id, templateId: tpl.id, duration: 10 })}
                                        >
                                            <div className="asset-thumb-small" style={{ background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Layout size={40} color="var(--border)" strokeWidth={1.5} />
                                            </div>
                                            <div className="asset-info-small">
                                                <span className="asset-name-small" style={{ color: 'var(--text-primary)' }}>{tpl.name}</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Template</span>
                                            </div>
                                            <div className="select-indicator"><Plus size={12} /></div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isCreatingPlaylist && (
                <div className="modal-overlay" onClick={() => setIsCreatingPlaylist(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create New Playlist</h2>
                            <button className="modal-close" onClick={() => setIsCreatingPlaylist(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Playlist Name *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={newPlaylistName}
                                    onChange={(e) => setNewPlaylistName(e.target.value)}
                                    placeholder="Enter playlist name"
                                    autoFocus
                                />
                            </div>

                            {(user?.role === 'super_admin' || user?.role === 'property_admin') && (
                                <div className="form-group">
                                    <PropertyZoneSelector
                                        selectedPropertyId={selectedPropertyId}
                                        selectedZoneId={selectedZoneId}
                                        onPropertyChange={(propertyId) => {
                                            console.log('[Create Playlist] Property changed:', propertyId);
                                            setSelectedPropertyId(propertyId);
                                        }}
                                        onZoneChange={(zoneId) => {
                                            console.log('[Create Playlist] Zone changed:', zoneId);
                                            setSelectedZoneId(zoneId);
                                        }}
                                        required={user?.role === 'super_admin'}
                                        showZone={user?.role === 'property_admin' || user?.role === 'super_admin'}
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Transition Effect</label>
                                <select
                                    className="input"
                                    value={localPlaylistData.transitionEffect}
                                    onChange={(e) => setLocalPlaylistData({ ...localPlaylistData, transitionEffect: e.target.value })}
                                >
                                    {TRANSITION_EFFECTS.map(({ value, label }) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Transition Duration (ms)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={localPlaylistData.transitionDuration}
                                    onChange={(e) => setLocalPlaylistData({ ...localPlaylistData, transitionDuration: parseInt(e.target.value) || 1000 })}
                                    min="0"
                                    max="5000"
                                    step="100"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setIsCreatingPlaylist(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    console.log('[Create Playlist] Create button clicked', {
                                        newPlaylistName,
                                        selectedPropertyId,
                                        selectedZoneId,
                                        role: user?.role
                                    });

                                    if (!newPlaylistName.trim()) {
                                        alert('Please enter a playlist name');
                                        return;
                                    }

                                    // Validate required fields based on role
                                    if (user?.role === 'super_admin' && !selectedPropertyId) {
                                        alert('Please select a property');
                                        return;
                                    }
                                    if (user?.role === 'property_admin' && !selectedZoneId) {
                                        alert('Please select a zone');
                                        return;
                                    }

                                    createMutation.mutate({
                                        name: newPlaylistName,
                                        transitionEffect: localPlaylistData.transitionEffect,
                                        transitionDuration: localPlaylistData.transitionDuration
                                    });
                                }}
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? 'Creating...' : 'Create Playlist'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {assigningPlaylist && (
                <div className="modal-overlay" onClick={() => setAssigningPlaylist(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', background: 'var(--surface)', color: 'var(--text-primary)' }}>
                        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)' }}>
                            <h2>Assign to Devices</h2>
                            <button className="btn-icon" onClick={() => setAssigningPlaylist(null)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Select devices to play this playlist.</p>
                            <div className="devices-selection-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                                {allDevices?.map(device => {
                                    const isAssigned = assignedDevices?.some(d => d.id === device.id);
                                    return (
                                        <div
                                            key={device.id}
                                            className={`device-selection-card ${isAssigned ? 'assigned' : ''}`}
                                            onClick={() => {
                                                const currentIds = assignedDevices?.map(d => d.id) || [];
                                                const newIds = isAssigned ? currentIds.filter(id => id !== device.id) : [...currentIds, device.id];
                                                assignPlaylistMutation.mutate({ playlistId: assigningPlaylist, deviceIds: newIds });
                                            }}
                                            style={{
                                                padding: '1rem',
                                                border: `1px solid ${isAssigned ? 'var(--primary)' : 'var(--border)'}`,
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                background: isAssigned ? 'rgba(25, 118, 210, 0.05)' : 'transparent',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <div className="device-selection-info">
                                                <h4 style={{ margin: 0, fontSize: '1rem' }}>{device.device_name}</h4>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{device.property_name} • {device.zone_name}</p>
                                            </div>
                                            {isAssigned && <div className="assigned-badge" style={{ background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem' }}>Assigned</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', padding: '1rem' }}>
                            <button className="btn btn-primary" onClick={() => setAssigningPlaylist(null)}>Done</button>
                        </div>
                    </div>
                </div>
            )}

            {previewPlaylist && <PlaylistPreview playlistId={previewPlaylist.id} onClose={() => setPreviewPlaylist(null)} />}
        </div>
    );
}
