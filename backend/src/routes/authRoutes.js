import express from 'express';
import { login, forgotPassword, resetPassword } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/login - Public
router.post('/login', login);

// POST /api/auth/forgot-password - Public
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password/:token - Public
router.post('/reset-password/:token', resetPassword);

export default router;


