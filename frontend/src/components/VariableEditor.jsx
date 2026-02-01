import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Type, Hash, Calendar, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import './VariableEditor.css';

const VARIABLE_TYPES = [
    { id: 'text', name: 'Text', icon: Type },
    { id: 'number', name: 'Number', icon: Hash },
    { id: 'date', name: 'Date', icon: Calendar },
    { id: 'image', name: 'Image URL', icon: ImageIcon },
    { id: 'url', name: 'URL', icon: LinkIcon }
];

export default function VariableEditor({ templateId, variables = {}, onSave, isOpen, onClose }) {
    const [localVariables, setLocalVariables] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    const [formData, setFormData] = useState({
        key: '',
        type: 'text',
        defaultValue: '',
        description: '',
        isRequired: false,
        validationRules: {}
    });

    useEffect(() => {
        if (variables && Object.keys(variables).length > 0) {
            const varsArray = Object.entries(variables).map(([key, value]) => ({
                key,
                type: value.type || 'text',
                defaultValue: value.defaultValue || '',
                description: value.description || '',
                isRequired: value.isRequired || false,
                validationRules: value.validationRules || {}
            }));
            setLocalVariables(varsArray);
        } else {
            setLocalVariables([]);
        }
    }, [variables, isOpen]);

    const handleAddVariable = () => {
        if (!formData.key.trim()) {
            alert('Variable key is required');
            return;
        }

        if (localVariables.some(v => v.key === formData.key && editingIndex === null)) {
            alert('Variable key already exists');
            return;
        }

        if (editingIndex !== null) {
            // Update existing
            const updated = [...localVariables];
            updated[editingIndex] = { ...formData };
            setLocalVariables(updated);
            setEditingIndex(null);
        } else {
            // Add new
            setLocalVariables([...localVariables, { ...formData }]);
        }

        // Reset form
        setFormData({
            key: '',
            type: 'text',
            defaultValue: '',
            description: '',
            isRequired: false,
            validationRules: {}
        });
    };

    const handleEditVariable = (index) => {
        const variable = localVariables[index];
        setFormData({ ...variable });
        setEditingIndex(index);
    };

    const handleDeleteVariable = (index) => {
        if (confirm('Delete this variable?')) {
            setLocalVariables(localVariables.filter((_, i) => i !== index));
            if (editingIndex === index) {
                setEditingIndex(null);
                setFormData({
                    key: '',
                    type: 'text',
                    defaultValue: '',
                    description: '',
                    isRequired: false,
                    validationRules: {}
                });
            }
        }
    };

    const handleSave = () => {
        const variablesObj = {};
        localVariables.forEach(v => {
            variablesObj[v.key] = {
                type: v.type,
                defaultValue: v.defaultValue,
                description: v.description,
                isRequired: v.isRequired,
                validationRules: v.validationRules
            };
        });
        onSave(variablesObj);
        onClose();
    };

    const handleCancel = () => {
        setEditingIndex(null);
        setFormData({
            key: '',
            type: 'text',
            defaultValue: '',
            description: '',
            isRequired: false,
            validationRules: {}
        });
    };

    if (!isOpen) return null;

    const TypeIcon = VARIABLE_TYPES.find(t => t.id === formData.type)?.icon || Type;

    return (
        <div className="variable-editor-overlay" onClick={onClose}>
            <div className="variable-editor-modal" onClick={(e) => e.stopPropagation()}>
                <div className="variable-editor-header">
                    <h3>Template Variables</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="variable-editor-content">
                    {/* Variable List */}
                    <div className="variables-list">
                        <h4>Defined Variables</h4>
                        {localVariables.length === 0 ? (
                            <div className="empty-state">No variables defined. Add one below.</div>
                        ) : (
                            <div className="variables-table">
                                <div className="table-header">
                                    <div>Key</div>
                                    <div>Type</div>
                                    <div>Default Value</div>
                                    <div>Required</div>
                                    <div>Actions</div>
                                </div>
                                {localVariables.map((variable, index) => (
                                    <div key={index} className="table-row">
                                        <div className="variable-key">
                                            <code>{`{{${variable.key}}}`}</code>
                                        </div>
                                        <div className="variable-type">
                                            {VARIABLE_TYPES.find(t => t.id === variable.type)?.name || variable.type}
                                        </div>
                                        <div className="variable-default">
                                            {variable.defaultValue || <span className="text-muted">—</span>}
                                        </div>
                                        <div className="variable-required">
                                            {variable.isRequired ? (
                                                <span className="badge badge-required">Required</span>
                                            ) : (
                                                <span className="badge badge-optional">Optional</span>
                                            )}
                                        </div>
                                        <div className="variable-actions">
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={() => handleEditVariable(index)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDeleteVariable(index)}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add/Edit Variable Form */}
                    <div className="variable-form">
                        <h4>{editingIndex !== null ? 'Edit Variable' : 'Add Variable'}</h4>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Variable Key</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.key}
                                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                                    placeholder="company_name"
                                    disabled={editingIndex !== null}
                                />
                                <small>Use in templates as: {`{{${formData.key || 'key'}}}`}</small>
                            </div>

                            <div className="form-group">
                                <label>Type</label>
                                <select
                                    className="input"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    {VARIABLE_TYPES.map(type => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Default Value</label>
                                <input
                                    type={formData.type === 'number' ? 'number' : 'text'}
                                    className="input"
                                    value={formData.defaultValue}
                                    onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                                    placeholder="Enter default value"
                                />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="What this variable represents"
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.isRequired}
                                        onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                                    />
                                    Required
                                </label>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                className="btn btn-primary"
                                onClick={handleAddVariable}
                            >
                                <Plus size={16} />
                                {editingIndex !== null ? 'Update Variable' : 'Add Variable'}
                            </button>
                            {editingIndex !== null && (
                                <button
                                    className="btn btn-outline"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="variable-editor-footer">
                    <button className="btn btn-outline" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        <Save size={16} />
                        Save Variables
                    </button>
                </div>
            </div>
        </div>
    );
}
