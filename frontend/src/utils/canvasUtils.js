/**
 * Canvas utility functions for template designer
 */

/**
 * Calculate snap position based on grid size
 */
export function snapToGrid(value, gridSize = 10) {
    return Math.round(value / gridSize) * gridSize;
}

/**
 * Check if two zones are aligned (within threshold)
 */
export function isAligned(zone1, zone2, threshold = 5) {
    return (
        Math.abs(zone1.x - zone2.x) < threshold ||
        Math.abs(zone1.y - zone2.y) < threshold ||
        Math.abs(zone1.x + zone1.width - (zone2.x + zone2.width)) < threshold ||
        Math.abs(zone1.y + zone1.height - (zone2.y + zone2.height)) < threshold ||
        Math.abs(zone1.x - (zone2.x + zone2.width)) < threshold ||
        Math.abs(zone2.x - (zone1.x + zone1.width)) < threshold ||
        Math.abs(zone1.y - (zone2.y + zone2.height)) < threshold ||
        Math.abs(zone2.y - (zone1.y + zone1.height)) < threshold
    );
}

/**
 * Get alignment guides for a zone
 */
export function getAlignmentGuides(zone, allZones, threshold = 5) {
    const guides = {
        vertical: [],
        horizontal: []
    };

    allZones.forEach(otherZone => {
        if (otherZone.id === zone.id) return;

        // Vertical alignment (x positions)
        if (Math.abs(zone.x - otherZone.x) < threshold) {
            guides.vertical.push({ position: zone.x, type: 'left' });
        }
        if (Math.abs(zone.x + zone.width - (otherZone.x + otherZone.width)) < threshold) {
            guides.vertical.push({ position: zone.x + zone.width, type: 'right' });
        }
        if (Math.abs(zone.x + zone.width / 2 - (otherZone.x + otherZone.width / 2)) < threshold) {
            guides.vertical.push({ position: zone.x + zone.width / 2, type: 'center' });
        }

        // Horizontal alignment (y positions)
        if (Math.abs(zone.y - otherZone.y) < threshold) {
            guides.horizontal.push({ position: zone.y, type: 'top' });
        }
        if (Math.abs(zone.y + zone.height - (otherZone.y + otherZone.height)) < threshold) {
            guides.horizontal.push({ position: zone.y + zone.height, type: 'bottom' });
        }
        if (Math.abs(zone.y + zone.height / 2 - (otherZone.y + otherZone.height / 2)) < threshold) {
            guides.horizontal.push({ position: zone.y + zone.height / 2, type: 'center' });
        }
    });

    return guides;
}

/**
 * Constrain value within bounds
 */
export function constrain(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Calculate distance between two points
 */
export function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Check if point is inside rectangle
 */
export function isPointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height;
}

/**
 * Get resize handle position
 */
export function getResizeHandlePosition(handle, zone) {
    const handles = {
        'nw': { x: zone.x, y: zone.y },
        'n': { x: zone.x + zone.width / 2, y: zone.y },
        'ne': { x: zone.x + zone.width, y: zone.y },
        'e': { x: zone.x + zone.width, y: zone.y + zone.height / 2 },
        'se': { x: zone.x + zone.width, y: zone.y + zone.height },
        's': { x: zone.x + zone.width / 2, y: zone.y + zone.height },
        'sw': { x: zone.x, y: zone.y + zone.height },
        'w': { x: zone.x, y: zone.y + zone.height / 2 }
    };
    return handles[handle] || { x: 0, y: 0 };
}

/**
 * Calculate new zone dimensions based on resize
 */
export function calculateResize(zone, handle, deltaX, deltaY, constrainAspectRatio = false, minSize = 20) {
    let newZone = { ...zone };

    switch (handle) {
        case 'nw':
            newZone.x = constrain(zone.x + deltaX, 0, zone.x + zone.width - minSize);
            newZone.y = constrain(zone.y + deltaY, 0, zone.y + zone.height - minSize);
            newZone.width = constrain(zone.width - deltaX, minSize, zone.x + zone.width);
            newZone.height = constrain(zone.height - deltaY, minSize, zone.y + zone.height);
            if (constrainAspectRatio) {
                const aspectRatio = zone.width / zone.height;
                const newAspectRatio = newZone.width / newZone.height;
                if (newAspectRatio > aspectRatio) {
                    newZone.height = newZone.width / aspectRatio;
                    newZone.y = zone.y + zone.height - newZone.height;
                } else {
                    newZone.width = newZone.height * aspectRatio;
                    newZone.x = zone.x + zone.width - newZone.width;
                }
            }
            break;
        case 'n':
            newZone.y = constrain(zone.y + deltaY, 0, zone.y + zone.height - minSize);
            newZone.height = constrain(zone.height - deltaY, minSize, zone.y + zone.height);
            break;
        case 'ne':
            newZone.y = constrain(zone.y + deltaY, 0, zone.y + zone.height - minSize);
            newZone.width = constrain(zone.width + deltaX, minSize, Infinity);
            newZone.height = constrain(zone.height - deltaY, minSize, zone.y + zone.height);
            if (constrainAspectRatio) {
                const aspectRatio = zone.width / zone.height;
                newZone.height = newZone.width / aspectRatio;
                newZone.y = zone.y + zone.height - newZone.height;
            }
            break;
        case 'e':
            newZone.width = constrain(zone.width + deltaX, minSize, Infinity);
            if (constrainAspectRatio) {
                const aspectRatio = zone.width / zone.height;
                newZone.height = newZone.width / aspectRatio;
            }
            break;
        case 'se':
            newZone.width = constrain(zone.width + deltaX, minSize, Infinity);
            newZone.height = constrain(zone.height + deltaY, minSize, Infinity);
            if (constrainAspectRatio) {
                const aspectRatio = zone.width / zone.height;
                const newAspectRatio = newZone.width / newZone.height;
                if (newAspectRatio > aspectRatio) {
                    newZone.height = newZone.width / aspectRatio;
                } else {
                    newZone.width = newZone.height * aspectRatio;
                }
            }
            break;
        case 's':
            newZone.height = constrain(zone.height + deltaY, minSize, Infinity);
            if (constrainAspectRatio) {
                const aspectRatio = zone.width / zone.height;
                newZone.width = newZone.height * aspectRatio;
            }
            break;
        case 'sw':
            newZone.x = constrain(zone.x + deltaX, 0, zone.x + zone.width - minSize);
            newZone.width = constrain(zone.width - deltaX, minSize, zone.x + zone.width);
            newZone.height = constrain(zone.height + deltaY, minSize, Infinity);
            if (constrainAspectRatio) {
                const aspectRatio = zone.width / zone.height;
                newZone.width = newZone.height * aspectRatio;
                newZone.x = zone.x + zone.width - newZone.width;
            }
            break;
        case 'w':
            newZone.x = constrain(zone.x + deltaX, 0, zone.x + zone.width - minSize);
            newZone.width = constrain(zone.width - deltaX, minSize, zone.x + zone.width);
            if (constrainAspectRatio) {
                const aspectRatio = zone.width / zone.height;
                newZone.height = newZone.width / aspectRatio;
            }
            break;
    }

    return newZone;
}
