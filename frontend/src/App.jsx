import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MediaLibrary from './pages/MediaLibrary';
import Templates from './pages/Templates';
import Playlists from './pages/Playlists';
import Scheduler from './pages/Scheduler';
import Devices from './pages/Devices';
import UserManagement from './pages/UserManagement';
import Organization from './pages/Organization';
import DevicePlayer from './pages/DevicePlayer';
import Layout from './components/Layout';

const queryClient = new QueryClient();

function PrivateRoute({ children }) {
    const { isAuthenticated } = useAuthStore();
    return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    {/* Public route for device player */}
                    <Route path="/player" element={<DevicePlayer />} />
                    <Route path="/player/:deviceId" element={<DevicePlayer />} />
                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <Layout />
                            </PrivateRoute>
                        }
                    >
                        <Route index element={<Dashboard />} />
                        <Route path="media" element={<MediaLibrary />} />
                        <Route path="templates" element={<Templates />} />
                        <Route path="playlists" element={<Playlists />} />
                        <Route path="scheduler" element={<Scheduler />} />
                        <Route path="devices" element={<Devices />} />
                        <Route path="properties" element={<Organization />} />
                        <Route path="users" element={<UserManagement />} />
                        <Route path="organization" element={<Organization />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;
