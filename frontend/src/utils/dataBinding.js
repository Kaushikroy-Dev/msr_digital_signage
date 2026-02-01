/**
 * Data binding utility for fetching and transforming data from various sources
 */

/**
 * Fetch data from a data source
 * @param {object} dataSource - Data source configuration
 * @param {string} dataPath - JSONPath or field name to extract
 * @returns {Promise<any>} - The extracted data
 */
export async function fetchDataFromSource(dataSource, dataPath = '') {
    try {
        let data;

        switch (dataSource.source_type) {
            case 'api':
                data = await fetchFromAPI(dataSource);
                break;
            case 'database':
                data = await fetchFromDatabase(dataSource);
                break;
            case 'scheduled':
                data = await fetchScheduledContent(dataSource);
                break;
            case 'websocket':
                // WebSocket connections are handled separately
                return null;
            default:
                throw new Error(`Unsupported data source type: ${dataSource.source_type}`);
        }

        // Extract data using JSONPath or field name
        if (dataPath) {
            return extractDataPath(data, dataPath);
        }

        return data;
    } catch (error) {
        console.error('Error fetching data from source:', error);
        throw error;
    }
}

/**
 * Fetch data from external API
 */
async function fetchFromAPI(dataSource) {
    const { config, authentication } = dataSource;
    const headers = {
        'Content-Type': 'application/json'
    };

    // Add authentication headers
    if (authentication) {
        if (authentication.apiKey) {
            headers['Authorization'] = `Bearer ${authentication.apiKey}`;
        } else if (authentication.basicAuth) {
            headers['Authorization'] = `Basic ${btoa(`${authentication.basicAuth.username}:${authentication.basicAuth.password}`)}`;
        }
    }

    const response = await fetch(config.endpoint, {
        method: config.method || 'GET',
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Fetch data from database (via backend API)
 */
async function fetchFromDatabase(dataSource) {
    // Database queries are executed on the backend for security
    const response = await fetch(`/api/templates/data-sources/${dataSource.id}/execute`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            query: dataSource.config.query
        })
    });

    if (!response.ok) {
        throw new Error(`Database query failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Fetch scheduled content based on current time
 */
async function fetchScheduledContent(dataSource) {
    const now = new Date();
    const { schedule_config } = dataSource.config;

    // Check if current time matches schedule
    if (schedule_config.type === 'daily') {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const scheduleTime = schedule_config.time; // e.g., "14:30"

        if (scheduleTime) {
            const [hour, minute] = scheduleTime.split(':').map(Number);
            if (currentHour === hour && currentMinute === minute) {
                return schedule_config.content;
            }
        }
    } else if (schedule_config.type === 'weekly') {
        const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
        if (schedule_config.days.includes(currentDay)) {
            return schedule_config.content;
        }
    }

    return null;
}

/**
 * Extract data using JSONPath or field name
 */
function extractDataPath(data, path) {
    if (!path) return data;

    // Simple field access (e.g., "items.0.title")
    if (!path.startsWith('$')) {
        const parts = path.split('.');
        let result = data;
        for (const part of parts) {
            if (result === null || result === undefined) return null;
            const index = parseInt(part);
            if (!isNaN(index)) {
                result = result[index];
            } else {
                result = result[part];
            }
        }
        return result;
    }

    // JSONPath support (simplified - would use a library like jsonpath-plus in production)
    // For now, handle simple cases
    if (path.startsWith('$.')) {
        const fieldPath = path.substring(2);
        return extractDataPath(data, fieldPath);
    }

    return data;
}

/**
 * Transform data according to transformation rules
 */
export function transformData(data, transform) {
    if (!transform || transform.type === 'none') {
        return data;
    }

    switch (transform.type) {
        case 'format':
            return formatData(data, transform.config);
        case 'filter':
            return filterData(data, transform.config);
        case 'map':
            return mapData(data, transform.config);
        default:
            return data;
    }
}

function formatData(data, config) {
    if (!config.pattern) return data;

    // Format based on pattern
    if (config.pattern.includes('date') || config.pattern.includes('Date')) {
        return new Date(data).toLocaleDateString();
    }
    if (config.pattern.includes('time') || config.pattern.includes('Time')) {
        return new Date(data).toLocaleTimeString();
    }
    if (config.pattern.includes('currency') || config.pattern.startsWith('$')) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data);
    }
    if (config.pattern.includes('number') || config.pattern.includes('Number')) {
        return new Intl.NumberFormat('en-US').format(data);
    }

    return data;
}

function filterData(data, config) {
    if (!config.condition || !Array.isArray(data)) return data;

    // Simple filter implementation (would use a proper expression evaluator in production)
    return data.filter(item => {
        // Placeholder - would evaluate condition properly
        return true;
    });
}

function mapData(data, config) {
    if (!config.mapping || !Array.isArray(data)) return data;

    return data.map(item => {
        const mapped = {};
        for (const [key, path] of Object.entries(config.mapping)) {
            mapped[key] = extractDataPath(item, path);
        }
        return mapped;
    });
}
