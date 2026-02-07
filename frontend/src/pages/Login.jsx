import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import './Login.css';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuthStore();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [otpCode, setOtpCode] = useState('');
    const [backupCode, setBackupCode] = useState('');
    const [useBackupCode, setUseBackupCode] = useState(false);
    const [requires2FA, setRequires2FA] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', formData);
            
            // Check if 2FA is required
            if (response.data.requires2FA) {
                setRequires2FA(true);
                setLoading(false);
                return;
            }

            // Normal login flow
            const { token, user } = response.data;
            login(user, token);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handle2FAVerify = async (e) => {
        e.preventDefault();
        setError('');
        setOtpLoading(true);

        try {
            const response = await api.post('/auth/2fa/verify', {
                email: formData.email,
                otp: useBackupCode ? null : otpCode,
                backupCode: useBackupCode ? backupCode : null
            });

            const { token } = response.data;
            
            // Get user info (we need to fetch it or store it)
            // For now, decode token or make another call
            const userResponse = await api.get('/auth/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });

            login(userResponse.data, token);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed');
        } finally {
            setOtpLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setError('');
        setOtpLoading(true);

        try {
            await api.post('/auth/2fa/resend', { email: formData.email });
            setError('');
            alert('New verification code sent to your email');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to resend code');
        } finally {
            setOtpLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>Digital Signage Portal</h1>
                    <p>Sign in to manage your content</p>
                </div>

                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}

                {!requires2FA ? (
                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                className="input"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                required
                                autoFocus
                                autoComplete="email"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                className="input"
                                value={formData.password}
                                onChange={(e) =>
                                    setFormData({ ...formData, password: e.target.value })
                                }
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary login-btn"
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handle2FAVerify} className="login-form">
                        <div className="2fa-prompt">
                            <p>A verification code has been sent to <strong>{formData.email}</strong></p>
                            <p className="help-text">Please enter the 6-digit code to complete login.</p>
                        </div>

                        {!useBackupCode ? (
                            <>
                                <div className="form-group">
                                    <label htmlFor="otp">Verification Code</label>
                                    <input
                                        id="otp"
                                        type="text"
                                        className="input"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        maxLength={6}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary login-btn"
                                    disabled={otpLoading || otpCode.length !== 6}
                                >
                                    {otpLoading ? 'Verifying...' : 'Verify'}
                                </button>

                                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                                    <button
                                        type="button"
                                        className="btn btn-link"
                                        onClick={handleResendOTP}
                                        disabled={otpLoading}
                                    >
                                        Resend Code
                                    </button>
                                    <span style={{ margin: '0 8px' }}>|</span>
                                    <button
                                        type="button"
                                        className="btn btn-link"
                                        onClick={() => setUseBackupCode(true)}
                                    >
                                        Use Backup Code
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label htmlFor="backupCode">Backup Code</label>
                                    <input
                                        id="backupCode"
                                        type="text"
                                        className="input"
                                        value={backupCode}
                                        onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                                        placeholder="Enter backup code"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary login-btn"
                                    disabled={otpLoading || !backupCode}
                                >
                                    {otpLoading ? 'Verifying...' : 'Verify Backup Code'}
                                </button>

                                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                                    <button
                                        type="button"
                                        className="btn btn-link"
                                        onClick={() => {
                                            setUseBackupCode(false);
                                            setBackupCode('');
                                        }}
                                    >
                                        Use OTP Code Instead
                                    </button>
                                </div>
                            </>
                        )}

                        <div style={{ marginTop: '16px', textAlign: 'center' }}>
                            <button
                                type="button"
                                className="btn btn-link"
                                onClick={() => {
                                    setRequires2FA(false);
                                    setOtpCode('');
                                    setBackupCode('');
                                    setUseBackupCode(false);
                                }}
                            >
                                Back to Login
                            </button>
                        </div>
                    </form>
                )}

                <div className="login-footer">
                    <p>Demo credentials: demo@example.com / password123</p>
                </div>
            </div>
        </div>
    );
}
