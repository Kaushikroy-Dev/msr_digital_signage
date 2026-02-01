/**
 * Variable substitution utility for templates
 * Replaces {{variable_key}} placeholders with actual values
 */

/**
 * Substitute variables in a string
 * @param {string} text - Text containing variable placeholders
 * @param {object} variableValues - Object with variable key-value pairs
 * @param {object} templateVariables - Template variable definitions (for validation)
 * @returns {string} - Text with variables substituted
 */
export function substituteVariables(text, variableValues = {}, templateVariables = {}) {
    if (!text || typeof text !== 'string') return text;

    // Find all variable placeholders: {{variable_key}}
    const variableRegex = /\{\{([^}]+)\}\}/g;
    
    return text.replace(variableRegex, (match, variableKey) => {
        const key = variableKey.trim();
        
        // Check if variable value is provided
        if (variableValues.hasOwnProperty(key)) {
            const value = variableValues[key];
            return value !== null && value !== undefined ? String(value) : match;
        }
        
        // Check if default value exists in template variables
        if (templateVariables[key]?.defaultValue !== undefined) {
            return String(templateVariables[key].defaultValue);
        }
        
        // Return original placeholder if no value found
        return match;
    });
}

/**
 * Extract all variable keys from a string
 * @param {string} text - Text to extract variables from
 * @returns {string[]} - Array of variable keys
 */
export function extractVariables(text) {
    if (!text || typeof text !== 'string') return [];

    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables = [];
    let match;

    while ((match = variableRegex.exec(text)) !== null) {
        const key = match[1].trim();
        if (key && !variables.includes(key)) {
            variables.push(key);
        }
    }

    return variables;
}

/**
 * Validate variable values against template variable definitions
 * @param {object} variableValues - Variable values to validate
 * @param {object} templateVariables - Template variable definitions
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
export function validateVariables(variableValues = {}, templateVariables = {}) {
    const errors = [];
    
    // Check required variables
    Object.entries(templateVariables).forEach(([key, def]) => {
        if (def.isRequired && (variableValues[key] === undefined || variableValues[key] === null || variableValues[key] === '')) {
            errors.push(`Variable "${key}" is required but not provided`);
        }
    });

    // Validate variable types
    Object.entries(variableValues).forEach(([key, value]) => {
        const def = templateVariables[key];
        if (def) {
            switch (def.type) {
                case 'number':
                    if (value !== '' && isNaN(Number(value))) {
                        errors.push(`Variable "${key}" must be a number`);
                    }
                    break;
                case 'date':
                    if (value !== '' && isNaN(Date.parse(value))) {
                        errors.push(`Variable "${key}" must be a valid date`);
                    }
                    break;
                case 'url':
                case 'image':
                    if (value !== '' && !/^https?:\/\//i.test(value)) {
                        errors.push(`Variable "${key}" must be a valid URL`);
                    }
                    break;
            }

            // Apply validation rules if defined
            if (def.validationRules) {
                const rules = def.validationRules;
                if (rules.min !== undefined && Number(value) < rules.min) {
                    errors.push(`Variable "${key}" must be at least ${rules.min}`);
                }
                if (rules.max !== undefined && Number(value) > rules.max) {
                    errors.push(`Variable "${key}" must be at most ${rules.max}`);
                }
                if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
                    errors.push(`Variable "${key}" does not match required pattern`);
                }
            }
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Get default variable values from template variables
 * @param {object} templateVariables - Template variable definitions
 * @returns {object} - Object with default values
 */
export function getDefaultVariableValues(templateVariables = {}) {
    const defaults = {};
    Object.entries(templateVariables).forEach(([key, def]) => {
        if (def.defaultValue !== undefined) {
            defaults[key] = def.defaultValue;
        }
    });
    return defaults;
}
