import express from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validate.js';
import {
    createSurgerySchema,
    updateSurgerySchema,
} from '../middlewares/validationSchemas.js';
import {
    listSurgeries,
    getSurgeryById,
    createSurgery,
    updateSurgery,
    deleteSurgery,
} from '../controllers/surgeryController.js';

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), listSurgeries);
router.get('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), getSurgeryById);
router.post('/', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), validate(createSurgerySchema), createSurgery);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), validate(updateSurgerySchema), updateSurgery);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), deleteSurgery);

export default router;
