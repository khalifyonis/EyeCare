/**
 * Use case diagram — quadrant layout, correct role assignments.
 * Left: Administrator, Super Admin, Optician
 * Right: Receptionist, Doctor, Pharmacist
 */
module.exports = {
  actors: [
    { id: 'AD', name: 'Administrator', side: 'left', slot: 0 },
    { id: 'SA', name: 'Super Admin', side: 'left', slot: 1 },
    { id: 'OP', name: 'Optician', side: 'left', slot: 2 },
    { id: 'RC', name: 'Receptionist', side: 'right', slot: 0 },
    { id: 'DR', name: 'Doctor', side: 'right', slot: 1 },
    { id: 'PH', name: 'Pharmacist', side: 'right', slot: 2 },
  ],
  quadrants: {
    tl: [
      { id: 'UC_RC1', label: 'Register Patient', actor: 'RC' },
      { id: 'UC_AD1', label: 'Manage Users', actor: 'AD' },
      { id: 'UC_SA1', label: 'Manage Branches', actor: 'SA' },
      { id: 'UC_SA2', label: 'Manage Role Permissions', actor: 'SA' },
    ],
    tr: [
      { id: 'UC_RC2', label: 'Schedule Appointment', actor: 'RC' },
      { id: 'UC_AD2', label: 'Manage Doctors', actor: 'AD' },
      { id: 'UC_AD3', label: 'View Reports', actor: 'AD' },
      { id: 'UC_SA3', label: 'Activity & Audit Logs', actor: 'SA' },
    ],
    bl: [
      { id: 'UC_OP1', label: 'View Prescription', actor: 'OP' },
      { id: 'UC_OP2', label: 'Manage Optical Inventory', actor: 'OP' },
      { id: 'UC_OP3', label: 'Dispense Optical Products', actor: 'OP' },
    ],
    br: [
      { id: 'UC_DR1', label: 'View Dashboard', actor: 'DR' },
      { id: 'UC_DR2', label: 'Conduct Examination', actor: 'DR' },
      { id: 'UC_DR3', label: 'Manage Prescriptions', actor: 'DR' },
      { id: 'UC_RC3', label: 'Billing', actor: 'RC' },
      { id: 'UC_PH1', label: 'Dispense Medicine', actor: 'PH' },
      { id: 'UC_PH2', label: 'Manage Pharmacy Inventory', actor: 'PH' },
      { id: 'UC_PH3', label: 'Pharmacy Sales', actor: 'PH' },
    ],
  },
  includes: [
    ['UC_PH1', 'UC_RC3'],
    ['UC_OP3', 'UC_RC3'],
  ],
};
