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

// Profile update (current user only: fullName, phone)
export const updateProfileSchema = Joi.object({
    fullName: Joi.string().min(2).max(120).optional().messages({
        'string.min': 'Full name must be at least 2 characters',
    }),
    phone: Joi.string().max(30).allow('', null).optional(),
}).min(1).options({ stripUnknown: true });

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

const patientBaseFields = {
    fullName: Joi.string().min(2).max(120).optional(),
    firstName: Joi.string().max(80).allow('', null).optional(),
    lastName: Joi.string().max(80).allow('', null).optional(),
    gender: Joi.string().valid('MALE', 'FEMALE').optional(),
    dateOfBirth: Joi.date().iso().max('now').optional().messages({ 'date.max': 'Invalid birth date' }),
    phone: Joi.string().regex(phoneRegex).optional().messages({ 'string.pattern.base': 'Invalid phone' }),
    email: Joi.string().email().allow('', null).optional(),
    address: Joi.string().allow('', null).optional(),
    city: Joi.string().max(100).allow('', null).optional(),
    state: Joi.string().max(100).allow('', null).optional(),
    zipCode: Joi.string().max(20).allow('', null).optional(),
    bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').allow('', null).optional(),
    weight: Joi.number().min(0).max(500).allow(null).optional(),
    allergies: Joi.string().allow('', null).optional(),
    chiefComplaint: Joi.string().allow('', null).optional(),
    emergencyContactName: Joi.string().max(120).allow('', null).optional(),
    emergencyContactRelationship: Joi.string().max(80).allow('', null).optional(),
    emergencyContactPhone: Joi.string().max(30).allow('', null).optional(),
    assignedDoctorId: Joi.string().uuid().allow('', null).optional(),
    isActive: Joi.boolean().optional(),
    branchId: Joi.string().allow('', null).optional(),
};

export const patientSchema = Joi.object({
    ...patientBaseFields,
    phone: Joi.string().regex(phoneRegex).required().messages({ 'string.pattern.base': 'Invalid phone' }),
}).options({ stripUnknown: true });

export const updatePatientSchema = Joi.object({
    ...patientBaseFields,
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
    // Appointments module additions
    type: Joi.string().valid('consultation', 'follow-up', 'checkup', 'emergency').optional().allow('', null),
    location: Joi.string().optional().allow('', null),
    notes: Joi.string().optional().allow('', null),
    status: Joi.string().valid('PENDING', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED').optional()
});

export const updateAppointmentSchema = Joi.object({
    patientId: Joi.string().uuid().optional(),
    doctorId: Joi.string().uuid().optional(),
    appointmentDate: Joi.date().iso().optional().messages({
        'date.iso': 'Invalid date'
    }),
    amount: Joi.number().min(0).optional().messages({
        'number.min': 'Invalid amount'
    }),
    type: Joi.string().valid('consultation', 'follow-up', 'checkup', 'emergency').optional().allow('', null),
    location: Joi.string().optional().allow('', null),
    notes: Joi.string().optional().allow('', null),
    status: Joi.string().valid('PENDING', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED').optional()
});

// ── Eye Examination Schemas ──
export const createEyeExaminationSchema = Joi.object({
    branchId: Joi.string().uuid().allow('', null).optional(),
    patientId: Joi.string().uuid().required(),
    doctorId: Joi.string().uuid().required(),
    chiefComplaint: Joi.string().min(2).max(500).required(),
    historyOfPresentIllness: Joi.string().allow('', null).optional(),
    vaScale: Joi.string().valid('SNELLEN', 'LOGMAR').optional().allow('', null),
    vaUnaidedOD: Joi.string().allow('', null).optional(),
    vaUnaidedOS: Joi.string().allow('', null).optional(),
    vaUnaidedNearOD: Joi.string().allow('', null).optional(),
    vaUnaidedNearOS: Joi.string().allow('', null).optional(),
    vaBcvaOD: Joi.string().allow('', null).optional(),
    vaBcvaOS: Joi.string().allow('', null).optional(),
    vaBcvaNearOD: Joi.string().allow('', null).optional(),
    vaBcvaNearOS: Joi.string().allow('', null).optional(),
    vaPinholeOD: Joi.string().allow('', null).optional(),
    vaPinholeOS: Joi.string().allow('', null).optional(),
    refractionSphereOD: Joi.string().allow('', null).optional(),
    refractionSphereOS: Joi.string().allow('', null).optional(),
    refractionCylinderOD: Joi.string().allow('', null).optional(),
    refractionCylinderOS: Joi.string().allow('', null).optional(),
    refractionAxisOD: Joi.string().allow('', null).optional(),
    refractionAxisOS: Joi.string().allow('', null).optional(),
    iopOD: Joi.number().integer().min(0).max(100).allow(null).optional(),
    iopOS: Joi.number().integer().min(0).max(100).allow(null).optional(),
    iopMethod: Joi.string().allow('', null).optional(),
    iopTime: Joi.string().allow('', null).optional(),
    targetIopOD: Joi.number().integer().min(0).max(100).allow(null).optional(),
    targetIopOS: Joi.number().integer().min(0).max(100).allow(null).optional(),
    anteriorSegmentFindings: Joi.object().unknown(true).allow(null).optional(),
    fundusFindings: Joi.object().unknown(true).allow(null).optional(),
    diagnosis: Joi.string().allow('', null).optional(),
    plan: Joi.string().allow('', null).optional(),
    followUpDate: Joi.date().iso().allow('', null).optional(),
    nextVisitReason: Joi.string().allow('', null).optional(),
}).options({ stripUnknown: true });

export const updateEyeExaminationSchema = Joi.object({
    patientId: Joi.string().uuid().optional(),
    doctorId: Joi.string().uuid().optional(),
    chiefComplaint: Joi.string().min(2).max(500).optional(),
    historyOfPresentIllness: Joi.string().allow('', null).optional(),
    vaScale: Joi.string().valid('SNELLEN', 'LOGMAR').optional().allow('', null),
    vaUnaidedOD: Joi.string().allow('', null).optional(),
    vaUnaidedOS: Joi.string().allow('', null).optional(),
    vaUnaidedNearOD: Joi.string().allow('', null).optional(),
    vaUnaidedNearOS: Joi.string().allow('', null).optional(),
    vaBcvaOD: Joi.string().allow('', null).optional(),
    vaBcvaOS: Joi.string().allow('', null).optional(),
    vaBcvaNearOD: Joi.string().allow('', null).optional(),
    vaBcvaNearOS: Joi.string().allow('', null).optional(),
    vaPinholeOD: Joi.string().allow('', null).optional(),
    vaPinholeOS: Joi.string().allow('', null).optional(),
    refractionSphereOD: Joi.string().allow('', null).optional(),
    refractionSphereOS: Joi.string().allow('', null).optional(),
    refractionCylinderOD: Joi.string().allow('', null).optional(),
    refractionCylinderOS: Joi.string().allow('', null).optional(),
    refractionAxisOD: Joi.string().allow('', null).optional(),
    refractionAxisOS: Joi.string().allow('', null).optional(),
    iopOD: Joi.number().integer().min(0).max(100).allow(null).optional(),
    iopOS: Joi.number().integer().min(0).max(100).allow(null).optional(),
    iopMethod: Joi.string().allow('', null).optional(),
    iopTime: Joi.string().allow('', null).optional(),
    targetIopOD: Joi.number().integer().min(0).max(100).allow(null).optional(),
    targetIopOS: Joi.number().integer().min(0).max(100).allow(null).optional(),
    anteriorSegmentFindings: Joi.object().unknown(true).allow(null).optional(),
    fundusFindings: Joi.object().unknown(true).allow(null).optional(),
    diagnosis: Joi.string().allow('', null).optional(),
    plan: Joi.string().allow('', null).optional(),
    followUpDate: Joi.date().iso().allow('', null).optional(),
    nextVisitReason: Joi.string().allow('', null).optional(),
}).min(1).options({ stripUnknown: true });

// ── Surgery Schemas ──
export const createSurgerySchema = Joi.object({
    examId: Joi.string().uuid().allow('', null).optional(),
    branchId: Joi.string().uuid().allow('', null).optional(),
    patientId: Joi.string().uuid().required(),
    eye: Joi.string().valid('OD', 'OS', 'BOTH', 'RIGHT', 'LEFT').required(),
    surgeryType: Joi.string().min(2).max(200).required(),
    procedure: Joi.string().allow('', null).optional(),
    anesthesiaType: Joi.string().allow('', null).optional(),
    date: Joi.date().iso().required().messages({
        'date.iso': 'Invalid date'
    }),
    time: Joi.string().allow('', null).optional(),
    operatingRoom: Joi.string().allow('', null).optional(),
    cataractDetails: Joi.object().unknown(true).allow(null).optional(),
    cost: Joi.number().min(0).optional().messages({
        'number.min': 'Invalid cost'
    }),
    status: Joi.string().valid('scheduled', 'completed', 'cancelled', 'pending', 'canceled').optional(),
    notes: Joi.string().allow('', null).optional(),
    nextFollowUpDate: Joi.date().iso().allow('', null).optional(),
    surgeonId: Joi.string().uuid().required(),
}).options({ stripUnknown: true });

export const updateSurgerySchema = Joi.object({
    eye: Joi.string().valid('OD', 'OS', 'BOTH', 'RIGHT', 'LEFT').optional(),
    surgeryType: Joi.string().min(2).max(200).optional(),
    procedure: Joi.string().allow('', null).optional(),
    anesthesiaType: Joi.string().allow('', null).optional(),
    date: Joi.date().iso().optional().messages({
        'date.iso': 'Invalid date'
    }),
    time: Joi.string().allow('', null).optional(),
    operatingRoom: Joi.string().allow('', null).optional(),
    cataractDetails: Joi.object().unknown(true).allow(null).optional(),
    cost: Joi.number().min(0).optional().messages({
        'number.min': 'Invalid cost'
    }),
    status: Joi.string().valid('scheduled', 'completed', 'cancelled', 'pending', 'canceled').optional(),
    notes: Joi.string().allow('', null).optional(),
    nextFollowUpDate: Joi.date().iso().allow('', null).optional(),
    surgeonId: Joi.string().uuid().optional(),
}).min(1).options({ stripUnknown: true });

// ── Prescription Schemas ──
export const createPrescriptionSchema = Joi.object({
    examId: Joi.string().uuid().required(),
    itemType: Joi.string().valid('PHARMACY').required(),
    itemId: Joi.string().allow('', null).optional(),
    quantity: Joi.number().integer().min(1).required().messages({
        'number.base': 'Quantity must be a number',
        'number.integer': 'Quantity must be a whole number',
        'number.min': 'Quantity must be at least 1'
    }),
    instructions: Joi.string().allow('', null).optional(),
    reviewAfterDays: Joi.number().integer().min(0).allow('', null).optional(),
}).options({ stripUnknown: true });

export const updatePrescriptionSchema = Joi.object({
    examId: Joi.string().uuid().optional(),
    itemType: Joi.string().valid('PHARMACY').optional(),
    itemId: Joi.string().allow('', null).optional(),
    quantity: Joi.number().integer().min(1).optional().messages({
        'number.base': 'Quantity must be a number',
        'number.integer': 'Quantity must be a whole number',
        'number.min': 'Quantity must be at least 1'
    }),
    instructions: Joi.string().allow('', null).optional(),
    reviewAfterDays: Joi.number().integer().min(0).allow('', null).optional(),
}).min(1).options({ stripUnknown: true });

// ── Billing Schemas ──
export const createBillingSchema = Joi.object({
    patientId: Joi.string().uuid().required(),
    branchId: Joi.string().uuid().allow('', null).optional(),
    appointmentId: Joi.string().uuid().allow('', null).optional(),
    surgeryId: Joi.string().uuid().allow('', null).optional(),
    prescriptionId: Joi.string().uuid().allow('', null).optional(),
    serviceType: Joi.string().valid('APPOINTMENT', 'PHARMACY', 'OPTICAL', 'SURGERY').required(),
    totalAmount: Joi.number().min(0).required().messages({
        'number.min': 'Total amount must be 0 or more',
    }),
    discount: Joi.number().min(0).optional().default(0).messages({
        'number.min': 'Discount cannot be negative',
    }),
    paymentMethod: Joi.string().allow('', null).optional(),
    referenceNumber: Joi.string().allow('', null).optional(),
    status: Joi.string().valid('PAID', 'UNPAID', 'PARTIAL', 'PARTIALLY_PAID', 'DRAFT').optional().default('UNPAID'),
    dueDate: Joi.date().iso().allow('', null).optional(),
    notes: Joi.string().allow('', null).optional(),
    lineItems: Joi.array().items(
        Joi.object({
            itemType: Joi.string().valid('PHARMACY', 'OPTICAL', 'APPOINTMENT', 'SURGERY').allow('', null).optional(),
            itemId: Joi.string().allow('', null).optional(),
            description: Joi.string().allow('', null).optional(),
            quantity: Joi.number().integer().min(1).required(),
            unitPrice: Joi.number().min(0).required(),
            lineTotal: Joi.number().min(0).optional(),
        }).options({ stripUnknown: true })
    ).optional(),
}).options({ stripUnknown: true });

export const updateBillingSchema = Joi.object({
    patientId: Joi.string().uuid().optional(),
    serviceType: Joi.string().valid('APPOINTMENT', 'PHARMACY', 'OPTICAL', 'SURGERY').optional(),
    totalAmount: Joi.number().min(0).optional().messages({
        'number.min': 'Total amount must be 0 or more',
    }),
    discount: Joi.number().min(0).optional().messages({
        'number.min': 'Discount cannot be negative',
    }),
    paymentMethod: Joi.string().allow('', null).optional(),
    referenceNumber: Joi.string().allow('', null).optional(),
    status: Joi.string().valid('PAID', 'UNPAID', 'PARTIAL', 'PARTIALLY_PAID', 'DRAFT').optional(),
    dueDate: Joi.date().iso().allow('', null).optional(),
    notes: Joi.string().allow('', null).optional(),
    lineItems: Joi.array().items(
        Joi.object({
            itemType: Joi.string().valid('PHARMACY', 'OPTICAL', 'APPOINTMENT', 'SURGERY').allow('', null).optional(),
            itemId: Joi.string().allow('', null).optional(),
            description: Joi.string().allow('', null).optional(),
            quantity: Joi.number().integer().min(1).required(),
            unitPrice: Joi.number().min(0).required(),
            lineTotal: Joi.number().min(0).optional(),
        }).options({ stripUnknown: true })
    ).optional(),
}).min(1).options({ stripUnknown: true });

// ── Pharmacy Item Schemas ──
export const createPharmacyItemSchema = Joi.object({
    branchId: Joi.string().uuid().allow('', null).optional(),
    itemName: Joi.string().min(2).required(),
    itemType: Joi.string().allow('', null).optional(),
    category: Joi.string().allow('', null).optional(),
    manufacturer: Joi.string().allow('', null).optional(),
    supplierName: Joi.string().allow('', null).optional(),
    batchNumber: Joi.string().allow('', null).optional(),
    stockQuantity: Joi.number().integer().min(0).optional().default(0),
    reorderLevel: Joi.number().integer().min(0).optional().default(10),
    purchasePrice: Joi.number().min(0).optional().default(0),
    sellingPrice: Joi.number().min(0).optional().default(0),
    expiryDate: Joi.date().iso().allow('', null).optional(),
}).options({ stripUnknown: true });

export const updatePharmacyItemSchema = Joi.object({
    itemName: Joi.string().min(2).optional(),
    itemType: Joi.string().allow('', null).optional(),
    category: Joi.string().allow('', null).optional(),
    manufacturer: Joi.string().allow('', null).optional(),
    supplierName: Joi.string().allow('', null).optional(),
    batchNumber: Joi.string().allow('', null).optional(),
    stockQuantity: Joi.number().integer().min(0).optional(),
    reorderLevel: Joi.number().integer().min(0).optional(),
    purchasePrice: Joi.number().min(0).optional(),
    sellingPrice: Joi.number().min(0).optional(),
    expiryDate: Joi.date().iso().allow('', null).optional(),
}).min(1).options({ stripUnknown: true });

// ── Optical Item Schemas ──
export const createOpticalItemSchema = Joi.object({
    branchId: Joi.string().uuid().allow('', null).optional(),
    itemName: Joi.string().min(2).required(),
    itemType: Joi.string().allow('', null).optional(),
    brand: Joi.string().allow('', null).optional(),
    manufacturer: Joi.string().allow('', null).optional(),
    supplierName: Joi.string().allow('', null).optional(),
    stockQuantity: Joi.number().integer().min(0).optional().default(0),
    reorderLevel: Joi.number().integer().min(0).optional().default(5),
    purchasePrice: Joi.number().min(0).optional().default(0),
    sellingPrice: Joi.number().min(0).optional().default(0),
}).options({ stripUnknown: true });

export const updateOpticalItemSchema = Joi.object({
    itemName: Joi.string().min(2).optional(),
    itemType: Joi.string().allow('', null).optional(),
    brand: Joi.string().allow('', null).optional(),
    manufacturer: Joi.string().allow('', null).optional(),
    supplierName: Joi.string().allow('', null).optional(),
    stockQuantity: Joi.number().integer().min(0).optional(),
    reorderLevel: Joi.number().integer().min(0).optional(),
    purchasePrice: Joi.number().min(0).optional(),
    sellingPrice: Joi.number().min(0).optional(),
}).min(1).options({ stripUnknown: true });

// Optical Prescription schema
export const createOpticalPrescriptionSchema = Joi.object({
    patientId: Joi.string().uuid().required(),
    branchId: Joi.string().uuid().allow('', null).optional(),
    type: Joi.string().valid('SPECTACLES', 'CONTACT_LENS', 'BOTH').required(),
    validityMonths: Joi.number().integer().min(1).max(60).optional().default(12),
    notes: Joi.string().allow('', null).optional(),

    odSphere: Joi.string().allow('', null).optional(),
    odCylinder: Joi.string().allow('', null).optional(),
    odAxis: Joi.number().integer().min(0).max(180).allow('', null).optional(),
    odAdd: Joi.string().allow('', null).optional(),
    odPd: Joi.number().integer().min(0).max(99).allow('', null).optional(),
    odPrism: Joi.string().allow('', null).optional(),

    osSphere: Joi.string().allow('', null).optional(),
    osCylinder: Joi.string().allow('', null).optional(),
    osAxis: Joi.number().integer().min(0).max(180).allow('', null).optional(),
    osAdd: Joi.string().allow('', null).optional(),
    osPd: Joi.number().integer().min(0).max(99).allow('', null).optional(),
    osPrism: Joi.string().allow('', null).optional(),

    lensType: Joi.string().allow('', null).optional(),
    lensMaterial: Joi.string().allow('', null).optional(),
    frameType: Joi.string().allow('', null).optional(),
    coatings: Joi.array().items(Joi.string()).optional().default([]),
}).options({ stripUnknown: true });

export const updateOpticalPrescriptionSchema = Joi.object({
    patientId: Joi.string().uuid().optional(),
    branchId: Joi.string().uuid().allow('', null).optional(),
    type: Joi.string().valid('SPECTACLES', 'CONTACT_LENS', 'BOTH').optional(),
    status: Joi.string().valid('FILLED', 'DISPENSED').optional(),
    validityMonths: Joi.number().integer().min(1).max(60).optional(),
    notes: Joi.string().allow('', null).optional(),

    odSphere: Joi.string().allow('', null).optional(),
    odCylinder: Joi.string().allow('', null).optional(),
    odAxis: Joi.number().integer().min(0).max(180).allow('', null).optional(),
    odAdd: Joi.string().allow('', null).optional(),
    odPd: Joi.number().integer().min(0).max(99).allow('', null).optional(),
    odPrism: Joi.string().allow('', null).optional(),

    osSphere: Joi.string().allow('', null).optional(),
    osCylinder: Joi.string().allow('', null).optional(),
    osAxis: Joi.number().integer().min(0).max(180).allow('', null).optional(),
    osAdd: Joi.string().allow('', null).optional(),
    osPd: Joi.number().integer().min(0).max(99).allow('', null).optional(),
    osPrism: Joi.string().allow('', null).optional(),

    lensType: Joi.string().allow('', null).optional(),
    lensMaterial: Joi.string().allow('', null).optional(),
    frameType: Joi.string().allow('', null).optional(),
    coatings: Joi.array().items(Joi.string()).optional(),
}).min(1).options({ stripUnknown: true });
