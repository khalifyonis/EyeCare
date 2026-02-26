import express from 'express';
import { login, forgotPassword, resetPassword, getMe } from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/auth/me - Private
router.get('/me', authenticate, getMe);

// POST /api/auth/login - Public
router.post('/login', login);

// POST /api/auth/forgot-password - Public
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password/:token - Public
router.post('/reset-password/:token', resetPassword);

export default router;


