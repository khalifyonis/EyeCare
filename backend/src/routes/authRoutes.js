import express from 'express';
import { login, forgotPassword, resetPassword, getMe, updateMe } from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import { updateProfileSchema } from '../middlewares/validationSchemas.js';

const router = express.Router();

// GET /api/auth/me - Private
router.get('/me', authenticate, getMe);
// PUT /api/auth/me - Update own profile (fullName, phone)
router.put('/me', authenticate, validate(updateProfileSchema), updateMe);

// POST /api/auth/login - Public
router.post('/login', login);

// POST /api/auth/forgot-password - Public
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password/:token - Public
router.post('/reset-password/:token', resetPassword);

export default router;


