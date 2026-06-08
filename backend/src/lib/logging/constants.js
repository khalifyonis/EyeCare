export const LOG_MODULES = {
    AUTH: 'auth',
    PATIENTS: 'patients',
    APPOINTMENTS: 'appointments',
    EXAMINATIONS: 'examinations',
    SURGERY: 'surgery',
    PRESCRIPTIONS: 'prescriptions',
    BILLING: 'billing',
    PHARMACY: 'pharmacy',
    OPTICAL: 'optical',
    USERS: 'users',
    PERMISSIONS: 'permissions',
    BRANCHES: 'branches',
    REPORTS: 'reports',
    INVENTORY: 'inventory',
};

export const ACTIVITY_ACTIONS = {
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    VIEW: 'VIEW',
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    EXPORT: 'EXPORT',
    PRINT: 'PRINT',
};

export const AUDIT_ACTIONS = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    PERMISSION_CHANGE: 'PERMISSION_CHANGE',
    ROLE_CHANGE: 'ROLE_CHANGE',
    STATUS_CHANGE: 'STATUS_CHANGE',
};

export const ENTITY_TYPES = {
    USER: 'User',
    PATIENT: 'Patient',
    APPOINTMENT: 'Appointment',
    BILLING: 'Billing',
    PERMISSION: 'Permission',
    ROLE: 'Role',
    BRANCH: 'Branch',
    PHARMACY_ITEM: 'PharmacyItem',
    OPTICAL_ITEM: 'OpticalItem',
    EXAMINATION: 'Examination',
    SURGERY: 'Surgery',
    PRESCRIPTION: 'Prescription',
};

export const SENSITIVE_FIELDS = new Set([
    'password',
    'resetToken',
    'resetTokenExpiry',
    'reset_token',
    'reset_token_expiry',
]);
