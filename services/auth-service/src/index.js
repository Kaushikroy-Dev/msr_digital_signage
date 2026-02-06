const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const pool = require('./config/database');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// DATABASE INITIALIZATION (Auto-create Admin)
// ============================================
async function initializeAdmin() {
    let client;
    try {
        console.log('🔍 [Initialization] Checking for administrative users...');

        // 1. Ensure the demo tenant exists
        const tenants = await pool.query('SELECT id FROM tenants WHERE subdomain = $1', ['demo']);
        let tenantId;
        if (tenants.rows.length === 0) {
            const newTenant = await pool.query(`
                INSERT INTO tenants (name, subdomain, status, subscription_tier)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, ['Demo Organization', 'demo', 'active', 'enterprise']);
            tenantId = newTenant.rows[0].id;
            console.log(`🏢 [Initialization] Created demo tenant: ${tenantId}`);
        } else {
            tenantId = tenants.rows[0].id;
            console.log(`📡 [Initialization] Using existing demo tenant: ${tenantId}`);
        }

        // 2. Ensure demo@example.com exists or update password
        const demoUser = await pool.query('SELECT id FROM users WHERE email = $1', ['demo@example.com']);
        if (demoUser.rows.length === 0) {
            console.log('🌱 [Initialization] Creating demo@example.com user...');
            const passwordHash = await bcrypt.hash('Test@123', 10);
            await pool.query(`
                INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [tenantId, 'demo@example.com', passwordHash, 'Demo', 'User', 'super_admin']);
            console.log('✅ [Initialization] demo@example.com created with Test@123');
        } else {
            // Update existing demo user password
            console.log('🔄 [Initialization] Updating demo@example.com password to Test@123...');
            const passwordHash = await bcrypt.hash('Test@123', 10);
            await pool.query(`
                UPDATE users SET password_hash = $1 WHERE email = $2
            `, [passwordHash, 'demo@example.com']);
            console.log('✅ [Initialization] demo@example.com password updated to Test@123');
        }

        // 3. Ensure admin@admin.com exists (for legacy support if needed)
        const adminUser = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@admin.com']);
        if (adminUser.rows.length === 0) {
            console.log('🌱 [Initialization] Creating admin@admin.com user...');
            const passwordHash = await bcrypt.hash('password123', 10);
            await pool.query(`
                INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [tenantId, 'admin@admin.com', passwordHash, 'System', 'Admin', 'super_admin']);
            console.log('✅ [Initialization] admin@admin.com created with password123');
        }

        const count = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['super_admin']);
        console.log(`✅ [Initialization] System has ${count.rows[0].count} super admin(s).`);
    } catch (error) {
        console.error('❌ [Initialization] Database initialization failed:', error);
    }
}

// Run initialization with a slight delay to ensure DB connection is stable
setTimeout(initializeAdmin, 3000);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// ============================================
// PASSWORD VALIDATION & HISTORY FUNCTIONS
// ============================================

/**
 * Validate password strength
 * Requirements: 8+ chars, uppercase, special char, numeric
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, error?: string}}
 */
function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Password is required' };
    }

    if (password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters long' };
    }

    if (!/[A-Z]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one uppercase letter' };
    }

    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)' };
    }

    if (!/[0-9]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one numeric digit' };
    }

    return { valid: true };
}

/**
 * Check if plain password matches any of the last 6 password hashes
 * @param {string} userId - User ID
 * @param {string} plainPassword - Plain text password to check
 * @param {Pool} pool - Database pool
 * @returns {Promise<boolean>} - True if password is NOT in history, false if found in history
 */
async function checkPasswordHistory(userId, plainPassword, pool) {
    try {
        // Get last 6 password hashes from history
        const historyResult = await pool.query(
            `SELECT password_hash 
             FROM password_history 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 6`,
            [userId]
        );

        // Compare plain password against all historical hashes
        for (const row of historyResult.rows) {
            const isMatch = await bcrypt.compare(plainPassword, row.password_hash);
            if (isMatch) {
                return false; // Password found in history
            }
        }

        return true; // Password not in history, safe to use
    } catch (error) {
        console.error('[PasswordHistory] Error checking password history:', error);
        // On error, allow password change (fail open for availability)
        return true;
    }
}

/**
 * Save password to history (keep only last 6)
 * @param {string} userId - User ID
 * @param {string} passwordHash - Hashed password to save
 * @param {Pool} pool - Database pool
 */
async function savePasswordHistory(userId, passwordHash, pool) {
    try {
        // Insert new password hash
        await pool.query(
            `INSERT INTO password_history (user_id, password_hash)
             VALUES ($1, $2)`,
            [userId, passwordHash]
        );

        // Get count of password history entries
        const countResult = await pool.query(
            `SELECT COUNT(*) as count FROM password_history WHERE user_id = $1`,
            [userId]
        );

        const count = parseInt(countResult.rows[0].count);

        // If more than 6 entries, delete oldest ones
        if (count > 6) {
            await pool.query(
                `DELETE FROM password_history 
                 WHERE id IN (
                     SELECT id FROM password_history 
                     WHERE user_id = $1 
                     ORDER BY created_at ASC 
                     LIMIT $2
                 )`,
                [userId, count - 6]
            );
        }
    } catch (error) {
        console.error('[PasswordHistory] Error saving password history:', error);
        // Don't throw - password history is not critical for user creation
    }
}

// ============================================
// TWO-FACTOR AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Generate 6-digit OTP code
 * @returns {string} 6-digit OTP code
 */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate backup codes (8 codes, each 8 characters)
 * @returns {string[]} Array of backup codes
 */
function generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 8; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(code);
    }
    return codes;
}

/**
 * Hash backup code for storage
 * @param {string} code - Plain backup code
 * @returns {Promise<string>} Hashed backup code
 */
async function hashBackupCode(code) {
    return await bcrypt.hash(code, 10);
}

/**
 * Verify backup code
 * @param {string} code - Plain backup code
 * @param {string} hash - Hashed backup code
 * @returns {Promise<boolean>} True if code matches
 */
async function verifyBackupCode(code, hash) {
    return await bcrypt.compare(code, hash);
}

/**
 * Configure email transporter
 * Uses environment variables for SMTP configuration
 */
function createEmailTransporter() {
    // Use environment variables for email configuration
    // Default to console logging if no email config provided
    if (!process.env.SMTP_HOST) {
        console.warn('[2FA] No SMTP configuration found. Email sending will be logged to console.');
        return {
            sendMail: async (options) => {
                console.log('[2FA Email]', options);
                return { messageId: 'console-log' };
            }
        };
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

const emailTransporter = createEmailTransporter();

/**
 * Send OTP code via email
 * @param {string} email - User email address
 * @param {string} code - 6-digit OTP code
 * @returns {Promise<void>}
 */
async function sendOTPEmail(email, code) {
    const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@digitalsignage.com',
        to: email,
        subject: 'Your Digital Signage Login Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Your Login Verification Code</h2>
                <p>Your one-time password (OTP) for Digital Signage login is:</p>
                <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                    ${code}
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply.</p>
            </div>
        `,
        text: `Your Digital Signage login code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`
    };

    try {
        await emailTransporter.sendMail(mailOptions);
        console.log(`[2FA] OTP sent to ${email}`);
    } catch (error) {
        console.error('[2FA] Error sending email:', error);
        throw new Error('Failed to send OTP email');
    }
}

// Validation schemas
const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(), // Custom validation will check strength
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'Passwords do not match'
    }),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    tenantId: Joi.string().uuid().required(),
    role: Joi.string().valid('super_admin', 'property_admin', 'content_editor', 'viewer').default('viewer')
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

// Register new user
app.post('/register', async (req, res) => {
    try {
        const { error, value } = registerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { email, password, confirmPassword, firstName, lastName, tenantId, role } = value;

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({ error: passwordValidation.error });
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const result = await pool.query(
            `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, role, created_at`,
            [tenantId, email, passwordHash, firstName, lastName, role]
        );

        const user = result.rows[0];

        // Save password to history
        await savePasswordHistory(user.id, passwordHash, pool);

        // Log audit
        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
            [tenantId, user.id, 'register', 'user', req.ip]
        );

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login endpoint - GET handler for better error message
app.get('/login', (req, res) => {
    res.status(405).json({ 
        error: 'Method not allowed',
        message: 'Login endpoint only accepts POST requests. Please use the frontend login form.',
        allowedMethods: ['POST']
    });
});

// Login
app.post('/login', async (req, res) => {
    try {
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { email, password } = value;

        // Get user
        const result = await pool.query(
            `SELECT u.*, t.name as tenant_name, t.subdomain
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1 AND u.is_active = true`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user has 2FA enabled
        const twoFactorResult = await pool.query(
            'SELECT is_enabled FROM user_2fa WHERE user_id = $1',
            [user.id]
        );

        const has2FA = twoFactorResult.rows.length > 0 && twoFactorResult.rows[0].is_enabled;

        if (has2FA) {
            // Generate OTP code
            const otpCode = generateOTP();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            // Invalidate old OTPs for this user
            await pool.query(
                'UPDATE otp_codes SET used = true WHERE user_id = $1 AND used = false',
                [user.id]
            );

            // Save new OTP
            await pool.query(
                'INSERT INTO otp_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
                [user.id, otpCode, expiresAt]
            );

            // Send OTP via email
            try {
                await sendOTPEmail(user.email, otpCode);
            } catch (emailError) {
                console.error('[Login] Failed to send 2FA email:', emailError);
                return res.status(500).json({ error: 'Failed to send verification code' });
            }

            // Return response indicating 2FA is required
            return res.json({
                requires2FA: true,
                otpSent: true,
                message: 'Verification code sent to your email'
            });
        }

        // Update last login
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Log audit
        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [user.tenant_id, user.id, 'login', 'user', req.ip, req.get('user-agent')]
        );

        // Generate JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                tenantId: user.tenant_id,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                tenantId: user.tenant_id,
                tenantName: user.tenant_name,
                subdomain: user.subdomain
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Verify token (middleware endpoint)
app.post('/verify', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.replace('Bearer ', '');

        console.log('[Auth] Verify request received:', {
            hasAuthHeader: !!authHeader,
            hasToken: !!token,
            jwtSecretLength: JWT_SECRET ? JWT_SECRET.length : 0
        });

        if (!token) {
            console.warn('[Auth] No token provided in /verify');
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('[Auth] Token decoded successfully for /verify:', {
            userId: decoded.userId,
            role: decoded.role
        });

        // Get fresh user data
        const result = await pool.query(
            `SELECT id, email, first_name, last_name, role, tenant_id, is_active
       FROM users WHERE id = $1`,
            [decoded.userId]
        );

        if (result.rows.length === 0 || !result.rows[0].is_active) {
            console.warn('[Auth] User not found or inactive in /verify:', decoded.userId);
            return res.status(401).json({ error: 'Invalid token' });
        }

        res.json({
            valid: true,
            user: {
                id: result.rows[0].id,
                email: result.rows[0].email,
                firstName: result.rows[0].first_name,
                lastName: result.rows[0].last_name,
                role: result.rows[0].role,
                tenantId: result.rows[0].tenant_id
            }
        });
    } catch (error) {
        console.error('[Auth] Verification error in /verify:', {
            name: error.name,
            message: error.message,
            secretLength: JWT_SECRET ? JWT_SECRET.length : 0
        });
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// TWO-FACTOR AUTHENTICATION ENDPOINTS
// ============================================

// 2FA Setup - Initialize 2FA for user
app.post('/auth/2fa/setup', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Check if 2FA already exists
        const existing2FA = await pool.query(
            'SELECT id FROM user_2fa WHERE user_id = $1',
            [userId]
        );

        if (existing2FA.rows.length > 0) {
            return res.status(400).json({ error: '2FA is already set up for this user' });
        }

        // Generate secret key and backup codes
        const secretKey = crypto.randomBytes(32).toString('hex');
        const backupCodes = generateBackupCodes();
        const hashedBackupCodes = await Promise.all(backupCodes.map(code => hashBackupCode(code)));

        // Get user email
        const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const userEmail = userResult.rows[0].email;

        // Generate initial OTP for verification
        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Save 2FA setup (not enabled yet)
        await pool.query(
            `INSERT INTO user_2fa (user_id, is_enabled, secret_key, backup_codes)
             VALUES ($1, $2, $3, $4)`,
            [userId, false, secretKey, JSON.stringify(hashedBackupCodes)]
        );

        // Save OTP for verification
        await pool.query(
            'INSERT INTO otp_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
            [userId, otpCode, expiresAt]
        );

        // Send OTP via email
        try {
            await sendOTPEmail(userEmail, otpCode);
        } catch (emailError) {
            console.error('[2FA Setup] Failed to send email:', emailError);
            return res.status(500).json({ error: 'Failed to send verification code' });
        }

        // Return backup codes (plain text, shown only once)
        res.json({
            message: '2FA setup initiated. Please verify with the code sent to your email.',
            backupCodes: backupCodes, // Return plain codes for user to save
            requiresVerification: true
        });
    } catch (error) {
        console.error('[2FA Setup] Error:', error);
        res.status(500).json({ error: 'Failed to setup 2FA' });
    }
});

// 2FA Enable - Verify OTP and enable 2FA
app.post('/auth/2fa/enable', authenticateToken, async (req, res) => {
    try {
        const { otp } = req.body;
        const userId = req.user.userId;

        if (!otp) {
            return res.status(400).json({ error: 'OTP code is required' });
        }

        // Verify OTP
        const otpResult = await pool.query(
            `SELECT id, expires_at, used FROM otp_codes 
             WHERE user_id = $1 AND code = $2 AND used = false 
             ORDER BY created_at DESC LIMIT 1`,
            [userId, otp]
        );

        if (otpResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired OTP code' });
        }

        const otpRecord = otpResult.rows[0];
        const expiresAt = new Date(otpRecord.expires_at);

        if (expiresAt < new Date()) {
            return res.status(400).json({ error: 'OTP code has expired' });
        }

        // Mark OTP as used
        await pool.query('UPDATE otp_codes SET used = true WHERE id = $1', [otpRecord.id]);

        // Enable 2FA
        await pool.query(
            'UPDATE user_2fa SET is_enabled = true WHERE user_id = $1',
            [userId]
        );

        res.json({ message: '2FA enabled successfully' });
    } catch (error) {
        console.error('[2FA Enable] Error:', error);
        res.status(500).json({ error: 'Failed to enable 2FA' });
    }
});

// 2FA Disable - Disable 2FA (requires password verification)
app.post('/auth/2fa/disable', authenticateToken, async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.user.userId;

        if (!password) {
            return res.status(400).json({ error: 'Password is required to disable 2FA' });
        }

        // Verify password
        const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isValidPassword = await bcrypt.compare(password, userResult.rows[0].password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Disable 2FA
        await pool.query(
            'UPDATE user_2fa SET is_enabled = false WHERE user_id = $1',
            [userId]
        );

        res.json({ message: '2FA disabled successfully' });
    } catch (error) {
        console.error('[2FA Disable] Error:', error);
        res.status(500).json({ error: 'Failed to disable 2FA' });
    }
});

// 2FA Verify - Verify OTP or backup code after login
app.post('/auth/2fa/verify', async (req, res) => {
    try {
        const { email, otp, backupCode } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        if (!otp && !backupCode) {
            return res.status(400).json({ error: 'OTP code or backup code is required' });
        }

        // Get user
        const userResult = await pool.query(
            'SELECT id, tenant_id, role FROM users WHERE email = $1 AND is_active = true',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Verify OTP or backup code
        let isValid = false;

        if (otp) {
            // Verify OTP code
            const otpResult = await pool.query(
                `SELECT id, expires_at, used FROM otp_codes 
                 WHERE user_id = $1 AND code = $2 AND used = false 
                 ORDER BY created_at DESC LIMIT 1`,
                [user.id, otp]
            );

            if (otpResult.rows.length > 0) {
                const otpRecord = otpResult.rows[0];
                const expiresAt = new Date(otpRecord.expires_at);

                if (expiresAt >= new Date()) {
                    isValid = true;
                    // Mark OTP as used
                    await pool.query('UPDATE otp_codes SET used = true WHERE id = $1', [otpRecord.id]);
                }
            }
        } else if (backupCode) {
            // Verify backup code
            const twoFactorResult = await pool.query(
                'SELECT backup_codes FROM user_2fa WHERE user_id = $1 AND is_enabled = true',
                [user.id]
            );

            if (twoFactorResult.rows.length > 0) {
                const hashedBackupCodes = JSON.parse(twoFactorResult.rows[0].backup_codes || '[]');
                
                for (const hashedCode of hashedBackupCodes) {
                    const codeMatch = await verifyBackupCode(backupCode, hashedCode);
                    if (codeMatch) {
                        isValid = true;
                        // Remove used backup code
                        const updatedCodes = hashedBackupCodes.filter((_, index) => 
                            hashedBackupCodes.indexOf(hashedCode) !== index
                        );
                        await pool.query(
                            'UPDATE user_2fa SET backup_codes = $1 WHERE user_id = $2',
                            [JSON.stringify(updatedCodes), user.id]
                        );
                        break;
                    }
                }
            }
        }

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid verification code' });
        }

        // Update last login
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Log audit
        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [user.tenant_id, user.id, 'login', 'user', req.ip, req.get('user-agent')]
        );

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: email,
                tenantId: user.tenant_id,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        res.json({
            token,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('[2FA Verify] Error:', error);
        res.status(500).json({ error: 'Failed to verify 2FA' });
    }
});

// Resend OTP
app.post('/auth/2fa/resend', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Get user
        const userResult = await pool.query(
            'SELECT id, email FROM users WHERE email = $1 AND is_active = true',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Check if 2FA is enabled
        const twoFactorResult = await pool.query(
            'SELECT is_enabled FROM user_2fa WHERE user_id = $1',
            [user.id]
        );

        if (twoFactorResult.rows.length === 0 || !twoFactorResult.rows[0].is_enabled) {
            return res.status(400).json({ error: '2FA is not enabled for this user' });
        }

        // Generate new OTP
        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Invalidate old OTPs
        await pool.query(
            'UPDATE otp_codes SET used = true WHERE user_id = $1 AND used = false',
            [user.id]
        );

        // Save new OTP
        await pool.query(
            'INSERT INTO otp_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
            [user.id, otpCode, expiresAt]
        );

        // Send OTP via email
        try {
            await sendOTPEmail(user.email, otpCode);
            res.json({ message: 'New verification code sent to your email' });
        } catch (emailError) {
            console.error('[2FA Resend] Failed to send email:', emailError);
            res.status(500).json({ error: 'Failed to send verification code' });
        }
    } catch (error) {
        console.error('[2FA Resend] Error:', error);
        res.status(500).json({ error: 'Failed to resend OTP' });
    }
});

// Get 2FA status
app.get('/auth/2fa/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            'SELECT is_enabled, created_at, updated_at FROM user_2fa WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.json({ enabled: false, setup: false });
        }

        res.json({
            enabled: result.rows[0].is_enabled,
            setup: true,
            createdAt: result.rows[0].created_at,
            updatedAt: result.rows[0].updated_at
        });
    } catch (error) {
        console.error('[2FA Status] Error:', error);
        res.status(500).json({ error: 'Failed to get 2FA status' });
    }
});

// Get user profile
app.get('/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.tenant_id, u.created_at,
              t.name as tenant_name, t.subdomain
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1`,
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        res.json({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            tenantId: user.tenant_id,
            tenantName: user.tenant_name,
            subdomain: user.subdomain,
            createdAt: user.created_at
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// USER MANAGEMENT (Super Admin Only)
// ============================================

// Get all users for a tenant
app.get('/users', async (req, res) => {
    try {
        const { tenantId } = req.query;

        const result = await pool.query(
            `SELECT id, email, first_name, last_name, role, is_active, last_login, created_at
             FROM users
             WHERE tenant_id = $1
             ORDER BY created_at DESC`,
            [tenantId]
        );

        res.json({ users: result.rows });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Create a new user
app.post('/users', async (req, res) => {
    const client = await pool.connect();
    try {
        const { tenantId, email, password, confirmPassword, firstName, lastName, role, propertyAccess, zoneAccess } = req.body;

        // Validate password strength
        if (password) {
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.valid) {
                return res.status(400).json({ error: passwordValidation.error });
            }

            // Check if passwords match
            if (password !== confirmPassword) {
                return res.status(400).json({ error: 'Passwords do not match' });
            }
        } else {
            return res.status(400).json({ error: 'Password is required' });
        }

        // Check if user exists
        const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        await client.query('BEGIN');

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const userResult = await client.query(
            `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, email, first_name, last_name, role, created_at`,
            [tenantId, email, passwordHash, firstName, lastName, role]
        );

        const user = userResult.rows[0];

        // Save password to history
        await savePasswordHistory(user.id, passwordHash, client);

        // Set property access for property_admin, content_editor, or viewer
        if ((role === 'property_admin' || role === 'content_editor' || role === 'viewer') && propertyAccess && propertyAccess.length > 0) {
            for (const propertyId of propertyAccess) {
                await client.query(
                    'INSERT INTO user_property_access (user_id, property_id) VALUES ($1, $2)',
                    [user.id, propertyId]
                );
            }
        }

        // Set zone access if zone_admin
        if (role === 'zone_admin' && zoneAccess && zoneAccess.length > 0) {
            for (const zoneId of zoneAccess) {
                await client.query(
                    'INSERT INTO user_zone_access (user_id, zone_id) VALUES ($1, $2)',
                    [user.id, zoneId]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json(user);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    } finally {
        client.release();
    }
});

// Update a user
app.put('/users/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { email, password, confirmPassword, firstName, lastName, role, propertyAccess, zoneAccess } = req.body;

        await client.query('BEGIN');

        // Update password if provided
        if (password) {
            // Validate password strength
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.valid) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: passwordValidation.error });
            }

            // Check if passwords match
            if (password !== confirmPassword) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Passwords do not match' });
            }

            // Check password history
            const isPasswordNew = await checkPasswordHistory(id, password, client);
            if (!isPasswordNew) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Password cannot be one of your last 6 passwords' });
            }

            // Hash new password
            const passwordHash = await bcrypt.hash(password, 10);
            
            // Update password_hash
            await client.query(
                'UPDATE users SET password_hash = $1 WHERE id = $2',
                [passwordHash, id]
            );

            // Save to password history
            await savePasswordHistory(id, passwordHash, client);
        }

        // Update user basic info
        let query = `UPDATE users SET first_name = $1, last_name = $2, role = $3, updated_at = NOW()`;
        let params = [firstName, lastName, role];

        query += ` WHERE id = $${params.length + 1} RETURNING id, email, first_name, last_name, role`;
        params.push(id);

        const result = await client.query(query, params);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }

        // Update property access for property_admin, content_editor, or viewer
        if ((role === 'property_admin' || role === 'content_editor' || role === 'viewer') && propertyAccess !== undefined) {
            await client.query('DELETE FROM user_property_access WHERE user_id = $1', [id]);
            for (const propertyId of propertyAccess) {
                await client.query(
                    'INSERT INTO user_property_access (user_id, property_id) VALUES ($1, $2)',
                    [id, propertyId]
                );
            }
        } else if (role !== 'property_admin' && role !== 'content_editor' && role !== 'viewer') {
            // Remove property access for roles that don't support it
            await client.query('DELETE FROM user_property_access WHERE user_id = $1', [id]);
        }

        // Update zone access
        if (role === 'zone_admin' && zoneAccess !== undefined) {
            await client.query('DELETE FROM user_zone_access WHERE user_id = $1', [id]);
            for (const zoneId of zoneAccess) {
                await client.query(
                    'INSERT INTO user_zone_access (user_id, zone_id) VALUES ($1, $2)',
                    [id, zoneId]
                );
            }
        } else if (role !== 'zone_admin') {
            await client.query('DELETE FROM user_zone_access WHERE user_id = $1', [id]);
        }

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    } finally {
        client.release();
    }
});

// Delete a user
app.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Get user's property access
app.get('/users/:id/property-access', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT property_id FROM user_property_access WHERE user_id = $1',
            [id]
        );

        res.json({ propertyIds: result.rows.map(r => r.property_id) });
    } catch (error) {
        console.error('Get property access error:', error);
        res.status(500).json({ error: 'Failed to fetch property access' });
    }
});

// Get user's zone access
app.get('/users/:id/zone-access', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT zone_id FROM user_zone_access WHERE user_id = $1',
            [id]
        );

        res.json({ zoneIds: result.rows.map(r => r.zone_id) });
    } catch (error) {
        console.error('Get zone access error:', error);
        res.status(500).json({ error: 'Failed to fetch zone access' });
    }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');

    console.log('[Auth] Middleware request received:', {
        path: req.path,
        method: req.method,
        hasAuthHeader: !!authHeader,
        hasToken: !!token
    });

    if (!token) {
        console.warn('[Auth] No token provided in middleware');
        return res.status(401).json({ error: 'Access denied' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('[Auth] Middleware Token verified for user:', decoded.userId);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('[Auth] Middleware JWT Verification failed:', error.message);
        return res.status(403).json({ error: 'Invalid token' });
    }
}

// ============================================
// ANALYTICS - ACTIVITY LOGS
// ============================================

// Get activity logs with filtering and pagination
app.get('/analytics/activity', authenticateToken, async (req, res) => {
    try {
        const { 
            tenantId, 
            userId, 
            action, 
            resourceType,
            limit = 100, 
            offset = 0, 
            startDate,
            endDate
        } = req.query;
        
        const targetTenantId = tenantId || req.user.tenantId;

        // Build dynamic query with filters
        let query = `
            SELECT 
                al.id,
                al.action,
                al.resource_type,
                al.resource_id,
                al.details,
                al.ip_address,
                al.user_agent,
                al.created_at,
                COALESCE(u.first_name || ' ' || u.last_name, u.email, 'System') as user_name,
                u.email as user_email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.tenant_id = $1
        `;
        
        const params = [targetTenantId];
        let paramIndex = 2;
        
        // Add filters
        if (userId) {
            query += ` AND al.user_id = $${paramIndex}`;
            params.push(userId);
            paramIndex++;
        }
        
        if (action) {
            query += ` AND al.action LIKE $${paramIndex}`;
            params.push(`%${action}%`);
            paramIndex++;
        }
        
        if (resourceType) {
            query += ` AND al.resource_type = $${paramIndex}`;
            params.push(resourceType);
            paramIndex++;
        }
        
        if (startDate) {
            query += ` AND al.created_at >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }
        
        if (endDate) {
            query += ` AND al.created_at <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }
        
        // Add ordering and pagination
        query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));
        
        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total
            FROM audit_logs al
            WHERE al.tenant_id = $1
        `;
        const countParams = [targetTenantId];
        let countParamIndex = 2;
        
        if (userId) {
            countQuery += ` AND al.user_id = $${countParamIndex}`;
            countParams.push(userId);
            countParamIndex++;
        }
        if (action) {
            countQuery += ` AND al.action LIKE $${countParamIndex}`;
            countParams.push(`%${action}%`);
            countParamIndex++;
        }
        if (resourceType) {
            countQuery += ` AND al.resource_type = $${countParamIndex}`;
            countParams.push(resourceType);
            countParamIndex++;
        }
        if (startDate) {
            countQuery += ` AND al.created_at >= $${countParamIndex}`;
            countParams.push(startDate);
            countParamIndex++;
        }
        if (endDate) {
            countQuery += ` AND al.created_at <= $${countParamIndex}`;
            countParams.push(endDate);
            countParamIndex++;
        }
        
        const [result, countResult] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, countParams)
        ]);

        const total = parseInt(countResult.rows[0].total);
        
        // Format timestamps as relative time
        const now = new Date();
        const activities = result.rows.map(row => {
            const createdAt = new Date(row.created_at);
            const diffMs = now - createdAt;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            let timeAgo;
            if (diffMins < 1) {
                timeAgo = 'just now';
            } else if (diffMins < 60) {
                timeAgo = `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
            } else if (diffHours < 24) {
                timeAgo = `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
            } else {
                timeAgo = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
            }

            // Format action text
            let actionText = row.action
                .replace(/_/g, ' ') // Replace all underscores with spaces
                .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word

            if (row.resource_type) {
                actionText = `${actionText} ${row.resource_type}`;
            }

            return {
                id: row.id,
                action: actionText,
                resourceType: row.resource_type,
                resourceId: row.resource_id,
                user: row.user_name || 'System',
                userEmail: row.user_email,
                ipAddress: row.ip_address,
                userAgent: row.user_agent,
                details: row.details,
                time: timeAgo,
                timestamp: row.created_at,
                createdAt: row.created_at
            };
        });

        res.json({ 
            activities,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Activity logs error:', error);
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'auth-service' });
});

// Diagnostic endpoint
app.get('/debug/stats', async (req, res) => {
    try {
        const users = await pool.query('SELECT COUNT(*) as count FROM users');
        const tenants = await pool.query('SELECT COUNT(*) as count FROM tenants');
        const superAdmins = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'super_admin'");
        const demoUser = await pool.query("SELECT email, role FROM users WHERE email = 'demo@example.com'");

        res.json({
            users: users.rows[0].count,
            tenants: tenants.rows[0].count,
            superAdmins: superAdmins.rows[0].count,
            demoUser: demoUser.rows.length > 0 ? demoUser.rows[0] : 'not found'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || process.env.AUTH_SERVICE_PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Auth Service running on port ${PORT}`);
});

module.exports = app;
