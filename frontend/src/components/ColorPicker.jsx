import { useState, useRef, useEffect } from 'react';
import './ColorPicker.css';

const PRESET_COLORS = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#C0C0C0', '#FFD700',
    '#4B0082', '#FF6347', '#40E0D0', '#EE82EE', '#F5DEB3'
];

export default function ColorPicker({ value, onChange, label, showAlpha = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [hexInput, setHexInput] = useState(value || '#000000');
    const [recentColors, setRecentColors] = useState(() => {
        const saved = localStorage.getItem('recentColors');
        return saved ? JSON.parse(saved) : [];
    });
    const pickerRef = useRef(null);

    useEffect(() => {
        setHexInput(value || '#000000');
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleColorChange = (color) => {
        onChange(color);
        setHexInput(color);

        // Add to recent colors
        const updated = [color, ...recentColors.filter(c => c !== color)].slice(0, 10);
        setRecentColors(updated);
        localStorage.setItem('recentColors', JSON.stringify(updated));
    };

    const handleHexInputChange = (e) => {
        const val = e.target.value;
        setHexInput(val);

        // Validate hex color
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            handleColorChange(val);
        }
    };

    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    };

    const rgbToHex = (r, g, b) => {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    };

    const rgb = hexToRgb(value || '#000000');

    return (
        <div className="color-picker-wrapper" ref={pickerRef}>
            {label && <label className="color-picker-label">{label}</label>}
            <div className="color-picker-trigger" onClick={() => setIsOpen(!isOpen)}>
                <div
                    className="color-preview"
                    style={{ backgroundColor: value || '#000000' }}
                />
                <span className="color-value">{value || '#000000'}</span>
            </div>

            {isOpen && (
                <div className="color-picker-dropdown">
                    <div className="color-picker-section">
                        <label className="section-label">Hex Color</label>
                        <input
                            type="text"
                            className="hex-input"
                            value={hexInput}
                            onChange={handleHexInputChange}
                            placeholder="#000000"
                        />
                    </div>

                    <div className="color-picker-section">
                        <label className="section-label">RGB</label>
                        <div className="rgb-sliders">
                            <div className="slider-group">
                                <label>R</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="255"
                                    value={rgb.r}
                                    onChange={(e) => handleColorChange(rgbToHex(parseInt(e.target.value), rgb.g, rgb.b))}
                                    className="color-slider red-slider"
                                />
                                <span>{rgb.r}</span>
                            </div>
                            <div className="slider-group">
                                <label>G</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="255"
                                    value={rgb.g}
                                    onChange={(e) => handleColorChange(rgbToHex(rgb.r, parseInt(e.target.value), rgb.b))}
                                    className="color-slider green-slider"
                                />
                                <span>{rgb.g}</span>
                            </div>
                            <div className="slider-group">
                                <label>B</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="255"
                                    value={rgb.b}
                                    onChange={(e) => handleColorChange(rgbToHex(rgb.r, rgb.g, parseInt(e.target.value)))}
                                    className="color-slider blue-slider"
                                />
                                <span>{rgb.b}</span>
                            </div>
                        </div>
                    </div>

                    <div className="color-picker-section">
                        <label className="section-label">Preset Colors</label>
                        <div className="color-swatches">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    key={color}
                                    className={`color-swatch ${value === color ? 'active' : ''}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleColorChange(color)}
                                    title={color}
                                />
                            ))}
                        </div>
                    </div>

                    {recentColors.length > 0 && (
                        <div className="color-picker-section">
                            <label className="section-label">Recent Colors</label>
                            <div className="color-swatches">
                                {recentColors.map((color, idx) => (
                                    <button
                                        key={`${color}-${idx}`}
                                        className={`color-swatch ${value === color ? 'active' : ''}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => handleColorChange(color)}
                                        title={color}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
