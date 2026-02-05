import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDeviceId } from '../utils/webViewUtils';
import './DevicePlayer.css';

/**
 * MediaRedirect Component
 * Checks for deviceId (from WebView native app or localStorage) and redirects accordingly
 * - If deviceId exists: Redirect to /player/{deviceId}
 * - If no deviceId: Redirect to /player for registration
 */
export default function MediaRedirect() {
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAndRedirect = async () => {
            try {
                // Get deviceId from native app (WebView) or localStorage (browser)
                const deviceId = getDeviceId();

                if (deviceId) {
                    console.log('[MediaRedirect] DeviceId found, redirecting to player:', deviceId);
                    // Redirect to player with deviceId
                    navigate(`/player/${deviceId}`, { replace: true });
                } else {
                    console.log('[MediaRedirect] No deviceId found, redirecting to registration');
                    // No deviceId - redirect to registration/pairing
                    navigate('/player', { replace: true });
                }
            } catch (error) {
                console.error('[MediaRedirect] Error checking deviceId:', error);
                // On error, redirect to registration
                navigate('/player', { replace: true });
            } finally {
                setLoading(false);
            }
        };

        // Small delay to ensure WebView interfaces are ready
        const timeout = setTimeout(() => {
            checkAndRedirect();
        }, 100);

        return () => clearTimeout(timeout);
    }, [navigate]);

    // Show loading state while checking
    if (loading) {
        return (
            <div className="device-pairing-container">
                <div className="pairing-card">
                    <div className="logo-placeholder">
                        <img src="/logo.svg" alt="Digital Signedge" className="pairing-logo" />
                    </div>
                    <h1>Loading...</h1>
                    <div className="pairing-footer">
                        <div className="loading-spinner"></div>
                        <span>Checking device registration...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Component will redirect, so this shouldn't render
    return null;
}
