import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar as CalendarIcon, Clock, Edit2, Trash2, X } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import PropertyZoneSelector from '../components/PropertyZoneSelector';
import './Scheduler.css';

const DAYS_OF_WEEK = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];

export default function Scheduler() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [isCreating, setIsCreating] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [deleteConfirmSchedule, setDeleteConfirmSchedule] = useState(null);
    const [selectedPropertyId, setSelectedPropertyId] = useState('');
    const [selectedZoneId, setSelectedZoneId] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        playlistId: '',
        deviceIds: [],
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        daysOfWeek: [],
        recurrencePattern: 'daily',
        isActive: true
    });

    // Fetch schedules
    const { data: schedules } = useQuery({
        queryKey: ['schedules', user?.tenantId, selectedPropertyId, selectedZoneId],
        queryFn: async () => {
            const params = { tenantId: user?.tenantId };
            if (user?.role === 'super_admin') {
                if (selectedPropertyId) params.propertyId = selectedPropertyId;
                if (selectedZoneId) params.zoneId = selectedZoneId;
            }
            const response = await api.get('/schedules', { params });
            return response.data.schedules;
        },
        enabled: !!user?.tenantId
    });

    // Fetch playlists for dropdown (filtered by property/zone)
    const { data: playlists } = useQuery({
        queryKey: ['playlists', user?.tenantId, selectedPropertyId, selectedZoneId],
        queryFn: async () => {
            const params = { tenantId: user?.tenantId };
            if (user?.role === 'super_admin') {
                if (selectedPropertyId) params.propertyId = selectedPropertyId;
                if (selectedZoneId) params.zoneId = selectedZoneId;
            }
            const response = await api.get('/schedules/playlists', { params });
            return response.data.playlists;
        },
        enabled: !!user?.tenantId
    });

    // Fetch devices for selection (filtered by property/zone)
    const { data: devices } = useQuery({
        queryKey: ['devices', user?.tenantId, selectedPropertyId, selectedZoneId],
        queryFn: async () => {
            const params = { tenantId: user?.tenantId };
            if (user?.role === 'super_admin') {
                if (selectedPropertyId) params.propertyId = selectedPropertyId;
                if (selectedZoneId) params.zoneId = selectedZoneId;
            }
            const response = await api.get('/schedules/devices', { params });
            return response.data.devices;
        },
        enabled: !!user?.tenantId
    });

    // Fetch assigned devices for a schedule when editing (only for existing schedules)
    const { data: assignedDevices } = useQuery({
        queryKey: ['schedule-devices', editingSchedule?.id],
        queryFn: async () => {
            if (!editingSchedule?.id) return [];
            try {
                const response = await api.get(`/schedules/${editingSchedule.id}/devices`);
                return response.data.devices || [];
            } catch (error) {
                // If schedule doesn't exist yet (404), return empty array
                if (error.response?.status === 404) {
                    return [];
                }
                throw error;
            }
        },
        enabled: !!editingSchedule?.id && !isCreating
    });

    // Create schedule mutation
    const createMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post('/schedules', {
                ...data,
                tenantId: user.tenantId,
                userId: user.id,
                propertyId: selectedPropertyId || undefined,
                zoneId: selectedZoneId || undefined
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['schedules']);
            setIsCreating(false);
            setEditingSchedule(null); // Ensure editingSchedule is cleared
            resetFormData();
        }
    });

    // Update schedule mutation
    const updateScheduleMutation = useMutation({
        mutationFn: async ({ scheduleId, data }) => {
            const response = await api.put(`/schedules/${scheduleId}`, {
                ...data,
                propertyId: selectedPropertyId || undefined,
                zoneId: selectedZoneId || undefined
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['schedules']);
            setEditingSchedule(null);
            resetFormData();
        },
        onError: (err) => {
            alert(err.response?.data?.error || 'Failed to update schedule');
        }
    });

    // Delete schedule mutation
    const deleteScheduleMutation = useMutation({
        mutationFn: async (scheduleId) => {
            await api.delete(`/schedules/${scheduleId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['schedules']);
            setDeleteConfirmSchedule(null);
        },
        onError: (err) => {
            alert(err.response?.data?.error || 'Failed to delete schedule');
        }
    });

    const resetFormData = () => {
        setFormData({
            name: '',
            playlistId: '',
            deviceIds: [],
            startDate: '',
            endDate: '',
            startTime: '',
            endTime: '',
            daysOfWeek: [],
            recurrencePattern: 'daily',
            isActive: true
        });
    };

    const loadScheduleIntoForm = (schedule) => {
        setFormData({
            name: schedule.name || '',
            playlistId: schedule.playlist_id || '',
            deviceIds: [], // Will be populated from assignedDevices
            startDate: schedule.start_date || '',
            endDate: schedule.end_date || '',
            startTime: schedule.start_time || '',
            endTime: schedule.end_time || '',
            daysOfWeek: schedule.days_of_week || [],
            recurrencePattern: schedule.recurrence_pattern || 'daily',
            isActive: schedule.is_active !== false
        });
        // Set property/zone from schedule if available
        if (schedule.property_id) setSelectedPropertyId(schedule.property_id);
        if (schedule.zone_id) setSelectedZoneId(schedule.zone_id);
    };

    // Update deviceIds when assignedDevices loads
    useEffect(() => {
        if (assignedDevices && editingSchedule && assignedDevices.length > 0) {
            const deviceIds = assignedDevices.map(d => d.id);
            setFormData(prev => ({ ...prev, deviceIds }));
        }
    }, [assignedDevices, editingSchedule]);

    const handleDayToggle = (day) => {
        setFormData(prev => ({
            ...prev,
            daysOfWeek: prev.daysOfWeek.includes(day)
                ? prev.daysOfWeek.filter(d => d !== day)
                : [...prev.daysOfWeek, day]
        }));
    };

    const handleDeviceToggle = (deviceId) => {
        setFormData(prev => ({
            ...prev,
            deviceIds: prev.deviceIds.includes(deviceId)
                ? prev.deviceIds.filter(id => id !== deviceId)
                : [...prev.deviceIds, deviceId]
        }));
    };

    const handleSubmit = () => {
        if (!formData.name || !formData.playlistId) {
            alert('Please fill in all required fields');
            return;
        }
        createMutation.mutate(formData);
    };

    return (
        <div className="scheduler-page">
            <div className="page-header">
                <div>
                    <h1>Scheduler</h1>
                    <p>Schedule content playback with day-parting and recurring patterns</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
                    <Plus size={18} />
                    New Schedule
                </button>
            </div>

            {user?.role === 'super_admin' && !isCreating && !editingSchedule && (
                <div style={{ marginBottom: '20px' }}>
                    <PropertyZoneSelector
                        selectedPropertyId={selectedPropertyId}
                        selectedZoneId={selectedZoneId}
                        onPropertyChange={setSelectedPropertyId}
                        onZoneChange={setSelectedZoneId}
                        required={false}
                    />
                </div>
            )}

            {(isCreating || editingSchedule) && (
                <div className="card create-schedule-card">
                    <h2>{editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}</h2>

                    <div className="form-section">
                        <h3>Basic Information</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Schedule Name *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Breakfast Menu"
                                />
                            </div>
                            <div className="form-group">
                                <label>Playlist *</label>
                                <select
                                    className="input"
                                    value={formData.playlistId}
                                    onChange={(e) => setFormData({ ...formData, playlistId: e.target.value })}
                                >
                                    <option value="">Select a playlist</option>
                                    {playlists?.map((playlist) => (
                                        <option key={playlist.id} value={playlist.id}>
                                            {playlist.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <PropertyZoneSelector
                                selectedPropertyId={selectedPropertyId}
                                selectedZoneId={selectedZoneId}
                                onPropertyChange={setSelectedPropertyId}
                                onZoneChange={setSelectedZoneId}
                                required={user?.role === 'super_admin'}
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Device Assignment</h3>
                        <p className="section-description">Select which devices should play this schedule</p>
                        <div className="devices-grid">
                            {devices?.map((device) => (
                                <div
                                    key={device.id}
                                    className={`device-card ${formData.deviceIds.includes(device.id) ? 'selected' : ''}`}
                                    onClick={() => handleDeviceToggle(device.id)}
                                >
                                    <div className="device-info">
                                        <h4>{device.device_name}</h4>
                                        <p>{device.property_name} • {device.zone_name}</p>
                                    </div>
                                    <div className="device-status">
                                        <span className={`status-dot ${device.status}`}></span>
                                        {device.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {formData.deviceIds.length > 0 && (
                            <p className="selected-count">{formData.deviceIds.length} device(s) selected</p>
                        )}
                    </div>

                    <div className="form-section">
                        <h3>Date Range (Day-Parting)</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>End Date</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Start Time</label>
                                <input
                                    type="time"
                                    className="input"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>End Time</label>
                                <input
                                    type="time"
                                    className="input"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Recurrence Pattern</h3>
                        <div className="form-group">
                            <label>Pattern Type</label>
                            <select
                                className="input"
                                value={formData.recurrencePattern}
                                onChange={(e) => setFormData({ ...formData, recurrencePattern: e.target.value })}
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>

                        <div className="days-selector">
                            <label>Days of Week</label>
                            <div className="days-grid">
                                {DAYS_OF_WEEK.map((day) => (
                                    <button
                                        key={day.value}
                                        className={`day-btn ${formData.daysOfWeek.includes(day.value) ? 'active' : ''}`}
                                        onClick={() => handleDayToggle(day.value)}
                                    >
                                        {day.label.substring(0, 3)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button 
                            className="btn btn-primary" 
                            onClick={() => {
                                if (!formData.name || !formData.playlistId) {
                                    alert('Please fill in all required fields');
                                    return;
                                }
                                if (editingSchedule) {
                                    updateScheduleMutation.mutate({
                                        scheduleId: editingSchedule.id,
                                        data: {
                                            ...formData,
                                            tenantId: user.tenantId,
                                            userId: user.id
                                        }
                                    });
                                } else {
                                    createMutation.mutate(formData);
                                }
                            }}
                            disabled={createMutation.isPending || updateScheduleMutation.isPending}
                        >
                            {editingSchedule 
                                ? (updateScheduleMutation.isPending ? 'Saving...' : 'Save Changes')
                                : (createMutation.isPending ? 'Creating...' : 'Create Schedule')
                            }
                        </button>
                        <button 
                            className="btn btn-outline" 
                            onClick={() => {
                                setIsCreating(false);
                                setEditingSchedule(null);
                                resetFormData();
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {deleteConfirmSchedule && (
                <div className="modal-overlay" onClick={() => setDeleteConfirmSchedule(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>Delete Schedule</h2>
                            <button className="btn-icon" onClick={() => setDeleteConfirmSchedule(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '16px' }}>
                                Are you sure you want to delete <strong>"{deleteConfirmSchedule.name}"</strong>?
                            </p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                This will remove the schedule and all device assignments. This action cannot be undone.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-danger"
                                onClick={() => deleteScheduleMutation.mutate(deleteConfirmSchedule.id)}
                                disabled={deleteScheduleMutation.isPending}
                                style={{ background: '#ef4444', color: 'white' }}
                            >
                                {deleteScheduleMutation.isPending ? 'Deleting...' : 'Delete Schedule'}
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={() => setDeleteConfirmSchedule(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="schedules-list">
                {schedules?.map((schedule) => (
                    <div key={schedule.id} className="schedule-card card">
                        <div className="schedule-header">
                            <div>
                                <h3>{schedule.name}</h3>
                                <p className="schedule-playlist">Playlist: {schedule.playlist_name}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div className="schedule-status">
                                    <span className={`status-badge ${schedule.is_active ? 'active' : 'inactive'}`}>
                                        {schedule.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <button
                                    className="btn-icon"
                                    onClick={() => {
                                        setEditingSchedule(schedule);
                                        loadScheduleIntoForm(schedule);
                                        setIsCreating(false);
                                    }}
                                    title="Edit Schedule"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    className="btn-icon"
                                    onClick={() => setDeleteConfirmSchedule(schedule)}
                                    title="Delete Schedule"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="schedule-details">
                            {schedule.start_date && (
                                <div className="detail-item">
                                    <CalendarIcon size={16} />
                                    <span>{schedule.start_date} to {schedule.end_date || 'Ongoing'}</span>
                                </div>
                            )}
                            {schedule.start_time && (
                                <div className="detail-item">
                                    <Clock size={16} />
                                    <span>{schedule.start_time} - {schedule.end_time}</span>
                                </div>
                            )}
                            {schedule.recurrence_pattern && (
                                <div className="detail-item">
                                    <span className="recurrence-badge">{schedule.recurrence_pattern}</span>
                                </div>
                            )}
                            {schedule.days_of_week && schedule.days_of_week.length > 0 && (
                                <div className="detail-item">
                                    <span>Days: {schedule.days_of_week.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label.substring(0, 3) || d).join(', ')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
