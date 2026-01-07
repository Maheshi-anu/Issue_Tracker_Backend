import pool from '../config/database.js';
import { comparePassword, hashPassword, generateResetToken, hashPasswordSHA256 } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [users] = await pool.execute(
      'SELECT id, email, password_hash, fname, lname, role, status FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    if (user.status === 'invited') {
      return res.status(403).json({ error: 'Please accept your invitation first' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    if (!user.password_hash) {
      return res.status(403).json({ error: 'Please set your password first' });
    }

    const passwordHash = hashPasswordSHA256(password);
    const isValidPassword = passwordHash === user.password_hash || await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fname: user.fname,
        lname: user.lname,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

    await pool.execute(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [resetToken, resetTokenExpiry, users[0].id]
    );

    sendPasswordResetEmail(email, resetToken)
      .then((emailResult) => {
        if (!emailResult.success) {
          console.error(`Failed to send password reset email to ${email}:`, emailResult.error);
        }
      })
      .catch((error) => {
        console.error(`Error sending password reset email to ${email}:`, error.message);
      });

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const passwordHash = await hashPassword(password);

    await pool.execute(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [passwordHash, users[0].id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

export const acceptInvitation = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const [users] = await pool.execute(
      'SELECT id, email, fname, lname, role, status, reset_token_expiry FROM users WHERE reset_token = ? AND status = ?',
      [token, 'invited']
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired invitation token' });
    }

    const user = users[0];

    if (!user.reset_token_expiry || new Date(user.reset_token_expiry) < new Date()) {
      return res.status(400).json({ error: 'Invitation token has expired' });
    }

    const passwordHash = await hashPassword(password);

    await pool.execute(
      'UPDATE users SET password_hash = ?, status = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [passwordHash, 'active', user.id]
    );

    const jwtToken = generateToken(user.id);

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        fname: user.fname || null,
        lname: user.lname || null,
        role: user.role
      },
      message: 'Invitation accepted successfully'
    });
  } catch (error) {
    next(error);
  }
};

