import { useState } from 'react';
import { API_BASE_URL } from '../lib/api';
import { X, Image as ImageIcon } from 'lucide-react';
import './BackgroundImagePicker.css';

export default function BackgroundImagePicker({
    value,
    onChange,
    onRemove,
    mediaAssets = []
}) {
    const [isOpen, setIsOpen] = useState(false);

    const imageAssets = mediaAssets.filter(a => a.fileType === 'image');
    const selectedAsset = imageAssets.find(a => a.id === value);
    const apiUrl = API_BASE_URL;

    const handleSelect = (asset) => {
        onChange(asset.id);
        setIsOpen(false);
    };

    if (!isOpen) {
        return (
            <div className="background-image-picker">
                {selectedAsset ? (
                    <div className="background-image-preview">
                        <img
                            src={`${apiUrl}${selectedAsset.url}`}
                            alt="Background"
                            className="preview-thumbnail"
                        />
                        <div className="preview-actions">
                            <button
                                className="btn btn-sm btn-outline"
                                onClick={() => setIsOpen(true)}
                            >
                                Change
                            </button>
                            <button
                                className="btn btn-sm btn-outline"
                                onClick={onRemove}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setIsOpen(true)}
                        disabled={imageAssets.length === 0}
                    >
                        <ImageIcon size={16} />
                        Select Image
                    </button>
                )}
                {imageAssets.length === 0 && (
                    <div className="picker-hint">
                        No images in media library. Upload images first.
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="background-image-picker-modal-overlay" onClick={() => setIsOpen(false)}>
            <div className="background-image-picker-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Select Background Image</h3>
                    <button
                        className="modal-close"
                        onClick={() => setIsOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-content">
                    {imageAssets.length === 0 ? (
                        <div className="empty-state">
                            <ImageIcon size={48} />
                            <p>No images available</p>
                            <p className="hint">Upload images to the media library first</p>
                        </div>
                    ) : (
                        <div className="image-grid">
                            {imageAssets.map(asset => (
                                <div
                                    key={asset.id}
                                    className={`image-item ${selectedAsset?.id === asset.id ? 'selected' : ''}`}
                                    onClick={() => handleSelect(asset)}
                                >
                                    <img
                                        src={`${apiUrl}${asset.url}`}
                                        alt={asset.originalName || 'Image'}
                                        className="image-thumbnail"
                                    />
                                    <div className="image-name">
                                        {asset.originalName || 'Image'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
