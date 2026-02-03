import { useState, useEffect, useCallback, useRef } from 'react';
import { DndContext, useDroppable, DragOverlay, closestCenter } from '@dnd-kit/core';
import { useSensors, useSensor, PointerSensor, MouseSensor } from '@dnd-kit/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Layout as LayoutIcon, Grid, Type, Image as ImageIcon, Clock, Cloud, QrCode, Globe, Undo, Redo, Eye, Maximize2, Timer, Rss, LayoutGrid, Shapes, Twitter, BarChart3, Code, Copy, History, RotateCcw, Share2, Download, Upload, Variable, RefreshCw, BarChart2, Play, ArrowLeft, Search, Edit2, Trash2 } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { snapToGrid, getAlignmentGuides, applySmartSnap } from '../utils/canvasUtils';
import * as alignmentUtils from '../utils/alignmentUtils';
import api, { API_BASE_URL } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import TemplateCanvas from '../components/TemplateCanvas';
import MediaLibraryPanel from '../components/MediaLibraryPanel';
import LayerPanel from '../components/LayerPanel';
import WidgetConfigPanel from '../components/WidgetConfigPanel';
import ColorPicker from '../components/ColorPicker';
import ZoomControls from '../components/ZoomControls';
import PropertiesPanel from '../components/PropertiesPanel';
import CanvasToolbar from '../components/CanvasToolbar';
import BackgroundImagePicker from '../components/BackgroundImagePicker';
import TemplateLivePreview from '../components/TemplateLivePreview';
import TemplateTester from '../components/TemplateTester';
import TemplateAnalytics from '../components/TemplateAnalytics';
import QuickActionMenu from '../components/QuickActionMenu';
import VariableEditor from '../components/VariableEditor';
import DataBindingPanel from '../components/DataBindingPanel';
import TemplateShareModal from '../components/TemplateShareModal';
import ContentShareModal from '../components/ContentShareModal';
import PropertyZoneSelector from '../components/PropertyZoneSelector';
import { debounce } from '../utils/debounce';
import { useTemplateUndoRedo } from '../hooks/useTemplateUndoRedo';
import { validateTemplate } from '../utils/templateValidation';
import './TemplateDesigner.css';

const WIDGETS = [
    { id: 'clock', name: 'Clock', icon: Clock, color: '#1976d2' },
    { id: 'weather', name: 'Weather', icon: Cloud, color: '#00acc1' },
    { id: 'qrcode', name: 'QR Code', icon: QrCode, color: '#7c4dff' },
    { id: 'webview', name: 'Web View', icon: Globe, color: '#43a047' },
    { id: 'text', name: 'Text', icon: Type, color: '#ff9800' },
    { id: 'countdown', name: 'Countdown', icon: Timer, color: '#e91e63' },
    { id: 'rss', name: 'RSS Feed', icon: Rss, color: '#ff5722' },
    { id: 'imagegallery', name: 'Image Gallery', icon: LayoutGrid, color: '#9c27b0' },
    { id: 'shape', name: 'Shape', icon: Shapes, color: '#607d8b' },
    { id: 'socialmedia', name: 'Social Media', icon: Twitter, color: '#1da1f2' },
    { id: 'chart', name: 'Chart', icon: BarChart3, color: '#4caf50' },
    { id: 'html', name: 'HTML', icon: Code, color: '#795548' },
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
    const [selectedPropertyId, setSelectedPropertyId] = useState('');
    const [selectedZoneId, setSelectedZoneId] = useState('');
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
    const [showLivePreview, setShowLivePreview] = useState(false);
    const [showTester, setShowTester] = useState(false);
    const [showSaveAs, setShowSaveAs] = useState(false);
    const [saveAsName, setSaveAsName] = useState('');
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [versionHistoryTemplate, setVersionHistoryTemplate] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedTags, setSelectedTags] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('DESC');
    const [showThumbnailUpload, setShowThumbnailUpload] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [analyticsTemplate, setAnalyticsTemplate] = useState(null);
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [showVariableEditor, setShowVariableEditor] = useState(false);
    const [templateVariables, setTemplateVariables] = useState({});
    const [showDataBindingPanel, setShowDataBindingPanel] = useState(false);
    const [dataBindingZone, setDataBindingZone] = useState(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showPropertyShareModal, setShowPropertyShareModal] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
        if (selectedZoneIds.length === 0) return;

        const selectedZones = zones.filter(z => selectedZoneIds.includes(z.id));
        if (selectedZones.length === 0) return;

        // Deep clone zones to avoid reference issues
        const copiedZones = selectedZones.map(z => ({
            ...z,
            widgetConfig: z.widgetConfig ? { ...z.widgetConfig } : {},
            mediaAsset: z.mediaAsset ? { ...z.mediaAsset } : null
        }));

        setClipboard(copiedZones);

        // Show visual feedback (toast notification)
        if (window.showToast) {
            window.showToast(`Copied ${copiedZones.length} zone(s)`, 'success');
        } else {
            console.log(`Copied ${copiedZones.length} zone(s)`);
        }
    }, [zones, selectedZoneIds]);

    const handlePaste = useCallback((withOffset = true) => {
        if (clipboard.length === 0) {
            if (window.showToast) {
                window.showToast('Clipboard is empty', 'info');
            }
            return;
        }

        const offset = withOffset ? 20 : 0;
        const timestamp = Date.now();

        const newZones = clipboard.map((z, index) => ({
            ...z,
            id: `zone-${timestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            x: z.x + offset,
            y: z.y + offset,
            // Remove mediaAsset reference (will be reloaded if needed)
            mediaAsset: undefined
        }));

        handleZonesChange([...zones, ...newZones]);
        setSelectedZoneIds(newZones.map(z => z.id));

        // Show visual feedback
        if (window.showToast) {
            window.showToast(`Pasted ${newZones.length} zone(s)`, 'success');
        } else {
            console.log(`Pasted ${newZones.length} zone(s)`);
        }
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

    const handleMatchWidth = useCallback(() => {
        const selectedZones = zones.filter(z => selectedZoneIds.includes(z.id));
        const matched = alignmentUtils.matchWidth(selectedZones);
        handleZonesChange(zones.map(z => {
            const matchedZone = matched.find(mz => mz.id === z.id);
            return matchedZone || z;
        }));
    }, [zones, selectedZoneIds, handleZonesChange]);

    const handleMatchHeight = useCallback(() => {
        const selectedZones = zones.filter(z => selectedZoneIds.includes(z.id));
        const matched = alignmentUtils.matchHeight(selectedZones);
        handleZonesChange(zones.map(z => {
            const matchedZone = matched.find(mz => mz.id === z.id);
            return matchedZone || z;
        }));
    }, [zones, selectedZoneIds, handleZonesChange]);

    const handleMatchSize = useCallback(() => {
        const selectedZones = zones.filter(z => selectedZoneIds.includes(z.id));
        const matched = alignmentUtils.matchSize(selectedZones);
        handleZonesChange(zones.map(z => {
            const matchedZone = matched.find(mz => mz.id === z.id);
            return matchedZone || z;
        }));
    }, [zones, selectedZoneIds, handleZonesChange]);

    const handleCenterOnCanvas = useCallback(() => {
        const selectedZones = zones.filter(z => selectedZoneIds.includes(z.id));
        const centered = alignmentUtils.centerOnCanvas(selectedZones, resolution.width, resolution.height);
        handleZonesChange(zones.map(z => {
            const centeredZone = centered.find(cz => cz.id === z.id);
            return centeredZone || z;
        }));
    }, [zones, selectedZoneIds, handleZonesChange, resolution.width, resolution.height]);

    const handleAlignToGrid = useCallback(() => {
        const selectedZones = zones.filter(z => selectedZoneIds.includes(z.id));
        const aligned = alignmentUtils.alignToGrid(selectedZones, 10);
        handleZonesChange(zones.map(z => {
            const alignedZone = aligned.find(az => az.id === z.id);
            return alignedZone || z;
        }));
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

                // Apply smart snap to other zones (if not snapping to grid)
                if (!snapToGridEnabled) {
                    const tempZone = { ...zone, x: newX, y: newY };
                    const snappedZone = applySmartSnap(tempZone, zones.filter(z => z.id !== zone.id), 10);
                    newX = snappedZone.x;
                    newY = snappedZone.y;
                } else {
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

    // Fetch templates with filters
    const { data: templates } = useQuery({
        queryKey: ['templates', user?.tenantId, selectedCategory, selectedTags, searchTerm, sortBy, sortOrder, selectedPropertyId, selectedZoneId],
        queryFn: async () => {
            const params = {
                tenantId: user?.tenantId,
                sortBy,
                sortOrder
            };
            if (selectedCategory !== 'all') {
                params.category = selectedCategory;
            }
            if (selectedTags.length > 0) {
                params.tags = selectedTags;
            }
            if (searchTerm.trim()) {
                params.search = searchTerm.trim();
            }
            if (user?.role === 'super_admin') {
                if (selectedPropertyId) params.propertyId = selectedPropertyId;
                if (selectedZoneId) params.zoneId = selectedZoneId;
            }
            const response = await api.get('/templates', { params });
            return response.data.templates || [];
        },
        enabled: !!user?.tenantId
    });

    // Get all unique tags from templates for filter
    const allTags = templates ? [...new Set(templates.flatMap(t => t.tags || []))] : [];

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
            const response = await api.post('/templates', templateData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['templates']);
            setIsCreating(false);
            resetTemplate();
            alert('Template saved successfully!');
        },
        onError: (error) => {
            console.error('Error saving template:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            const errorMessage = error.response?.data?.details || error.response?.data?.error || error.message;
            alert('Failed to save template: ' + errorMessage);
        }
    });

    // Update template mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, templateData }) => {
            const response = await api.put(`/templates/${id}`, templateData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['templates']);
            setIsEditing(false);
            resetTemplate();
            alert('Template updated successfully!');
        },
        onError: (error) => {
            console.error('Error updating template:', error);
            alert('Failed to update template: ' + (error.response?.data?.error || error.message));
        }
    });

    // Delete template mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/templates/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['templates']);
            alert('Template deleted successfully!');
        },
        onError: (error) => {
            console.error('Error deleting template:', error);
            alert('Failed to delete template: ' + (error.response?.data?.error || error.message));
        }
    });

    const duplicateMutation = useMutation({
        mutationFn: async (templateId) => {
            const response = await api.post(`/templates/${templateId}/duplicate`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['templates', user?.tenantId]);
            alert('Template duplicated successfully!');
        },
        onError: (error) => {
            console.error('Error duplicating template:', error);
            alert('Failed to duplicate template: ' + (error.response?.data?.error || error.message));
        }
    });

    const saveAsMutation = useMutation({
        mutationFn: async ({ templateId, name, description }) => {
            const response = await api.post(`/templates/${templateId}/save-as`, {
                name,
                description
            });
            return response.data;
        },
        onSuccess: (newTemplate) => {
            queryClient.invalidateQueries(['templates', user?.tenantId]);
            setShowSaveAs(false);
            setSaveAsName('');
            handleEditTemplate(newTemplate);
        }
    });

    const { data: templateVersions } = useQuery({
        queryKey: ['template-versions', versionHistoryTemplate?.id],
        queryFn: async () => {
            if (!versionHistoryTemplate) return { versions: [] };
            const response = await api.get(`/templates/${versionHistoryTemplate.id}/versions`);
            return response.data;
        },
        enabled: !!versionHistoryTemplate && showVersionHistory
    });

    const restoreVersionMutation = useMutation({
        mutationFn: async ({ templateId, versionId }) => {
            const response = await api.post(`/templates/${templateId}/versions/${versionId}/restore`);
            return response.data;
        },
        onSuccess: (restoredTemplate) => {
            queryClient.invalidateQueries(['templates', user?.tenantId]);
            queryClient.invalidateQueries(['template-versions', versionHistoryTemplate?.id]);
            handleEditTemplate(restoredTemplate);
            setShowVersionHistory(false);
        }
    });

    const generateThumbnailMutation = useMutation({
        mutationFn: async ({ templateId, thumbnailBlob, propertyId, zoneId }) => {
            const formData = new FormData();
            formData.append('file', thumbnailBlob, `template-${templateId}-thumbnail.png`);
            formData.append('tenantId', user?.tenantId);
            formData.append('userId', user?.id || user?.userId);

            // Add property/zone for super_admin
            if (user?.role === 'super_admin') {
                if (propertyId) {
                    formData.append('propertyId', propertyId);
                }
                if (zoneId) {
                    formData.append('zoneId', zoneId);
                }
            } else if (user?.role === 'property_admin') {
                // Property is auto-assigned, but zone needs to be provided
                if (zoneId) {
                    formData.append('zoneId', zoneId);
                }
            }
            // zone_admin and content_editor will have property/zone auto-assigned by backend

            // Upload to media library
            const uploadResponse = await api.post('/content/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const asset = uploadResponse.data;

            // Update template with thumbnail path
            const updateResponse = await api.put(`/templates/${templateId}`, {
                preview_image_path: asset.url || asset.thumbnailUrl
            });

            return updateResponse.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['templates']);
            alert('Thumbnail generated successfully!');
        },
        onError: (error) => {
            console.error('Error generating thumbnail:', error);
            alert('Failed to generate thumbnail: ' + (error.response?.data?.error || error.message));
        }
    });

    const handleGenerateThumbnail = async () => {
        if (!selectedTemplate) {
            alert('Please select a template first');
            return;
        }

        try {
            // Find the canvas container element
            const canvasElement = document.querySelector('.designer-canvas-container');
            if (!canvasElement) {
                alert('Canvas not found. Please ensure the template is open in the designer.');
                return;
            }

            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(canvasElement, {
                backgroundColor: backgroundColor || '#ffffff',
                scale: 0.5,
                useCORS: true,
                logging: false,
                allowTaint: true,
                width: resolution.width,
                height: resolution.height
            });

            canvas.toBlob((blob) => {
                if (blob) {
                    // Get property/zone from template or current selection
                    const propertyId = selectedTemplate?.property_id || selectedPropertyId;
                    const zoneId = selectedTemplate?.zone_id || selectedZoneId;

                    // Validate property for super_admin
                    if (user?.role === 'super_admin' && !propertyId) {
                        alert('Please select a property before generating thumbnail');
                        return;
                    }

                    generateThumbnailMutation.mutate({
                        templateId: selectedTemplate.id,
                        thumbnailBlob: blob,
                        propertyId: propertyId || undefined,
                        zoneId: zoneId || undefined
                    });
                } else {
                    alert('Failed to generate thumbnail blob');
                }
            }, 'image/png', 0.9);
        } catch (error) {
            console.error('Thumbnail generation failed:', error);
            alert('Failed to generate thumbnail: ' + error.message);
        }
    };

    const resetTemplate = () => {
        setTemplateName('');
        setTemplateDescription('');
        setSelectedPropertyId('');
        setSelectedZoneId('');
        setZones([]);
        setSelectedZoneIds([]);
        setBackgroundColor('#ffffff');
        setBackgroundImageId(null);
        setBackgroundImage(null);
        setSelectedTemplate(null);
        setSidebarCollapsed(false);
    };

    const handleCreateNew = () => {
        setIsCreating(true);
        setIsEditing(false);
        resetTemplate();
        setSidebarCollapsed(false); // Show sidebar by default
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
            setSidebarCollapsed(false); // Show sidebar by default
            setTemplateName(template.name || '');
            setTemplateDescription(template.description || '');
            setSelectedPropertyId(template.property_id || '');
            setSelectedZoneId(template.zone_id || '');
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
                    const apiUrl = API_BASE_URL;
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
        handleZonesChange(zones.map(z => {
            if (z.id === zoneId) {
                // For media zones, config might be the updated zone object itself
                if (z.contentType === 'media' && config.mediaFit !== undefined) {
                    return { ...z, ...config };
                }
                // For widget zones, update widgetConfig
                return { ...z, widgetConfig: config };
            }
            return z;
        }));
    }, [zones, handleZonesChange]);

    const handleExportTemplate = useCallback(async () => {
        if (!selectedTemplate || !isEditing) {
            alert('Please select a template to export.');
            return;
        }

        try {
            const response = await api.get(`/templates/${selectedTemplate.id}/export`);
            const templateData = response.data;

            // Create a blob and download
            const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${templateName || selectedTemplate.name || 'template'}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting template:', error);
            alert('Failed to export template: ' + (error.response?.data?.error || error.message));
        }
    }, [selectedTemplate, isEditing, templateName]);

    const handleImportTemplate = useCallback(async (file) => {
        try {
            const text = await file.text();
            const templateData = JSON.parse(text);

            // Validate the imported template data
            if (!templateData.name || !templateData.width || !templateData.height || !Array.isArray(templateData.zones)) {
                alert('Invalid template file format.');
                return;
            }

            // Create a new template from the imported data
            const importData = {
                name: `${templateData.name} (Imported)`,
                description: templateData.description || '',
                category: templateData.category || 'custom',
                tags: templateData.tags || [],
                width: templateData.width,
                height: templateData.height,
                orientation: templateData.orientation || (templateData.width > templateData.height ? 'landscape' : 'portrait'),
                background_color: templateData.background_color || '#ffffff',
                background_image_id: templateData.background_image_id || null,
                zones: templateData.zones || [],
                variables: templateData.variables || []
            };

            const response = await api.post('/templates/import', {
                ...importData,
                tenantId: user?.tenantId,
                userId: user?.id
            });

            if (response.data) {
                queryClient.invalidateQueries(['templates']);
                alert('Template imported successfully!');
                // Optionally, open the imported template for editing
                handleEditTemplate(response.data);
            }
        } catch (error) {
            console.error('Error importing template:', error);
            alert('Failed to import template: ' + (error.response?.data?.error || error.message));
        }
    }, [user, queryClient]);

    const handleSaveTemplate = () => {
        console.log('=== Save Template Called ===');
        console.log('Template Name:', templateName);
        console.log('Selected Property ID:', selectedPropertyId);
        console.log('Resolution:', resolution);
        console.log('Zones:', zones);
        console.log('Is Editing:', isEditing);
        console.log('Selected Template:', selectedTemplate);

        if (!templateName.trim()) {
            console.error('Validation failed: Template name is empty');
            alert('Please enter a template name');
            return;
        }

        // Validate property selection for super_admin
        if (user?.role === 'super_admin' && !selectedPropertyId) {
            console.error('Validation failed: Property ID is required for super_admin');
            alert('Please select a property for this template');
            return;
        }

        // Validate zone selection for property_admin and content_editor
        if ((user?.role === 'property_admin' || user?.role === 'content_editor') && !selectedZoneId) {
            console.error('Validation failed: Zone ID is required');
            alert('Please select a zone for this template');
            return;
        }

        // Validate template before saving
        const templateForValidation = {
            name: templateName,
            width: resolution.width,
            height: resolution.height
        };

        const validation = validateTemplate(templateForValidation, zones, mediaAssets);
        console.log('Validation result:', validation);

        // Log errors and warnings
        if (validation.errors.length > 0) {
            console.error('Validation errors:', validation.errors);
        }
        if (validation.warnings.length > 0) {
            console.warn('Validation warnings:', validation.warnings);
        }

        // Show errors if any - but allow user to proceed
        if (!validation.isValid) {
            const errorMessages = validation.errors.map(e => e.message).join('\n');
            const warningMessages = validation.warnings.map(w => w.message).join('\n');

            let message = 'Template validation failed:\n\n' + errorMessages;
            if (warningMessages) {
                message += '\n\nWarnings:\n' + warningMessages;
            }

            console.log('Showing confirmation dialog for validation errors');
            const userConfirmed = confirm(message + '\n\nDo you want to save anyway?');
            console.log('User confirmed:', userConfirmed);

            if (!userConfirmed) {
                console.log('User cancelled save due to validation errors');
                return;
            }
        } else if (validation.warnings.length > 0) {
            // If valid but has warnings, just log them and proceed
            console.log('Template has warnings but is valid. Proceeding with save.', validation.warnings);
            // Optionally we could show a non-blocking toast here if a toast system existed
        }

        const templateData = {
            name: templateName,
            description: templateDescription,
            category: selectedCategory !== 'all' ? selectedCategory : 'custom',
            tags: selectedTags,
            width: resolution.width,
            height: resolution.height,
            orientation: resolution.width > resolution.height ? 'landscape' : 'portrait',
            background_color: backgroundColor,
            background_image_id: backgroundImageId || null,
            propertyId: selectedPropertyId || undefined,
            zoneId: selectedZoneId || undefined,
            zones: zones.map(z => ({
                ...z,
                mediaAsset: undefined // Don't send full asset object
            }))
        };

        console.log('Template data to save:', templateData);

        if (isEditing && selectedTemplate) {
            console.log('Calling updateMutation with template ID:', selectedTemplate.id);
            updateMutation.mutate({ id: selectedTemplate.id, templateData });
        } else {
            console.log('Calling createMutation');
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

            // Copy/Paste
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedZoneIds.length > 0) {
                e.preventDefault();
                handleCopy();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.shiftKey) {
                e.preventDefault();
                handlePaste(true); // Paste with offset
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'v' && e.shiftKey) {
                e.preventDefault();
                handlePaste(false); // Paste in place
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedZoneIds.length > 0) {
                e.preventDefault();
                // Duplicate (copy + paste)
                handleCopy();
                setTimeout(() => handlePaste(true), 10);
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
        <div className={isCreating || isEditing ? 'template-designer fullscreen-designer' : 'templates-container'}>
            {(isCreating || isEditing) && (
                <div className="designer-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            className="btn btn-outline back-button"
                            onClick={() => {
                                setIsCreating(false);
                                setIsEditing(false);
                                setSelectedTemplate(null);
                                setSidebarCollapsed(false);
                                resetTemplate();
                            }}
                            title="Back to Templates"
                        >
                            <ArrowLeft size={18} />
                            Back
                        </button>
                        <h1>Template Designer</h1>
                    </div>
                    <div className="designer-actions">
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
                        <button
                            className="btn btn-outline"
                            onClick={() => setShowTester(true)}
                            title="Test Template"
                        >
                            <Eye size={18} />
                            Test
                        </button>
                        <button
                            className="btn btn-outline"
                            onClick={() => setShowLivePreview(true)}
                            title="Preview Template (F11)"
                        >
                            <Maximize2 size={18} />
                            Preview
                        </button>
                        {isEditing && (
                            <button
                                className="btn btn-outline"
                                onClick={() => {
                                    setSaveAsName(selectedTemplate?.name || '');
                                    setShowSaveAs(true);
                                }}
                                title="Save As New Template"
                            >
                                <Copy size={18} />
                                Save As
                            </button>
                        )}
                        <button className="btn btn-primary" onClick={handleSaveTemplate}>
                            <Save size={18} />
                            {isEditing ? 'Update' : 'Save'} Template
                        </button>
                        {isEditing && selectedTemplate && (
                            <>
                                <button
                                    className="btn btn-outline"
                                    onClick={handleGenerateThumbnail}
                                    title="Generate Thumbnail"
                                    disabled={generateThumbnailMutation.isLoading}
                                >
                                    <RefreshCw size={18} />
                                    {generateThumbnailMutation.isLoading ? 'Generating...' : 'Thumbnail'}
                                </button>
                                <button
                                    className="btn btn-outline"
                                    onClick={() => {
                                        setVersionHistoryTemplate(selectedTemplate);
                                        setShowVersionHistory(true);
                                    }}
                                    title="View Version History"
                                >
                                    <History size={18} />
                                    Versions
                                </button>
                                <button
                                    className="btn btn-outline"
                                    onClick={() => {
                                        setAnalyticsTemplate(selectedTemplate);
                                        setShowAnalytics(true);
                                    }}
                                    title="View Analytics"
                                >
                                    <BarChart2 size={18} />
                                    Analytics
                                </button>
                                <button
                                    className="btn btn-outline"
                                    onClick={() => setShowQuickActions(true)}
                                    title="Quick Actions"
                                >
                                    <Play size={18} />
                                    Add to Playlist
                                </button>
                                <button
                                    className="btn btn-outline"
                                    onClick={() => setShowVariableEditor(true)}
                                    title="Manage Variables"
                                >
                                    <Variable size={18} />
                                    Variables
                                </button>
                                <button
                                    className="btn btn-outline"
                                    onClick={() => setShowShareModal(true)}
                                    title="Share Template with Users"
                                >
                                    <Share2 size={18} />
                                    Share
                                </button>
                                {user?.role === 'super_admin' && (
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => setShowPropertyShareModal(true)}
                                        title="Share Template with Properties"
                                    >
                                        <Share2 size={18} />
                                        Share Property
                                    </button>
                                )}
                                <button
                                    className="btn btn-outline"
                                    onClick={handleExportTemplate}
                                    title="Export Template"
                                >
                                    <Download size={18} />
                                    Export
                                </button>
                                <button
                                    className="btn btn-outline"
                                    onClick={() => document.getElementById('import-template-input')?.click()}
                                    title="Import Template"
                                >
                                    <Upload size={18} />
                                    Import
                                </button>
                            </>
                        )}
                        <button className="btn btn-outline" onClick={() => {
                            setIsCreating(false);
                            setIsEditing(false);
                            setSidebarCollapsed(false);
                            resetTemplate();
                        }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {!isCreating && !isEditing ? (
                <div className="templates-listing">
                    <div className="page-header">
                        <div className="header-title">
                            <h1>Template Designer</h1>
                            <p className="subtitle">{templates?.length || 0} templates available • Create dynamic multi-zone layouts</p>
                        </div>
                        <div className="header-actions">
                            <button className="btn-premium" onClick={handleCreateNew}>
                                <Plus size={20} />
                                New Template
                            </button>
                        </div>
                    </div>

                    {user?.role === 'super_admin' && (
                        <div className="filter-card organization-filter">
                            <div className="filter-header">
                                <div className="filter-title">
                                    <Cloud size={18} className="icon-primary" />
                                    <span>Organization Scope</span>
                                </div>
                            </div>
                            <PropertyZoneSelector
                                selectedPropertyId={selectedPropertyId}
                                selectedZoneId={selectedZoneId}
                                onPropertyChange={setSelectedPropertyId}
                                onZoneChange={setSelectedZoneId}
                                required={false}
                            />
                        </div>
                    )}

                    <div className="filter-card main-filters">
                        <div className="filters-grid">
                            <div className="filter-item">
                                <label>Category</label>
                                <div className="select-wrapper">
                                    <select
                                        className="premium-select"
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                    >
                                        <option value="all">All Categories</option>
                                        <option value="retail">Retail</option>
                                        <option value="corporate">Corporate</option>
                                        <option value="education">Education</option>
                                        <option value="events">Events</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>
                            </div>

                            <div className="filter-item search-group">
                                <label>Search</label>
                                <div className="premium-search">
                                    <Search size={18} className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search templates..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="filter-item">
                                <label>Sort By</label>
                                <div className="select-wrapper">
                                    <select
                                        className="premium-select"
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                    >
                                        <option value="created_at">Date Created</option>
                                        <option value="updated_at">Last Updated</option>
                                        <option value="name">Name</option>
                                        <option value="category">Category</option>
                                    </select>
                                </div>
                            </div>

                            <div className="filter-item">
                                <label>Order</label>
                                <div className="select-wrapper">
                                    <select
                                        className="premium-select"
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value)}
                                    >
                                        <option value="DESC">Descending</option>
                                        <option value="ASC">Ascending</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {allTags.length > 0 && (
                            <div className="tags-container">
                                <span className="tags-label">Quick Tags:</span>
                                <div className="tags-list">
                                    {allTags.map(tag => (
                                        <button
                                            key={tag}
                                            className={`tag-toggle ${selectedTags.includes(tag) ? 'active' : ''}`}
                                            onClick={() => {
                                                if (selectedTags.includes(tag)) {
                                                    setSelectedTags(selectedTags.filter(t => t !== tag));
                                                } else {
                                                    setSelectedTags([...selectedTags, tag]);
                                                }
                                            }}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="templates-grid">
                        <div className="template-card create-card" onClick={handleCreateNew}>
                            <div className="create-icon">
                                <Plus size={48} />
                            </div>
                            <h3>Create New Template</h3>
                            <p>Build from a blank canvas</p>
                        </div>

                        {templates?.map((template) => (
                            <div key={template.id} className="template-card">
                                <div className="template-card-preview">
                                    {template.preview_image_path ? (
                                        <img src={template.preview_image_path} alt={template.name} />
                                    ) : (
                                        <div className="preview-placeholder">
                                            <LayoutGrid size={48} opacity={0.3} />
                                        </div>
                                    )}
                                    <div className="card-overlay">
                                        <button className="overlay-btn edit" onClick={() => handleEditTemplate(template)}>
                                            <Edit2 size={18} />
                                        </button>
                                        <button className="overlay-btn copy" onClick={(e) => {
                                            e.stopPropagation();
                                            duplicateMutation.mutate(template.id);
                                        }}>
                                            <Copy size={18} />
                                        </button>
                                        <button className="overlay-btn delete" onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Delete "${template.name}"?`)) deleteMutation.mutate(template.id);
                                        }}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    {template.category && (
                                        <div className="premium-badge">{template.category}</div>
                                    )}
                                </div>
                                <div className="template-card-content">
                                    <h3 className="template-title">{template.name}</h3>
                                    <div className="template-meta">
                                        <span className="res">{template.width}x{template.height}</span>
                                        <span className="dot">•</span>
                                        <span className="date">{new Date(template.updated_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
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
                        <div className={`designer-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                            {!sidebarCollapsed && (
                                <>
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
                                                    {(isCreating || isEditing) && (
                                                        <div className="form-group">
                                                            <PropertyZoneSelector
                                                                selectedPropertyId={selectedPropertyId}
                                                                selectedZoneId={selectedZoneId}
                                                                onPropertyChange={setSelectedPropertyId}
                                                                onZoneChange={setSelectedZoneId}
                                                                required={user?.role === 'super_admin'}
                                                            />
                                                        </div>
                                                    )}
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
                                                    <div className="form-group">
                                                        <label>Background Image</label>
                                                        <BackgroundImagePicker
                                                            value={backgroundImageId}
                                                            onChange={(assetId) => {
                                                                const asset = mediaAssets.find(a => a.id === assetId);
                                                                if (asset) {
                                                                    setBackgroundImageId(assetId);
                                                                    setBackgroundImage({ id: assetId, url: asset.url });
                                                                }
                                                            }}
                                                            onRemove={() => {
                                                                setBackgroundImageId(null);
                                                                setBackgroundImage(null);
                                                            }}
                                                            mediaAssets={mediaAssets}
                                                        />
                                                    </div>
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
                                </>
                            )}
                            <button
                                className="sidebar-toggle"
                                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                            >
                                {sidebarCollapsed ? '▶' : '◀'}
                            </button>
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
                                    onMatchWidth={handleMatchWidth}
                                    onMatchHeight={handleMatchHeight}
                                    onMatchSize={handleMatchSize}
                                    onCenterOnCanvas={handleCenterOnCanvas}
                                    onAlignToGrid={handleAlignToGrid}
                                    canvasWidth={resolution.width}
                                    canvasHeight={resolution.height}
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
                        {selectedZone && selectedZone.contentType === 'widget' && (
                            <WidgetConfigPanel
                                zone={selectedZone}
                                templateId={selectedTemplate?.id}
                                onConfigChange={(config) => {
                                    handleZonesChange(zones.map(z =>
                                        z.id === selectedZone.id
                                            ? { ...z, widgetConfig: config }
                                            : z
                                    ));
                                }}
                                allZones={zones}
                                onDataBindingClick={() => {
                                    setDataBindingZone(selectedZone);
                                    setShowDataBindingPanel(true);
                                }}
                            />
                        )}
                    </div>
                    <TemplateLivePreview
                        template={{
                            name: templateName,
                            width: resolution.width,
                            height: resolution.height,
                            background_color: backgroundColor,
                            background_image_id: backgroundImageId,
                            zones: zones
                        }}
                        zones={zones}
                        mediaAssets={mediaAssets}
                        isOpen={showLivePreview}
                        onClose={() => setShowLivePreview(false)}
                    />
                    <TemplateTester
                        template={{
                            name: templateName,
                            width: resolution.width,
                            height: resolution.height,
                            background_color: backgroundColor,
                            background_image_id: backgroundImageId
                        }}
                        zones={zones}
                        mediaAssets={mediaAssets}
                        isOpen={showTester}
                        onClose={() => setShowTester(false)}
                    />
                    <TemplateAnalytics
                        template={analyticsTemplate}
                        isOpen={showAnalytics}
                        onClose={() => {
                            setShowAnalytics(false);
                            setAnalyticsTemplate(null);
                        }}
                    />
                    <QuickActionMenu
                        template={selectedTemplate}
                        isOpen={showQuickActions}
                        onClose={() => setShowQuickActions(false)}
                    />
                    <VariableEditor
                        templateId={selectedTemplate?.id}
                        variables={templateVariables}
                        isOpen={showVariableEditor}
                        onClose={() => setShowVariableEditor(false)}
                        onSave={(vars) => {
                            setTemplateVariables(vars);
                            // Optionally auto-save to template
                            if (selectedTemplate) {
                                updateMutation.mutate({
                                    id: selectedTemplate.id,
                                    templateData: {
                                        name: templateName,
                                        description: templateDescription,
                                        category: selectedCategory !== 'all' ? selectedCategory : 'custom',
                                        tags: selectedTags,
                                        variables: vars,
                                        width: resolution.width,
                                        height: resolution.height,
                                        orientation: resolution.width > resolution.height ? 'landscape' : 'portrait',
                                        background_color: backgroundColor,
                                        background_image_id: backgroundImageId || null,
                                        propertyId: selectedPropertyId || undefined,
                                        zoneId: selectedZoneId || undefined,
                                        zones: zones.map(z => ({
                                            ...z,
                                            mediaAsset: undefined
                                        }))
                                    }
                                });
                            }
                        }}
                    />
                    <DataBindingPanel
                        zone={dataBindingZone}
                        templateId={selectedTemplate?.id}
                        isOpen={showDataBindingPanel}
                        onClose={() => {
                            setShowDataBindingPanel(false);
                            setDataBindingZone(null);
                        }}
                    />
                    <TemplateShareModal
                        template={selectedTemplate}
                        isOpen={showShareModal}
                        onClose={() => setShowShareModal(false)}
                    />
                    {selectedTemplate && (
                        <ContentShareModal
                            isOpen={showPropertyShareModal}
                            onClose={() => setShowPropertyShareModal(false)}
                            contentId={selectedTemplate.id}
                            contentType="template"
                            currentSharedProperties={selectedTemplate.sharedWithProperties || []}
                        />
                    )}
                    <input
                        id="import-template-input"
                        type="file"
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                handleImportTemplate(file);
                            }
                            e.target.value = ''; // Reset input
                        }}
                    />

                    {/* Save As Modal */}
                    {showSaveAs && (
                        <div className="modal-overlay" onClick={() => setShowSaveAs(false)}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <h3>Save As New Template</h3>
                                <div className="form-group">
                                    <label>Template Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={saveAsName}
                                        onChange={(e) => setSaveAsName(e.target.value)}
                                        placeholder="Enter template name"
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description (Optional)</label>
                                    <textarea
                                        className="input"
                                        value={templateDescription}
                                        onChange={(e) => setTemplateDescription(e.target.value)}
                                        placeholder="Enter description"
                                        rows="3"
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => {
                                            if (saveAsName.trim() && selectedTemplate) {
                                                saveAsMutation.mutate({
                                                    templateId: selectedTemplate.id,
                                                    name: saveAsName.trim(),
                                                    description: templateDescription
                                                });
                                            }
                                        }}
                                        disabled={!saveAsName.trim() || saveAsMutation.isLoading}
                                    >
                                        {saveAsMutation.isLoading ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => {
                                            setShowSaveAs(false);
                                            setSaveAsName('');
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Version History Modal */}
                    {showVersionHistory && versionHistoryTemplate && (
                        <div className="modal-overlay" onClick={() => setShowVersionHistory(false)}>
                            <div className="modal-content version-history-modal" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>Version History: {versionHistoryTemplate.name}</h3>
                                    <button className="close-btn" onClick={() => setShowVersionHistory(false)}>×</button>
                                </div>
                                <div className="version-list">
                                    {templateVersions?.versions?.length > 0 ? (
                                        templateVersions.versions.map((version) => (
                                            <div key={version.id} className="version-item">
                                                <div className="version-info">
                                                    <div className="version-header">
                                                        <span className="version-number">Version {version.version}</span>
                                                        <span className="version-date">
                                                            {new Date(version.created_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    {version.created_by_email && (
                                                        <div className="version-author">By {version.created_by_email}</div>
                                                    )}
                                                </div>
                                                <div className="version-actions">
                                                    <button
                                                        className="btn btn-sm btn-outline"
                                                        onClick={() => {
                                                            if (confirm('Restore this version? Current changes will be saved as a new version.')) {
                                                                restoreVersionMutation.mutate({
                                                                    templateId: versionHistoryTemplate.id,
                                                                    versionId: version.id
                                                                });
                                                            }
                                                        }}
                                                        disabled={restoreVersionMutation.isLoading}
                                                    >
                                                        <RotateCcw size={14} />
                                                        Restore
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="empty-state">No version history available</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

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
