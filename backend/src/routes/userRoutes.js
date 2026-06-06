import express from 'express';
import {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    uploadProfileImage, // Added uploadProfileImage
} from '../controllers/userController.js';
import { authenticate, authorize, checkPermission } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js'; // Added upload middleware import

const router = express.Router();

router.use(authenticate);

// Allow a user to update their own profile image, or admins to update anyone.
const authorizeSelfOrAdmin = (req, res, next) => {
    const { id } = req.params;
    const role = req.user?.role;
    if (role === 'SUPERADMIN' || role === 'ADMIN' || req.user?.id === id) return next();
    return res.status(403).json({ message: 'Forbidden. Insufficient permissions.' });
};

router.post('/:id/profile-image', authorizeSelfOrAdmin, upload.single('image'), uploadProfileImage);

// User management: dynamic permissions
router.get('/', checkPermission('users', 'canRead'), getAllUsers);
router.get('/:id', checkPermission('users', 'canRead'), getUserById);
router.post('/', checkPermission('users', 'canCreate'), createUser);
router.put('/:id', checkPermission('users', 'canUpdate'), updateUser);
router.delete('/:id', checkPermission('users', 'canDelete'), deleteUser);

export default router;
