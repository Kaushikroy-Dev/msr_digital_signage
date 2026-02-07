// Alignment utilities for template designer

export function alignLeft(zones) {
    if (zones.length < 2) return zones;
    const minX = Math.min(...zones.map(z => z.x));
    return zones.map(z => ({ ...z, x: minX }));
}

export function alignCenter(zones) {
    if (zones.length < 2) return zones;
    const minX = Math.min(...zones.map(z => z.x));
    const maxX = Math.max(...zones.map(z => z.x + z.width));
    const centerX = (minX + maxX) / 2;
    return zones.map(z => ({ ...z, x: centerX - z.width / 2 }));
}

export function alignRight(zones) {
    if (zones.length < 2) return zones;
    const maxX = Math.max(...zones.map(z => z.x + z.width));
    return zones.map(z => ({ ...z, x: maxX - z.width }));
}

export function alignTop(zones) {
    if (zones.length < 2) return zones;
    const minY = Math.min(...zones.map(z => z.y));
    return zones.map(z => ({ ...z, y: minY }));
}

export function alignMiddle(zones) {
    if (zones.length < 2) return zones;
    const minY = Math.min(...zones.map(z => z.y));
    const maxY = Math.max(...zones.map(z => z.y + z.height));
    const centerY = (minY + maxY) / 2;
    return zones.map(z => ({ ...z, y: centerY - z.height / 2 }));
}

export function alignBottom(zones) {
    if (zones.length < 2) return zones;
    const maxY = Math.max(...zones.map(z => z.y + z.height));
    return zones.map(z => ({ ...z, y: maxY - z.height }));
}

export function distributeHorizontally(zones) {
    if (zones.length < 3) return zones;

    // Sort by x position
    const sorted = [...zones].sort((a, b) => a.x - b.x);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const totalSpace = (last.x + last.width) - first.x;
    const totalWidths = sorted.reduce((sum, z) => sum + z.width, 0);
    const gap = (totalSpace - totalWidths) / (sorted.length - 1);

    let currentX = first.x;
    return sorted.map(zone => {
        const newZone = { ...zone, x: currentX };
        currentX += zone.width + gap;
        return newZone;
    });
}

export function distributeVertically(zones) {
    if (zones.length < 3) return zones;

    // Sort by y position
    const sorted = [...zones].sort((a, b) => a.y - b.y);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const totalSpace = (last.y + last.height) - first.y;
    const totalHeights = sorted.reduce((sum, z) => sum + z.height, 0);
    const gap = (totalSpace - totalHeights) / (sorted.length - 1);

    let currentY = first.y;
    return sorted.map(zone => {
        const newZone = { ...zone, y: currentY };
        currentY += zone.height + gap;
        return newZone;
    });
}

export function bringForward(zones, selectedIds) {
    const maxZIndex = Math.max(...zones.map(z => z.zIndex || 0));
    return zones.map(z => {
        if (selectedIds.includes(z.id)) {
            return { ...z, zIndex: Math.min((z.zIndex || 0) + 1, maxZIndex + 1) };
        }
        return z;
    });
}

export function sendBackward(zones, selectedIds) {
    const minZIndex = Math.min(...zones.map(z => z.zIndex || 0));
    return zones.map(z => {
        if (selectedIds.includes(z.id)) {
            return { ...z, zIndex: Math.max((z.zIndex || 0) - 1, minZIndex - 1) };
        }
        return z;
    });
}

export function bringToFront(zones, selectedIds) {
    const maxZIndex = Math.max(...zones.map(z => z.zIndex || 0));
    return zones.map(z => {
        if (selectedIds.includes(z.id)) {
            return { ...z, zIndex: maxZIndex + 1 };
        }
        return z;
    });
}

export function sendToBack(zones, selectedIds) {
    const minZIndex = Math.min(...zones.map(z => z.zIndex || 0));
    return zones.map(z => {
        if (selectedIds.includes(z.id)) {
            return { ...z, zIndex: minZIndex - 1 };
        }
        return z;
    });
}

export function groupZones(zones, selectedIds) {
    // Create a group object
    const selectedZones = zones.filter(z => selectedIds.includes(z.id));
    if (selectedZones.length < 2) return zones;

    const groupId = `group-${Date.now()}`;
    const minX = Math.min(...selectedZones.map(z => z.x));
    const minY = Math.min(...selectedZones.map(z => z.y));
    const maxX = Math.max(...selectedZones.map(z => z.x + z.width));
    const maxY = Math.max(...selectedZones.map(z => z.y + z.height));

    const group = {
        id: groupId,
        name: 'Group',
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        zIndex: Math.max(...selectedZones.map(z => z.zIndex || 0)),
        contentType: 'group',
        children: selectedIds,
        isLocked: false,
        isVisible: true
    };

    // Remove selected zones and add group
    const remainingZones = zones.filter(z => !selectedIds.includes(z.id));
    return [...remainingZones, group];
}

export function ungroupZones(zones, groupId) {
    const group = zones.find(z => z.id === groupId && z.contentType === 'group');
    if (!group) return zones;

    // This is a simplified version - in a real implementation,
    // you'd need to store the original zones and restore them
    return zones.filter(z => z.id !== groupId);
}

// Advanced alignment functions

/**
 * Match width of selected zones to the widest zone
 */
export function matchWidth(zones) {
    if (zones.length < 2) return zones;
    const maxWidth = Math.max(...zones.map(z => z.width));
    return zones.map(z => ({ ...z, width: maxWidth }));
}

/**
 * Match height of selected zones to the tallest zone
 */
export function matchHeight(zones) {
    if (zones.length < 2) return zones;
    const maxHeight = Math.max(...zones.map(z => z.height));
    return zones.map(z => ({ ...z, height: maxHeight }));
}

/**
 * Match both width and height
 */
export function matchSize(zones) {
    if (zones.length < 2) return zones;
    const maxWidth = Math.max(...zones.map(z => z.width));
    const maxHeight = Math.max(...zones.map(z => z.height));
    return zones.map(z => ({ ...z, width: maxWidth, height: maxHeight }));
}

/**
 * Center selected zones on canvas
 */
export function centerOnCanvas(zones, canvasWidth, canvasHeight) {
    if (zones.length === 0) return zones;
    
    // Calculate bounding box of all selected zones
    const minX = Math.min(...zones.map(z => z.x));
    const minY = Math.min(...zones.map(z => z.y));
    const maxX = Math.max(...zones.map(z => z.x + z.width));
    const maxY = Math.max(...zones.map(z => z.y + z.height));
    
    const groupWidth = maxX - minX;
    const groupHeight = maxY - minY;
    
    // Calculate center position
    const centerX = (canvasWidth - groupWidth) / 2;
    const centerY = (canvasHeight - groupHeight) / 2;
    
    // Calculate offset
    const offsetX = centerX - minX;
    const offsetY = centerY - minY;
    
    return zones.map(z => ({
        ...z,
        x: z.x + offsetX,
        y: z.y + offsetY
    }));
}

/**
 * Align zones to grid
 */
export function alignToGrid(zones, gridSize = 10) {
    return zones.map(z => ({
        ...z,
        x: Math.round(z.x / gridSize) * gridSize,
        y: Math.round(z.y / gridSize) * gridSize,
        width: Math.round(z.width / gridSize) * gridSize,
        height: Math.round(z.height / gridSize) * gridSize
    }));
}

/**
 * Get smart snap position based on other zones
 */
export function getSmartSnapPosition(zone, allZones, threshold = 5) {
    let snapX = zone.x;
    let snapY = zone.y;
    
    allZones.forEach(otherZone => {
        if (otherZone.id === zone.id) return;
        
        // Snap to left edge
        if (Math.abs(zone.x - otherZone.x) < threshold) {
            snapX = otherZone.x;
        }
        // Snap to right edge
        if (Math.abs(zone.x - (otherZone.x + otherZone.width)) < threshold) {
            snapX = otherZone.x + otherZone.width;
        }
        // Snap to center
        if (Math.abs(zone.x + zone.width / 2 - (otherZone.x + otherZone.width / 2)) < threshold) {
            snapX = otherZone.x + otherZone.width / 2 - zone.width / 2;
        }
        
        // Snap to top edge
        if (Math.abs(zone.y - otherZone.y) < threshold) {
            snapY = otherZone.y;
        }
        // Snap to bottom edge
        if (Math.abs(zone.y - (otherZone.y + otherZone.height)) < threshold) {
            snapY = otherZone.y + otherZone.height;
        }
        // Snap to center
        if (Math.abs(zone.y + zone.height / 2 - (otherZone.y + otherZone.height / 2)) < threshold) {
            snapY = otherZone.y + otherZone.height / 2 - zone.height / 2;
        }
    });
    
    return { x: snapX, y: snapY };
}

/**
 * Distribute spacing evenly (improved version)
 */
export function distributeSpacingEvenly(zones, direction = 'horizontal') {
    if (zones.length < 3) return zones;
    
    if (direction === 'horizontal') {
        const sorted = [...zones].sort((a, b) => a.x - b.x);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalWidth = (last.x + last.width) - first.x;
        const totalZoneWidths = sorted.reduce((sum, z) => sum + z.width, 0);
        const spacing = (totalWidth - totalZoneWidths) / (sorted.length - 1);
        
        let currentX = first.x;
        return sorted.map(zone => {
            const newZone = { ...zone, x: currentX };
            currentX += zone.width + spacing;
            return newZone;
        });
    } else {
        const sorted = [...zones].sort((a, b) => a.y - b.y);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalHeight = (last.y + last.height) - first.y;
        const totalZoneHeights = sorted.reduce((sum, z) => sum + z.height, 0);
        const spacing = (totalHeight - totalZoneHeights) / (sorted.length - 1);
        
        let currentY = first.y;
        return sorted.map(zone => {
            const newZone = { ...zone, y: currentY };
            currentY += zone.height + spacing;
            return newZone;
        });
    }
}
