import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import './ZoomControls.css';

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2];

export default function ZoomControls({ zoom, onZoomChange, onFitToScreen }) {
    const handleZoomIn = () => {
        const currentIndex = ZOOM_LEVELS.findIndex(z => z >= zoom);
        if (currentIndex < ZOOM_LEVELS.length - 1) {
            onZoomChange(ZOOM_LEVELS[currentIndex + 1]);
        }
    };

    const handleZoomOut = () => {
        const currentIndex = ZOOM_LEVELS.findIndex(z => z >= zoom);
        if (currentIndex > 0) {
            onZoomChange(ZOOM_LEVELS[currentIndex - 1]);
        }
    };

    const handleZoomSelect = (e) => {
        const value = parseFloat(e.target.value);
        onZoomChange(value);
    };

    return (
        <div className="zoom-controls">
            <button
                className="zoom-btn"
                onClick={handleZoomOut}
                disabled={zoom <= ZOOM_LEVELS[0]}
                title="Zoom Out"
            >
                <ZoomOut size={16} />
            </button>

            <select
                className="zoom-select"
                value={zoom}
                onChange={handleZoomSelect}
            >
                {ZOOM_LEVELS.map(level => (
                    <option key={level} value={level}>
                        {Math.round(level * 100)}%
                    </option>
                ))}
            </select>

            <button
                className="zoom-btn"
                onClick={handleZoomIn}
                disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                title="Zoom In"
            >
                <ZoomIn size={16} />
            </button>

            <div className="zoom-divider" />

            <button
                className="zoom-btn fit-screen"
                onClick={onFitToScreen}
                title="Fit to Screen"
            >
                <Maximize2 size={16} />
            </button>
        </div>
    );
}
