import pool from '../config/database.js';
import { sendInvitationEmail } from '../services/emailService.js';
import crypto from 'crypto';

export const inviteUser = async (req, res, next) => {
  try {
    const { email, fname, lname, role = 'user' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const [existingUsers] = await pool.execute(
      'SELECT id, status FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.status === 'invited') {
        return res.status(409).json({ error: 'Invitation already sent' });
      }
      return res.status(409).json({ error: 'User already exists' });
    }

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [result] = await pool.execute(
      'INSERT INTO users (email, password_hash, fname, lname, role, status, reset_token, reset_token_expiry, invited_by, invited_at) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [email, fname || null, lname || null, role, 'invited', invitationToken, expiresAt, req.user.id]
    );

    const frontendUrl = process.env.ENVIRONMENT === 'prod'
      ? process.env.FRONTEND_URL_PROD
      : process.env.FRONTEND_URL;
    const invitationLink = `${frontendUrl}/accept-invitation?token=${invitationToken}`;

    const emailResult = await Promise.race([
      sendInvitationEmail(email, invitationToken),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Email timeout')), 10000))
    ]).catch(() => ({ success: false, error: 'Email timeout', link: invitationLink }));

    if (emailResult.success) {
      res.status(201).json({
        message: 'Invitation sent successfully',
        invitation_link: invitationLink
      });
    } else {
      res.status(201).json({
        message: 'User invited successfully, but email could not be sent',
        warning: emailResult.error || 'Email service error',
        invitation_link: invitationLink
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    let query = 'SELECT id, email, fname, lname, role, status, created_at FROM users WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND email LIKE ?';
      params.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;

    const [users] = await pool.execute(query, params);

    const [countResult] = await pool.execute(
      search
        ? 'SELECT COUNT(*) as total FROM users WHERE email LIKE ?'
        : 'SELECT COUNT(*) as total FROM users',
      search ? [`%${search}%`] : []
    );

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [users] = await pool.execute(
      'SELECT id, email, fname, lname, role, status, created_at FROM users WHERE id = ?',
      [parseInt(id)]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const { fname, lname, role, status } = req.body;
    const isOwnAccount = userId === req.user.id;

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (isOwnAccount && (role !== undefined || status !== undefined)) {
      return res.status(400).json({ error: 'Cannot modify your own role or status' });
    }

    const updates = [];
    const params = [];

    if (fname !== undefined) {
      updates.push('fname = ?');
      params.push(fname || null);
    }

    if (lname !== undefined) {
      updates.push('lname = ?');
      params.push(lname || null);
    }

    if (role !== undefined) {
      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.push('role = ?');
      params.push(role);
    }

    if (status !== undefined) {
      if (!['active', 'invited', 'inactive'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(userId);

    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};