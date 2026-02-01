import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Clock, Cloud, QrCode, Globe, Type, Image as ImageIcon, Video } from 'lucide-react';
import ResizeHandles from './ResizeHandles';
import './ZoneElement.css';

const WIDGET_ICONS = {
    clock: Clock,
    weather: Cloud,
    qrcode: QrCode,
    webview: Globe,
    text: Type,
    media: ImageIcon
};

const ZoneElement = React.memo(function ZoneElement({
    zone,
    isSelected,
    onSelect,
    onResizeStart,
    onRotate,
    scale = 1,
    canvasWidth,
    canvasHeight
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging
    } = useDraggable({
        id: zone.id,
        disabled: zone.isLocked,
        data: {
            type: 'zone',
            zone: zone
        }
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
        : {};

    const widgetIcon = zone.contentType === 'widget' && WIDGET_ICONS[zone.widgetType]
        ? WIDGET_ICONS[zone.widgetType]
        : null;

    const WidgetIcon = widgetIcon;

    // Render media preview if it's a media zone
    const renderContent = () => {
        if (zone.contentType === 'media' && zone.mediaAsset) {
            if (zone.mediaAsset.fileType === 'image') {
                return (
                    <img
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${zone.mediaAsset.thumbnailUrl || zone.mediaAsset.url}`}
                        alt={zone.mediaAsset.originalName}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: zone.mediaFit || 'cover'
                        }}
                    />
                );
            } else if (zone.mediaAsset.fileType === 'video') {
                return (
                    <div className="zone-video-preview">
                        <Video size={32} />
                        <span>{zone.mediaAsset.originalName}</span>
                    </div>
                );
            }
        }

        if (zone.contentType === 'widget' && WidgetIcon) {
            return (
                <div className="zone-widget-icon">
                    <WidgetIcon size={32} />
                </div>
            );
        }

        if (zone.contentType === 'text') {
            return (
                <div className="zone-text-preview">
                    {zone.textContent || 'Text'}
                </div>
            );
        }

        return (
            <div className="zone-placeholder">
                {zone.name}
            </div>
        );
    };

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                position: 'absolute',
                left: `${zone.x}px`,
                top: `${zone.y}px`,
                width: `${zone.width}px`,
                height: `${zone.height}px`,
                zIndex: zone.zIndex || 0,
                opacity: zone.isVisible !== false ? (zone.opacity !== undefined ? zone.opacity : 1) : 0.3,
                filter: zone.blur ? `blur(${zone.blur}px)` : undefined,
                mixBlendMode: zone.blendMode || 'normal',
                transform: [
                    style.transform,
                    zone.rotation ? `rotate(${zone.rotation}deg)` : null,
                    zone.flipHorizontal ? 'scaleX(-1)' : null,
                    zone.flipVertical ? 'scaleY(-1)' : null
                ].filter(Boolean).join(' ') || undefined,
                transformOrigin: 'center center'
            }}
            className={`zone-element ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${zone.isLocked ? 'locked' : ''}`}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(zone.id);
            }}
            {...(!zone.isLocked ? listeners : {})}
            {...(!zone.isLocked ? attributes : {})}
        >
            {renderContent()}
            {isSelected && !zone.isLocked && (
                <ResizeHandles
                    zone={zone}
                    onResizeStart={onResizeStart}
                    scale={scale}
                />
            )}
            {zone.isLocked && (
                <div className="zone-lock-indicator" title="Locked">
                    🔒
                </div>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    // Only re-render if zone properties actually changed
    return (
        prevProps.zone.id === nextProps.zone.id &&
        prevProps.zone.x === nextProps.zone.x &&
        prevProps.zone.y === nextProps.zone.y &&
        prevProps.zone.width === nextProps.zone.width &&
        prevProps.zone.height === nextProps.zone.height &&
        prevProps.zone.zIndex === nextProps.zone.zIndex &&
        prevProps.zone.isVisible === nextProps.zone.isVisible &&
        prevProps.zone.isLocked === nextProps.zone.isLocked &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.scale === nextProps.scale
    );
});

export default ZoneElement;
