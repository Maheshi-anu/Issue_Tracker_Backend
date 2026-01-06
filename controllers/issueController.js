import pool from '../config/database.js';

export const createIssue = async (req, res, next) => {
  try {
    const { title, description, severity, priority, assigned_to, due_date } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (assigned_to) {
      const [users] = await pool.execute(
        'SELECT id FROM users WHERE id = ? AND status = "active"',
        [parseInt(assigned_to)]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'Assigned user not found' });
      }
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    const validPriorities = ['low', 'medium', 'high', 'urgent'];

    if (severity && !validSeverities.includes(severity)) {
      return res.status(400).json({ error: 'Invalid severity' });
    }

    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    const [result] = await pool.execute(
      'INSERT INTO issues (title, description, severity, priority, status, created_by, assigned_to, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        title,
        description || null,
        severity || 'medium',
        priority || 'medium',
        'open',
        req.user.id,
        assigned_to ? parseInt(assigned_to) : null,
        due_date || null
      ]
    );

    const [issues] = await pool.execute(
      `SELECT i.*, 
        u1.email as created_by_email,
        u2.email as assigned_to_email
      FROM issues i
      LEFT JOIN users u1 ON i.created_by = u1.id
      LEFT JOIN users u2 ON i.assigned_to = u2.id
      WHERE i.id = ?`,
      [result.insertId]
    );

    res.status(201).json(issues[0]);
  } catch (error) {
    next(error);
  }
};

export const getIssues = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      priority,
      severity,
      assigned_to,
      created_by,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    const validSortFields = ['created_at', 'due_date'];
    const validSortOrders = ['ASC', 'DESC'];

    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (i.title LIKE ? OR i.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += ' AND i.status = ?';
      params.push(status);
    }

    if (priority) {
      whereClause += ' AND i.priority = ?';
      params.push(priority);
    }

    if (severity) {
      whereClause += ' AND i.severity = ?';
      params.push(severity);
    }

    if (assigned_to === 'unassigned') {
      whereClause += ' AND i.assigned_to IS NULL';
    } else if (assigned_to) {
      whereClause += ' AND i.assigned_to = ?';
      params.push(parseInt(assigned_to));
    }

    if (created_by) {
      whereClause += ' AND i.created_by = ?';
      params.push(parseInt(created_by));
    }

    let orderByClause = `ORDER BY i.${sortField} ${sortOrder}`;
    if (sortField === 'due_date') {
      if (sortOrder === 'ASC') {
        orderByClause = `ORDER BY i.due_date IS NULL, i.due_date ASC, i.created_at DESC`;
      } else {
        orderByClause = `ORDER BY i.due_date IS NULL, i.due_date DESC, i.created_at DESC`;
      }
    }

    const query = `SELECT i.*, 
      u1.email as created_by_email,
      u2.email as assigned_to_email
    FROM issues i
    LEFT JOIN users u1 ON i.created_by = u1.id
    LEFT JOIN users u2 ON i.assigned_to = u2.id
    ${whereClause}
    ${orderByClause} LIMIT ${limitNum} OFFSET ${offset}`;

    const [issues] = await pool.execute(query, params);

    const countQuery = `SELECT COUNT(*) as total 
    FROM issues i
    ${whereClause}`;

    const [countResult] = await pool.execute(countQuery, params);

    const [statusCounts] = await pool.execute(
      `SELECT status, COUNT(*) as count 
      FROM issues 
      GROUP BY status`
    );

    const counts = {
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0
    };

    statusCounts.forEach(item => {
      counts[item.status] = item.count;
    });

    res.json({
      issues,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limitNum)
      },
      counts
    });
  } catch (error) {
    next(error);
  }
};

export const getIssueById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [issues] = await pool.execute(
      `SELECT i.*, 
        u1.email as created_by_email,
        u2.email as assigned_to_email
      FROM issues i
      LEFT JOIN users u1 ON i.created_by = u1.id
      LEFT JOIN users u2 ON i.assigned_to = u2.id
      WHERE i.id = ?`,
      [parseInt(id)]
    );

    if (issues.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json(issues[0]);
  } catch (error) {
    next(error);
  }
};

export const updateIssue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, severity, priority, status, assigned_to, due_date } = req.body;

    const [issues] = await pool.execute(
      'SELECT * FROM issues WHERE id = ?',
      [id]
    );

    if (issues.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const issue = issues[0];

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    const validPriorities = ['low', 'medium', 'high', 'urgent'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (severity && !validSeverities.includes(severity)) {
      return res.status(400).json({ error: 'Invalid severity' });
    }

    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    if (assigned_to) {
      const [users] = await pool.execute(
        'SELECT id FROM users WHERE id = ? AND status = "active"',
        [parseInt(assigned_to)]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'Assigned user not found' });
      }
    }

    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (severity !== undefined) {
      updates.push('severity = ?');
      params.push(severity);
    }

    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      params.push(assigned_to ? parseInt(assigned_to) : null);
    }

    if (due_date !== undefined) {
      updates.push('due_date = ?');
      params.push(due_date || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(parseInt(id));

    await pool.execute(
      `UPDATE issues SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [updatedIssues] = await pool.execute(
      `SELECT i.*, 
        u1.email as created_by_email,
        u2.email as assigned_to_email
      FROM issues i
      LEFT JOIN users u1 ON i.created_by = u1.id
      LEFT JOIN users u2 ON i.assigned_to = u2.id
      WHERE i.id = ?`,
      [parseInt(id)]
    );

    res.json(updatedIssues[0]);
  } catch (error) {
    next(error);
  }
};

export const changeIssueStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const [issues] = await pool.execute(
      'SELECT * FROM issues WHERE id = ?',
      [parseInt(id)]
    );

    if (issues.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    await pool.execute(
      'UPDATE issues SET status = ? WHERE id = ?',
      [status, parseInt(id)]
    );

    const [updatedIssues] = await pool.execute(
      `SELECT i.*, 
        u1.email as created_by_email,
        u2.email as assigned_to_email
      FROM issues i
      LEFT JOIN users u1 ON i.created_by = u1.id
      LEFT JOIN users u2 ON i.assigned_to = u2.id
      WHERE i.id = ?`,
      [parseInt(id)]
    );

    res.json(updatedIssues[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteIssue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const issueId = parseInt(id);

    const [issues] = await pool.execute(
      'SELECT created_by FROM issues WHERE id = ?',
      [issueId]
    );

    if (issues.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    await pool.execute('DELETE FROM issues WHERE id = ?', [issueId]);

    res.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const exportIssues = async (req, res, next) => {
  try {
    const { format = 'json', status, priority, severity, from_date, to_date } = req.query;

    let query = `SELECT i.*, 
      u1.email as created_by_email,
      u2.email as assigned_to_email
    FROM issues i
    LEFT JOIN users u1 ON i.created_by = u1.id
    LEFT JOIN users u2 ON i.assigned_to = u2.id
    WHERE 1=1`;

    const params = [];

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    if (priority) {
      query += ' AND i.priority = ?';
      params.push(priority);
    }

    if (severity) {
      query += ' AND i.severity = ?';
      params.push(severity);
    }

    if (from_date) {
      query += ' AND DATE(i.created_at) >= ?';
      params.push(from_date);
    }

    if (to_date) {
      query += ' AND DATE(i.created_at) <= ?';
      params.push(to_date);
    }

    query += ' ORDER BY i.created_at DESC';

    const [issues] = await pool.execute(query, params);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=issues.csv');

      const headers = ['ID', 'Title', 'Description', 'Severity', 'Priority', 'Status', 'Created By', 'Assigned To', 'Created At', 'Updated At'];
      const csvRows = [headers.join(',')];

      issues.forEach(issue => {
        const row = [
          issue.id,
          `"${(issue.title || '').replace(/"/g, '""')}"`,
          `"${(issue.description || '').replace(/"/g, '""')}"`,
          issue.severity,
          issue.priority,
          issue.status,
          issue.created_by_email,
          issue.assigned_to_email || '',
          issue.created_at,
          issue.updated_at
        ];
        csvRows.push(row.join(','));
      });

      res.send(csvRows.join('\n'));
    } else {
      res.json(issues);
    }
  } catch (error) {
    next(error);
  }
};

