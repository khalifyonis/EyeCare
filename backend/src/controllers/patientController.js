import prisma from '../lib/prisma.js';
import moment from 'moment';
import { getPaginationParams, sendPaginated } from '../lib/pagination.js';

// Generate PAT-XXXXX style patient number
async function generatePatientNumber() {
    const lastPatient = await prisma.patient.findFirst({
        where: { patientNumber: { startsWith: 'PAT-' } },
        orderBy: { patientNumber: 'desc' },
        select: { patientNumber: true }
    });

    let nextNumber = 1;
    if (lastPatient?.patientNumber) {
        const currentNum = parseInt(lastPatient.patientNumber.replace('PAT-', ''), 10);
        if (!isNaN(currentNum)) nextNumber = currentNum + 1;
    }

    return `PAT-${nextNumber.toString().padStart(5, '0')}`;
}

export const createPatient = async (req, res, next) => {
    try {
        const {
            fullName, firstName, lastName,
            phone, email, dateOfBirth, gender,
            address, city, state, zipCode,
            bloodGroup, weight, allergies, chiefComplaint,
            currentMedications, medicalHistory, familyMedicalHistory,
            emergencyContactName, emergencyContactRelationship, emergencyContactPhone,
            assignedDoctorId, isActive,
            branchId,
        } = req.body;

        const activeBranchId = branchId || req.user.branchId;
        if (!activeBranchId) {
            return res.status(400).json({ message: 'Branch assignment is required' });
        }

        // Derive fullName from firstName+lastName if not provided
        const resolvedFullName = (fullName || [firstName, lastName].filter(Boolean).join(' ')).trim();
        if (!resolvedFullName) {
            return res.status(400).json({ message: 'Patient name is required' });
        }

        // Check if phone number already exists
        if (phone) {
            const existingPatient = await prisma.patient.findUnique({
                where: { phone }
            });
            if (existingPatient) {
                return res.status(400).json({ message: 'A patient with this phone number already exists' });
            }
        }

        // Date of birth validation
        if (dateOfBirth && moment(dateOfBirth).isAfter(moment().startOf('day'))) {
            return res.status(400).json({ message: 'Date of birth cannot be in the future' });
        }

        let patient;
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            try {
                const patientNumber = await generatePatientNumber();

                patient = await prisma.patient.create({
                    data: {
                        patientNumber,
                        fullName: resolvedFullName,
                        firstName: firstName || null,
                        lastName: lastName || null,
                        phone,
                        email: email || null,
                        dateOfBirth: dateOfBirth ? moment(dateOfBirth).toDate() : new Date('2000-01-01'),
                        gender: gender || null,
                        address: address || null,
                        city: city || null,
                        state: state || null,
                        zipCode: zipCode || null,
                        bloodGroup: bloodGroup || null,
                        weight: weight ? parseFloat(weight) : null,
                        allergies: allergies || null,
                        chiefComplaint: chiefComplaint || null,
                        currentMedications: currentMedications || null,
                        medicalHistory: medicalHistory || null,
                        familyMedicalHistory: familyMedicalHistory || null,
                        emergencyContactName: emergencyContactName || null,
                        emergencyContactRelationship: emergencyContactRelationship || null,
                        emergencyContactPhone: emergencyContactPhone || null,
                        assignedDoctorId: assignedDoctorId || null,
                        isActive: isActive !== undefined ? Boolean(isActive) : true,
                        branchId: activeBranchId,
                    },
                    include: {
                        assignedDoctor: { include: { user: { select: { fullName: true } } } },
                        branch: { select: { branchName: true } },
                    },
                });
                break; // Success
            } catch (error) {
                if (error.code === 'P2002' && error.meta?.target?.includes('patient_number')) {
                    attempts++;
                    if (attempts >= maxAttempts) throw error;
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
                    continue;
                }
                throw error;
            }
        }

        res.status(201).json(patient);
    } catch (error) {
        next(error);
    }
};

export const getAllPatients = async (req, res, next) => {
    try {
        const { search, branchId, gender, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const { skip, take, page, limit } = getPaginationParams(req.query);

        // SUPERADMIN sees all; others filter by branch (skip branch filter if branchId missing, e.g. old token)
        const branchFilter = req.user.role === 'SUPERADMIN' || !req.user.branchId
            ? {}
            : { branchId: req.user.branchId };
        const whereClause = {
            ...branchFilter,
            ...(branchId ? { branchId } : {}),
            ...(gender ? { gender } : {}),
            ...(search ? {
                OR: [
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ]
            } : {})
        };

        const [patients, total] = await Promise.all([
            prisma.patient.findMany({
                where: whereClause,
                orderBy: { [sortBy]: sortOrder },
                skip,
                take,
                include: {
                    branch: { select: { branchName: true } },
                    assignedDoctor: {
                        include: { user: { select: { fullName: true } } }
                    },
                }
            }),
            prisma.patient.count({ where: whereClause })
        ]);

        sendPaginated(res, patients, total, page, limit);
    } catch (error) {
        next(error);
    }
};

export const getPatientStats = async (req, res, next) => {
    try {
        const now = moment();
        const startOfToday = now.clone().startOf('day').toDate();
        const startOfWeek = now.clone().startOf('week').toDate();
        const startOfMonth = now.clone().startOf('month').toDate();

        const branchFilter = (req.user.role === 'SUPERADMIN' || !req.user.branchId) ? {} : { branchId: req.user.branchId };

        const [total, today, week, month] = await Promise.all([
            prisma.patient.count({ where: branchFilter }),
            prisma.patient.count({
                where: {
                    ...branchFilter,
                    createdAt: { gte: startOfToday }
                }
            }),
            prisma.patient.count({
                where: {
                    ...branchFilter,
                    createdAt: { gte: startOfWeek }
                }
            }),
            prisma.patient.count({
                where: {
                    ...branchFilter,
                    createdAt: { gte: startOfMonth }
                }
            })
        ]);

        res.status(200).json({
            total,
            today,
            week,
            month,
        });
    } catch (error) {
        next(error);
    }
};

export const getPatientById = async (req, res, next) => {
    try {
        const branchFilter = req.user.role === 'SUPERADMIN' || !req.user.branchId
            ? {}
            : { branchId: req.user.branchId };

        const patient = await prisma.patient.findFirst({
            where: {
                id: req.params.id,
                ...branchFilter,
            },
            include: {
                appointments: {
                    include: {
                        doctor: {
                            include: {
                                user: {
                                    select: { fullName: true }
                                }
                            }
                        },
                        clinicalExamination: {
                            include: {
                                examinedBy: {
                                    include: {
                                        user: {
                                            select: {
                                                fullName: true
                                            }
                                        }
                                    }
                                },
                                surgery: {
                                    include: {
                                        surgeon: {
                                            include: {
                                                user: {
                                                    select: {
                                                        fullName: true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                prescriptions: {
                                    select: {
                                        id: true,
                                        itemType: true,
                                        itemId: true,
                                        quantity: true,
                                        instructions: true,
                                        createdAt: true,
                                    }
                                }
                            }
                        },
                        erExamination: {
                            include: {
                                recordedBy: {
                                    select: {
                                        fullName: true,
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        appointmentDate: 'desc'
                    }
                },
                branch: true
            }
        });

        if (!patient) return res.status(404).json({ message: 'Patient not found' });

        res.status(200).json(patient);
    } catch (error) {
        next(error);
    }
};

export const updatePatient = async (req, res, next) => {
    try {
        const {
            fullName, firstName, lastName,
            phone, email, dateOfBirth, gender,
            address, city, state, zipCode,
            bloodGroup, weight, allergies, chiefComplaint,
            currentMedications, medicalHistory, familyMedicalHistory,
            emergencyContactName, emergencyContactRelationship, emergencyContactPhone,
            assignedDoctorId, isActive,
        } = req.body;

        // Date of birth validation
        if (dateOfBirth && moment(dateOfBirth).isAfter(moment().startOf('day'))) {
            return res.status(400).json({ message: 'Date of birth cannot be in the future' });
        }

        const data = {};
        if (fullName !== undefined) data.fullName = fullName.trim();
        if (firstName !== undefined) data.firstName = firstName || null;
        if (lastName !== undefined) data.lastName = lastName || null;
        if (phone !== undefined) data.phone = phone;
        if (email !== undefined) data.email = email || null;
        if (dateOfBirth !== undefined) data.dateOfBirth = moment(dateOfBirth).toDate();
        if (gender !== undefined) data.gender = gender;
        if (address !== undefined) data.address = address || null;
        if (city !== undefined) data.city = city || null;
        if (state !== undefined) data.state = state || null;
        if (zipCode !== undefined) data.zipCode = zipCode || null;
        if (bloodGroup !== undefined) data.bloodGroup = bloodGroup || null;
        if (weight !== undefined) data.weight = weight ? parseFloat(weight) : null;
        if (allergies !== undefined) data.allergies = allergies || null;
        if (chiefComplaint !== undefined) data.chiefComplaint = chiefComplaint || null;
        if (currentMedications !== undefined) data.currentMedications = currentMedications || null;
        if (medicalHistory !== undefined) data.medicalHistory = medicalHistory || null;
        if (familyMedicalHistory !== undefined) data.familyMedicalHistory = familyMedicalHistory || null;
        if (emergencyContactName !== undefined) data.emergencyContactName = emergencyContactName || null;
        if (emergencyContactRelationship !== undefined) data.emergencyContactRelationship = emergencyContactRelationship || null;
        if (emergencyContactPhone !== undefined) data.emergencyContactPhone = emergencyContactPhone || null;
        if (assignedDoctorId !== undefined) data.assignedDoctorId = assignedDoctorId || null;
        if (isActive !== undefined) data.isActive = Boolean(isActive);

        const patient = await prisma.patient.update({
            where: { id: req.params.id },
            data,
            include: {
                assignedDoctor: { include: { user: { select: { fullName: true } } } },
                branch: { select: { branchName: true } },
            },
        });
        res.status(200).json(patient);
    } catch (error) {
        next(error);
    }
};

export const deletePatient = async (req, res, next) => {
    try {
        await prisma.patient.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Patient deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export const getPatientEyeHistory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const branchFilter = req.user.role === 'SUPERADMIN' || !req.user.branchId
            ? {}
            : { branchId: req.user.branchId };

        const patient = await prisma.patient.findFirst({
            where: { id, ...branchFilter },
            select: { id: true },
        });
        if (!patient) return res.status(404).json({ message: 'Patient not found' });

        const appointments = await prisma.appointment.findMany({
            where: { patientId: id, ...branchFilter },
            orderBy: { appointmentDate: 'asc' },
            include: {
                doctor: { include: { user: { select: { fullName: true } } } },
                clinicalExamination: {
                    include: {
                        examinedBy: { include: { user: { select: { fullName: true } } } },
                        surgery: {
                            include: {
                                surgeon: { include: { user: { select: { fullName: true } } } },
                            },
                        },
                    },
                },
                erExamination: {
                    include: { recordedBy: { select: { fullName: true } } },
                },
            },
        });

        const refractionHistory = [];
        const iopHistory = [];
        const surgeries = [];

        for (const apt of appointments) {
            if (apt.clinicalExamination) {
                const ce = apt.clinicalExamination;
                refractionHistory.push({
                    date: apt.appointmentDate,
                    doctorName: ce.examinedBy?.user?.fullName || apt.doctor?.user?.fullName || 'Unknown',
                    sphRight: ce.sphRight,
                    cylRight: ce.cylRight,
                    axisRight: ce.axisRight,
                    sphLeft: ce.sphLeft,
                    cylLeft: ce.cylLeft,
                    axisLeft: ce.axisLeft,
                    diagnosis: ce.diagnosis,
                });
                if (ce.surgery) {
                    const s = ce.surgery;
                    surgeries.push({
                        date: s.date,
                        eye: s.eye,
                        surgeryType: s.surgeryType,
                        status: s.status,
                        surgeonName: s.surgeon?.user?.fullName || 'Unknown',
                        notes: s.notes,
                    });
                }
            }
            if (apt.erExamination) {
                const er = apt.erExamination;
                iopHistory.push({
                    date: apt.appointmentDate,
                    recordedBy: er.recordedBy?.fullName || 'Unknown',
                    vaRight: er.vaRight,
                    vaLeft: er.vaLeft,
                    iopRight: er.iopRight,
                    iopLeft: er.iopLeft,
                });
            }
        }

        res.status(200).json({ refractionHistory, iopHistory, surgeries });
    } catch (error) {
        next(error);
    }
};
