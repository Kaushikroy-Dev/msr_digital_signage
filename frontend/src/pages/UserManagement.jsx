import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Edit2, Trash2, Shield, Building2, MapPin } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './UserManagement.css';

export default function UserManagement() {
    const { user: currentUser } = useAuthStore();
    const queryClient = useQueryClient();
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const [userForm, setUserForm] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        role: 'viewer',
        propertyAccess: [],
        zoneAccess: []
    });
    
    const [passwordValidation, setPasswordValidation] = useState({
        length: false,
        uppercase: false,
        special: false,
        numeric: false
    });

    // Fetch users
    const { data: users, isLoading } = useQuery({
        queryKey: ['users', currentUser?.tenantId],
        queryFn: async () => {
            const response = await api.get('/auth/users', {
                params: { tenantId: currentUser?.tenantId }
            });
            return response.data.users;
        },
        enabled: !!currentUser?.tenantId && currentUser?.role === 'super_admin'
    });

    // Fetch properties for access control
    const { data: properties } = useQuery({
        queryKey: ['properties', currentUser?.tenantId],
        queryFn: async () => {
            const response = await api.get('/devices/properties', {
                params: { tenantId: currentUser?.tenantId }
            });
            return response.data.properties;
        },
        enabled: !!currentUser?.tenantId
    });

    // Fetch all zones
    const { data: zonesData } = useQuery({
        queryKey: ['all-zones', currentUser?.tenantId],
        queryFn: async () => {
            const response = await api.get('/devices/all-zones', {
                params: { tenantId: currentUser?.tenantId }
            });
            return response.data.zones;
        },
        enabled: !!currentUser?.tenantId
    });

    // Create user mutation
    const createUserMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post('/auth/users', {
                ...data,
                tenantId: currentUser.tenantId
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            setIsAddingUser(false);
            resetForm();
        }
    });

    // Update user mutation
    const updateUserMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await api.put(`/auth/users/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            setEditingUser(null);
            resetForm();
        }
    });

    // Delete user mutation
    const deleteUserMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/auth/users/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
        }
    });

    // Password validation function
    const validatePasswordStrength = (password) => {
        return {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
            numeric: /[0-9]/.test(password)
        };
    };

    // Handle password change
    const handlePasswordChange = (password) => {
        setUserForm({ ...userForm, password });
        setPasswordValidation(validatePasswordStrength(password));
    };

    const resetForm = () => {
        setUserForm({
            email: '',
            password: '',
            confirmPassword: '',
            firstName: '',
            lastName: '',
            role: 'viewer',
            propertyAccess: [],
            zoneAccess: []
        });
        setPasswordValidation({
            length: false,
            uppercase: false,
            special: false,
            numeric: false
        });
    };

    const handleCreateUser = (e) => {
        e.preventDefault();
        createUserMutation.mutate(userForm);
    };

    const handleUpdateUser = (e) => {
        e.preventDefault();
        const { password, ...updateData } = userForm;
        const payload = password ? userForm : updateData;
        updateUserMutation.mutate({
            id: editingUser.id,
            data: payload
        });
    };

    const handleDeleteUser = (user) => {
        if (confirm(`Delete user "${user.email}"? This action cannot be undone.`)) {
            deleteUserMutation.mutate(user.id);
        }
    };

    const startEditUser = async (user) => {
        setEditingUser(user);

        // Fetch user's access permissions
        const [propertyAccessRes, zoneAccessRes] = await Promise.all([
            api.get(`/auth/users/${user.id}/property-access`),
            api.get(`/auth/users/${user.id}/zone-access`)
        ]);

        setUserForm({
            email: user.email,
            password: '',
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            role: user.role,
            propertyAccess: propertyAccessRes.data.propertyIds || [],
            zoneAccess: zoneAccessRes.data.zoneIds || []
        });
    };

    const togglePropertyAccess = (propertyId) => {
        setUserForm(prev => ({
            ...prev,
            propertyAccess: prev.propertyAccess.includes(propertyId)
                ? prev.propertyAccess.filter(id => id !== propertyId)
                : [...prev.propertyAccess, propertyId]
        }));
    };

    const toggleAreaAccess = (zoneId) => {
        setUserForm(prev => ({
            ...prev,
            zoneAccess: prev.zoneAccess.includes(zoneId)
                ? prev.zoneAccess.filter(id => id !== zoneId)
                : [...prev.zoneAccess, zoneId]
        }));
    };

    const getRoleBadgeClass = (role) => {
        const classes = {
            super_admin: 'role-badge-super',
            property_admin: 'role-badge-property',
            zone_admin: 'role-badge-area',
            content_editor: 'role-badge-editor',
            viewer: 'role-badge-viewer'
        };
        return classes[role] || 'role-badge-viewer';
    };

    const getRoleLabel = (role) => {
        const labels = {
            super_admin: 'Super Admin',
            property_admin: 'Property Admin',
            zone_admin: 'Area Admin',
            content_editor: 'Content Editor',
            viewer: 'Viewer'
        };
        return labels[role] || role;
    };

    if (currentUser?.role !== 'super_admin') {
        return (
            <div className="access-denied">
                <Shield size={48} />
                <h2>Access Denied</h2>
                <p>You don't have permission to manage users.</p>
            </div>
        );
    }

    if (isLoading) {
        return <div className="loading-container">Loading users...</div>;
    }

    const showAccessControl = ['property_admin', 'zone_admin', 'content_editor', 'viewer'].includes(userForm.role);

    return (
        <div className="user-management-page">
            <div className="page-header premium-header">
                <div>
                    <h1 className="premium-title">User Management</h1>
                    <p className="premium-subtitle">Manage system access, roles, and permissions.</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-primary btn-premium"
                        onClick={() => setIsAddingUser(true)}
                    >
                        <Plus size={20} />
                        Add New User
                    </button>
                </div>
            </div>

            {/* Add/Edit User Modal */}
            {(isAddingUser || editingUser) && (
                <div className="modal-overlay">
                    <div className="modal-content modal-large">
                        <div className="modal-header">
                            <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
                        </div>
                        <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                            <div className="form-sections">
                                <div className="form-section">
                                    <h3>User Details</h3>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>First Name *</label>
                                            <input
                                                type="text"
                                                className="premium-input"
                                                value={userForm.firstName}
                                                onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Last Name *</label>
                                            <input
                                                type="text"
                                                className="premium-input"
                                                value={userForm.lastName}
                                                onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Email *</label>
                                        <input
                                            type="email"
                                            className="premium-input"
                                            value={userForm.email}
                                            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                                            required
                                            disabled={!!editingUser}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Password {editingUser ? '(leave blank to keep current)' : '*'}</label>
                                        <input
                                            type="password"
                                            className="premium-input"
                                            value={userForm.password}
                                            onChange={(e) => handlePasswordChange(e.target.value)}
                                            required={!editingUser}
                                            placeholder={editingUser ? 'Leave blank to keep current password' : ''}
                                        />
                                        {userForm.password && !editingUser && (
                                            <div className="password-validation" style={{ marginTop: '8px', fontSize: '12px' }}>
                                                <div style={{ color: passwordValidation.length ? '#10b981' : '#ef4444' }}>
                                                    {passwordValidation.length ? '✓' : '✗'} At least 8 characters
                                                </div>
                                                <div style={{ color: passwordValidation.uppercase ? '#10b981' : '#ef4444' }}>
                                                    {passwordValidation.uppercase ? '✓' : '✗'} One uppercase letter
                                                </div>
                                                <div style={{ color: passwordValidation.special ? '#10b981' : '#ef4444' }}>
                                                    {passwordValidation.special ? '✓' : '✗'} One special character
                                                </div>
                                                <div style={{ color: passwordValidation.numeric ? '#10b981' : '#ef4444' }}>
                                                    {passwordValidation.numeric ? '✓' : '✗'} One numeric digit
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {!editingUser && (
                                        <div className="form-group">
                                            <label>Confirm Password *</label>
                                            <input
                                                type="password"
                                                className="premium-input"
                                                value={userForm.confirmPassword}
                                                onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                                                required
                                                placeholder="Re-enter password"
                                            />
                                            {userForm.confirmPassword && userForm.password !== userForm.confirmPassword && (
                                                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                                                    Passwords do not match
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label>Role *</label>
                                        <select
                                            className="premium-select"
                                            value={userForm.role}
                                            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                                        >
                                            <option value="viewer">Viewer - Read-only access</option>
                                            <option value="content_editor">Content Editor - Can manage content</option>
                                            <option value="zone_admin">Zone Admin - Manage specific zones</option>
                                            <option value="property_admin">Property Admin - Manage specific properties</option>
                                            <option value="super_admin">Super Admin - Full access</option>
                                        </select>
                                    </div>
                                </div>

                                {showAccessControl && (
                                    <div className="form-section">
                                        <h3>Access Control</h3>

                                        {(userForm.role === 'property_admin' || userForm.role === 'content_editor' || userForm.role === 'viewer') && (
                                            <div className="access-control-section">
                                                <label>Property Access</label>
                                                <p className="help-text">
                                                    {userForm.role === 'property_admin' && 'Select which properties this user can manage'}
                                                    {userForm.role === 'content_editor' && 'Select which properties this user can access for content management'}
                                                    {userForm.role === 'viewer' && 'Select which properties this user can view'}
                                                </p>
                                                <div className="access-list">
                                                    {properties?.map((property) => (
                                                        <label key={property.id} className="access-item">
                                                            <input
                                                                type="checkbox"
                                                                checked={userForm.propertyAccess.includes(property.id)}
                                                                onChange={() => togglePropertyAccess(property.id)}
                                                            />
                                                            <Building2 size={16} />
                                                            <span>{property.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {userForm.role === 'zone_admin' && (
                                            <div className="access-control-section">
                                                <label>Area Access</label>
                                                <p className="help-text">Select which areas this user can manage</p>
                                                <div className="access-list">
                                                    {zonesData?.map((zone) => {
                                                        const property = properties?.find(p => p.id === zone.property_id);
                                                        return (
                                                            <label key={zone.id} className="access-item">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={userForm.zoneAccess.includes(zone.id)}
                                                                    onChange={() => toggleAreaAccess(zone.id)}
                                                                />
                                                                <MapPin size={16} />
                                                                <span>{zone.name}</span>
                                                                <small>({property?.name})</small>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => {
                                        setIsAddingUser(false);
                                        setEditingUser(null);
                                        resetForm();
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={createUserMutation.isPending || updateUserMutation.isPending}
                                >
                                    {editingUser ? 'Update User' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Users List or Empty State */}
            {users?.length === 0 ? (
                <div className="empty-state-large">
                    <div className="empty-icon-wrapper">
                        <Users size={64} />
                    </div>
                    <h2>No Users Yet</h2>
                    <p>Invite team members to collaborate on your digital signage network.</p>
                    <button className="btn btn-primary" onClick={() => setIsAddingUser(true)}>
                        Add First User
                    </button>
                </div>
            ) : (
                <div className="users-list">
                    <div className="list-header">
                        <div className="col-user">User</div>
                        <div className="col-role">Role</div>
                        <div className="col-access">Access</div>
                        <div className="col-status">Status</div>
                        <div className="col-actions">Actions</div>
                    </div>

                    {users?.map((user) => (
                        <div key={user.id} className="user-row">
                            <div className="col-user">
                                <div className="user-avatar">
                                    {user.first_name?.[0]}{user.last_name?.[0]}
                                </div>
                                <div className="user-info">
                                    <h4>{user.first_name} {user.last_name}</h4>
                                    <p>{user.email}</p>
                                </div>
                            </div>
                            <div className="col-role">
                                <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                                    {getRoleLabel(user.role)}
                                </span>
                            </div>
                            <div className="col-access">
                                {user.role === 'super_admin' && <span className="access-label">All Properties</span>}
                                {user.role === 'property_admin' && <span className="access-label">Limited Properties</span>}
                                {user.role === 'zone_admin' && <span className="access-label">Limited Areas</span>}
                                {['content_editor', 'viewer'].includes(user.role) && <span className="access-label">-</span>}
                            </div>
                            <div className="col-status">
                                <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                                    {user.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="col-actions">
                                <button
                                    className="icon-btn tooltip"
                                    onClick={() => startEditUser(user)}
                                    data-tooltip="Edit User"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    className="icon-btn tooltip delete"
                                    onClick={() => handleDeleteUser(user)}
                                    data-tooltip="Delete User"
                                    disabled={user.id === currentUser.id}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
