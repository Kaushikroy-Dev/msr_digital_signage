import { useQuery } from '@tanstack/react-query';
import { Image as ImageIcon, Video, Search } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './MediaLibraryPanel.css';

function MediaItem({ asset, onAddMedia }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `media-${asset.id}`,
        data: {
            type: 'media',
            asset: asset
        }
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            opacity: isDragging ? 0.5 : 1
        }
        : {};

    const getFileIcon = (fileType) => {
        switch (fileType) {
            case 'image': return <ImageIcon size={20} />;
            case 'video': return <Video size={20} />;
            default: return null;
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`media-item ${isDragging ? 'dragging' : ''}`}
            onClick={(e) => {
                // Click to add media at center of canvas
                if (onAddMedia) {
                    onAddMedia(asset);
                }
            }}
        >
            <div className="media-item-preview">
                {asset.fileType === 'image' ? (
                    <img
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${asset.thumbnailUrl || asset.url}`}
                        alt={asset.originalName}
                    />
                ) : (
                    <div className="media-item-icon">
                        {getFileIcon(asset.fileType)}
                    </div>
                )}
            </div>
            <div className="media-item-name" title={asset.originalName}>
                {asset.originalName}
            </div>
        </div>
    );
}

export default function MediaLibraryPanel({ searchTerm, onSearchChange, onAddMedia }) {
    const { user } = useAuthStore();

    const { data: assets, isLoading } = useQuery({
        queryKey: ['media-assets', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/content/assets', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.assets || [];
        },
        enabled: !!user?.tenantId
    });

    const filteredAssets = assets?.filter(asset =>
        asset.originalName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (asset.fileType === 'image' || asset.fileType === 'video')
    ) || [];

    return (
        <div className="media-library-panel">
            <div className="media-library-search">
                <Search size={16} />
                <input
                    type="text"
                    placeholder="Search media..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="input"
                />
            </div>

            {isLoading ? (
                <div className="media-library-loading">Loading media...</div>
            ) : filteredAssets.length === 0 ? (
                <div className="media-library-empty">
                    {searchTerm ? 'No media found' : 'No media available'}
                </div>
            ) : (
                <div className="media-library-grid">
                    {filteredAssets.map((asset) => (
                        <MediaItem key={asset.id} asset={asset} onAddMedia={onAddMedia} />
                    ))}
                </div>
            )}
        </div>
    );
}
