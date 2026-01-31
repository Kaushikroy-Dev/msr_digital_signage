import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Trash2, GripVertical, Image, Video, Eye, Monitor, X, Edit2, Layout } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import PlaylistPreview from '../components/PlaylistPreview';
import './Playlists.css';

export default function Playlists() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [previewPlaylist, setPreviewPlaylist] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [playlistName, setPlaylistName] = useState('');
    const [transitionEffect, setTransitionEffect] = useState('fade');
    const [assigningPlaylist, setAssigningPlaylist] = useState(null); // playlistId
    const [selectedAssets, setSelectedAssets] = useState(new Set()); // For bulk selection
    const [bulkDuration, setBulkDuration] = useState(5); // Default duration for bulk add
    const [editingItemId, setEditingItemId] = useState(null); // Item being edited
    const [editingDuration, setEditingDuration] = useState(5);
    const [editingPlaylist, setEditingPlaylist] = useState(null); // Playlist being edited
    const [deleteConfirmPlaylist, setDeleteConfirmPlaylist] = useState(null); // Playlist to delete
    const [contentTab, setContentTab] = useState('media'); // 'media' or 'templates'
    const [selectedTemplates, setSelectedTemplates] = useState(new Set()); // For template selection

    // Fetch playlists
    const { data: playlists } = useQuery({
        queryKey: ['playlists', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/schedules/playlists', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.playlists;
        },
        enabled: !!user?.tenantId
    });

    // Fetch media assets for adding to playlist
    const { data: mediaAssets } = useQuery({
        queryKey: ['media-assets', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/content/assets', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.assets;
        },
        enabled: !!user?.tenantId
    });

    // Fetch templates for adding to playlist
    const { data: templates } = useQuery({
        queryKey: ['templates', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/templates/templates', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.templates || [];
        },
        enabled: !!user?.tenantId
    });

    // Create playlist mutation
    const createMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post('/schedules/playlists', {
                ...data,
                tenantId: user.tenantId,
                userId: user.id
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['playlists']);
            setIsCreating(false);
            setPlaylistName('');
        }
    });

    // Update playlist mutation
    const updatePlaylistMutation = useMutation({
        mutationFn: async ({ playlistId, data }) => {
            const response = await api.put(`/schedules/playlists/${playlistId}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['playlists']);
            setEditingPlaylist(null);
        },
        onError: (err) => {
            alert(err.response?.data?.error || 'Failed to update playlist');
        }
    });

    // Delete playlist mutation
    const deletePlaylistMutation = useMutation({
        mutationFn: async (playlistId) => {
            await api.delete(`/schedules/playlists/${playlistId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['playlists']);
            queryClient.invalidateQueries(['schedules']);
            setDeleteConfirmPlaylist(null);
            if (selectedPlaylist?.id === deleteConfirmPlaylist?.id) {
                setSelectedPlaylist(null);
            }
        },
        onError: (err) => {
            alert(err.response?.data?.error || 'Failed to delete playlist');
        }
    });

    // Add item to playlist mutation
    const addItemMutation = useMutation({
        mutationFn: async ({ playlistId, assetId, asset, duration }) => {
            const durationMs = (duration || (asset.fileType === 'video' ? 30 : 5)) * 1000;
            const response = await api.post(`/schedules/playlists/${playlistId}/items`, {
                contentType: 'media',
                contentId: assetId,
                duration: durationMs,
                tenantId: user.tenantId
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['playlist-items']);
            setSelectedAssets(new Set());
        }
    });

    // Add template to playlist mutation
    const addTemplateMutation = useMutation({
        mutationFn: async ({ playlistId, templateId, duration }) => {
            const durationSeconds = duration || 10; // Default 10 seconds for templates
            const response = await api.post(`/schedules/playlists/${playlistId}/items`, {
                contentType: 'template',
                contentId: templateId,
                duration: durationSeconds,
                tenantId: user.tenantId
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['playlist-items']);
            setSelectedTemplates(new Set());
        }
    });

    // Bulk add templates to playlist
    const bulkAddTemplatesMutation = useMutation({
        mutationFn: async ({ playlistId, templateIds, duration }) => {
            const durationSeconds = duration || 10;
            const promises = templateIds.map(templateId => 
                api.post(`/schedules/playlists/${playlistId}/items`, {
                    contentType: 'template',
                    contentId: templateId,
                    duration: durationSeconds,
                    tenantId: user.tenantId
                })
            );
            await Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['playlist-items']);
            setSelectedTemplates(new Set());
            alert(`Added ${selectedTemplates.size} templates to playlist!`);
        }
    });

    // Bulk add items to playlist
    const bulkAddMutation = useMutation({
        mutationFn: async ({ playlistId, assetIds, duration }) => {
            const durationMs = duration * 1000;
            const promises = assetIds.map(assetId => 
                api.post(`/schedules/playlists/${playlistId}/items`, {
                    contentType: 'media',
                    contentId: assetId,
                    duration: durationMs,
                    tenantId: user.tenantId
                })
            );
            await Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['playlist-items']);
            setSelectedAssets(new Set());
            alert(`Added ${selectedAssets.size} items to playlist!`);
        }
    });

    // Update item duration mutation
    const updateItemDurationMutation = useMutation({
        mutationFn: async ({ playlistId, itemId, duration }) => {
            // Need to add this endpoint to backend
            const durationSeconds = duration;
            await api.put(`/schedules/playlists/${playlistId}/items/${itemId}`, {
                duration: durationSeconds
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['playlist-items']);
            setEditingItemId(null);
        }
    });

    // Fetch playlist items when a playlist is selected
    const { data: playlistItems } = useQuery({
        queryKey: ['playlist-items', selectedPlaylist?.id],
        queryFn: async () => {
            const response = await api.get(`/schedules/playlists/${selectedPlaylist.id}/items`, {
                params: { tenantId: user?.tenantId }
            });
            return response.data.items;
        },
        enabled: !!selectedPlaylist?.id && !!user?.tenantId
    });

    // Fetch all devices for assignment
    const { data: allDevices } = useQuery({
        queryKey: ['all-devices', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/devices/devices', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.devices;
        },
        enabled: !!user?.tenantId
    });

    // Fetch assigned devices for a playlist
    const { data: assignedDevices } = useQuery({
        queryKey: ['playlist-devices', assigningPlaylist],
        queryFn: async () => {
            const response = await api.get(`/schedules/playlists/${assigningPlaylist}/devices`);
            return response.data.devices;
        },
        enabled: !!assigningPlaylist
    });

    // Assign playlist to devices mutation
    const assignPlaylistMutation = useMutation({
        mutationFn: async ({ playlistId, deviceIds }) => {
            const response = await api.post(`/schedules/playlists/${playlistId}/assign-devices`, {
                deviceIds
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['playlist-devices']);
            queryClient.invalidateQueries(['schedules']);
            queryClient.invalidateQueries(['playlists']);
            // Don't close modal - let user see the updated assignments
        },
        onError: (err) => {
            alert(err.response?.data?.error || 'Failed to assign playlist to devices');
        }
    });

    // Delete playlist item mutation
    const deleteItemMutation = useMutation({
        mutationFn: async (itemId) => {
            await api.delete(`/schedules/playlists/${selectedPlaylist.id}/items/${itemId}`, {
                params: { tenantId: user.tenantId }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['playlist-items']);
        }
    });

    const handleCreatePlaylist = () => {
        if (!playlistName) {
            alert('Please enter a playlist name');
            return;
        }

        createMutation.mutate({
            name: playlistName,
            description: '',
            transitionEffect,
            transitionDuration: 1000
        });
    };

    return (
        <div className="playlists-page">
            <div className="page-header">
                <div>
                    <h1>Playlists</h1>
                    <p>Create and manage content playlists</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
                    <Plus size={18} />
                    New Playlist
                </button>
            </div>

            {isCreating && (
                <div className="card create-playlist-card">
                    <h2>Create New Playlist</h2>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Playlist Name</label>
                            <input
                                type="text"
                                className="input"
                                value={playlistName}
                                onChange={(e) => setPlaylistName(e.target.value)}
                                placeholder="Enter playlist name"
                            />
                        </div>
                        <div className="form-group">
                            <label>Transition Effect</label>
                            <select
                                className="input"
                                value={transitionEffect}
                                onChange={(e) => setTransitionEffect(e.target.value)}
                            >
                                <option value="fade">Fade</option>
                                <option value="slide">Slide</option>
                                <option value="wipe">Wipe</option>
                                <option value="zoom">Zoom</option>
                                <option value="rotate">Rotate</option>
                                <option value="dissolve">Dissolve</option>
                                <option value="blur">Blur</option>
                                <option value="cut">Cut</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-actions">
                        <button className="btn btn-primary" onClick={handleCreatePlaylist}>
                            Create Playlist
                        </button>
                        <button className="btn btn-outline" onClick={() => setIsCreating(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="playlists-grid">
                {playlists?.map((playlist) => (
                    <div
                        key={playlist.id}
                        className="playlist-card"
                        onClick={() => setSelectedPlaylist(playlist)}
                    >
                        <div className="playlist-icon">
                            <Play size={32} />
                        </div>
                        <h3>{playlist.name}</h3>
                        <p className="playlist-meta">
                            {playlist.transition_effect} · {playlist.transition_duration_ms}ms
                        </p>
                        <div className="playlist-actions">
                            <button
                                className="btn-icon"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setAssigningPlaylist(playlist.id);
                                }}
                                title="Assign to Devices"
                            >
                                <Monitor size={16} />
                            </button>
                            <button
                                className="btn-icon"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPlaylist(playlist);
                                }}
                                title="Edit Playlist"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                className="btn-icon"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewPlaylist(playlist);
                                }}
                                title="Preview Playlist"
                            >
                                <Eye size={16} />
                            </button>
                            <button
                                className="btn-icon"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmPlaylist(playlist);
                                }}
                                title="Delete Playlist"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {editingPlaylist && (
                <div className="modal-overlay" onClick={() => setEditingPlaylist(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Playlist</h2>
                            <button className="btn-icon" onClick={() => setEditingPlaylist(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label>Playlist Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    defaultValue={editingPlaylist.name}
                                    id="edit-playlist-name"
                                    placeholder="Enter playlist name"
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label>Transition Effect</label>
                                <select
                                    className="input"
                                    defaultValue={editingPlaylist.transition_effect}
                                    id="edit-playlist-transition"
                                >
                                    <option value="fade">Fade</option>
                                    <option value="slide">Slide</option>
                                    <option value="wipe">Wipe</option>
                                    <option value="zoom">Zoom</option>
                                    <option value="rotate">Rotate</option>
                                    <option value="dissolve">Dissolve</option>
                                    <option value="blur">Blur</option>
                                    <option value="cut">Cut</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Transition Duration (ms)</label>
                                <input
                                    type="number"
                                    className="input"
                                    defaultValue={editingPlaylist.transition_duration_ms}
                                    id="edit-playlist-duration"
                                    min="100"
                                    max="5000"
                                    step="100"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    const name = document.getElementById('edit-playlist-name').value;
                                    const transitionEffect = document.getElementById('edit-playlist-transition').value;
                                    const transitionDuration = parseInt(document.getElementById('edit-playlist-duration').value) || 1000;
                                    
                                    if (!name.trim()) {
                                        alert('Please enter a playlist name');
                                        return;
                                    }

                                    updatePlaylistMutation.mutate({
                                        playlistId: editingPlaylist.id,
                                        data: {
                                            name: name.trim(),
                                            transitionEffect,
                                            transitionDuration
                                        }
                                    });
                                }}
                                disabled={updatePlaylistMutation.isPending}
                            >
                                {updatePlaylistMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={() => setEditingPlaylist(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirmPlaylist && (
                <div className="modal-overlay" onClick={() => setDeleteConfirmPlaylist(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>Delete Playlist</h2>
                            <button className="btn-icon" onClick={() => setDeleteConfirmPlaylist(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '16px' }}>
                                Are you sure you want to delete <strong>"{deleteConfirmPlaylist.name}"</strong>?
                            </p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                This will also delete all items in this playlist and any schedules using it. This action cannot be undone.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-danger"
                                onClick={() => deletePlaylistMutation.mutate(deleteConfirmPlaylist.id)}
                                disabled={deletePlaylistMutation.isPending}
                                style={{ background: '#ef4444', color: 'white' }}
                            >
                                {deletePlaylistMutation.isPending ? 'Deleting...' : 'Delete Playlist'}
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={() => setDeleteConfirmPlaylist(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {previewPlaylist && (
                <PlaylistPreview
                    playlistId={previewPlaylist.id}
                    onClose={() => setPreviewPlaylist(null)}
                />
            )}

            {assigningPlaylist && (
                <div className="modal-overlay" onClick={() => setAssigningPlaylist(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Assign Playlist to Devices</h2>
                            <button className="btn-icon" onClick={() => setAssigningPlaylist(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                                Select devices to play this playlist. A schedule will be created automatically.
                            </p>
                            <div className="devices-selection-grid">
                                {allDevices?.map((device) => {
                                    const isAssigned = assignedDevices?.some(d => d.id === device.id);
                                    return (
                                        <div
                                            key={device.id}
                                            className={`device-selection-card ${isAssigned ? 'assigned' : ''}`}
                                            onClick={() => {
                                                if (assignPlaylistMutation.isPending) return;
                                                
                                                const currentAssigned = assignedDevices?.map(d => d.id) || [];
                                                const deviceIds = isAssigned
                                                    ? currentAssigned.filter(id => id !== device.id)
                                                    : [...currentAssigned, device.id];
                                                
                                                assignPlaylistMutation.mutate({
                                                    playlistId: assigningPlaylist,
                                                    deviceIds
                                                });
                                            }}
                                        >
                                            <div className="device-selection-info">
                                                <h4>{device.device_name}</h4>
                                                <p>{device.property_name} • {device.zone_name}</p>
                                            </div>
                                            <div className="device-selection-status">
                                                <span className={`status-dot ${device.status}`}></span>
                                                {isAssigned && <span className="assigned-badge">Assigned</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {assignedDevices && assignedDevices.length > 0 && (
                                <div style={{ marginTop: '20px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                    <p style={{ fontWeight: '600', marginBottom: '8px' }}>Currently Assigned ({assignedDevices.length}):</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {assignedDevices.map(device => (
                                            <span key={device.id} style={{ 
                                                padding: '4px 12px', 
                                                background: 'var(--primary)', 
                                                color: 'white', 
                                                borderRadius: '4px',
                                                fontSize: '14px'
                                            }}>
                                                {device.device_name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={() => setAssigningPlaylist(null)}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedPlaylist && (
                <div className="playlist-editor card">
                    <h2>{selectedPlaylist.name}</h2>
                    <div className="editor-layout">
                        <div className="media-library-panel">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                        className={`btn ${contentTab === 'media' ? 'btn-primary' : 'btn-outline'}`}
                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                        onClick={() => {
                                            setContentTab('media');
                                            setSelectedTemplates(new Set());
                                        }}
                                    >
                                        Media
                                    </button>
                                    <button
                                        className={`btn ${contentTab === 'templates' ? 'btn-primary' : 'btn-outline'}`}
                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                        onClick={() => {
                                            setContentTab('templates');
                                            setSelectedAssets(new Set());
                                        }}
                                    >
                                        Templates
                                    </button>
                                </div>
                                {contentTab === 'media' && selectedAssets.size > 0 && (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            {selectedAssets.size} selected
                                        </span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="60"
                                            value={bulkDuration}
                                            onChange={(e) => setBulkDuration(parseInt(e.target.value) || 5)}
                                            style={{ width: '60px', padding: '4px 8px', fontSize: '12px' }}
                                            placeholder="sec"
                                        />
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>sec</span>
                                        <button
                                            className="btn btn-primary"
                                            style={{ padding: '6px 12px', fontSize: '12px' }}
                                            onClick={() => {
                                                bulkAddMutation.mutate({
                                                    playlistId: selectedPlaylist.id,
                                                    assetIds: Array.from(selectedAssets),
                                                    duration: bulkDuration
                                                });
                                            }}
                                            disabled={bulkAddMutation.isPending}
                                        >
                                            Add {selectedAssets.size} Items
                                        </button>
                                        <button
                                            className="btn btn-outline"
                                            style={{ padding: '6px 12px', fontSize: '12px' }}
                                            onClick={() => setSelectedAssets(new Set())}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                )}
                                {contentTab === 'templates' && selectedTemplates.size > 0 && (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            {selectedTemplates.size} selected
                                        </span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="60"
                                            value={bulkDuration}
                                            onChange={(e) => setBulkDuration(parseInt(e.target.value) || 10)}
                                            style={{ width: '60px', padding: '4px 8px', fontSize: '12px' }}
                                            placeholder="sec"
                                        />
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>sec</span>
                                        <button
                                            className="btn btn-primary"
                                            style={{ padding: '6px 12px', fontSize: '12px' }}
                                            onClick={() => {
                                                bulkAddTemplatesMutation.mutate({
                                                    playlistId: selectedPlaylist.id,
                                                    templateIds: Array.from(selectedTemplates),
                                                    duration: bulkDuration
                                                });
                                            }}
                                            disabled={bulkAddTemplatesMutation.isPending}
                                        >
                                            Add {selectedTemplates.size} Templates
                                        </button>
                                        <button
                                            className="btn btn-outline"
                                            style={{ padding: '6px 12px', fontSize: '12px' }}
                                            onClick={() => setSelectedTemplates(new Set())}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                )}
                            </div>
                            {contentTab === 'media' && (
                                <div className="media-items">
                                    {mediaAssets?.map((asset) => {
                                    const isSelected = selectedAssets.has(asset.id);
                                    return (
                                        <div key={asset.id} className={`media-item ${isSelected ? 'selected' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => {
                                                    const newSelected = new Set(selectedAssets);
                                                    if (e.target.checked) {
                                                        newSelected.add(asset.id);
                                                    } else {
                                                        newSelected.delete(asset.id);
                                                    }
                                                    setSelectedAssets(newSelected);
                                                }}
                                                style={{ marginRight: '8px' }}
                                            />
                                            {asset.fileType === 'image' ? (
                                                <Image size={20} />
                                            ) : (
                                                <Video size={20} />
                                            )}
                                            <span>{asset.originalName}</span>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="60"
                                                    defaultValue={asset.fileType === 'video' ? 30 : 5}
                                                    style={{ width: '50px', padding: '4px', fontSize: '12px' }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const duration = parseInt(e.target.value) || 5;
                                                            addItemMutation.mutate({
                                                                playlistId: selectedPlaylist.id,
                                                                assetId: asset.id,
                                                                asset,
                                                                duration
                                                            });
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                    placeholder={asset.fileType === 'video' ? '30' : '5'}
                                                />
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>s</span>
                                                <button
                                                    className="btn-add"
                                                    onClick={() => {
                                                        const duration = asset.fileType === 'video' ? 30 : 5;
                                                        addItemMutation.mutate({
                                                            playlistId: selectedPlaylist.id,
                                                            assetId: asset.id,
                                                            asset,
                                                            duration
                                                        });
                                                    }}
                                                    disabled={addItemMutation.isPending}
                                                    title="Add with default duration"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                </div>
                            )}
                            {contentTab === 'templates' && (
                                <div className="media-items">
                                    {templates?.map((template) => {
                                        const isSelected = selectedTemplates.has(template.id);
                                        return (
                                            <div key={template.id} className={`media-item ${isSelected ? 'selected' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        const newSelected = new Set(selectedTemplates);
                                                        if (e.target.checked) {
                                                            newSelected.add(template.id);
                                                        } else {
                                                            newSelected.delete(template.id);
                                                        }
                                                        setSelectedTemplates(newSelected);
                                                    }}
                                                    style={{ marginRight: '8px' }}
                                                />
                                                <Layout size={20} />
                                                <span>{template.name}</span>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="60"
                                                        defaultValue={10}
                                                        style={{ width: '50px', padding: '4px', fontSize: '12px' }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                const duration = parseInt(e.target.value) || 10;
                                                                addTemplateMutation.mutate({
                                                                    playlistId: selectedPlaylist.id,
                                                                    templateId: template.id,
                                                                    duration
                                                                });
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                        placeholder="10"
                                                    />
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>s</span>
                                                    <button
                                                        className="btn-add"
                                                        onClick={() => {
                                                            addTemplateMutation.mutate({
                                                                playlistId: selectedPlaylist.id,
                                                                templateId: template.id,
                                                                duration: 10
                                                            });
                                                        }}
                                                        disabled={addTemplateMutation.isPending}
                                                        title="Add with default duration"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="playlist-items-panel">
                            <h3>Playlist Items ({playlistItems?.length || 0})</h3>
                            <div className="playlist-items">
                                {playlistItems && playlistItems.length > 0 ? (
                                    playlistItems.map((item, index) => (
                                        <div key={item.id} className="playlist-item">
                                            <GripVertical size={16} className="drag-handle" />
                                            <span className="item-order">{index + 1}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                                {item.content_type === 'template' ? (
                                                    <Layout size={16} style={{ color: 'var(--primary)' }} />
                                                ) : item.file_type === 'image' ? (
                                                    <Image size={16} />
                                                ) : item.file_type === 'video' ? (
                                                    <Video size={16} />
                                                ) : null}
                                                <span className="item-name">{item.content_name || item.name || `Item ${index + 1}`}</span>
                                            </div>
                                            {editingItemId === item.id ? (
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="60"
                                                        value={editingDuration}
                                                        onChange={(e) => setEditingDuration(parseInt(e.target.value) || 5)}
                                                        style={{ width: '50px', padding: '4px', fontSize: '12px' }}
                                                        autoFocus
                                                    />
                                                    <span style={{ fontSize: '11px' }}>s</span>
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => {
                                                            updateItemDurationMutation.mutate({
                                                                playlistId: selectedPlaylist.id,
                                                                itemId: item.id,
                                                                duration: editingDuration
                                                            });
                                                        }}
                                                        title="Save"
                                                        style={{ background: 'var(--primary)', color: 'white' }}
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => setEditingItemId(null)}
                                                        title="Cancel"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span 
                                                        className="item-duration"
                                                        onClick={() => {
                                                            setEditingItemId(item.id);
                                                            setEditingDuration(item.duration_ms / 1000);
                                                        }}
                                                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                        title="Click to edit duration"
                                                    >
                                                        {item.duration_ms / 1000}s
                                                    </span>
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => deleteItemMutation.mutate(item.id)}
                                                        title="Remove"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        <p>No items in playlist. Select images and click + to add media.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
