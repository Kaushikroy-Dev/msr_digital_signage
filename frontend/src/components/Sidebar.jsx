import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Image,
    Layout as LayoutIcon,
    ListVideo,
    Calendar,
    Monitor,
    Building2,
    MapPin,
    Users,
    Terminal,
    Settings,
    LogOut
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import './Sidebar.css';

const menuItems = [
    { path: '/properties', icon: Building2, label: 'Organization', requiresRoles: ['super_admin', 'property_admin'] },
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/media', icon: Image, label: 'Media Library' },
    { path: '/templates', icon: LayoutIcon, label: 'Templates' },
    { path: '/playlists', icon: ListVideo, label: 'Playlists' },
    { path: '/scheduler', icon: Calendar, label: 'Scheduler' },
    { path: '/devices', icon: Monitor, label: 'Devices' },
    { path: '/users', icon: Users, label: 'Users', requiresRole: 'super_admin' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/logs', icon: Terminal, label: 'Activity Logs' },
];

export default function Sidebar() {
    const { user, logout } = useAuthStore();

    // Filter menu items based on user role
    const visibleMenuItems = menuItems.filter(item => {
        if (item.requiresRole) {
            return user?.role === item.requiresRole;
        }
        if (item.requiresRoles) {
            return item.requiresRoles.includes(user?.role);
        }
        return true;
    });

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h1 className="sidebar-title">Digital Signage</h1>
                <p className="sidebar-subtitle">{user?.tenantName || 'Portal'}</p>
            </div>

            <nav className="sidebar-nav">
                {visibleMenuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? 'active' : ''}`
                        }
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">
                            {user?.firstName} {user?.lastName}
                        </div>
                        <div className="sidebar-user-role">{user?.role}</div>
                    </div>
                </div>
                <button onClick={logout} className="sidebar-logout">
                    <LogOut size={18} />
                    Logout
                </button>
            </div>
        </aside>
    );
}
