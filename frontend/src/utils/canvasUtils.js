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
 * Get alignment guides for a zone (enhanced with smart snapping)
 */
export function getAlignmentGuides(zone, allZones, threshold = 5) {
    const guides = {
        vertical: [],
        horizontal: []
    };

    allZones.forEach(otherZone => {
        if (otherZone.id === zone.id || !otherZone.isVisible) return;

        // Vertical alignment (x positions)
        if (Math.abs(zone.x - otherZone.x) < threshold) {
            guides.vertical.push({ position: zone.x, type: 'left', zoneId: otherZone.id });
        }
        if (Math.abs(zone.x + zone.width - (otherZone.x + otherZone.width)) < threshold) {
            guides.vertical.push({ position: zone.x + zone.width, type: 'right', zoneId: otherZone.id });
        }
        if (Math.abs(zone.x + zone.width / 2 - (otherZone.x + otherZone.width / 2)) < threshold) {
            guides.vertical.push({ position: zone.x + zone.width / 2, type: 'center', zoneId: otherZone.id });
        }
        
        // Additional smart guides: snap to edges
        if (Math.abs(zone.x - (otherZone.x + otherZone.width)) < threshold) {
            guides.vertical.push({ position: otherZone.x + otherZone.width, type: 'edge-left', zoneId: otherZone.id });
        }
        if (Math.abs((zone.x + zone.width) - otherZone.x) < threshold) {
            guides.vertical.push({ position: otherZone.x, type: 'edge-right', zoneId: otherZone.id });
        }

        // Horizontal alignment (y positions)
        if (Math.abs(zone.y - otherZone.y) < threshold) {
            guides.horizontal.push({ position: zone.y, type: 'top', zoneId: otherZone.id });
        }
        if (Math.abs(zone.y + zone.height - (otherZone.y + otherZone.height)) < threshold) {
            guides.horizontal.push({ position: zone.y + zone.height, type: 'bottom', zoneId: otherZone.id });
        }
        if (Math.abs(zone.y + zone.height / 2 - (otherZone.y + otherZone.height / 2)) < threshold) {
            guides.horizontal.push({ position: zone.y + zone.height / 2, type: 'center', zoneId: otherZone.id });
        }
        
        // Additional smart guides: snap to edges
        if (Math.abs(zone.y - (otherZone.y + otherZone.height)) < threshold) {
            guides.horizontal.push({ position: otherZone.y + otherZone.height, type: 'edge-top', zoneId: otherZone.id });
        }
        if (Math.abs((zone.y + zone.height) - otherZone.y) < threshold) {
            guides.horizontal.push({ position: otherZone.y, type: 'edge-bottom', zoneId: otherZone.id });
        }
    });

    // Remove duplicates
    const uniqueVertical = guides.vertical.filter((guide, index, self) =>
        index === self.findIndex(g => g.position === guide.position && g.type === guide.type)
    );
    const uniqueHorizontal = guides.horizontal.filter((guide, index, self) =>
        index === self.findIndex(g => g.position === guide.position && g.type === guide.type)
    );

    return {
        vertical: uniqueVertical,
        horizontal: uniqueHorizontal
    };
}

/**
 * Apply smart snap to guides during drag
 */
export function applySmartSnap(zone, allZones, threshold = 5) {
    const guides = getAlignmentGuides(zone, allZones, threshold);
    let snappedZone = { ...zone };

    // Apply vertical snap
    if (guides.vertical.length > 0) {
        const closestGuide = guides.vertical.reduce((closest, guide) => {
            const distance = Math.abs(zone.x - guide.position);
            const closestDistance = Math.abs(zone.x - closest.position);
            return distance < closestDistance ? guide : closest;
        });
        
        if (Math.abs(zone.x - closestGuide.position) < threshold) {
            snappedZone.x = closestGuide.position;
        } else if (closestGuide.type === 'center') {
            snappedZone.x = closestGuide.position - zone.width / 2;
        } else if (closestGuide.type === 'right') {
            snappedZone.x = closestGuide.position - zone.width;
        }
    }

    // Apply horizontal snap
    if (guides.horizontal.length > 0) {
        const closestGuide = guides.horizontal.reduce((closest, guide) => {
            const distance = Math.abs(zone.y - guide.position);
            const closestDistance = Math.abs(zone.y - closest.position);
            return distance < closestDistance ? guide : closest;
        });
        
        if (Math.abs(zone.y - closestGuide.position) < threshold) {
            snappedZone.y = closestGuide.position;
        } else if (closestGuide.type === 'center') {
            snappedZone.y = closestGuide.position - zone.height / 2;
        } else if (closestGuide.type === 'bottom') {
            snappedZone.y = closestGuide.position - zone.height;
        }
    }

    return snappedZone;
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
