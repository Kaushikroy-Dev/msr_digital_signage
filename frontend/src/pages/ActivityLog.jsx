import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api, { API_BASE_URL } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Terminal, Filter, Download, Play, Pause, Search, X } from 'lucide-react';
import './ActivityLog.css';

export default function ActivityLog() {
    const { user } = useAuthStore();
    const [filters, setFilters] = useState({
        userId: '',
        action: '',
        resourceType: '',
        startDate: '',
        endDate: ''
    });
    const [isLive, setIsLive] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [autoScroll, setAutoScroll] = useState(true);
    const logsEndRef = useRef(null);
    const logContainerRef = useRef(null);
    const wsRef = useRef(null);
    const [liveLogs, setLiveLogs] = useState([]);
    
    // Fetch historical logs
    const { data: historicalData, refetch } = useQuery({
        queryKey: ['activity-logs', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            params.append('limit', '100');
            const response = await api.get(`/analytics/activity?${params}`);
            return response.data;
        },
        enabled: !isLive, // Only fetch when not in live mode
        refetchInterval: false
    });
    
    // WebSocket connection for live logs
    useEffect(() => {
        if (!isLive || !user?.tenantId) return;
        
        const apiUrl = API_BASE_URL;
        const wsUrl = apiUrl.replace(/^http/, 'ws').replace(/^https/, 'wss') + '/ws';
        
        console.log('[ActivityLog] Connecting to WebSocket:', wsUrl);
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
            console.log('[ActivityLog] WebSocket connected');
            wsRef.current.send(JSON.stringify({
                type: 'subscribe_logs',
                tenantId: user.tenantId
            }));
        };
        
        wsRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'log') {
                    setLiveLogs(prev => {
                        const newLogs = [data.data, ...prev];
                        // Keep only last 1000 logs to prevent memory issues
                        return newLogs.slice(0, 1000);
                    });
                } else if (data.type === 'logs_subscribed') {
                    console.log('[ActivityLog] Successfully subscribed to logs');
                }
            } catch (error) {
                console.error('[ActivityLog] Error parsing WebSocket message:', error);
            }
        };
        
        wsRef.current.onerror = (error) => {
            console.error('[ActivityLog] WebSocket error:', error);
        };
        
        wsRef.current.onclose = () => {
            console.log('[ActivityLog] WebSocket disconnected');
            // Attempt to reconnect if still in live mode
            if (isLive) {
                setTimeout(() => {
                    if (wsRef.current?.readyState === WebSocket.CLOSED) {
                        console.log('[ActivityLog] Attempting to reconnect...');
                        // Reconnect will be handled by useEffect
                    }
                }, 3000);
            }
        };
        
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [isLive, user?.tenantId]);
    
    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [liveLogs, autoScroll]);
    
    // Get all logs (live or historical)
    const allLogs = isLive ? liveLogs : (historicalData?.activities || []);
    
    // Filter logs by search term
    const filteredLogs = allLogs.filter(log => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            log.action?.toLowerCase().includes(searchLower) ||
            log.user?.toLowerCase().includes(searchLower) ||
            log.userEmail?.toLowerCase().includes(searchLower) ||
            log.resourceType?.toLowerCase().includes(searchLower) ||
            log.ipAddress?.toLowerCase().includes(searchLower)
        );
    });
    
    // Export logs to CSV
    const exportLogs = () => {
        const csv = [
            ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'User Agent', 'Details'].join(','),
            ...filteredLogs.map(log => {
                const timestamp = log.timestamp || log.created_at || new Date().toISOString();
                const details = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '';
                return [
                    timestamp,
                    log.user || log.user_name || 'System',
                    log.action || '',
                    log.resourceType || log.resource_type || '',
                    log.resourceId || log.resource_id || '',
                    log.ipAddress || log.ip_address || '',
                    (log.userAgent || log.user_agent || '').replace(/"/g, '""'),
                    details
                ].map(field => `"${field}"`).join(',');
            })
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const clearFilters = () => {
        setFilters({
            userId: '',
            action: '',
            resourceType: '',
            startDate: '',
            endDate: ''
        });
        setSearchTerm('');
    };
    
    const getLogLevel = (action) => {
        if (!action) return 'info';
        const actionLower = action.toLowerCase();
        if (actionLower.includes('delete') || actionLower.includes('remove')) return 'error';
        if (actionLower.includes('create') || actionLower.includes('upload') || actionLower.includes('add')) return 'info';
        if (actionLower.includes('update') || actionLower.includes('edit') || actionLower.includes('modify')) return 'warning';
        return 'info';
    };
    
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };
    
    return (
        <div className="activity-log-page">
            <div className="activity-log-header">
                <div className="header-left">
                    <Terminal className="header-icon" size={24} />
                    <h1>Activity Logs</h1>
                    {isLive && (
                        <span className="live-indicator">
                            <span className="live-dot"></span>
                            LIVE
                        </span>
                    )}
                </div>
                <div className="header-actions">
                    <button 
                        className={`live-toggle ${isLive ? 'active' : ''}`}
                        onClick={() => {
                            setIsLive(!isLive);
                            if (!isLive) {
                                refetch();
                            }
                        }}
                        title={isLive ? 'Pause live updates' : 'Resume live updates'}
                    >
                        {isLive ? <Pause size={16} /> : <Play size={16} />}
                        {isLive ? 'Pause' : 'Resume'}
                    </button>
                    <button 
                        className={`auto-scroll-toggle ${autoScroll ? 'active' : ''}`}
                        onClick={() => setAutoScroll(!autoScroll)}
                        title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
                    >
                        Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
                    </button>
                    <button onClick={exportLogs} className="export-btn" title="Export logs to CSV">
                        <Download size={16} />
                        Export
                    </button>
                </div>
            </div>
            
            <div className="activity-log-filters">
                <div className="search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className="clear-search" onClick={() => setSearchTerm('')}>
                            <X size={14} />
                        </button>
                    )}
                </div>
                <select
                    value={filters.resourceType}
                    onChange={(e) => setFilters({...filters, resourceType: e.target.value})}
                    placeholder="Resource Type"
                >
                    <option value="">All Resource Types</option>
                    <option value="media">Media</option>
                    <option value="template">Template</option>
                    <option value="playlist">Playlist</option>
                    <option value="schedule">Schedule</option>
                    <option value="device">Device</option>
                    <option value="user">User</option>
                    <option value="property">Property</option>
                    <option value="auth">Auth</option>
                </select>
                <input
                    type="text"
                    value={filters.action}
                    onChange={(e) => setFilters({...filters, action: e.target.value})}
                    placeholder="Action filter..."
                />
                <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    placeholder="Start Date"
                />
                <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    placeholder="End Date"
                />
                {(filters.resourceType || filters.action || filters.startDate || filters.endDate) && (
                    <button className="clear-filters" onClick={clearFilters} title="Clear all filters">
                        <X size={16} />
                        Clear
                    </button>
                )}
            </div>
            
            <div className="log-viewer" ref={logContainerRef}>
                {filteredLogs.length === 0 ? (
                    <div className="no-logs">
                        {isLive ? 'Waiting for logs...' : 'No logs found'}
                    </div>
                ) : (
                    filteredLogs.map((log, index) => {
                        const logLevel = getLogLevel(log.action);
                        return (
                            <div key={log.id || index} className={`log-entry log-${logLevel}`}>
                                <span className="log-timestamp">{formatTimestamp(log.timestamp || log.created_at)}</span>
                                <span className={`log-level log-level-${logLevel}`}>
                                    {logLevel.toUpperCase()}
                                </span>
                                <span className="log-user" title={log.userEmail || log.user_email}>
                                    {log.user || log.user_name || 'System'}
                                </span>
                                <span className="log-action">{log.action || 'Unknown action'}</span>
                                {log.resourceType && (
                                    <span className="log-resource" title={`Resource ID: ${log.resourceId || log.resource_id || 'N/A'}`}>
                                        {log.resourceType}
                                    </span>
                                )}
                                {log.ipAddress && (
                                    <span className="log-ip" title={log.userAgent || log.user_agent}>
                                        {log.ipAddress}
                                    </span>
                                )}
                            </div>
                        );
                    })
                )}
                <div ref={logsEndRef} />
            </div>
            
            {!isLive && historicalData && (
                <div className="log-pagination">
                    <div className="pagination-info">
                        Showing {filteredLogs.length} of {historicalData.total || 0} logs
                    </div>
                </div>
            )}
        </div>
    );
}
