import express from 'express';
import {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    uploadProfileImage, // Added uploadProfileImage
} from '../controllers/userController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js'; // Added upload middleware import

const router = express.Router();

// All routes here are restricted to ADMIN and require authentication
router.use(authenticate, authorize('ADMIN'));

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.post('/:id/profile-image', upload.single('image'), uploadProfileImage); // Added new route

export default router;
