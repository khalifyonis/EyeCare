import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

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
        where: { id: 'main-branch-id' }, // Using a fixed ID for consistency in seed
        update: {},
        create: {
            id: 'main-branch-id',
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
    for (const userData of usersToSeed) {
        const existing = await prisma.user.findUnique({ where: { username: userData.username } });
        if (existing) {
            console.log(`User ${userData.username} already exists. Skipping.`);
            createdUsers[userData.username] = existing;
        } else {
            const user = await prisma.user.create({ data: userData });
            console.log(`User created: ${user.username}`);
            createdUsers[user.username] = user;
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

    const createdByUser = createdUsers['reception1'] || createdUsers['admin'] || createdUsers['yonis'];

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
                    const appt = await prisma.appointment.create({
                        data: {
                            bookingNumber: `BK-${100 + i}-${doctor.id.slice(0, 4)}`,
                            appointmentDate: time,
                            status: statuses[i],
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
                        const er = await prisma.eRExamination.create({
                            data: {
                                appointmentId: appt.id,
                                vaRight: '6/9',
                                vaLeft: '6/9',
                                notes: 'Demo ER exam',
                                recordedById: createdByUser.id,
                            },
                        });

                        const clinical = await prisma.clinicalExamination.create({
                            data: {
                                appointmentId: appt.id,
                                // Simple but realistic refraction values
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
                        const prescription = await prisma.prescription.create({
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
                    eyeSide: 'RIGHT',
                    surgeryType: 'Cataract Extraction',
                    surgeryDate,
                    cost: surgeryCost,
                    status: 'COMPLETED',
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
