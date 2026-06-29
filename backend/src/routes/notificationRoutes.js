import express from 'express';
import { getNotifications } from '../controllers/notificationController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authenticate, getNotifications);

export default router;
