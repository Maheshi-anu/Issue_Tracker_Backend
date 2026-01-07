Issue Tracker Backend

A REST API for managing issues and users with authentication, built with Node.js, Express, and MySQL.

Quick Start

Prerequisites

Node.js 14+ and npm installed
MySQL Server running
SendGrid account (for email features)

Installation

1. Clone the repository and install dependencies:

npm install

2. Create a .env file in the root directory with these variables:

ENVIRONMENT=dev
PORT=3000
DB_HOST=localhost
DB_PORT=8889
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=issue_tracker
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
SENDGRID_API_KEY=your_api_key
SENDGRID_FROM_EMAIL=your_email@example.com
FRONTEND_URL=http://localhost:5173
FRONTEND_URL_PROD=https://your-production-url.com

3. Set up the database:

mysql -u root -p
CREATE DATABASE issue_tracker;

Run the provided SQL schema to create users and issues tables.

CREATE DATABASE IF NOT EXISTS issue_tracker;
USE issue_tracker;

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NULL,
    fname VARCHAR(100) NULL,
    lname VARCHAR(100) NULL,
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    status ENUM('active', 'invited', 'inactive') NOT NULL DEFAULT 'active',
    reset_token VARCHAR(255) NULL,
    reset_token_expiry DATETIME NULL,
    invited_by INT NULL,
    invited_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_reset_token (reset_token),
    INDEX idx_role (role),
    INDEX idx_status (status),
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE issues (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    due_date DATE NULL,
    created_by INT NOT NULL,
    assigned_to INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_severity (severity),
    INDEX idx_created_by (created_by),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_title (title(100)),
    FULLTEXT INDEX idx_search (title, description)
);

INSERT INTO users (email, password_hash, role, status, fname, lname)
VALUES ('admin@itracker.com', SHA2('admin@123', 256), 'admin', 'active', 'Super', 'Admin');

4. Start the server:

npm run dev (development with auto-reload)
npm start (production)

Test the connection:

npm run test-db

Key Features

User management with role-based access (admin, user)
Issue creation, tracking, and status updates
User invitations with email notifications
Password reset functionality
Issue filtering and pagination
Export issues to CSV & JSON

API Endpoints

Authentication
POST /api/auth/login - User login
POST /api/auth/forgot-password - Request password reset
POST /api/auth/reset-password - Reset password
POST /api/auth/accept-invitation - Accept user invitation

Users (Admin only)
GET /api/users - List all users
GET /api/users/:id - Get user details
POST /api/users/invite - Invite new user
PUT /api/users/:id - Update user
DELETE /api/users/:id - Delete user

Issues
POST /api/issues - Create issue
GET /api/issues - List issues with filters
GET /api/issues/:id - Get issue details
PUT /api/issues/:id - Update issue
PATCH /api/issues/:id/status - Change issue status
DELETE /api/issues/:id - Delete issue
GET /api/issues/export - Export issues (CSV or JSON)

Important Notes

Environment Setup

Use ENVIRONMENT=dev for local development, prod for production
For production, the app uses MYSQL_PUBLIC_URL instead of individual DB variables
SendGrid API key is required for email features; operations work without it, but emails won't send

Authentication

Include JWT token in Authorization header: Authorization: Bearer {token}
Tokens expire after the time set in JWT_EXPIRES_IN
Users must have an active status to log in

Database

Connection pooling is configured with a limit of 10 connections
Passwords are hashed using bcryptjs
Use prepared statements (already implemented) to prevent SQL injection

Troubleshooting

Database connection fails - Verify MySQL is running, and credentials in .env are correct
Emails not sending - Check SENDGRID_API_KEY and ensure your sender email is verified
Port already in use - Change the PORT in .env
JWT errors - Verify the token format and JWT_SECRET haven't changed

Project Structure

server.js - Main entry point
config/ - Database configuration
controllers/ - Request handlers
middleware/ - Auth and error handling
routes/ - API endpoints
services/ - SendGrid email service
utils/ - JWT and password utilities

Tech Stack

Express.js - Web framework
MySQL2 - Database driver
JWT - Authentication
bcryptjs - Password hashing
SendGrid - Email service


