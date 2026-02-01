import { useState, useRef } from 'react';
import { X, Monitor, Tablet, Smartphone, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import TemplateRenderer from './TemplateRenderer';
import './TemplateLivePreview.css';

const DEVICE_FRAMES = {
    tv: { name: 'TV (16:9)', width: 1920, height: 1080, icon: Monitor },
    tablet: { name: 'Tablet (4:3)', width: 1024, height: 768, icon: Tablet },
    phone: { name: 'Phone (9:16)', width: 375, height: 667, icon: Smartphone }
};

export default function TemplateLivePreview({ 
    template, 
    zones = [], 
    mediaAssets = [],
    isOpen,
    onClose 
}) {
    const [deviceFrame, setDeviceFrame] = useState('tv');
    const [showFrame, setShowFrame] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const previewRef = useRef(null);

    // Convert mediaAssets array to object map for TemplateRenderer
    const mediaAssetsMap = mediaAssets.reduce((acc, asset) => {
        if (asset && asset.id) {
            acc[asset.id] = asset;
        }
        return acc;
    }, {});

    const handleExport = async () => {
        if (!previewRef.current) return;
        
        setIsExporting(true);
        try {
            const canvas = await html2canvas(previewRef.current, {
                backgroundColor: template.background_color || '#ffffff',
                scale: 2, // Higher quality
                useCORS: true,
                logging: false
            });
            
            // Convert to blob and download
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${template.name || 'template'}-preview.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }
            }, 'image/png');
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export preview image');
        } finally {
            setIsExporting(false);
        }
    };

    if (!isOpen || !template) return null;

    const frame = DEVICE_FRAMES[deviceFrame];
    const maxWidth = 800;
    const maxHeight = 600;
    const scale = showFrame ? Math.min(maxWidth / frame.width, maxHeight / frame.height, 0.8) : Math.min(maxWidth / frame.width, maxHeight / frame.height);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    // Ensure zones are properly formatted
    const formattedZones = (zones || []).map(zone => ({
        ...zone,
        // Ensure required fields exist
        contentType: zone.contentType || zone.content_type || 'media',
        widgetType: zone.widgetType || zone.widget_type,
        widgetConfig: zone.widgetConfig || zone.widget_config || {},
        mediaAssetId: zone.mediaAssetId || zone.media_asset_id,
        isVisible: zone.isVisible !== false,
        zIndex: zone.zIndex || zone.z_index || 0
    }));

    const templateForPreview = {
        ...template,
        zones: formattedZones,
        width: frame.width,
        height: frame.height
    };

    return (
        <div className="template-live-preview-overlay" onClick={onClose}>
            <div className="template-live-preview-modal" onClick={(e) => e.stopPropagation()}>
                <div className="preview-header">
                    <h3>Live Preview</h3>
                    <div className="preview-controls">
                        <select
                            className="input input-sm"
                            value={deviceFrame}
                            onChange={(e) => setDeviceFrame(e.target.value)}
                        >
                            {Object.entries(DEVICE_FRAMES).map(([key, frame]) => (
                                <option key={key} value={key}>{frame.name}</option>
                            ))}
                        </select>
                        <label className="preview-checkbox">
                            <input
                                type="checkbox"
                                checked={showFrame}
                                onChange={(e) => setShowFrame(e.target.checked)}
                            />
                            Show Frame
                        </label>
                        <button 
                            className="btn btn-sm btn-outline" 
                            onClick={handleExport}
                            disabled={isExporting}
                            title="Export as Image"
                        >
                            <Download size={16} />
                            {isExporting ? 'Exporting...' : 'Export'}
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={onClose}>
                            <X size={16} />
                        </button>
                    </div>
                </div>
                <div className="preview-content">
                    <div 
                        className={`preview-container ${showFrame ? 'with-frame' : ''}`}
                        style={{
                            width: showFrame ? frame.width * scale + 40 : frame.width * scale,
                            height: showFrame ? frame.height * scale + 40 : frame.height * scale
                        }}
                    >
                        {showFrame && (
                            <div className="device-frame">
                                <frame.icon size={24} />
                                <span>{frame.name}</span>
                            </div>
                        )}
                        <div 
                            ref={previewRef}
                            className="preview-canvas"
                            style={{
                                width: `${frame.width}px`,
                                height: `${frame.height}px`,
                                transform: `scale(${scale})`,
                                transformOrigin: 'top left',
                                position: 'relative',
                                backgroundColor: template.background_color || '#ffffff'
                            }}
                        >
                            <TemplateRenderer
                                template={templateForPreview}
                                zones={formattedZones}
                                mediaAssets={mediaAssetsMap}
                                duration={0}
                                onComplete={() => {}}
                                apiUrl={apiUrl}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
