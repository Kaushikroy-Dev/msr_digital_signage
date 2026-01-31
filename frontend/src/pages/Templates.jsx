import { useState, useEffect, useCallback, useRef } from 'react';
import { DndContext, useDroppable, DragOverlay, closestCenter } from '@dnd-kit/core';
import { useSensors, useSensor, PointerSensor, MouseSensor } from '@dnd-kit/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Layout as LayoutIcon, Grid, Type, Image as ImageIcon, Clock, Cloud, QrCode, Globe, Undo, Redo, Eye } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { snapToGrid, getAlignmentGuides } from '../utils/canvasUtils';
import * as alignmentUtils from '../utils/alignmentUtils';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import TemplateCanvas from '../components/TemplateCanvas';
import MediaLibraryPanel from '../components/MediaLibraryPanel';
import LayerPanel from '../components/LayerPanel';
import WidgetConfigPanel from '../components/WidgetConfigPanel';
import ColorPicker from '../components/ColorPicker';
import ZoomControls from '../components/ZoomControls';
import PropertiesPanel from '../components/PropertiesPanel';
import CanvasToolbar from '../components/CanvasToolbar';
import { useTemplateUndoRedo } from '../hooks/useTemplateUndoRedo';
import './TemplateDesigner.css';

const WIDGETS = [
    { id: 'clock', name: 'Clock', icon: Clock, color: '#1976d2' },
    { id: 'weather', name: 'Weather', icon: Cloud, color: '#00acc1' },
    { id: 'qrcode', name: 'QR Code', icon: QrCode, color: '#7c4dff' },
    { id: 'webview', name: 'Web View', icon: Globe, color: '#43a047' },
    { id: 'text', name: 'Text', icon: Type, color: '#ff9800' },
];

const RESOLUTIONS = [
    { name: '1920x1080 (Full HD Landscape)', width: 1920, height: 1080 },
    { name: '1080x1920 (Full HD Portrait)', width: 1080, height: 1920 },
    { name: '3840x2160 (4K Landscape)', width: 3840, height: 2160 },
    { name: '1280x720 (HD)', width: 1280, height: 720 },
];

function DraggableWidget({ widget, onAddWidget }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `widget-${widget.id}`,
        data: {
            type: 'widget',
            widgetType: widget.id
        }
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            opacity: isDragging ? 0.5 : 1
        }
        : {};

    return (
        <button
            ref={setNodeRef}
            style={{ ...style, borderColor: widget.color }}
            {...listeners}
            {...attributes}
            className="widget-btn"
            onClick={(e) => {
                // Click to add widget at center of canvas
                if (onAddWidget) {
                    onAddWidget(widget.id);
                }
            }}
        >
            <widget.icon size={24} style={{ color: widget.color }} />
            <span>{widget.name}</span>
        </button>
    );
}

export default function TemplateDesigner() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');
    const [resolution, setResolution] = useState(RESOLUTIONS[0]);
    const [zones, setZones] = useState([]);
    const [selectedZoneIds, setSelectedZoneIds] = useState([]);
    const [sidebarTab, setSidebarTab] = useState('widgets'); // 'widgets', 'media', 'layers'
    const [showGrid, setShowGrid] = useState(true);
    const [snapToGridEnabled, setSnapToGridEnabled] = useState(false);
    const [scale, setScale] = useState(0.4);
    const [backgroundColor, setBackgroundColor] = useState('#ffffff');
    const [backgroundImageId, setBackgroundImageId] = useState(null);
    const [backgroundImage, setBackgroundImage] = useState(null);
    const [mediaSearchTerm, setMediaSearchTerm] = useState('');
    const [mediaAssets, setMediaAssets] = useState([]);
    const canvasRef = useRef(null);
    const [activeDragId, setActiveDragId] = useState(null);
    const [alignmentGuides, setAlignmentGuides] = useState({ vertical: [], horizontal: [] });
    const isUndoRedoUpdateRef = useRef(false);
    const [clipboard, setClipboard] = useState([]);

    const { currentZones, pushToHistory, undo, redo, canUndo, canRedo } = useTemplateUndoRedo(zones);

    // DndContext setup for workspace-level drag handling
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8
            }
        }),
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 8
            }
        })
    );

    // Track mouse position during drag for accurate drop coordinates
    const dragPositionRef = useRef({ x: 0, y: 0 });

    // Define handlers before handleDragEnd (which depends on them)
    const handleZonesChange = useCallback((newZones) => {
        isUndoRedoUpdateRef.current = false; // This is a manual change, not undo/redo
        setZones(newZones);
        pushToHistory(newZones);
    }, [pushToHistory]);

    const handleSelectZone = useCallback((zoneId) => {
        if (zoneId === null) {
            setSelectedZoneIds([]);
            return;
        }
        setSelectedZoneIds([zoneId]);
    }, []);

    // Clipboard operations
    const handleCut = useCallback(() => {
        const selectedZones = zones.filter(z => selectedZoneIds.includes(z.id));
        setClipboard(selectedZones.map(z => ({ ...z, id: `${z.id}-copy` })));
        handleZonesChange(zones.filter(z => !selectedZoneIds.includes(z.id)));
        setSelectedZoneIds([]);
    }, [zones, selectedZoneIds, handleZonesChange]);

    const handleCopy = useCallback(() => {
        const selectedZones = zones.filter(z => selectedZoneIds.includes(z.id));
        setClipboard(selectedZones.map(z => ({ ...z, id: `${z.id}-copy-${Date.now()}` })));
    }, [zones, selectedZoneIds]);

    const handlePaste = useCallback(() => {
        if (clipboard.length === 0) return;

        const newZones = clipboard.map(z => ({
            ...z,
            id: `zone-${Date.now()}-${Math.random()}`,
            x: z.x + 20,
            y: z.y + 20
        }));

        handleZonesChange([...zones, ...newZones]);
        setSelectedZoneIds(newZones.map(z => z.id));
    }, [clipboard, zones, handleZonesChange]);

    // Alignment operations
    const handleAlignLeft = useCallback(() => {
        const selectedZones = zones.filter(z => selectedZoneIds.includes(z.id));
        const aligned = alignmentUtils.alignLeft(selectedZones);
        handleZonesChange(zones.map(z => {
            const alignedZone = aligned.find(az => az.id === z.id);
            return alignedZone || z;
        }));
    }, [zones, selectedZoneIds, handleZonesChange]);

    const handleAlignCenter = useCallback(() => {
        const selectedZones = zones.filter(z => selectedZoneIds.includes(z.id));
        const aligned = alignmentUtils.alignCenter(selectedZones);
        handleZonesChange(zones.map(z => {
            const alignedZone = aligned.find(az => az.id === z.id);
            return alignedZone || z;
        }));
    }, [zones, selectedZoneIds, handleZonesChange]);

    const handleAlignRight = useCallback(() => {
        const selectedZones = zones.filter(z => selectedZoneIds.includes(z.id));
        const aligned = alignmentUtils.alignRight(selectedZones);
        handleZonesChange(zones.map(z => {
            const alignedZone = aligned.find(az => az.id === z.id);
            return alignedZone || z;
        }));
    }, [zones, selectedZoneIds, handleZonesChange]);

    const handleAlignTop = useCallback(() => {
        const selectedZones = zones.filter(z => selectedZoneIds.includes(z.id));
        const aligned = alignmentUtils.alignTop(selectedZones);
        handleZonesChange(zones.map(z => {
            const alignedZone = aligned.find(az => az.id === z.id);
            return alignedZone || z;
        }));
    }, [zones, selectedZoneIds, handleZonesChange]);

    const handleAlignMiddle = useCallback(() => {
        const selectedZones = zones.filter(z => selectedZoneIds.includes(z.id));
        const aligned = alignmentUtils.alignMiddle(selectedZones);
        handleZonesChange(zones.map(z => {
            const alignedZone = aligned.find(az => az.id === z.id);
            return alignedZone || z;
        }));
    }, [zones, selectedZoneIds, handleZonesChange]);

    const handleAlignBottom = useCallback(() => {
        const selectedZones = zones.filter(z => selectedZoneIds.includes(z.id));
        const aligned = alignmentUtils.alignBottom(selectedZones);
        handleZonesChange(zones.map(z => {
            const alignedZone = aligned.find(az => az.id === z.id);
            return alignedZone || z;
        }));
    }, [zones, selectedZoneIds, handleZonesChange]);

    const handleDistributeHorizontal = useCallback(() => {
        const selectedZones = zones.filter(z => selectedZoneIds.includes(z.id));
        const distributed = alignmentUtils.distributeHorizontally(selectedZones);
        handleZonesChange(zones.map(z => {
            const distributedZone = distributed.find(dz => dz.id === z.id);
            return distributedZone || z;
        }));
    }, [zones, selectedZoneIds, handleZonesChange]);

    const handleDistributeVertical = useCallback(() => {
        const selectedZones = zones.filter(z => selectedZoneIds.includes(z.id));
        const distributed = alignmentUtils.distributeVertically(selectedZones);
        handleZonesChange(zones.map(z => {
            const distributedZone = distributed.find(dz => dz.id === z.id);
            return distributedZone || z;
        }));
    }, [zones, selectedZoneIds, handleZonesChange]);

    const handleBringForward = useCallback(() => {
        handleZonesChange(alignmentUtils.bringForward(zones, selectedZoneIds));
    }, [zones, selectedZoneIds, handleZonesChange]);

    const handleSendBackward = useCallback(() => {
        handleZonesChange(alignmentUtils.sendBackward(zones, selectedZoneIds));
    }, [zones, selectedZoneIds, handleZonesChange]);

    const handleGroup = useCallback(() => {
        handleZonesChange(alignmentUtils.groupZones(zones, selectedZoneIds));
        setSelectedZoneIds([]);
    }, [zones, selectedZoneIds, handleZonesChange]);

    const handleUngroup = useCallback(() => {
        if (selectedZoneIds.length === 1) {
            handleZonesChange(alignmentUtils.ungroupZones(zones, selectedZoneIds[0]));
            setSelectedZoneIds([]);
        }
    }, [zones, selectedZoneIds, handleZonesChange]);

    // Handle click to add widget (alternative to drag-and-drop)
    const handleAddWidget = useCallback((widgetType) => {
        const newZone = {
            id: `zone-${Date.now()}`,
            name: `${widgetType} Zone`,
            x: Math.max(0, (resolution.width / 2) - 150),
            y: Math.max(0, (resolution.height / 2) - 100),
            width: 300,
            height: 200,
            zIndex: zones.length,
            contentType: 'widget',
            widgetType: widgetType,
            widgetConfig: {},
            isLocked: false,
            isVisible: true
        };
        handleZonesChange([...zones, newZone]);
        handleSelectZone(newZone.id);
    }, [zones, resolution, handleZonesChange, handleSelectZone]);

    // Handle click to add media (alternative to drag-and-drop)
    const handleAddMedia = useCallback((asset) => {
        const newZone = {
            id: `zone-${Date.now()}`,
            name: asset.originalName,
            x: Math.max(0, (resolution.width / 2) - (asset.width || 400) / 2),
            y: Math.max(0, (resolution.height / 2) - (asset.height || 300) / 2),
            width: asset.width || 400,
            height: asset.height || 300,
            zIndex: zones.length,
            contentType: 'media',
            mediaAssetId: asset.id,
            mediaAsset: asset,
            mediaFit: 'cover',
            isLocked: false,
            isVisible: true
        };
        handleZonesChange([...zones, newZone]);
        handleSelectZone(newZone.id);
    }, [zones, resolution, handleZonesChange, handleSelectZone]);

    // Handle drag end for widgets/media dropped on canvas
    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;

        if (!over || over.id !== 'canvas') {
            setActiveDragId(null);
            setAlignmentGuides({ vertical: [], horizontal: [] });
            return;
        }

        const activeData = active.data.current;

        if (activeData?.type === 'widget') {
            // Create new widget zone at drop position or center
            const canvasElement = document.querySelector('.template-canvas');
            if (canvasElement) {
                const rect = canvasElement.getBoundingClientRect();
                // Use tracked drag position or center of canvas
                const dropX = dragPositionRef.current.x > 0 ? dragPositionRef.current.x - rect.left : rect.width / 2;
                const dropY = dragPositionRef.current.y > 0 ? dragPositionRef.current.y - rect.top : rect.height / 2;

                // Convert screen coordinates to canvas coordinates (accounting for scale)
                const x = (dropX / scale) - 150;
                const y = (dropY / scale) - 100;

                const newZone = {
                    id: `zone-${Date.now()}`,
                    name: `${activeData.widgetType} Zone`,
                    x: snapToGridEnabled ? snapToGrid(Math.max(0, x), 10) : Math.max(0, x),
                    y: snapToGridEnabled ? snapToGrid(Math.max(0, y), 10) : Math.max(0, y),
                    width: 300,
                    height: 200,
                    zIndex: zones.length,
                    contentType: 'widget',
                    widgetType: activeData.widgetType,
                    widgetConfig: {},
                    isLocked: false,
                    isVisible: true
                };

                handleZonesChange([...zones, newZone]);
                handleSelectZone(newZone.id);
            } else {
                // Fallback: add at center
                handleAddWidget(activeData.widgetType);
            }
        } else if (activeData?.type === 'media') {
            // Create new media zone at drop position or center
            const canvasElement = document.querySelector('.template-canvas');
            if (canvasElement) {
                const rect = canvasElement.getBoundingClientRect();
                const asset = activeData.asset;
                // Use tracked drag position or center of canvas
                const dropX = dragPositionRef.current.x > 0 ? dragPositionRef.current.x - rect.left : rect.width / 2;
                const dropY = dragPositionRef.current.y > 0 ? dragPositionRef.current.y - rect.top : rect.height / 2;

                // Convert screen coordinates to canvas coordinates (accounting for scale)
                const x = (dropX / scale) - (asset.width || 400) / 2;
                const y = (dropY / scale) - (asset.height || 300) / 2;

                const newZone = {
                    id: `zone-${Date.now()}`,
                    name: asset.originalName,
                    x: snapToGridEnabled ? snapToGrid(Math.max(0, x), 10) : Math.max(0, x),
                    y: snapToGridEnabled ? snapToGrid(Math.max(0, y), 10) : Math.max(0, y),
                    width: asset.width || 400,
                    height: asset.height || 300,
                    zIndex: zones.length,
                    contentType: 'media',
                    mediaAssetId: asset.id,
                    mediaAsset: asset,
                    mediaFit: 'cover',
                    isLocked: false,
                    isVisible: true
                };

                handleZonesChange([...zones, newZone]);
                handleSelectZone(newZone.id);
            } else {
                // Fallback: add at center
                handleAddMedia(activeData.asset);
            }
        } else if (activeData?.type === 'zone') {
            // Zone was moved
            const zone = zones.find(z => z.id === active.id);
            if (zone) {
                const deltaX = event.delta.x / scale;
                const deltaY = event.delta.y / scale;

                let newX = zone.x + deltaX;
                let newY = zone.y + deltaY;

                if (snapToGridEnabled) {
                    newX = snapToGrid(newX, 10);
                    newY = snapToGrid(newY, 10);
                }

                // Constrain to canvas bounds
                newX = Math.max(0, Math.min(newX, resolution.width - zone.width));
                newY = Math.max(0, Math.min(newY, resolution.height - zone.height));

                const updatedZone = { ...zone, x: newX, y: newY };
                handleZonesChange(zones.map(z => z.id === zone.id ? updatedZone : z));
            }
        }

        setActiveDragId(null);
        setAlignmentGuides({ vertical: [], horizontal: [] });
        dragPositionRef.current = { x: 0, y: 0 };
    }, [zones, handleZonesChange, handleSelectZone, scale, snapToGridEnabled, resolution, handleAddWidget, handleAddMedia]);

    const handleDragStart = useCallback((event) => {
        setActiveDragId(event.active.id);
        // Track initial mouse position
        if (event.activatorEvent) {
            dragPositionRef.current = { x: event.activatorEvent.clientX, y: event.activatorEvent.clientY };
        }

        // Track mouse movement during drag
        const handleMouseMove = (e) => {
            dragPositionRef.current = { x: e.clientX, y: e.clientY };
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', () => {
            document.removeEventListener('mousemove', handleMouseMove);
        }, { once: true });
    }, []);

    const handleDragMove = useCallback((event) => {
        // Update drag position for accurate drop coordinates
        if (event.activatorEvent) {
            dragPositionRef.current = { x: event.activatorEvent.clientX, y: event.activatorEvent.clientY };
        }

        if (event.active.data.current?.type === 'zone') {
            const zone = zones.find(z => z.id === event.active.id);
            if (zone) {
                const guides = getAlignmentGuides(
                    {
                        ...zone,
                        x: zone.x + event.delta.x / scale,
                        y: zone.y + event.delta.y / scale
                    },
                    zones.filter(z => z.id !== zone.id)
                );
                setAlignmentGuides(guides);
            }
        }
    }, [zones, scale]);

    // Update zones when undo/redo changes
    useEffect(() => {
        if (currentZones && !isUndoRedoUpdateRef.current) {
            const currentZonesStr = JSON.stringify(currentZones);
            const zonesStr = JSON.stringify(zones);
            if (currentZonesStr !== zonesStr) {
                isUndoRedoUpdateRef.current = true;
                setZones(currentZones);
                // Reset flag after state update
                setTimeout(() => {
                    isUndoRedoUpdateRef.current = false;
                }, 0);
            }
        }
    }, [currentZones]);

    // Fetch templates
    const { data: templates } = useQuery({
        queryKey: ['templates', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/templates/templates', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.templates || [];
        },
        enabled: !!user?.tenantId
    });

    // Fetch media assets
    const { data: assets } = useQuery({
        queryKey: ['media-assets', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/content/assets', {
                params: { tenantId: user?.tenantId }
            });
            const assetsList = response.data.assets || [];
            setMediaAssets(assetsList);
            return assetsList;
        },
        enabled: !!user?.tenantId
    });

    // Load media assets into zones when editing a template
    useEffect(() => {
        if (isEditing && assets && assets.length > 0 && zones.length > 0) {
            let hasChanges = false;
            const updatedZones = zones.map(zone => {
                // If zone has mediaAssetId but no mediaAsset, load it
                if (zone.contentType === 'media' && zone.mediaAssetId && !zone.mediaAsset) {
                    const asset = assets.find(a => a.id === zone.mediaAssetId);
                    if (asset) {
                        hasChanges = true;
                        return { ...zone, mediaAsset: asset };
                    }
                }
                return zone;
            });

            // Only update if something changed
            if (hasChanges) {
                setZones(updatedZones);
            }
        }
    }, [assets, isEditing, zones.length]); // Only depend on assets, isEditing, and zones.length to avoid infinite loop

    // Create template mutation
    const createMutation = useMutation({
        mutationFn: async (templateData) => {
            const response = await api.post('/templates/templates', {
                ...templateData,
                tenantId: user.tenantId,
                userId: user.id
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['templates']);
            setIsCreating(false);
            resetTemplate();
        }
    });

    // Update template mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, templateData }) => {
            const response = await api.put(`/templates/templates/${id}`, templateData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['templates']);
            setIsEditing(false);
            resetTemplate();
        }
    });

    // Delete template mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/templates/templates/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['templates']);
        }
    });

    const resetTemplate = () => {
        setTemplateName('');
        setTemplateDescription('');
        setZones([]);
        setSelectedZoneIds([]);
        setBackgroundColor('#ffffff');
        setBackgroundImageId(null);
        setBackgroundImage(null);
        setSelectedTemplate(null);
    };

    const handleCreateNew = () => {
        setIsCreating(true);
        setIsEditing(false);
        resetTemplate();
    };

    const handleEditTemplate = (template) => {
        if (!template) {
            console.error('Cannot edit: template is null or undefined');
            return;
        }

        try {
            setSelectedTemplate(template);
            setIsEditing(true);
            setIsCreating(false);
            setTemplateName(template.name || '');
            setTemplateDescription(template.description || '');
            setResolution({
                width: template.width || 1920,
                height: template.height || 1080
            });

            // Safely parse zones - they might be a JSON string from the database
            let parsedZones = [];
            try {
                if (template.zones) {
                    if (typeof template.zones === 'string') {
                        parsedZones = JSON.parse(template.zones);
                    } else if (Array.isArray(template.zones)) {
                        parsedZones = template.zones;
                    }
                }
            } catch (parseError) {
                console.error('Error parsing zones:', parseError);
                parsedZones = [];
            }

            // Ensure parsedZones is an array
            if (!Array.isArray(parsedZones)) {
                parsedZones = [];
            }

            setZones(parsedZones);
            setBackgroundColor(template.background_color || '#ffffff');
            setBackgroundImageId(template.background_image_id || null);

            // Load background image if exists
            if (template.background_image_id && assets && assets.length > 0) {
                const bgImage = assets.find(a => a.id === template.background_image_id);
                if (bgImage && bgImage.url) {
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                    setBackgroundImage(`${apiUrl}${bgImage.url}`);
                } else {
                    setBackgroundImage(null);
                }
            } else {
                setBackgroundImage(null);
            }
        } catch (error) {
            console.error('Error loading template:', error);
            alert('Error loading template: ' + (error.message || 'Unknown error'));
        }
    };

    const handleMultiSelect = useCallback((zoneId, isCtrlPressed) => {
        if (isCtrlPressed) {
            setSelectedZoneIds(prev =>
                prev.includes(zoneId)
                    ? prev.filter(id => id !== zoneId)
                    : [...prev, zoneId]
            );
        } else {
            setSelectedZoneIds([zoneId]);
        }
    }, []);

    const handleDeleteZone = useCallback((zoneId) => {
        const newZones = zones.filter(z => z.id !== zoneId);
        handleZonesChange(newZones);
        setSelectedZoneIds(prev => prev.filter(id => id !== zoneId));
    }, [zones, handleZonesChange]);

    const handleWidgetConfigChange = useCallback((zoneId, config) => {
        handleZonesChange(zones.map(z =>
            z.id === zoneId ? { ...z, widgetConfig: config } : z
        ));
    }, [zones, handleZonesChange]);

    const handleSaveTemplate = () => {
        if (!templateName.trim()) {
            alert('Please enter a template name');
            return;
        }

        const templateData = {
            name: templateName,
            description: templateDescription,
            category: 'custom',
            width: resolution.width,
            height: resolution.height,
            orientation: resolution.width > resolution.height ? 'landscape' : 'portrait',
            background_color: backgroundColor,
            background_image_id: backgroundImageId || null,
            zones: zones.map(z => ({
                ...z,
                mediaAsset: undefined // Don't send full asset object
            }))
        };

        if (isEditing && selectedTemplate) {
            updateMutation.mutate({ id: selectedTemplate.id, templateData });
        } else {
            createMutation.mutate(templateData);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // Delete selected zones
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedZoneIds.length > 0) {
                e.preventDefault();
                selectedZoneIds.forEach(id => handleDeleteZone(id));
                setSelectedZoneIds([]);
            }

            // Undo/Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                const newZones = undo();
                if (newZones) setZones(newZones);
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                const newZones = redo();
                if (newZones) setZones(newZones);
            }

            // Copy/Paste (simplified - just copy zone IDs for now)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedZoneIds.length > 0) {
                // Copy logic would go here
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                // Paste logic would go here
            }

            // Arrow keys to move zones
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedZoneIds.length > 0) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;
                const delta = {
                    ArrowUp: { x: 0, y: -step },
                    ArrowDown: { x: 0, y: step },
                    ArrowLeft: { x: -step, y: 0 },
                    ArrowRight: { x: step, y: 0 }
                }[e.key];

                handleZonesChange(zones.map(z =>
                    selectedZoneIds.includes(z.id)
                        ? { ...z, x: Math.max(0, z.x + delta.x), y: Math.max(0, z.y + delta.y) }
                        : z
                ));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedZoneIds, zones, handleZonesChange, handleDeleteZone, undo, redo]);

    // Load media assets into zones
    useEffect(() => {
        if (assets && zones.length > 0) {
            const updatedZones = zones.map(zone => {
                if (zone.contentType === 'media' && zone.mediaAssetId && !zone.mediaAsset) {
                    const asset = assets.find(a => a.id === zone.mediaAssetId);
                    if (asset) {
                        return { ...zone, mediaAsset: asset };
                    }
                }
                return zone;
            });
            if (updatedZones.some((z, i) => z !== zones[i])) {
                setZones(updatedZones);
            }
        }
    }, [assets, zones]);

    const selectedZone = zones.find(z => selectedZoneIds.includes(z.id));

    return (
        <div className="template-designer">
            <div className="designer-header">
                <h1>Template Designer</h1>
                <div className="designer-actions">
                    {isCreating || isEditing ? (
                        <>
                            <button
                                className="btn btn-outline"
                                onClick={() => undo()}
                                disabled={!canUndo}
                                title="Undo (Ctrl+Z)"
                            >
                                <Undo size={18} />
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={() => redo()}
                                disabled={!canRedo}
                                title="Redo (Ctrl+Y)"
                            >
                                <Redo size={18} />
                            </button>
                            <button className="btn btn-primary" onClick={handleSaveTemplate}>
                                <Save size={18} />
                                {isEditing ? 'Update' : 'Save'} Template
                            </button>
                            <button className="btn btn-outline" onClick={() => {
                                setIsCreating(false);
                                setIsEditing(false);
                                resetTemplate();
                            }}>
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button className="btn btn-primary" onClick={handleCreateNew}>
                            <Plus size={18} />
                            New Template
                        </button>
                    )}
                </div>
            </div>

            {!isCreating && !isEditing ? (
                <div className="templates-grid">
                    <div className="template-card new-template" onClick={handleCreateNew}>
                        <Plus size={48} />
                        <h3>Create New Template</h3>
                    </div>
                    {templates?.map((template) => (
                        <div key={template.id} className="template-card">
                            <div className="template-preview">
                                {template.preview_image_path ? (
                                    <img src={template.preview_image_path} alt={template.name} />
                                ) : (
                                    <LayoutIcon size={32} />
                                )}
                            </div>
                            <h3>{template.name}</h3>
                            <p>{template.width}x{template.height}</p>
                            <div className="template-actions">
                                <button className="btn btn-sm" onClick={() => handleEditTemplate(template)}>
                                    Edit
                                </button>
                                <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => {
                                        if (confirm('Delete this template?')) {
                                            deleteMutation.mutate(template.id);
                                        }
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                >
                    <div className="designer-workspace">
                        <div className="designer-sidebar">
                            <div className="sidebar-tabs">
                                <button
                                    className={sidebarTab === 'widgets' ? 'active' : ''}
                                    onClick={() => setSidebarTab('widgets')}
                                >
                                    Widgets
                                </button>
                                <button
                                    className={sidebarTab === 'media' ? 'active' : ''}
                                    onClick={() => setSidebarTab('media')}
                                >
                                    Media
                                </button>
                                <button
                                    className={sidebarTab === 'layers' ? 'active' : ''}
                                    onClick={() => setSidebarTab('layers')}
                                >
                                    Layers
                                </button>
                            </div>

                            <div className="sidebar-content">
                                {sidebarTab === 'widgets' && (
                                    <>
                                        <div className="sidebar-section">
                                            <h3>Template Info</h3>
                                            <div className="form-group">
                                                <label>Template Name</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={templateName}
                                                    onChange={(e) => setTemplateName(e.target.value)}
                                                    placeholder="Enter template name"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Description</label>
                                                <textarea
                                                    className="input"
                                                    value={templateDescription}
                                                    onChange={(e) => setTemplateDescription(e.target.value)}
                                                    placeholder="Template description"
                                                    rows="2"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Resolution</label>
                                                <select
                                                    className="input"
                                                    value={JSON.stringify(resolution)}
                                                    onChange={(e) => setResolution(JSON.parse(e.target.value))}
                                                >
                                                    {RESOLUTIONS.map((res, idx) => (
                                                        <option key={idx} value={JSON.stringify(res)}>
                                                            {res.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <ColorPicker
                                                label="Background Color"
                                                value={backgroundColor}
                                                onChange={setBackgroundColor}
                                            />
                                        </div>

                                        <div className="sidebar-section">
                                            <h3>Widgets</h3>
                                            <div className="widgets-grid">
                                                {WIDGETS.map((widget) => (
                                                    <DraggableWidget
                                                        key={widget.id}
                                                        widget={widget}
                                                        onAddWidget={handleAddWidget}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {sidebarTab === 'media' && (
                                    <MediaLibraryPanel
                                        searchTerm={mediaSearchTerm}
                                        onSearchChange={setMediaSearchTerm}
                                        onAddMedia={handleAddMedia}
                                    />
                                )}

                                {sidebarTab === 'layers' && (
                                    <LayerPanel
                                        zones={zones}
                                        selectedZoneIds={selectedZoneIds}
                                        onSelectZone={handleSelectZone}
                                        onZonesChange={handleZonesChange}
                                        onDeleteZone={handleDeleteZone}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="designer-canvas-container">
                            <div className="canvas-toolbar">
                                <CanvasToolbar
                                    canUndo={canUndo}
                                    canRedo={canRedo}
                                    onUndo={() => {
                                        const newZones = undo();
                                        if (newZones) setZones(newZones);
                                    }}
                                    onRedo={() => {
                                        const newZones = redo();
                                        if (newZones) setZones(newZones);
                                    }}
                                    selectedZones={zones.filter(z => selectedZoneIds.includes(z.id))}
                                    onCut={handleCut}
                                    onCopy={handleCopy}
                                    onPaste={handlePaste}
                                    onGroup={handleGroup}
                                    onUngroup={handleUngroup}
                                    onAlignLeft={handleAlignLeft}
                                    onAlignCenter={handleAlignCenter}
                                    onAlignRight={handleAlignRight}
                                    onAlignTop={handleAlignTop}
                                    onAlignMiddle={handleAlignMiddle}
                                    onAlignBottom={handleAlignBottom}
                                    onDistributeHorizontal={handleDistributeHorizontal}
                                    onDistributeVertical={handleDistributeVertical}
                                    onBringForward={handleBringForward}
                                    onSendBackward={handleSendBackward}
                                />

                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div className="toolbar-control" onClick={() => setShowGrid(!showGrid)}>
                                        <input
                                            type="checkbox"
                                            checked={showGrid}
                                            onChange={(e) => setShowGrid(e.target.checked)}
                                        />
                                        <Grid size={16} />
                                        <span>Show Grid</span>
                                    </div>

                                    <div className="toolbar-control" onClick={() => setSnapToGridEnabled(!snapToGridEnabled)}>
                                        <input
                                            type="checkbox"
                                            checked={snapToGridEnabled}
                                            onChange={(e) => setSnapToGridEnabled(e.target.checked)}
                                        />
                                        <span>Snap to Grid</span>
                                    </div>

                                    <ZoomControls
                                        zoom={scale}
                                        onZoomChange={setScale}
                                        onFitToScreen={() => setScale(0.5)}
                                    />
                                </div>
                            </div>

                            <div className={`canvas-wrapper ${showGrid ? 'show-grid' : ''}`}>
                                <TemplateCanvas
                                    zones={zones}
                                    selectedZoneIds={selectedZoneIds}
                                    onZonesChange={handleZonesChange}
                                    onSelectZone={handleSelectZone}
                                    onMultiSelect={handleMultiSelect}
                                    width={resolution.width}
                                    height={resolution.height}
                                    scale={scale}
                                    showGrid={showGrid}
                                    snapToGridEnabled={snapToGridEnabled}
                                    backgroundColor={backgroundColor}
                                    backgroundImage={backgroundImage}
                                    mediaAssets={mediaAssets}
                                    alignmentGuides={alignmentGuides}
                                />
                            </div>
                        </div>

                        <PropertiesPanel
                            selectedZone={selectedZone}
                            resolution={resolution}
                            onUpdate={(updatedZone) => {
                                handleZonesChange(zones.map(z => z.id === updatedZone.id ? updatedZone : z));
                            }}
                            onClose={() => setSelectedZoneIds([])}
                            onDelete={handleDeleteZone}
                        />
                    </div>
                    <DragOverlay>
                        {activeDragId ? (
                            <div style={{ opacity: 0.5 }}>
                                {zones.find(z => z.id === activeDragId) ? (
                                    <div style={{
                                        width: zones.find(z => z.id === activeDragId).width,
                                        height: zones.find(z => z.id === activeDragId).height,
                                        border: '2px dashed var(--primary)',
                                        background: 'rgba(25, 118, 210, 0.1)'
                                    }}>
                                        {zones.find(z => z.id === activeDragId).name}
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: '20px',
                                        background: 'var(--surface)',
                                        border: '2px dashed var(--primary)',
                                        borderRadius: '8px'
                                    }}>
                                        Dragging...
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}
        </div>
    );
}
