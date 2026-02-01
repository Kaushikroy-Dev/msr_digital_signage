import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Monitor, Image, ListVideo, Calendar, Activity, AlertCircle, Building2 } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './Dashboard.css';

export default function Dashboard() {
    const { user } = useAuthStore();
    const [selectedPropertyId, setSelectedPropertyId] = useState('');

    // Fetch properties list for super_admin dropdown
    const { data: properties } = useQuery({
        queryKey: ['properties', user?.tenantId],
        queryFn: async () => {
            const response = await api.get('/devices/properties', {
                params: { tenantId: user?.tenantId }
            });
            return response.data.properties;
        },
        enabled: !!user?.tenantId && user?.role === 'super_admin'
    });

    // Fetch dashboard stats
    const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
        queryKey: ['dashboard-stats', selectedPropertyId],
        queryFn: async () => {
            const params = {};
            if (user?.role === 'super_admin' && selectedPropertyId) {
                params.propertyId = selectedPropertyId;
            }
            const response = await api.get('/analytics/dashboard-stats', { params });
            return response.data;
        }
    });

    // Fetch activity logs
    const { data: activityData, isLoading: activityLoading, isError: activityError } = useQuery({
        queryKey: ['activity'],
        queryFn: async () => {
            const response = await api.get('/analytics/activity');
            return response.data;
        }
    });

    const statCards = [
        {
            title: 'Total Devices',
            value: stats?.totalDevices || 0,
            subtitle: `${stats?.onlineDevices || 0} online`,
            icon: Monitor,
            color: '#1976d2'
        },
        {
            title: 'Media Assets',
            value: stats?.totalMedia || 0,
            subtitle: 'Images & Videos',
            icon: Image,
            color: '#7c4dff'
        },
        {
            title: 'Playlists',
            value: stats?.totalPlaylists || 0,
            subtitle: 'Active playlists',
            icon: ListVideo,
            color: '#00acc1'
        },
        {
            title: 'Schedules',
            value: stats?.activeSchedules || 0,
            subtitle: 'Active schedules',
            icon: Calendar,
            color: '#43a047'
        }
    ];

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Welcome back, {user?.firstName}!</h1>
                    <p>Here's what's happening with your digital signage network</p>
                </div>
                {user?.role === 'super_admin' && properties && properties.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Building2 size={20} style={{ color: '#666' }} />
                        <select
                            value={selectedPropertyId}
                            onChange={(e) => setSelectedPropertyId(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #ddd',
                                fontSize: '14px',
                                minWidth: '200px',
                                background: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">All Properties</option>
                            {properties.map(property => (
                                <option key={property.id} value={property.id}>
                                    {property.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="grid grid-4">
                {statsLoading ? (
                    <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#666' }}>
                        Loading dashboard statistics...
                    </div>
                ) : statsError ? (
                    <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#d32f2f' }}>
                        Failed to load dashboard statistics
                    </div>
                ) : (
                    statCards.map((stat) => (
                        <div key={stat.title} className="stat-card">
                            <div className="stat-icon" style={{ background: `${stat.color}15`, color: stat.color }}>
                                <stat.icon size={24} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stat.value}</div>
                                <div className="stat-title">{stat.title}</div>
                                <div className="stat-subtitle">{stat.subtitle}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="grid grid-2" style={{ marginTop: '24px' }}>
                <div className="card">
                    <div className="card-header">
                        <h2>Recent Activity</h2>
                        <Activity size={20} />
                    </div>
                    <div className="activity-list">
                        {activityLoading ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                Loading activity...
                            </div>
                        ) : activityError ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#d32f2f' }}>
                                Failed to load activity
                            </div>
                        ) : activityData?.activities && activityData.activities.length > 0 ? (
                            activityData.activities.map((activity) => (
                                <div key={activity.id} className="activity-item">
                                    <div className="activity-dot"></div>
                                    <div className="activity-content">
                                        <div className="activity-action">{activity.action}</div>
                                        <div className="activity-meta">
                                            {activity.user} · {activity.time}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                No recent activity
                            </div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h2>System Status</h2>
                        <AlertCircle size={20} />
                    </div>
                    <div className="status-list">
                        <div className="status-item">
                            <div className="status-indicator status-success"></div>
                            <div className="status-content">
                                <div className="status-title">API Gateway</div>
                                <div className="status-subtitle">Operational</div>
                            </div>
                        </div>
                        <div className="status-item">
                            <div className="status-indicator status-success"></div>
                            <div className="status-content">
                                <div className="status-title">Content Delivery</div>
                                <div className="status-subtitle">Operational</div>
                            </div>
                        </div>
                        <div className="status-item">
                            <div className="status-indicator status-warning"></div>
                            <div className="status-content">
                                <div className="status-title">Media Processing</div>
                                <div className="status-subtitle">2 jobs in queue</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
