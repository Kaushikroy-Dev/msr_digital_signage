import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Share2, Users, User, Globe, Lock, Edit, Shield } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './TemplateShareModal.css';

const PERMISSIONS = [
    { value: 'view', label: 'View Only', icon: Lock },
    { value: 'edit', label: 'Can Edit', icon: Edit },
    { value: 'admin', label: 'Full Access', icon: Shield }
];

export default function TemplateShareModal({ template, isOpen, onClose }) {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [shareType, setShareType] = useState('user'); // 'user', 'tenant', 'public'
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedTenantId, setSelectedTenantId] = useState('');
    const [permission, setPermission] = useState('view');
    const [feedback, setFeedback] = useState(null);

    // Fetch users in tenant for sharing
    const { data: users } = useQuery({
        queryKey: ['users', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/auth/users', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.users || [];
        },
        enabled: isOpen && shareType === 'user' && !!user?.tenantId
    });

    // Fetch existing shares
    const { data: existingShares } = useQuery({
        queryKey: ['template-shares', template?.id],
        queryFn: async () => {
            if (!template?.id) return { shares: [] };
            const response = await api.get(`/templates/templates/${template.id}/shares`);
            return response.data || { shares: [] };
        },
        enabled: isOpen && !!template?.id
    });

    const shareMutation = useMutation({
        mutationFn: async (shareData) => {
            const response = await api.post(`/templates/templates/${template.id}/share`, shareData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['template-shares', template?.id]);
            queryClient.invalidateQueries(['templates', user?.tenantId]);
            setFeedback({ type: 'success', message: 'Template shared successfully!' });
            setTimeout(() => {
                setFeedback(null);
                onClose();
            }, 2000);
        },
        onError: (err) => {
            setFeedback({ type: 'error', message: err.response?.data?.error || err.message });
        }
    });

    const unshareMutation = useMutation({
        mutationFn: async (shareId) => {
            const response = await api.delete(`/templates/templates/${template.id}/share`, {
                params: { shareId }
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['template-shares', template?.id]);
            setFeedback({ type: 'success', message: 'Template unshared successfully!' });
        },
        onError: (err) => {
            setFeedback({ type: 'error', message: err.response?.data?.error || err.message });
        }
    });

    const handleShare = () => {
        if (shareType === 'user' && !selectedUserId) {
            setFeedback({ type: 'error', message: 'Please select a user' });
            return;
        }

        const shareData = {
            permission
        };

        if (shareType === 'user') {
            shareData.sharedWithUserId = selectedUserId;
        } else if (shareType === 'tenant') {
            shareData.sharedWithTenantId = user?.tenantId;
        } else if (shareType === 'public') {
            shareData.isPublic = true;
        }

        shareMutation.mutate(shareData);
    };

    if (!isOpen || !template) return null;

    return (
        <div className="template-share-overlay" onClick={onClose}>
            <div className="template-share-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Share Template: {template.name}</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {feedback && (
                        <div className={`feedback-message ${feedback.type}`}>
                            {feedback.message}
                        </div>
                    )}

                    {/* Share Type Selection */}
                    <div className="share-type-selector">
                        <button
                            className={`share-type-btn ${shareType === 'user' ? 'active' : ''}`}
                            onClick={() => setShareType('user')}
                        >
                            <User size={20} />
                            Share with User
                        </button>
                        <button
                            className={`share-type-btn ${shareType === 'tenant' ? 'active' : ''}`}
                            onClick={() => setShareType('tenant')}
                        >
                            <Users size={20} />
                            Share with Tenant
                        </button>
                        <button
                            className={`share-type-btn ${shareType === 'public' ? 'active' : ''}`}
                            onClick={() => setShareType('public')}
                        >
                            <Globe size={20} />
                            Make Public
                        </button>
                    </div>

                    {/* Share Configuration */}
                    <div className="share-config">
                        {shareType === 'user' && (
                            <div className="form-group">
                                <label>Select User</label>
                                <select
                                    className="input"
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                >
                                    <option value="">-- Select User --</option>
                                    {users?.filter(u => u.id !== user?.id).map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {shareType === 'tenant' && (
                            <div className="info-message">
                                This template will be shared with all users in your tenant.
                            </div>
                        )}

                        {shareType === 'public' && (
                            <div className="info-message warning">
                                <strong>Warning:</strong> Making this template public will allow anyone with access to view it.
                            </div>
                        )}

                        <div className="form-group">
                            <label>Permission Level</label>
                            <div className="permission-selector">
                                {PERMISSIONS.map(perm => {
                                    const Icon = perm.icon;
                                    return (
                                        <button
                                            key={perm.value}
                                            className={`permission-btn ${permission === perm.value ? 'active' : ''}`}
                                            onClick={() => setPermission(perm.value)}
                                        >
                                            <Icon size={18} />
                                            {perm.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Existing Shares */}
                    {existingShares?.shares && existingShares.shares.length > 0 && (
                        <div className="existing-shares">
                            <h4>Current Shares</h4>
                            <div className="shares-list">
                                {existingShares.shares.map(share => (
                                    <div key={share.id} className="share-item">
                                        <div className="share-info">
                                            {share.is_public ? (
                                                <>
                                                    <Globe size={16} />
                                                    <span>Public</span>
                                                </>
                                            ) : share.shared_with_user_id ? (
                                                <>
                                                    <User size={16} />
                                                    <span>User: {share.user_name || share.shared_with_user_id}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Users size={16} />
                                                    <span>Tenant: {share.tenant_name || share.shared_with_tenant_id}</span>
                                                </>
                                            )}
                                            <span className="permission-badge">{share.permission}</span>
                                        </div>
                                        <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => unshareMutation.mutate(share.id)}
                                            disabled={unshareMutation.isLoading}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-outline" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleShare}
                        disabled={shareMutation.isLoading || (shareType === 'user' && !selectedUserId)}
                    >
                        <Share2 size={16} />
                        {shareMutation.isLoading ? 'Sharing...' : 'Share Template'}
                    </button>
                </div>
            </div>
        </div>
    );
}
