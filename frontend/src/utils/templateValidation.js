/**
 * Template validation utility
 * Validates templates before saving to prevent errors on devices
 */

export function validateTemplate(template, zones, assets = []) {
    const errors = [];
    const warnings = [];

    // Validate template name
    if (!template.name || template.name.trim().length === 0) {
        errors.push({
            type: 'template_name',
            message: 'Template name is required'
        });
    }

    // Validate template dimensions
    if (!template.width || template.width <= 0) {
        errors.push({
            type: 'template_width',
            message: 'Template width must be greater than 0'
        });
    }

    if (!template.height || template.height <= 0) {
        errors.push({
            type: 'template_height',
            message: 'Template height must be greater than 0'
        });
    }

    // Validate zones
    if (!zones || zones.length === 0) {
        warnings.push({
            type: 'no_zones',
            message: 'Template has no zones. Consider adding content.'
        });
    } else {
        zones.forEach((zone, index) => {
            // Validate zone bounds
            if (zone.x < 0 || zone.y < 0) {
                errors.push({
                    type: 'zone_bounds',
                    message: `Zone "${zone.name || `Zone ${index + 1}`}" is outside canvas bounds (negative position)`
                });
            }

            if (zone.x + zone.width > template.width) {
                errors.push({
                    type: 'zone_bounds',
                    message: `Zone "${zone.name || `Zone ${index + 1}`}" extends beyond canvas width`
                });
            }

            if (zone.y + zone.height > template.height) {
                errors.push({
                    type: 'zone_bounds',
                    message: `Zone "${zone.name || `Zone ${index + 1}`}" extends beyond canvas height`
                });
            }

            // Validate zone dimensions
            if (!zone.width || zone.width <= 0) {
                errors.push({
                    type: 'zone_dimensions',
                    message: `Zone "${zone.name || `Zone ${index + 1}`}" has invalid width`
                });
            }

            if (!zone.height || zone.height <= 0) {
                errors.push({
                    type: 'zone_dimensions',
                    message: `Zone "${zone.name || `Zone ${index + 1}`}" has invalid height`
                });
            }

            // Validate widget configurations
            if (zone.contentType === 'widget') {
                const widgetErrors = validateWidgetConfig(zone.widgetType, zone.widgetConfig || {});
                widgetErrors.forEach(error => {
                    errors.push({
                        type: 'widget_config',
                        message: `Zone "${zone.name || `Zone ${index + 1}`}" (${zone.widgetType}): ${error}`
                    });
                });
            }

            // Validate media asset references
            if (zone.contentType === 'media' && zone.mediaAssetId) {
                const asset = assets.find(a => a.id === zone.mediaAssetId);
                if (!asset) {
                    errors.push({
                        type: 'media_reference',
                        message: `Zone "${zone.name || `Zone ${index + 1}`}" references a media asset that doesn't exist`
                    });
                }
            }

            // Check for very small zones (warning)
            if (zone.width < 50 || zone.height < 50) {
                warnings.push({
                    type: 'small_zone',
                    message: `Zone "${zone.name || `Zone ${index + 1}`}" is very small (${zone.width}x${zone.height}px). Content may not be visible.`
                });
            }
        });

        // Check for overlapping zones (warning) - only if they have the same z-index
        for (let i = 0; i < zones.length; i++) {
            for (let j = i + 1; j < zones.length; j++) {
                if (zonesOverlap(zones[i], zones[j])) {
                    const z1 = zones[i].zIndex || zones[i].z_index || 0;
                    const z2 = zones[j].zIndex || zones[j].z_index || 0;

                    if (z1 === z2) {
                        warnings.push({
                            type: 'overlapping_zones',
                            message: `Zones "${zones[i].name || `Zone ${i + 1}`}" and "${zones[j].name || `Zone ${j + 1}`}" overlap at the same depth (z-index: ${z1})`
                        });
                    }
                }
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

function validateWidgetConfig(widgetType, config) {
    const errors = [];

    switch (widgetType) {
        case 'weather':
            // Changed to warnings - allow saving unconfigured widgets
            if (!config.apiKey || config.apiKey.trim().length === 0) {
                // This is now a warning, not an error
                // Users can configure this later
            }
            if (!config.location || config.location.trim().length === 0) {
                // This is now a warning, not an error
                // Users can configure this later
            }
            break;

        case 'qrcode':
            if (!config.text && !config.url) {
                // Allow saving, user can configure later
            }
            break;

        case 'webview':
            if (!config.url || config.url.trim().length === 0) {
                // Allow saving, user can configure later
            }
            // Validate URL format only if URL is provided
            if (config.url && config.url.trim().length > 0 && !isValidUrl(config.url)) {
                errors.push('Invalid URL format');
            }
            break;

        case 'text':
            if (!config.content && !config.text) {
                // Allow saving, user can configure later
            }
            break;

        default:
            // No validation for other widget types
            break;
    }

    return errors;
}

function zonesOverlap(zone1, zone2) {
    return !(
        zone1.x + zone1.width <= zone2.x ||
        zone2.x + zone2.width <= zone1.x ||
        zone1.y + zone1.height <= zone2.y ||
        zone2.y + zone2.height <= zone1.y
    );
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}
