import Joi from 'joi';

// ── Auth Schemas ──
export const loginSchema = Joi.object({
    username: Joi.string().required().messages({
        'any.required': 'Username is required',
        'string.empty': 'Username cannot be empty'
    }),
    password: Joi.string().min(6).required().messages({
        'any.required': 'Password is required',
        'string.min': 'Password must be at least 6 characters long'
    })
});

export const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    })
});

export const resetPasswordSchema = Joi.object({
    password: Joi.string().min(6).required().messages({
        'string.min': 'New password must be at least 6 characters long',
        'any.required': 'Password is required'
    })
});

// ── User Schemas ──
const nameRegex = /^[a-zA-Z\s]+$/;

export const createUserSchema = Joi.object({
    fullName: Joi.string().regex(nameRegex).min(3).required().messages({
        'string.pattern.base': 'Name must only contain letters',
        'string.min': 'Name too short'
    }),
    username: Joi.string().alphanum().min(3).required(),
    email: Joi.string().email().required(),
    roleName: Joi.string().valid('ADMIN', 'DOCTOR', 'PHARMACIST', 'OPTICIAN', 'RECEPTIONIST').required(),
    branchIds: Joi.array().items(Joi.string()).min(1).required(),
    licenseNumber: Joi.string().when('roleName', { is: 'DOCTOR', then: Joi.required(), otherwise: Joi.allow('', null).optional() }),
    specialization: Joi.string().when('roleName', { is: 'DOCTOR', then: Joi.required(), otherwise: Joi.allow('', null).optional() })
}).options({ stripUnknown: true });

export const updateUserSchema = Joi.object({
    fullName: Joi.string().regex(nameRegex).min(3).optional().messages({
        'string.pattern.base': 'Name must only contain letters',
        'string.min': 'Name too short'
    }),
    username: Joi.string().alphanum().min(3).optional(),
    email: Joi.string().email().optional(),
    password: Joi.string().min(6).allow('', null).optional(),
    roleName: Joi.string().valid('ADMIN', 'DOCTOR', 'PHARMACIST', 'OPTICIAN', 'RECEPTIONIST').optional(),
    branchIds: Joi.array().items(Joi.string()).optional().allow(null),
    licenseNumber: Joi.string().allow('', null).optional().when('roleName', {
        is: 'DOCTOR',
        then: Joi.required(),
        otherwise: Joi.optional() // If roleName is not provided or not DOCTOR, it's optional
    }),
    specialization: Joi.string().allow('', null).optional().when('roleName', {
        is: 'DOCTOR',
        then: Joi.required(),
        otherwise: Joi.optional()
    })
}).options({ stripUnknown: true });

// ── Patient Schemas ──
const phoneRegex = /^[+]?[(]?[0-9]{1,3}[)]?[-s./0-9]*$/;

export const patientSchema = Joi.object({
    firstName: Joi.string().regex(nameRegex).required().messages({
        'string.pattern.base': 'Letters only'
    }),
    lastName: Joi.string().regex(nameRegex).required().messages({
        'string.pattern.base': 'Letters only'
    }),
    gender: Joi.string().valid('MALE', 'FEMALE').required(),
    dateOfBirth: Joi.date().iso().max('now').required().messages({
        'date.max': 'Invalid birth date'
    }),
    phone: Joi.string().regex(phoneRegex).required().messages({
        'string.pattern.base': 'Invalid phone'
    }),
    email: Joi.string().email().allow('', null).optional(),
    address: Joi.string().allow('', null).optional(),
    branchId: Joi.string().allow('', null).optional()
}).options({ stripUnknown: true });

export const updatePatientSchema = Joi.object({
    firstName: Joi.string().regex(nameRegex).optional().messages({
        'string.pattern.base': 'Letters only'
    }),
    lastName: Joi.string().regex(nameRegex).optional().messages({
        'string.pattern.base': 'Letters only'
    }),
    gender: Joi.string().valid('MALE', 'FEMALE').optional(),
    dateOfBirth: Joi.date().iso().max('now').optional().messages({
        'date.max': 'Invalid birth date'
    }),
    phone: Joi.string().regex(phoneRegex).optional().messages({
        'string.pattern.base': 'Invalid phone'
    }),
    email: Joi.string().email().allow('', null).optional(),
    address: Joi.string().allow('', null).optional(),
    branchId: Joi.string().allow('', null).optional()
}).options({ stripUnknown: true });

// ── Branch Schemas ──
export const branchSchema = Joi.object({
    branchName: Joi.string().required(),
    address: Joi.string().required(),
    phone: Joi.string().required()
});

// ── Appointment Schemas ──
export const appointmentSchema = Joi.object({
    patientId: Joi.string().uuid().required(),
    doctorId: Joi.string().uuid().required(),
    branchId: Joi.string().uuid().optional(),
    appointmentDate: Joi.date().iso().required().messages({
        'date.iso': 'Invalid date'
    }),
    amount: Joi.number().min(0).optional().default(0).messages({
        'number.min': 'Invalid amount'
    }),
    status: Joi.string().valid('PENDING', 'COMPLETED', 'CANCELLED').optional()
});

export const updateAppointmentSchema = Joi.object({
    doctorId: Joi.string().uuid().optional(),
    appointmentDate: Joi.date().iso().optional().messages({
        'date.iso': 'Invalid date'
    }),
    amount: Joi.number().min(0).optional().messages({
        'number.min': 'Invalid amount'
    }),
    status: Joi.string().valid('PENDING', 'COMPLETED', 'CANCELLED').optional()
});
