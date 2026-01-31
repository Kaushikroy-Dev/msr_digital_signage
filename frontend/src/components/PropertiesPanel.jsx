import { X } from 'lucide-react';
import ColorPicker from './ColorPicker';
import NumericInput from './NumericInput';
import './PropertiesPanel.css';

export default function PropertiesPanel({
    selectedZone,
    onUpdate,
    onClose,
    onDelete,
    resolution
}) {
    if (!selectedZone) {
        return (
            <div className="properties-panel empty">
                <div className="empty-state">
                    <p>Select a widget to edit its properties</p>
                </div>
            </div>
        );
    }

    const handleChange = (field, value) => {
        onUpdate({ ...selectedZone, [field]: value });
    };

    const handleConfigChange = (field, value) => {
        onUpdate({
            ...selectedZone,
            widgetConfig: {
                ...selectedZone.widgetConfig,
                [field]: value
            }
        });
    };

    return (
        <div className="properties-panel">
            <div className="properties-header">
                <h3>Properties</h3>
                <button className="close-btn" onClick={onClose} title="Deselect">
                    <X size={18} />
                </button>
            </div>

            <div className="properties-content">
                {/* Basic Properties */}
                <div className="property-section">
                    <h4 className="section-title">Basic</h4>

                    <div className="property-group">
                        <label>Name</label>
                        <input
                            type="text"
                            className="property-input"
                            value={selectedZone.name || ''}
                            onChange={(e) => handleChange('name', e.target.value)}
                        />
                    </div>
                </div>

                {/* Position & Size */}
                <div className="property-section">
                    <h4 className="section-title">Position & Size</h4>

                    <div className="property-grid">
                        <NumericInput
                            label="X"
                            value={selectedZone.x}
                            onChange={(val) => handleChange('x', val)}
                            min={0}
                            max={5000}
                            step={1}
                            showSlider={false}
                        />
                        <NumericInput
                            label="Y"
                            value={selectedZone.y}
                            onChange={(val) => handleChange('y', val)}
                            min={0}
                            max={5000}
                            step={1}
                            showSlider={false}
                        />
                    </div>

                    <div className="property-grid">
                        <NumericInput
                            label="Width"
                            value={selectedZone.width}
                            onChange={(val) => handleChange('width', val)}
                            min={10}
                            max={5000}
                            step={1}
                            showSlider={false}
                        />
                        <NumericInput
                            label="Height"
                            value={selectedZone.height}
                            onChange={(val) => handleChange('height', val)}
                            min={10}
                            max={5000}
                            step={1}
                            showSlider={false}
                        />
                    </div>
                </div>

                {/* Widget-specific properties */}
                {selectedZone.contentType === 'widget' && (
                    <div className="property-section">
                        <h4 className="section-title">Widget Settings</h4>

                        {selectedZone.widgetType === 'clock' && (
                            <>
                                <div className="property-group">
                                    <label>Time Format</label>
                                    <select
                                        className="property-input"
                                        value={selectedZone.widgetConfig?.timeFormat || '12'}
                                        onChange={(e) => handleConfigChange('timeFormat', e.target.value)}
                                    >
                                        <option value="12">12 Hour</option>
                                        <option value="24">24 Hour</option>
                                    </select>
                                </div>

                                <div className="property-group">
                                    <label>Show Seconds</label>
                                    <input
                                        type="checkbox"
                                        checked={selectedZone.widgetConfig?.showSeconds || false}
                                        onChange={(e) => handleConfigChange('showSeconds', e.target.checked)}
                                    />
                                </div>

                                <NumericInput
                                    label="Font Size"
                                    value={selectedZone.widgetConfig?.fontSize || 48}
                                    onChange={(val) => handleConfigChange('fontSize', val)}
                                    min={12}
                                    max={200}
                                    step={1}
                                />

                                <ColorPicker
                                    label="Text Color"
                                    value={selectedZone.widgetConfig?.textColor || '#000000'}
                                    onChange={(val) => handleConfigChange('textColor', val)}
                                />

                                <ColorPicker
                                    label="Background Color"
                                    value={selectedZone.widgetConfig?.backgroundColor || '#ffffff'}
                                    onChange={(val) => handleConfigChange('backgroundColor', val)}
                                />
                            </>
                        )}

                        {selectedZone.widgetType === 'weather' && (
                            <>
                                <div className="property-group">
                                    <label>Location</label>
                                    <input
                                        type="text"
                                        className="property-input"
                                        value={selectedZone.widgetConfig?.location || ''}
                                        onChange={(e) => handleConfigChange('location', e.target.value)}
                                        placeholder="City name"
                                    />
                                </div>

                                <div className="property-group">
                                    <label>Temperature Unit</label>
                                    <select
                                        className="property-input"
                                        value={selectedZone.widgetConfig?.unit || 'celsius'}
                                        onChange={(e) => handleConfigChange('unit', e.target.value)}
                                    >
                                        <option value="celsius">Celsius</option>
                                        <option value="fahrenheit">Fahrenheit</option>
                                    </select>
                                </div>

                                <NumericInput
                                    label="Font Size"
                                    value={selectedZone.widgetConfig?.fontSize || 32}
                                    onChange={(val) => handleConfigChange('fontSize', val)}
                                    min={12}
                                    max={200}
                                    step={1}
                                />

                                <ColorPicker
                                    label="Text Color"
                                    value={selectedZone.widgetConfig?.textColor || '#000000'}
                                    onChange={(val) => handleConfigChange('textColor', val)}
                                />
                            </>
                        )}

                        {selectedZone.widgetType === 'text' && (
                            <>
                                <div className="property-group">
                                    <label>Text Content</label>
                                    <textarea
                                        className="property-input"
                                        value={selectedZone.widgetConfig?.text || ''}
                                        onChange={(e) => handleConfigChange('text', e.target.value)}
                                        rows={3}
                                        placeholder="Enter text..."
                                    />
                                </div>

                                <NumericInput
                                    label="Font Size"
                                    value={selectedZone.widgetConfig?.fontSize || 24}
                                    onChange={(val) => handleConfigChange('fontSize', val)}
                                    min={8}
                                    max={200}
                                    step={1}
                                />

                                <ColorPicker
                                    label="Text Color"
                                    value={selectedZone.widgetConfig?.textColor || '#000000'}
                                    onChange={(val) => handleConfigChange('textColor', val)}
                                />

                                <ColorPicker
                                    label="Background Color"
                                    value={selectedZone.widgetConfig?.backgroundColor || 'transparent'}
                                    onChange={(val) => handleConfigChange('backgroundColor', val)}
                                />

                                <div className="property-group">
                                    <label>Text Align</label>
                                    <select
                                        className="property-input"
                                        value={selectedZone.widgetConfig?.textAlign || 'left'}
                                        onChange={(e) => handleConfigChange('textAlign', e.target.value)}
                                    >
                                        <option value="left">Left</option>
                                        <option value="center">Center</option>
                                        <option value="right">Right</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {selectedZone.widgetType === 'qrcode' && (
                            <>
                                <div className="property-group">
                                    <label>QR Code Data</label>
                                    <textarea
                                        className="property-input"
                                        value={selectedZone.widgetConfig?.data || ''}
                                        onChange={(e) => handleConfigChange('data', e.target.value)}
                                        rows={2}
                                        placeholder="URL or text..."
                                    />
                                </div>

                                <ColorPicker
                                    label="Foreground Color"
                                    value={selectedZone.widgetConfig?.fgColor || '#000000'}
                                    onChange={(val) => handleConfigChange('fgColor', val)}
                                />

                                <ColorPicker
                                    label="Background Color"
                                    value={selectedZone.widgetConfig?.bgColor || '#ffffff'}
                                    onChange={(val) => handleConfigChange('bgColor', val)}
                                />
                            </>
                        )}

                        {selectedZone.widgetType === 'webview' && (
                            <>
                                <div className="property-group">
                                    <label>URL</label>
                                    <input
                                        type="url"
                                        className="property-input"
                                        value={selectedZone.widgetConfig?.url || ''}
                                        onChange={(e) => handleConfigChange('url', e.target.value)}
                                        placeholder="https://example.com"
                                    />
                                </div>

                                <div className="property-group">
                                    <label>Refresh Interval (seconds)</label>
                                    <input
                                        type="number"
                                        className="property-input"
                                        value={selectedZone.widgetConfig?.refreshInterval || 0}
                                        onChange={(e) => handleConfigChange('refreshInterval', parseInt(e.target.value))}
                                        min={0}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Media-specific properties */}
                {selectedZone.contentType === 'media' && (
                    <div className="property-section">
                        <h4 className="section-title">Media Settings</h4>

                        <div className="property-group">
                            <label>Object Fit</label>
                            <select
                                className="property-input"
                                value={selectedZone.mediaFit || 'cover'}
                                onChange={(e) => handleChange('mediaFit', e.target.value)}
                            >
                                <option value="cover">Cover</option>
                                <option value="contain">Contain</option>
                                <option value="fill">Fill</option>
                                <option value="none">None</option>
                            </select>
                        </div>

                        <div className="property-group">
                            <button
                                className="fill-canvas-btn"
                                onClick={() => {
                                    // Use actual canvas dimensions from resolution
                                    const canvasWidth = resolution?.width || 1920;
                                    const canvasHeight = resolution?.height || 1080;
                                    onUpdate({
                                        ...selectedZone,
                                        x: 0,
                                        y: 0,
                                        width: canvasWidth,
                                        height: canvasHeight,
                                        mediaFit: 'cover'
                                    });
                                }}
                            >
                                Fill Canvas
                            </button>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="property-section">
                    <button
                        className="delete-zone-btn"
                        onClick={() => onDelete(selectedZone.id)}
                    >
                        Delete Widget
                    </button>
                </div>
            </div>
        </div>
    );
}
