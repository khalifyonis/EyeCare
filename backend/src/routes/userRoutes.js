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

// User management: ADMIN and SUPERADMIN only
router.use(authenticate, authorize('ADMIN', 'SUPERADMIN'));

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.post('/:id/profile-image', upload.single('image'), uploadProfileImage); // Added new route

export default router;
