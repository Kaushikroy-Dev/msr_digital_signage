import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, CheckCircle, XCircle, Download, Key } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './UserSettings.css';

export default function UserSettings() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [otpCode, setOtpCode] = useState('');
    const [setupStep, setSetupStep] = useState('initial'); // 'initial', 'verifying', 'enabled'
    const [backupCodes, setBackupCodes] = useState([]);
    const [disablePassword, setDisablePassword] = useState('');

    // Fetch 2FA status
    const { data: twoFactorStatus, refetch: refetchStatus } = useQuery({
        queryKey: ['2fa-status'],
        queryFn: async () => {
            const response = await api.get('/auth/2fa/status');
            return response.data;
        }
    });

    // Setup 2FA mutation
    const setup2FAMutation = useMutation({
        mutationFn: async () => {
            const response = await api.post('/auth/2fa/setup');
            return response.data;
        },
        onSuccess: (data) => {
            setBackupCodes(data.backupCodes || []);
            setSetupStep('verifying');
        }
    });

    // Enable 2FA mutation
    const enable2FAMutation = useMutation({
        mutationFn: async (code) => {
            const response = await api.post('/auth/2fa/enable', { otp: code });
            return response.data;
        },
        onSuccess: () => {
            setSetupStep('enabled');
            refetchStatus();
            setOtpCode('');
        }
    });

    // Disable 2FA mutation
    const disable2FAMutation = useMutation({
        mutationFn: async (password) => {
            const response = await api.post('/auth/2fa/disable', { password });
            return response.data;
        },
        onSuccess: () => {
            refetchStatus();
            setDisablePassword('');
            setSetupStep('initial');
        }
    });

    const handleSetup2FA = () => {
        setup2FAMutation.mutate();
    };

    const handleEnable2FA = (e) => {
        e.preventDefault();
        if (otpCode.length !== 6) {
            return;
        }
        enable2FAMutation.mutate(otpCode);
    };

    const handleDisable2FA = (e) => {
        e.preventDefault();
        if (!disablePassword) {
            return;
        }
        disable2FAMutation.mutate(disablePassword);
    };

    const downloadBackupCodes = () => {
        const content = `Digital Signage - Two-Factor Authentication Backup Codes\n\n` +
            `Save these codes in a safe place. You can use them to log in if you lose access to your email.\n\n` +
            backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n') +
            `\n\nGenerated: ${new Date().toLocaleString()}`;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'digitalsignage-2fa-backup-codes.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const isEnabled = twoFactorStatus?.enabled === true;
    const isSetup = twoFactorStatus?.setup === true;

    return (
        <div className="user-settings-page">
            <div className="page-header premium-header">
                <div>
                    <h1>User Settings</h1>
                    <p>Manage your account security settings</p>
                </div>
            </div>

            <div className="settings-content">
                <div className="settings-section">
                    <div className="section-header">
                        <Shield size={24} />
                        <h2>Two-Factor Authentication</h2>
                    </div>

                    {!isSetup && setupStep === 'initial' && (
                        <div className="2fa-setup">
                            <p>Add an extra layer of security to your account with two-factor authentication.</p>
                            <p className="help-text">When enabled, you'll need to enter a code sent to your email after logging in with your password.</p>
                            <button 
                                className="premium-button"
                                onClick={handleSetup2FA}
                                disabled={setup2FAMutation.isLoading}
                            >
                                {setup2FAMutation.isLoading ? 'Setting up...' : 'Enable 2FA'}
                            </button>
                        </div>
                    )}

                    {setupStep === 'verifying' && (
                        <div className="2fa-verification">
                            <p>A verification code has been sent to <strong>{user?.email}</strong></p>
                            <p className="help-text">Please enter the 6-digit code to complete setup.</p>
                            
                            {backupCodes.length > 0 && (
                                <div className="backup-codes-display">
                                    <h3>Backup Codes</h3>
                                    <p className="warning-text">Save these codes now! You won't be able to see them again.</p>
                                    <div className="backup-codes-list">
                                        {backupCodes.map((code, index) => (
                                            <div key={index} className="backup-code-item">{code}</div>
                                        ))}
                                    </div>
                                    <button 
                                        className="premium-button secondary"
                                        onClick={downloadBackupCodes}
                                    >
                                        <Download size={16} />
                                        Download Backup Codes
                                    </button>
                                </div>
                            )}

                            <form onSubmit={handleEnable2FA}>
                                <div className="form-group">
                                    <label>Verification Code</label>
                                    <input
                                        type="text"
                                        className="premium-input"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        maxLength={6}
                                        required
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    className="premium-button"
                                    disabled={otpCode.length !== 6 || enable2FAMutation.isLoading}
                                >
                                    {enable2FAMutation.isLoading ? 'Verifying...' : 'Verify and Enable'}
                                </button>
                            </form>

                            {enable2FAMutation.isError && (
                                <div className="error-message">
                                    {enable2FAMutation.error?.response?.data?.error || 'Failed to enable 2FA'}
                                </div>
                            )}
                        </div>
                    )}

                    {isEnabled && (
                        <div className="2fa-enabled">
                            <div className="status-badge enabled">
                                <CheckCircle size={20} />
                                <span>2FA is Enabled</span>
                            </div>
                            <p>Your account is protected with two-factor authentication.</p>
                            {twoFactorStatus?.updatedAt && (
                                <p className="help-text">Last updated: {new Date(twoFactorStatus.updatedAt).toLocaleString()}</p>
                            )}

                            <div className="disable-section">
                                <h3>Disable 2FA</h3>
                                <p className="warning-text">Disabling 2FA will reduce your account security.</p>
                                <form onSubmit={handleDisable2FA}>
                                    <div className="form-group">
                                        <label>Enter your password to disable 2FA</label>
                                        <input
                                            type="password"
                                            className="premium-input"
                                            value={disablePassword}
                                            onChange={(e) => setDisablePassword(e.target.value)}
                                            placeholder="Your password"
                                            required
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        className="premium-button danger"
                                        disabled={!disablePassword || disable2FAMutation.isLoading}
                                    >
                                        {disable2FAMutation.isLoading ? 'Disabling...' : 'Disable 2FA'}
                                    </button>
                                </form>

                                {disable2FAMutation.isError && (
                                    <div className="error-message">
                                        {disable2FAMutation.error?.response?.data?.error || 'Failed to disable 2FA'}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
