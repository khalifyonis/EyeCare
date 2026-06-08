import { PrismaClient } from './src/generated/client/index.js';

const prisma = new PrismaClient();

const defaultPermissions = {
  SUPERADMIN: [
    { module: 'patients', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'appointments', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'preliminary_exams', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'clinical_exams', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'surgery', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'medicine_prescriptions', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'optical_prescriptions', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'reports_financial', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'reports_clinical', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'reports_appointments', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'reports_patients', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'reports_inventory', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'reports_operational', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'pharmacy', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'optical', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'billing', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'users', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'logs', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'branches', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
  ],
  ADMIN: [
    { module: 'patients', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'appointments', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'preliminary_exams', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'clinical_exams', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'surgery', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'medicine_prescriptions', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'optical_prescriptions', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'reports_financial', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'reports_clinical', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'reports_appointments', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'reports_patients', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'reports_inventory', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'reports_operational', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'pharmacy', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'optical', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'billing', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'users', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'logs', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'branches', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
  ],
  DOCTOR: [
    { module: 'patients', canRead: true, canCreate: true, canUpdate: true, canDelete: false },
    { module: 'appointments', canRead: true, canCreate: true, canUpdate: true, canDelete: false },
    { module: 'preliminary_exams', canRead: true, canCreate: true, canUpdate: true, canDelete: false },
    { module: 'clinical_exams', canRead: true, canCreate: true, canUpdate: true, canDelete: false },
    { module: 'surgery', canRead: true, canCreate: true, canUpdate: true, canDelete: false },
    { module: 'medicine_prescriptions', canRead: true, canCreate: true, canUpdate: true, canDelete: false },
    { module: 'optical_prescriptions', canRead: true, canCreate: true, canUpdate: true, canDelete: false },
    { module: 'reports_financial', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_clinical', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_appointments', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_patients', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_inventory', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_operational', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'pharmacy', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'optical', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'billing', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'users', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'logs', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'branches', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
  ],
  RECEPTIONIST: [
    { module: 'patients', canRead: true, canCreate: true, canUpdate: true, canDelete: false },
    { module: 'appointments', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'preliminary_exams', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'clinical_exams', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'surgery', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'medicine_prescriptions', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'optical_prescriptions', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_financial', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_clinical', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_appointments', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_patients', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_inventory', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_operational', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'pharmacy', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'optical', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'billing', canRead: true, canCreate: true, canUpdate: true, canDelete: false },
    { module: 'users', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'logs', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'branches', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
  ],
  PHARMACIST: [
    { module: 'patients', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'appointments', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'preliminary_exams', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'clinical_exams', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'surgery', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'medicine_prescriptions', canRead: true, canCreate: false, canUpdate: true, canDelete: false },
    { module: 'optical_prescriptions', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_financial', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_clinical', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_appointments', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_patients', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_inventory', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_operational', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'pharmacy', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'optical', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'billing', canRead: true, canCreate: true, canUpdate: true, canDelete: false },
    { module: 'users', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'logs', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'branches', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
  ],
  OPTICIAN: [
    { module: 'patients', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'appointments', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'preliminary_exams', canRead: true, canCreate: true, canUpdate: true, canDelete: false },
    { module: 'clinical_exams', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'surgery', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'medicine_prescriptions', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'optical_prescriptions', canRead: true, canCreate: false, canUpdate: true, canDelete: false },
    { module: 'reports_financial', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_clinical', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_appointments', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_patients', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_inventory', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'reports_operational', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'pharmacy', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'optical', canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    { module: 'billing', canRead: true, canCreate: true, canUpdate: true, canDelete: false },
    { module: 'users', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'logs', canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    { module: 'branches', canRead: true, canCreate: false, canUpdate: false, canDelete: false },
  ],
};

const ROLE_DESCRIPTIONS = {
  SUPERADMIN: 'Global administrator with complete system bypass privileges.',
  ADMIN: 'Branch administrator with full management control.',
  DOCTOR: 'Medical professional performing clinical examinations.',
  RECEPTIONIST: 'Front desk coordinator managing registrations and appointments.',
  PHARMACIST: 'Pharmacy inventory manager and prescription dispenser.',
  OPTICIAN: 'Optical inventory manager and dispenser.',
};

async function main() {
  console.log('Seeding default roles and permissions...');
  
  for (const [roleName, perms] of Object.entries(defaultPermissions)) {
    console.log(`Setting up CustomRole: ${roleName}`);
    
    // Seed/upsert role
    await prisma.customRole.upsert({
      where: { name: roleName },
      update: {
        description: ROLE_DESCRIPTIONS[roleName] || `${roleName} system role`,
        isSystem: true
      },
      create: {
        name: roleName,
        description: ROLE_DESCRIPTIONS[roleName] || `${roleName} system role`,
        isSystem: true
      }
    });

    console.log(`Setting permissions for role: ${roleName}`);
    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: {
          roleName_module: {
            roleName: roleName,
            module: perm.module,
          },
        },
        update: {
          canRead: perm.canRead,
          canCreate: perm.canCreate,
          canUpdate: perm.canUpdate,
          canDelete: perm.canDelete,
        },
        create: {
          roleName: roleName,
          module: perm.module,
          canRead: perm.canRead,
          canCreate: perm.canCreate,
          canUpdate: perm.canUpdate,
          canDelete: perm.canDelete,
        },
      });
    }
  }
  
  console.log('Roles and permissions seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
