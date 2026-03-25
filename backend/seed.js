import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/client/index.js';
import bcrypt from 'bcrypt';

const MAIN_BRANCH_ID = '00000000-0000-0000-0000-000000000001';
const SEED_DEMO_USERS = String(process.env.SEED_DEMO_USERS || '').toLowerCase() === '1'
    || String(process.env.SEED_DEMO_USERS || '').toLowerCase() === 'true';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
    console.log('Seeding roles...');
    const roles = [
        { name: 'SUPERADMIN', description: 'Complete System Access' },
        { name: 'ADMIN', description: 'System Administrator' },
        { name: 'DOCTOR', description: 'Medical Professional' },
        { name: 'RECEPTIONIST', description: 'Front Desk Staff' },
        { name: 'OPTICIAN', description: 'Eyewear Specialist' },
        { name: 'PHARMACIST', description: 'Medication Specialist' },
    ];

    for (const role of roles) {
        await prisma.role.upsert({
            where: { name: role.name },
            update: {},
            create: role,
        });
    }

    console.log('Seeding default branch...');
    const mainBranch = await prisma.branch.upsert({
        where: { id: MAIN_BRANCH_ID }, // Using a fixed UUID for consistency in seed
        update: {},
        create: {
            id: MAIN_BRANCH_ID,
            branchName: 'Main Branch',
            address: '123 Eye St, Medical District',
            phone: '123-456-7890',
        }
    });

    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    const doctorRole = await prisma.role.findUnique({ where: { name: 'DOCTOR' } });
    const receptionistRole = await prisma.role.findUnique({ where: { name: 'RECEPTIONIST' } });
    const opticianRole = await prisma.role.findUnique({ where: { name: 'OPTICIAN' } });
    const pharmacistRole = await prisma.role.findUnique({ where: { name: 'PHARMACIST' } });
    if (!adminRole || !doctorRole || !receptionistRole || !opticianRole || !pharmacistRole) {
        throw new Error('One or more roles not found after seeding');
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const usersToSeed = [
        {
            fullName: 'System Admin',
            username: 'admin',
            email: 'admin@eyecare.com',
            password: hashedPassword,
            roleId: adminRole.id,
            branchId: mainBranch.id,
        },
        {
            fullName: 'Yonis',
            username: 'yonis',
            email: 'yonis@eyecare.com',
            password: hashedPassword,
            roleId: adminRole.id, // Giving admin access as requested
            branchId: mainBranch.id,
        },
        {
            fullName: 'Dr. Ahmed',
            username: 'doctor1',
            email: 'doctor1@eyecare.com',
            password: hashedPassword,
            roleId: doctorRole.id,
            branchId: mainBranch.id,
        },
        {
            fullName: 'Amina Reception',
            username: 'reception1',
            email: 'reception1@eyecare.com',
            password: hashedPassword,
            roleId: receptionistRole.id,
            branchId: mainBranch.id,
        },
        {
            fullName: 'Pharmacy User',
            username: 'pharmacist1',
            email: 'pharmacist1@eyecare.com',
            password: hashedPassword,
            roleId: pharmacistRole.id,
            branchId: mainBranch.id,
        },
        {
            fullName: 'Optician User',
            username: 'optician1',
            email: 'optician1@eyecare.com',
            password: hashedPassword,
            roleId: opticianRole.id,
            branchId: mainBranch.id,
        },
    ];

    console.log('Checking and seeding users...');
    const createdUsers = {};
    if (SEED_DEMO_USERS) {
        for (const userData of usersToSeed) {
            const existing = await prisma.user.findUnique({ where: { username: userData.username } });
            if (existing) {
                console.log(`User ${userData.username} already exists. Skipping.`);
                createdUsers[userData.username] = existing;
            } else {
                const user = await prisma.user.create({ data: userData });
                console.log(`User created: ${user.username}`);
                createdUsers[userData.username] = user;
            }
        }
    } else {
        console.log('Skipping demo user seeding. (Set SEED_DEMO_USERS=1 to enable)');
        const existing = await prisma.user.findMany({
            where: { branchId: mainBranch.id },
            select: { id: true, username: true, roleId: true, branchId: true },
        });
        for (const u of existing) createdUsers[u.username] = u;
        if (existing.length === 0) {
            console.log('No users exist in this database. Create your real users first, or run with SEED_DEMO_USERS=1 once.');
        }
    }

    // Ensure every DOCTOR user has a Doctor profile (including existing users like \"omar\")
    console.log('Ensuring doctor profiles for all doctor users...');
    const doctorUsers = await prisma.user.findMany({ where: { roleId: doctorRole.id } });
    for (let i = 0; i < doctorUsers.length; i++) {
        const user = doctorUsers[i];
        const existingDoctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
        if (!existingDoctor) {
            const license = `DOC-${1000 + i}`;
            await prisma.doctor.create({
                data: {
                    userId: user.id,
                    licenseNumber: license,
                    specialization: 'Ophthalmology',
                    phone: user.phone || '555-0000',
                    branchId: mainBranch.id,
                },
            });
            console.log(`Doctor profile created for user ${user.username} (${license})`);
        }
    }

    console.log('Seeding demo clinical data (patients, appointments, exams, prescriptions, billing)...');

    // Pharmacy items (so prescriptions can link to real items)
    const pharmaItems = [
        { itemName: 'Eye Drops (Timolol)',    itemType: 'Drops',   category: 'Glaucoma',       purchasePrice: 3, sellingPrice: 5 },
        { itemName: 'Lubricant Eye Drops',    itemType: 'Drops',   category: 'Dry Eye',        purchasePrice: 2, sellingPrice: 4 },
        { itemName: 'Ciprofloxacin Drops',    itemType: 'Drops',   category: 'Antibiotic',     purchasePrice: 4, sellingPrice: 7 },
        { itemName: 'Prednisolone Acetate',   itemType: 'Drops',   category: 'Anti-inflammatory', purchasePrice: 5, sellingPrice: 9 },
    ];
    const createdPharmaItems = [];
    for (const pi of pharmaItems) {
        const existing = await prisma.pharmacyItem.findFirst({
            where: { branchId: mainBranch.id, itemName: pi.itemName },
        });
        if (existing) {
            createdPharmaItems.push(existing);
        } else {
            const item = await prisma.pharmacyItem.create({
                data: {
                    branchId: mainBranch.id,
                    itemName: pi.itemName,
                    itemType: pi.itemType,
                    category: pi.category,
                    stockQuantity: 50,
                    reorderLevel: 10,
                    purchasePrice: pi.purchasePrice,
                    sellingPrice: pi.sellingPrice,
                },
            });
            createdPharmaItems.push(item);
        }
    }
    console.log(`${createdPharmaItems.length} pharmacy items ensured.`);

    // Optical items (eyewear, lenses, solutions)
    const opticalItems = [
        { itemName: 'Classic Reading Glasses', itemType: 'Frame', brand: 'VisionPro', manufacturer: 'VisionPro Optics', stockQuantity: 25, reorderLevel: 5, purchasePrice: 15, sellingPrice: 35 },
        { itemName: 'Blue Light Blocking Glasses', itemType: 'Frame', brand: 'ScreenGuard', manufacturer: 'ScreenGuard Ltd', stockQuantity: 30, reorderLevel: 8, purchasePrice: 12, sellingPrice: 28 },
        { itemName: 'Single Vision CR-39 Lens', itemType: 'Lens', brand: 'ClearView', manufacturer: 'ClearView Lenses', stockQuantity: 50, reorderLevel: 15, purchasePrice: 8, sellingPrice: 22 },
        { itemName: 'Contact Lens Solution 300ml', itemType: 'Solution', brand: 'OptiCare', manufacturer: 'OptiCare Solutions', stockQuantity: 40, reorderLevel: 10, purchasePrice: 4, sellingPrice: 10 },
        { itemName: 'Polarized Sunglasses (Unisex)', itemType: 'Frame', brand: 'SunEyes', manufacturer: 'SunEyes Optical', stockQuantity: 20, reorderLevel: 5, purchasePrice: 18, sellingPrice: 45 },
    ];
    for (const oi of opticalItems) {
        const existing = await prisma.opticalItem.findFirst({
            where: { branchId: mainBranch.id, itemName: oi.itemName, brand: oi.brand },
        });
        if (!existing) {
            await prisma.opticalItem.create({
                data: {
                    branchId: mainBranch.id,
                    itemName: oi.itemName,
                    itemType: oi.itemType,
                    brand: oi.brand,
                    manufacturer: oi.manufacturer,
                    stockQuantity: oi.stockQuantity,
                    reorderLevel: oi.reorderLevel,
                    purchasePrice: oi.purchasePrice,
                    sellingPrice: oi.sellingPrice,
                },
            });
        }
    }
    console.log('Optical items ensured.');

    // Patients
    const demoPatients = [
        { fullName: 'Ahmed Ali', phone: '700000001' },
        { fullName: 'Sarah Omar', phone: '700000002' },
        { fullName: 'Mohamed Hassan', phone: '700000003' },
        { fullName: 'Fatima Yusuf', phone: '700000004' },
    ];

    const now = new Date();
    const today = new Date(now);
    today.setHours(9, 0, 0, 0);

    const patients = [];
    for (let i = 0; i < demoPatients.length; i++) {
        const p = demoPatients[i];
        const existing = await prisma.patient.findUnique({ where: { phone: p.phone } });
        if (existing) {
            patients.push(existing);
        } else {
            const created = await prisma.patient.create({
                data: {
                    fullName: p.fullName,
                    gender: i % 2 === 0 ? 'Male' : 'Female',
                    dateOfBirth: new Date(1990, i, 10),
                    phone: p.phone,
                    email: null,
                    address: 'Demo Address',
                    branchId: mainBranch.id,
                },
            });
            patients.push(created);
        }
    }

    // Ensure Smoke Test Patient exists with complete profile fields
    const smokePhone = '792069316';

    const smokePayload = {
        fullName: 'Smoke Test Patient',
        gender: 'Male',
        dateOfBirth: new Date('1989-12-31T00:00:00.000Z'),
        phone: smokePhone,
        email: 'smoke.patient@eyecare.com',
        address: 'Hodan District, Road 3, Mogadishu',
        branchId: mainBranch.id,
    };

    const existingSmoke = await prisma.patient.findUnique({ where: { phone: smokePhone } });
    let smokePatient;
    if (existingSmoke) {
        smokePatient = await prisma.patient.update({
            where: { id: existingSmoke.id },
            data: smokePayload,
        });
        console.log('Smoke Test Patient updated with complete profile fields.');
    } else {
        smokePatient = await prisma.patient.create({ data: smokePayload });
        console.log('Smoke Test Patient created with complete profile fields.');
    }

    if (!patients.some((p) => p.id === smokePatient.id)) {
        patients.push(smokePatient);
    }

    const createdByUser = createdUsers['reception1']
        || createdUsers['admin']
        || createdUsers['yonis']
        || (await prisma.user.findFirst({ where: { branchId: mainBranch.id } }));

    if (createdByUser) {
        const doctors = await prisma.doctor.findMany({ where: { branchId: mainBranch.id } });
        for (const doctor of doctors) {
            const existingForDoctor = await prisma.appointment.findMany({
                where: {
                    branchId: mainBranch.id,
                    doctorId: doctor.id,
                    appointmentDate: { gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) },
                },
            });

            if (existingForDoctor.length === 0) {
                const statuses = ['PENDING', 'COMPLETED', 'PENDING', 'COMPLETED'];
                const createdAppointments = [];

                for (let i = 0; i < patients.length; i++) {
                    const time = new Date(today);
                    time.setHours(9 + i, 0, 0, 0);
                    const bookingNumber = `BK-${100 + i}-${doctor.id.slice(0, 4)}`;
                    const appt = await prisma.appointment.upsert({
                        where: { bookingNumber },
                        update: {
                            appointmentDate: time,
                            status: statuses[i] || 'PENDING',
                            amount: 20,
                            branchId: mainBranch.id,
                            patientId: patients[i].id,
                            doctorId: doctor.id,
                            createdById: createdByUser.id,
                        },
                        create: {
                            bookingNumber,
                            appointmentDate: time,
                            status: statuses[i] || 'PENDING',
                            amount: 20,
                            branchId: mainBranch.id,
                            patientId: patients[i].id,
                            doctorId: doctor.id,
                            createdById: createdByUser.id,
                        },
                    });
                    createdAppointments.push(appt);
                }

                // Create ER and Clinical exams, prescriptions, billing for completed ones
                for (const appt of createdAppointments) {
                    if (appt.status === 'COMPLETED') {
                        await prisma.eRExamination.upsert({
                            where: { appointmentId: appt.id },
                            update: {
                                vaRight: '6/9',
                                vaLeft: '6/9',
                                notes: 'Demo ER exam',
                                recordedById: createdByUser.id,
                            },
                            create: {
                                appointmentId: appt.id,
                                vaRight: '6/9',
                                vaLeft: '6/9',
                                notes: 'Demo ER exam',
                                recordedById: createdByUser.id,
                            },
                        });

                        const clinical = await prisma.clinicalExamination.upsert({
                            where: { appointmentId: appt.id },
                            update: {
                                sphRight: -1.25,
                                cylRight: -0.50,
                                axisRight: 90,
                                sphLeft: -1.00,
                                cylLeft: -0.25,
                                axisLeft: 85,
                                diagnosis: 'Demo diagnosis',
                                managementPlan: 'Demo plan',
                                examinedById: doctor.id,
                            },
                            create: {
                                appointmentId: appt.id,
                                sphRight: -1.25,
                                cylRight: -0.50,
                                axisRight: 90,
                                sphLeft: -1.00,
                                cylLeft: -0.25,
                                axisLeft: 85,
                                diagnosis: 'Demo diagnosis',
                                managementPlan: 'Demo plan',
                                examinedById: doctor.id,
                            },
                        });

                        const randItem = createdPharmaItems[Math.floor(Math.random() * createdPharmaItems.length)];
                        let prescription = await prisma.prescription.findFirst({
                            where: { appointmentId: appt.id, branchId: mainBranch.id },
                            orderBy: { createdAt: 'asc' },
                        });

                        if (!prescription) {
                            prescription = await prisma.prescription.create({
                                data: {
                                    appointmentId: appt.id,
                                    examId: clinical.id,
                                    branchId: mainBranch.id,
                                    itemType: 'PHARMACY',
                                    itemId: randItem?.id || null,
                                    quantity: 1,
                                    instructions: 'Use as directed',
                                },
                            });
                        }

                        const existingBilling = await prisma.billing.findFirst({
                            where: { appointmentId: appt.id, serviceType: 'APPOINTMENT' },
                        });

                        if (!existingBilling) {
                            await prisma.billing.create({
                                data: {
                                    patientId: appt.patientId,
                                    branchId: mainBranch.id,
                                    appointmentId: appt.id,
                                    surgeryId: null,
                                    prescriptionId: prescription.id,
                                    serviceType: 'APPOINTMENT',
                                    totalAmount: 20,
                                    discount: 0,
                                    finalAmount: 20,
                                    paymentMethod: 'CASH',
                                    referenceNumber: null,
                                    status: 'PAID',
                                    createdById: createdByUser.id,
                                },
                            });
                        }
                    }
                }

                console.log(`Demo appointments, exams, prescriptions and billing created for doctor ${doctor.id}.`);
            } else {
                console.log(`Appointments for today already exist for doctor ${doctor.id}. Reusing existing data.`);
            }
        }

        // Ensure we have some demo surgeries and related billing with reference numbers
        const examsNeedingSurgery = await prisma.clinicalExamination.findMany({
            where: { surgery: null },
            include: { appointment: true },
            take: 3,
        });

        for (const exam of examsNeedingSurgery) {
            if (!exam.appointment) continue;

            const surgeryDate = new Date(exam.appointment.appointmentDate ?? today);
            surgeryDate.setHours(surgeryDate.getHours() + 1);

            const surgeryCost = 150;

            const surgery = await prisma.surgery.create({
                data: {
                    examId: exam.id,
                    branchId: exam.appointment.branchId,
                    patientId: exam.appointment.patientId,
                    eye: 'OD',
                    surgeryType: 'Cataract Surgery',
                    procedure: 'Phacoemulsification + IOL',
                    anesthesiaType: 'Topical',
                    date: surgeryDate,
                    time: '10:30',
                    operatingRoom: 'OR-1',
                    cataractDetails: { technique: 'Phacoemulsification', iolModel: 'Alcon SN60WF', iolPower: 0, targetRefraction: 0 },
                    cost: surgeryCost,
                    status: 'completed',
                    notes: 'Demo cataract surgery',
                    surgeonId: exam.examinedById,
                },
            });

            await prisma.billing.create({
                data: {
                    patientId: exam.appointment.patientId,
                    branchId: exam.appointment.branchId,
                    appointmentId: exam.appointment.id,
                    surgeryId: surgery.id,
                    prescriptionId: null,
                    serviceType: 'SURGERY',
                    totalAmount: surgeryCost,
                    discount: 0,
                    finalAmount: surgeryCost,
                    paymentMethod: 'CASH',
                    referenceNumber: `SURG-${exam.appointment.bookingNumber || surgery.id.slice(0, 6)}`,
                    status: 'PAID',
                    createdById: createdByUser.id,
                },
            });
        }
    } else {
        console.log('createdBy user missing, skipping clinical data seeding.');
    }

    // Seed demo surgeries for the Eye Surgery module list page
    const existingSurgeryCount = await prisma.surgery.count({ where: { branchId: mainBranch.id } });
    if (existingSurgeryCount < 6 && patients.length > 0) {
        const doctors = await prisma.doctor.findMany({ where: { branchId: mainBranch.id }, select: { id: true } });
        const surgeonIds = doctors.map((d) => d.id);

        if (surgeonIds.length > 0) {
            const needed = Math.max(0, 6 - existingSurgeryCount);
            if (needed === 0) {
                // no-op
            } else {

            const base = new Date();
            base.setHours(9, 0, 0, 0);

            const types = [
                { surgeryType: 'Cataract Surgery', procedure: 'Phacoemulsification + IOL', anesthesiaType: 'Topical' },
                { surgeryType: 'Refractive Surgery', procedure: 'LASIK', anesthesiaType: 'Topical' },
                { surgeryType: 'Refractive Surgery', procedure: 'PRK', anesthesiaType: 'Topical' },
                { surgeryType: 'Retinal Surgery', procedure: 'Vitrectomy', anesthesiaType: 'General' },
                { surgeryType: 'Retinal Surgery', procedure: 'Retinal Detachment Repair', anesthesiaType: 'General' },
                { surgeryType: 'Cataract Surgery', procedure: 'ECCE + IOL', anesthesiaType: 'Topical' },
            ];

            const rows = types.slice(0, Math.min(needed, types.length)).map((t, idx) => {
                const d = new Date(base);
                d.setDate(d.getDate() + idx);
                d.setHours(10 + (idx % 4), 0, 0, 0);

                const patient = patients[idx % patients.length];
                const surgeonId = surgeonIds[idx % surgeonIds.length];

                const status = idx === 2 ? 'completed' : 'scheduled';
                const eye = idx % 3 === 0 ? 'OD' : idx % 3 === 1 ? 'OS' : 'BOTH';

                return {
                    branchId: mainBranch.id,
                    patientId: patient.id,
                    eye,
                    surgeryType: t.surgeryType,
                    procedure: t.procedure,
                    anesthesiaType: t.anesthesiaType,
                    date: d,
                    time: `${String(d.getHours()).padStart(2, '0')}:00`,
                    operatingRoom: `OR-${(idx % 3) + 1}`,
                    cataractDetails: t.surgeryType === 'Cataract Surgery'
                        ? { technique: 'Phacoemulsification', iolModel: 'Alcon SN60WF', iolPower: 0, targetRefraction: 0 }
                        : null,
                    status,
                    notes: 'Demo surgery',
                    surgeonId,
                    cost: 0,
                };
            });

            await prisma.surgery.createMany({ data: rows });
            console.log(`Seeded ${rows.length} surgeries.`);
            }
        }
    }

    // Seed demo optical prescriptions for datatable visibility
    const existingOpticalCount = await prisma.opticalPrescription.count({
        where: { branchId: mainBranch.id },
    });

    if (existingOpticalCount === 0 && patients.length > 0) {
        const samplePatients = patients.slice(0, Math.min(6, patients.length));
        const seedRows = samplePatients.map((p, idx) => {
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - (idx * 5 + 1));
            const validityMonths = idx % 2 === 0 ? 12 : 6;
            const expiryDate = new Date(createdAt);
            expiryDate.setMonth(expiryDate.getMonth() + validityMonths);

            const isDispensed = idx % 3 === 0;

            return {
                branchId: mainBranch.id,
                patientId: p.id,
                createdById: createdByUser?.id || null,
                type: idx % 2 === 0 ? 'SPECTACLES' : 'CONTACT_LENS',
                status: isDispensed ? 'DISPENSED' : 'FILLED',
                createdAt,
                validityMonths,
                expiryDate,
                dispensedAt: isDispensed ? new Date(createdAt.getTime() + 86400000) : null,
                notes: 'Demo optical prescription',

                odSphere: '-1.25',
                odCylinder: '-0.50',
                odAxis: 90,
                odAdd: '+1.00',
                odPd: 31,
                odPrism: '0',

                osSphere: '-1.00',
                osCylinder: '-0.25',
                osAxis: 85,
                osAdd: '+1.00',
                osPd: 31,
                osPrism: '0',

                lensType: idx % 2 === 0 ? 'Single Vision' : 'Progressive',
                lensMaterial: idx % 2 === 0 ? 'CR-39' : 'Polycarbonate',
                frameType: idx % 2 === 0 ? 'Full Rim' : 'Half Rim',
                coatings: ['Anti Reflective', 'UV Protection'],
            };
        });

        await prisma.opticalPrescription.createMany({ data: seedRows });
        console.log(`Seeded ${seedRows.length} optical prescriptions.`);
    }

    // Fix any existing prescriptions that have null itemId
    if (createdPharmaItems.length > 0) {
        const nullItemRx = await prisma.prescription.findMany({ where: { itemId: null } });
        for (const rx of nullItemRx) {
            const randItem = createdPharmaItems[Math.floor(Math.random() * createdPharmaItems.length)];
            await prisma.prescription.update({
                where: { id: rx.id },
                data: { itemId: randItem.id },
            });
        }
        if (nullItemRx.length > 0) console.log(`Fixed ${nullItemRx.length} prescriptions with missing items.`);
    }

    console.log('Seeding complete.');
    console.log('Credentials:');
    console.log('- username="admin", password="admin123"');
    console.log('- username="yonis", password="admin123"');
    console.log('- username="doctor1", password="admin123"');
    console.log('- username="reception1", password="admin123"');
    console.log('- username="pharmacist1", password="admin123"');
    console.log('- username="optician1", password="admin123"');
    await pool.end();
}

seed().catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
});
