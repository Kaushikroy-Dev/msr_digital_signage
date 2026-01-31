import { X } from 'lucide-react';
import './TemplatePreview.css';

export default function TemplatePreview({ template, zones, onClose }) {
    if (!template) return null;

    return (
        <div className="template-preview-overlay" onClick={onClose}>
            <div className="template-preview-modal" onClick={(e) => e.stopPropagation()}>
                <div className="template-preview-header">
                    <h2>{template.name}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div 
                    className="template-preview-canvas"
                    style={{
                        width: template.width,
                        height: template.height,
                        backgroundColor: template.background_color || '#ffffff',
                        transform: 'scale(0.5)',
                        transformOrigin: 'top left'
                    }}
                >
                    {zones?.map((zone) => (
                        <div
                            key={zone.id}
                            className="preview-zone"
                            style={{
                                position: 'absolute',
                                left: zone.x,
                                top: zone.y,
                                width: zone.width,
                                height: zone.height,
                                zIndex: zone.zIndex || 0
                            }}
                        >
                            {zone.contentType === 'media' && zone.mediaAsset && (
                                <img
                                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${zone.mediaAsset.url}`}
                                    alt={zone.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            )}
                            {zone.contentType === 'widget' && (
                                <div className="preview-widget">{zone.name}</div>
                            )}
                            {zone.contentType === 'text' && (
                                <div className="preview-text">{zone.textContent || 'Text'}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
