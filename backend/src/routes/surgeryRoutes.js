import express from 'express';
import { authenticate, authorize, restrictOptometrist } from '../middlewares/authMiddleware.js';
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

router.use(authenticate, restrictOptometrist);

router.get('/', authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), listSurgeries);
router.get('/:id', authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), getSurgeryById);
router.post('/', authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), validate(createSurgerySchema), createSurgery);
router.put('/:id', authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), validate(updateSurgerySchema), updateSurgery);
router.delete('/:id', authorize('ADMIN', 'SUPERADMIN', 'DOCTOR'), deleteSurgery);

export default router;
