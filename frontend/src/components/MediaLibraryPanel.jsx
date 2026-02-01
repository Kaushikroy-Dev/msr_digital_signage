import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image as ImageIcon, Video, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './MediaLibraryPanel.css';

// Memoized MediaItem component for performance
const MediaItem = React.memo(({ asset, onAddMedia }) => {
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

    const handleClick = useCallback((e) => {
        if (onAddMedia) {
            onAddMedia(asset);
        }
    }, [asset, onAddMedia]);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`media-item ${isDragging ? 'dragging' : ''}`}
            onClick={handleClick}
        >
            <div className="media-item-preview">
                {asset.fileType === 'image' ? (
                    <img
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${asset.thumbnailUrl || asset.url}`}
                        alt={asset.originalName}
                        loading="lazy"
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
});

MediaItem.displayName = 'MediaItem';

const ITEMS_PER_PAGE = 50;

export default function MediaLibraryPanel({ searchTerm, onSearchChange, onAddMedia }) {
    const { user } = useAuthStore();
    const [currentPage, setCurrentPage] = useState(1);

    const { data: assets, isLoading } = useQuery({
        queryKey: ['media-assets', user?.tenantId],
        queryFn: async () => {
            // Fetch all assets (backend handles pagination internally for now)
            // In production, you might want to implement infinite scroll or fetch all pages
            const response = await api.get('/content/assets', {
                params: { 
                    tenantId: user?.tenantId,
                    limit: 1000 // Fetch more items, but still limit for performance
                    // offset is handled by frontend pagination
                }
            });
            return response.data.assets || [];
        },
        enabled: !!user?.tenantId,
        staleTime: 5 * 60 * 1000 // Cache for 5 minutes
    });

    // Memoize filtered assets
    const filteredAssets = useMemo(() => {
        if (!assets) return [];
        return assets.filter(asset =>
            asset.originalName.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (asset.fileType === 'image' || asset.fileType === 'video')
        );
    }, [assets, searchTerm]);

    // Pagination
    const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
    const paginatedAssets = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAssets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredAssets, currentPage]);

    // Reset to page 1 when search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handlePageChange = useCallback((newPage) => {
        setCurrentPage(newPage);
    }, []);

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
                <>
                    <div className="media-library-grid">
                        {paginatedAssets.map((asset) => (
                            <MediaItem key={asset.id} asset={asset} onAddMedia={onAddMedia} />
                        ))}
                    </div>
                    {totalPages > 1 && (
                        <div className="media-library-pagination">
                            <button
                                className="btn btn-sm btn-outline"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="pagination-info">
                                Page {currentPage} of {totalPages} ({filteredAssets.length} items)
                            </span>
                            <button
                                className="btn btn-sm btn-outline"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
