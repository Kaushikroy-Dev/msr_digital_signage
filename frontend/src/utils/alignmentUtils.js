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
