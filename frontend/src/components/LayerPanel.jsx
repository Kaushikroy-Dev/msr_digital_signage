import { DndContext, closestCenter } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, Lock, Unlock, Trash2, Image as ImageIcon, Clock, Cloud, QrCode, Globe, Type } from 'lucide-react';
import './LayerPanel.css';

const WIDGET_ICONS = {
    clock: Clock,
    weather: Cloud,
    qrcode: QrCode,
    webview: Globe,
    text: Type,
    media: ImageIcon
};

function LayerItem({ zone, isSelected, onSelect, onToggleVisibility, onToggleLock, onDelete, index }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: zone.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    };

    const getIcon = () => {
        if (zone.contentType === 'media') {
            return <ImageIcon size={16} />;
        } else if (zone.contentType === 'widget' && WIDGET_ICONS[zone.widgetType]) {
            const Icon = WIDGET_ICONS[zone.widgetType];
            return <Icon size={16} />;
        } else if (zone.contentType === 'text') {
            return <Type size={16} />;
        }
        return null;
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`layer-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
            onClick={() => onSelect(zone.id)}
        >
            <div className="layer-item-drag-handle" {...attributes} {...listeners}>
                ⋮⋮
            </div>
            <div className="layer-item-icon">
                {getIcon()}
            </div>
            <div className="layer-item-name" title={zone.name}>
                {zone.name}
            </div>
            <div className="layer-item-actions">
                <button
                    className="layer-action-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(zone.id);
                    }}
                    title={zone.isVisible !== false ? 'Hide' : 'Show'}
                >
                    {zone.isVisible !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                    className="layer-action-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleLock(zone.id);
                    }}
                    title={zone.isLocked ? 'Unlock' : 'Lock'}
                >
                    {zone.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
                <button
                    className="layer-action-btn delete"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(zone.id);
                    }}
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}

export default function LayerPanel({ zones, selectedZoneIds, onSelectZone, onZonesChange, onDeleteZone }) {
    const handleToggleVisibility = (zoneId) => {
        onZonesChange(zones.map(z =>
            z.id === zoneId ? { ...z, isVisible: z.isVisible === false ? true : false } : z
        ));
    };

    const handleToggleLock = (zoneId) => {
        onZonesChange(zones.map(z =>
            z.id === zoneId ? { ...z, isLocked: !z.isLocked } : z
        ));
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = zones.findIndex(z => z.id === active.id);
        const newIndex = zones.findIndex(z => z.id === over.id);

        const newZones = [...zones];
        const [moved] = newZones.splice(oldIndex, 1);
        newZones.splice(newIndex, 0, moved);

        // Update z-index based on new order
        const updatedZones = newZones.map((zone, index) => ({
            ...zone,
            zIndex: index
        }));

        onZonesChange(updatedZones);
    };

    // Sort zones by z-index for display
    const sortedZones = [...zones].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    const zoneIds = sortedZones.map(z => z.id);

    return (
        <div className="layer-panel">
            <div className="layer-panel-header">
                <h3>Layers ({zones.length})</h3>
            </div>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={zoneIds} strategy={verticalListSortingStrategy}>
                    <div className="layer-list">
                        {sortedZones.length === 0 ? (
                            <div className="layer-empty">No layers</div>
                        ) : (
                            sortedZones.map((zone, index) => (
                                <LayerItem
                                    key={zone.id}
                                    zone={zone}
                                    isSelected={selectedZoneIds.includes(zone.id)}
                                    onSelect={onSelectZone}
                                    onToggleVisibility={handleToggleVisibility}
                                    onToggleLock={handleToggleLock}
                                    onDelete={onDeleteZone}
                                    index={index}
                                />
                            ))
                        )}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}
