import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DndContext, useDroppable, DragOverlay, closestCenter } from '@dnd-kit/core';
import { useSensors, useSensor, PointerSensor, MouseSensor } from '@dnd-kit/core';
import ZoneElement from './ZoneElement';
import { calculateResize, snapToGrid, getAlignmentGuides } from '../utils/canvasUtils';
import './TemplateCanvas.css';

function CanvasGrid({ width, height, gridSize, showGrid }) {
    if (!showGrid) return null;

    const lines = [];
    const step = gridSize;

    // Vertical lines
    for (let x = 0; x <= width; x += step) {
        lines.push(
            <line
                key={`v-${x}`}
                x1={x}
                y1={0}
                x2={x}
                y2={height}
                stroke="rgba(0, 0, 0, 0.1)"
                strokeWidth="1"
            />
        );
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += step) {
        lines.push(
            <line
                key={`h-${y}`}
                x1={0}
                y1={y}
                x2={width}
                y2={y}
                stroke="rgba(0, 0, 0, 0.1)"
                strokeWidth="1"
            />
        );
    }

    return (
        <svg className="canvas-grid" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
            {lines}
        </svg>
    );
}

function AlignmentGuides({ guides, width, height }) {
    if (!guides || (guides.vertical.length === 0 && guides.horizontal.length === 0)) {
        return null;
    }

    return (
        <svg className="alignment-guides" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 9999 }}>
            {guides.vertical.map((guide, idx) => (
                <line
                    key={`v-${idx}`}
                    x1={guide.position}
                    y1={0}
                    x2={guide.position}
                    y2={height}
                    stroke="#ff0000"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                />
            ))}
            {guides.horizontal.map((guide, idx) => (
                <line
                    key={`h-${idx}`}
                    x1={0}
                    y1={guide.position}
                    x2={width}
                    y2={guide.position}
                    stroke="#ff0000"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                />
            ))}
        </svg>
    );
}

function DroppableCanvas({ children, width, height, id }) {
    const { setNodeRef } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className="droppable-canvas"
            style={{ width, height, position: 'relative' }}
        >
            {children}
        </div>
    );
}

function TemplateCanvas({
    zones = [],
    selectedZoneIds = [],
    onZonesChange,
    onSelectZone,
    onMultiSelect,
    width,
    height,
    scale = 1,
    showGrid = true,
    gridSize = 10,
    snapToGridEnabled = false,
    backgroundColor = '#ffffff',
    backgroundImage = null,
    mediaAssets = [],
    alignmentGuides = { vertical: [], horizontal: [] }
}) {
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState(null);
    const [resizeStartZone, setResizeStartZone] = useState(null);
    const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
    const canvasRef = useRef(null);

    // Handle resize
    const handleResizeStart = useCallback((e, handle) => {
        e.preventDefault();
        e.stopPropagation();
        const zone = zones.find(z => selectedZoneIds.includes(z.id));
        if (zone) {
            setIsResizing(true);
            setResizeHandle(handle);
            setResizeStartZone(zone);
            setResizeStartPos({ x: e.clientX, y: e.clientY });
        }
    }, [zones, selectedZoneIds]);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e) => {
            if (!resizeStartZone || !resizeHandle) return;

            const deltaX = (e.clientX - resizeStartPos.x) / scale;
            const deltaY = (e.clientY - resizeStartPos.y) / scale;
            const constrainAspectRatio = e.shiftKey;

            const updatedZone = calculateResize(
                resizeStartZone,
                resizeHandle,
                deltaX,
                deltaY,
                constrainAspectRatio
            );

            // Constrain to canvas bounds
            updatedZone.x = Math.max(0, Math.min(updatedZone.x, width - updatedZone.width));
            updatedZone.y = Math.max(0, Math.min(updatedZone.y, height - updatedZone.height));
            updatedZone.width = Math.min(updatedZone.width, width - updatedZone.x);
            updatedZone.height = Math.min(updatedZone.height, height - updatedZone.y);

            if (snapToGridEnabled) {
                updatedZone.x = snapToGrid(updatedZone.x, gridSize);
                updatedZone.y = snapToGrid(updatedZone.y, gridSize);
                updatedZone.width = snapToGrid(updatedZone.width, gridSize);
                updatedZone.height = snapToGrid(updatedZone.height, gridSize);
            }

            onZonesChange(zones.map(z => z.id === resizeStartZone.id ? updatedZone : z));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            setResizeHandle(null);
            setResizeStartZone(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, resizeHandle, resizeStartZone, resizeStartPos, scale, width, height, snapToGridEnabled, gridSize, zones, onZonesChange]);

    // Handle canvas click to deselect
    const handleCanvasClick = useCallback((e) => {
        if (e.target === canvasRef.current || e.target.closest('.droppable-canvas')) {
            onSelectZone(null);
        }
    }, [onSelectZone]);

    const canvasStyle = {
        width: width * scale,
        height: height * scale,
        backgroundColor: backgroundImage ? 'transparent' : backgroundColor,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        transform: `scale(${scale})`,
        transformOrigin: 'top left'
    };

    return (
        <div className="template-canvas-wrapper" onClick={handleCanvasClick}>
            <DroppableCanvas id="canvas" width={width * scale} height={height * scale}>
                <div
                    ref={canvasRef}
                    className="template-canvas"
                    style={canvasStyle}
                >
                    <CanvasGrid width={width} height={height} gridSize={gridSize} showGrid={showGrid} />
                    <AlignmentGuides guides={alignmentGuides} width={width} height={height} />
                    {zones.map((zone) => (
                        <ZoneElement
                            key={zone.id}
                            zone={zone}
                            isSelected={selectedZoneIds.includes(zone.id)}
                            onSelect={onSelectZone}
                            onResizeStart={handleResizeStart}
                            scale={scale}
                            canvasWidth={width}
                            canvasHeight={height}
                        />
                    ))}
                </div>
            </DroppableCanvas>
        </div>
    );
}

export default TemplateCanvas;
