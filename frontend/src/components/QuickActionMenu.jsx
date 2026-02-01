import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Play, Clock, List } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './QuickActionMenu.css';

export default function QuickActionMenu({ template, isOpen, onClose }) {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
    const [duration, setDuration] = useState(10);

    const { data: playlists } = useQuery({
        queryKey: ['playlists', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/schedules/playlists', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.playlists || [];
        },
        enabled: !!user?.tenantId && isOpen
    });

    const addToPlaylistMutation = useMutation({
        mutationFn: async ({ playlistId, templateId, duration }) => {
            const response = await api.post(`/schedules/playlists/${playlistId}/items`, {
                contentType: 'template',
                contentId: templateId,
                duration: duration
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['playlists', user?.tenantId]);
            onClose();
            alert('Template added to playlist successfully!');
        }
    });

    const handleAddToPlaylist = () => {
        if (!selectedPlaylistId || !template) {
            alert('Please select a playlist');
            return;
        }
        addToPlaylistMutation.mutate({
            playlistId: selectedPlaylistId,
            templateId: template.id,
            duration
        });
    };

    if (!isOpen || !template) return null;

    return (
        <div className="quick-action-overlay" onClick={onClose}>
            <div className="quick-action-modal" onClick={(e) => e.stopPropagation()}>
                <div className="quick-action-header">
                    <h3>Quick Actions: {template.name}</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="quick-action-content">
                    <div className="action-section">
                        <h4>
                            <List size={18} />
                            Add to Playlist
                        </h4>
                        <div className="form-group">
                            <label>Select Playlist</label>
                            <select
                                className="input"
                                value={selectedPlaylistId || ''}
                                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                            >
                                <option value="">Choose a playlist...</option>
                                {playlists?.map(playlist => (
                                    <option key={playlist.id} value={playlist.id}>
                                        {playlist.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>
                                <Clock size={16} />
                                Duration (seconds)
                            </label>
                            <input
                                type="number"
                                className="input"
                                min="1"
                                max="3600"
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value))}
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={handleAddToPlaylist}
                            disabled={!selectedPlaylistId || addToPlaylistMutation.isLoading}
                        >
                            <Play size={16} />
                            {addToPlaylistMutation.isLoading ? 'Adding...' : 'Add to Playlist'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
