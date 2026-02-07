import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, BarChart2, Monitor, Calendar, TrendingUp } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './TemplateAnalytics.css';

export default function TemplateAnalytics({ template, isOpen, onClose }) {
    const { user } = useAuthStore();

    const { data: analytics, isLoading } = useQuery({
        queryKey: ['template-analytics', template?.id],
        queryFn: async () => {
            const response = await api.get(`/templates/templates/${template.id}/analytics`);
            return response.data;
        },
        enabled: !!template?.id && isOpen
    });

    if (!isOpen || !template) return null;

    return (
        <div className="template-analytics-overlay" onClick={onClose}>
            <div className="template-analytics-modal" onClick={(e) => e.stopPropagation()}>
                <div className="analytics-header">
                    <h3>Template Analytics: {template.name}</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="analytics-content">
                    {isLoading ? (
                        <div className="loading">Loading analytics...</div>
                    ) : analytics ? (
                        <>
                            <div className="analytics-grid">
                                <div className="analytics-card">
                                    <div className="analytics-icon">
                                        <BarChart2 size={24} />
                                    </div>
                                    <div className="analytics-value">{analytics.playlistUsage || 0}</div>
                                    <div className="analytics-label">Playlists Using</div>
                                </div>

                                <div className="analytics-card">
                                    <div className="analytics-icon">
                                        <Monitor size={24} />
                                    </div>
                                    <div className="analytics-value">{analytics.deviceCount || 0}</div>
                                    <div className="analytics-label">Devices Displaying</div>
                                </div>

                                <div className="analytics-card">
                                    <div className="analytics-icon">
                                        <Calendar size={24} />
                                    </div>
                                    <div className="analytics-value">
                                        {analytics.lastUsed 
                                            ? new Date(analytics.lastUsed).toLocaleDateString()
                                            : 'Never'
                                        }
                                    </div>
                                    <div className="analytics-label">Last Used</div>
                                </div>

                                <div className="analytics-card">
                                    <div className="analytics-icon">
                                        <TrendingUp size={24} />
                                    </div>
                                    <div className="analytics-value">
                                        {analytics.loadTime ? `${analytics.loadTime}ms` : 'N/A'}
                                    </div>
                                    <div className="analytics-label">Avg Load Time</div>
                                </div>
                            </div>

                            {analytics.errors && analytics.errors.length > 0 && (
                                <div className="analytics-section">
                                    <h4>Recent Errors</h4>
                                    <div className="errors-list">
                                        {analytics.errors.map((error, idx) => (
                                            <div key={idx} className="error-item">
                                                <span className="error-message">{error.message}</span>
                                                <span className="error-date">
                                                    {new Date(error.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="empty-state">No analytics data available</div>
                    )}
                </div>
            </div>
        </div>
    );
}
