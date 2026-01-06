import express from 'express';
import { login, forgotPassword, resetPassword, acceptInvitation } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/accept-invitation', acceptInvitation);

export default router;

