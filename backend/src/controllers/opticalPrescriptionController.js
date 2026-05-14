import prisma from '../lib/prisma.js';

const getBranchFilter = (req) => {
    return (req.user.role === 'SUPERADMIN' || !req.user.branchId)
        ? {}
        : { branchId: req.user.branchId };
};

const assertBranchAccess = (req, branchId) => {
    if (req.user.role !== 'SUPERADMIN' && req.user.branchId && branchId !== req.user.branchId) {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
    }
};

const normalizeOptionalString = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    return value;
};

const addMonthsSafe = (date, months) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    const next = new Date(d);
    const day = next.getDate();
    next.setMonth(next.getMonth() + months);
    // Fix for month rollover (e.g., Jan 31 + 1 month)
    if (next.getDate() !== day) next.setDate(0);
    return next;
};

const opticalPrescriptionInclude = {
    patient: { select: { id: true, fullName: true, patientNumber: true, dateOfBirth: true } },
    branch: { select: { id: true, branchName: true } },
    createdBy: { select: { id: true, fullName: true } },
    frameItem: { select: { id: true, itemName: true, itemType: true, brand: true, sellingPrice: true } },
    lensItem: { select: { id: true, itemName: true, itemType: true, brand: true, sellingPrice: true } },
};

export const listOpticalPrescriptions = async (req, res, next) => {
    try {
        const {
            search = '',
            status = 'all',
            type = 'all',
            patientId,
            page = '1',
            limit = '20',
            todayOnly,
            date,
            from,
            to,
        } = req.query;

        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        const whereClause = {
            ...getBranchFilter(req),
            ...(patientId ? { patientId: String(patientId) } : {}),
            ...(type !== 'all' ? { type } : {}),
            ...(status !== 'all'
                ? status === 'ACTIVE'
                    ? {
                        status: { not: 'DISPENSED' },
                        expiryDate: { gte: new Date() },
                    }
                    : status === 'EXPIRED'
                        ? {
                            status: { not: 'DISPENSED' },
                            expiryDate: { lt: new Date() },
                        }
                        : { status }
                : {}),
            ...((from || to)
                ? {
                    createdAt: {
                        ...(from ? { gte: new Date(new Date(from).setHours(0, 0, 0, 0)) } : {}),
                        ...(to ? { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) } : {}),
                    },
                }
                : date
                    ? {
                        createdAt: {
                            gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
                            lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
                        },
                    }
                    : todayOnly === '1'
                        ? {
                            createdAt: {
                                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                                lte: new Date(new Date().setHours(23, 59, 59, 999)),
                            },
                        }
                        : {}),
            ...(search
                ? {
                    OR: [
                        { id: { contains: search, mode: 'insensitive' } },
                        {
                            patient: {
                                fullName: { contains: search, mode: 'insensitive' },
                            },
                        },
                        {
                            patient: {
                                patientNumber: { contains: search, mode: 'insensitive' },
                            },
                        },
                    ],
                }
                : {}),
        };

        const [total, rows] = await Promise.all([
            prisma.opticalPrescription.count({ where: whereClause }),
            prisma.opticalPrescription.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
                include: opticalPrescriptionInclude,
            }),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / limitNum));

        res.status(200).json({
            data: rows,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages,
        });
    } catch (error) {
        next(error);
    }
};

export const getOpticalPrescriptionById = async (req, res, next) => {
    try {
        const row = await prisma.opticalPrescription.findFirst({
            where: {
                id: req.params.id,
                ...getBranchFilter(req),
            },
            include: opticalPrescriptionInclude,
        });

        if (!row) return res.status(404).json({ message: 'Optical prescription not found' });
        res.status(200).json(row);
    } catch (error) {
        next(error);
    }
};

export const getOpticalPrescriptionStats = async (req, res, next) => {
    try {
        const branchFilter = getBranchFilter(req);
        const now = new Date();

        const [total, dispensed, active, expired] = await Promise.all([
            prisma.opticalPrescription.count({ where: branchFilter }),
            prisma.opticalPrescription.count({ where: { ...branchFilter, status: 'DISPENSED' } }),
            prisma.opticalPrescription.count({
                where: {
                    ...branchFilter,
                    status: { not: 'DISPENSED' },
                    expiryDate: { gte: now },
                },
            }),
            prisma.opticalPrescription.count({
                where: {
                    ...branchFilter,
                    status: { not: 'DISPENSED' },
                    expiryDate: { lt: now },
                },
            }),
        ]);

        res.status(200).json({
            total,
            active,
            dispensed,
            expired,
        });
    } catch (error) {
        next(error);
    }
};

export const createOpticalPrescription = async (req, res, next) => {
    try {
        const {
            patientId,
            branchId,
            type,
            validityMonths,
            notes,

            odSphere,
            odCylinder,
            odAxis,
            odAdd,
            odPd,
            odPrism,

            osSphere,
            osCylinder,
            osAxis,
            osAdd,
            osPd,
            osPrism,

            lensType,
            lensMaterial,
            frameType,
            coatings,

            frameItemId,
            lensItemId,
        } = req.body;

        const activeBranchId = (req.user.role === 'SUPERADMIN' && branchId) ? branchId : req.user.branchId;
        if (!activeBranchId) return res.status(400).json({ message: 'Branch assignment is required' });

        // Ensure patient exists and is accessible
        const patient = await prisma.patient.findFirst({
            where: {
                id: patientId,
                ...(req.user.role === 'SUPERADMIN' || !req.user.branchId ? {} : { branchId: req.user.branchId }),
            },
            select: { id: true, branchId: true },
        });

        if (!patient) return res.status(404).json({ message: 'Patient not found' });
        assertBranchAccess(req, patient.branchId);

        const validity = Number(validityMonths);
        const validitySafe = Number.isFinite(validity) && validity > 0 ? Math.floor(validity) : 12;
        const expiry = addMonthsSafe(new Date(), validitySafe);
        if (!expiry) return res.status(400).json({ message: 'Invalid validity (months)' });

        const selectedFrameItemId = normalizeOptionalString(frameItemId);
        const selectedLensItemId = normalizeOptionalString(lensItemId);

        if (selectedFrameItemId) {
            const frameItem = await prisma.opticalItem.findFirst({
                where: { id: selectedFrameItemId, branchId: activeBranchId },
                select: { id: true, itemType: true },
            });
            if (!frameItem) return res.status(404).json({ message: 'Selected frame item not found' });
            if (frameItem.itemType && String(frameItem.itemType).toLowerCase() !== 'frame') {
                return res.status(400).json({ message: 'Selected frame item must have type Frame' });
            }
        }

        if (selectedLensItemId) {
            const lensItem = await prisma.opticalItem.findFirst({
                where: { id: selectedLensItemId, branchId: activeBranchId },
                select: { id: true, itemType: true },
            });
            if (!lensItem) return res.status(404).json({ message: 'Selected lens item not found' });
            if (lensItem.itemType && String(lensItem.itemType).toLowerCase() !== 'lens') {
                return res.status(400).json({ message: 'Selected lens item must have type Lens' });
            }
        }

        const row = await prisma.opticalPrescription.create({
            data: {
                branchId: activeBranchId,
                patientId: patient.id,
                createdById: req.user?.id || null,
                type,
                validityMonths: validitySafe,
                expiryDate: expiry,
                notes: normalizeOptionalString(notes),

                odSphere: normalizeOptionalString(odSphere),
                odCylinder: normalizeOptionalString(odCylinder),
                odAxis: odAxis === '' || odAxis === null || odAxis === undefined ? null : Number(odAxis),
                odAdd: normalizeOptionalString(odAdd),
                odPd: odPd === '' || odPd === null || odPd === undefined ? null : Number(odPd),
                odPrism: normalizeOptionalString(odPrism),

                osSphere: normalizeOptionalString(osSphere),
                osCylinder: normalizeOptionalString(osCylinder),
                osAxis: osAxis === '' || osAxis === null || osAxis === undefined ? null : Number(osAxis),
                osAdd: normalizeOptionalString(osAdd),
                osPd: osPd === '' || osPd === null || osPd === undefined ? null : Number(osPd),
                osPrism: normalizeOptionalString(osPrism),

                lensType: normalizeOptionalString(lensType),
                lensMaterial: normalizeOptionalString(lensMaterial),
                frameType: normalizeOptionalString(frameType),
                coatings: Array.isArray(coatings) ? coatings.filter((c) => typeof c === 'string' && c.trim()) : [],

                frameItemId: selectedFrameItemId,
                lensItemId: selectedLensItemId,
            },
            include: opticalPrescriptionInclude,
        });

        res.status(201).json(row);
    } catch (error) {
        next(error);
    }
};

export const updateOpticalPrescription = async (req, res, next) => {
    try {
        const existing = await prisma.opticalPrescription.findFirst({
            where: {
                id: req.params.id,
                ...getBranchFilter(req),
            },
            select: {
                id: true,
                branchId: true,
                createdAt: true,
                status: true,
                dispensedAt: true,
            },
        });

        if (!existing) return res.status(404).json({ message: 'Optical prescription not found' });
        assertBranchAccess(req, existing.branchId);

        const {
            patientId,
            branchId,
            type,
            status,
            validityMonths,
            notes,

            odSphere,
            odCylinder,
            odAxis,
            odAdd,
            odPd,
            odPrism,

            osSphere,
            osCylinder,
            osAxis,
            osAdd,
            osPd,
            osPrism,

            lensType,
            lensMaterial,
            frameType,
            coatings,

            frameItemId,
            lensItemId,
        } = req.body;

        const data = {};

        if (patientId !== undefined) {
            const patient = await prisma.patient.findFirst({
                where: {
                    id: patientId,
                    ...(req.user.role === 'SUPERADMIN' || !req.user.branchId ? {} : { branchId: req.user.branchId }),
                },
                select: { id: true, branchId: true },
            });

            if (!patient) return res.status(404).json({ message: 'Patient not found' });
            assertBranchAccess(req, patient.branchId);
            data.patientId = patient.id;
            if (req.user.role === 'SUPERADMIN') data.branchId = patient.branchId;
        }

        if (req.user.role === 'SUPERADMIN' && branchId !== undefined && branchId !== null && branchId !== '') {
            data.branchId = branchId;
        }

        if (type !== undefined) data.type = type;
        if (notes !== undefined) data.notes = normalizeOptionalString(notes);

        if (validityMonths !== undefined) {
            const validity = Number(validityMonths);
            const validitySafe = Number.isFinite(validity) && validity > 0 ? Math.floor(validity) : null;
            if (!validitySafe) return res.status(400).json({ message: 'Invalid validity (months)' });
            const expiry = addMonthsSafe(existing.createdAt, validitySafe);
            if (!expiry) return res.status(400).json({ message: 'Invalid validity (months)' });
            data.validityMonths = validitySafe;
            data.expiryDate = expiry;
        }

        if (status !== undefined) {
            data.status = status;
            if (status === 'DISPENSED') {
                data.dispensedAt = existing.dispensedAt || new Date();
            } else {
                data.dispensedAt = null;
            }
        }

        if (odSphere !== undefined) data.odSphere = normalizeOptionalString(odSphere);
        if (odCylinder !== undefined) data.odCylinder = normalizeOptionalString(odCylinder);
        if (odAxis !== undefined) data.odAxis = odAxis === '' || odAxis === null ? null : Number(odAxis);
        if (odAdd !== undefined) data.odAdd = normalizeOptionalString(odAdd);
        if (odPd !== undefined) data.odPd = odPd === '' || odPd === null ? null : Number(odPd);
        if (odPrism !== undefined) data.odPrism = normalizeOptionalString(odPrism);

        if (osSphere !== undefined) data.osSphere = normalizeOptionalString(osSphere);
        if (osCylinder !== undefined) data.osCylinder = normalizeOptionalString(osCylinder);
        if (osAxis !== undefined) data.osAxis = osAxis === '' || osAxis === null ? null : Number(osAxis);
        if (osAdd !== undefined) data.osAdd = normalizeOptionalString(osAdd);
        if (osPd !== undefined) data.osPd = osPd === '' || osPd === null ? null : Number(osPd);
        if (osPrism !== undefined) data.osPrism = normalizeOptionalString(osPrism);

        if (lensType !== undefined) data.lensType = normalizeOptionalString(lensType);
        if (lensMaterial !== undefined) data.lensMaterial = normalizeOptionalString(lensMaterial);
        if (frameType !== undefined) data.frameType = normalizeOptionalString(frameType);
        if (coatings !== undefined) {
            data.coatings = Array.isArray(coatings)
                ? coatings.filter((c) => typeof c === 'string' && c.trim())
                : [];
        }

        if (frameItemId !== undefined) {
            const selectedFrameItemId = normalizeOptionalString(frameItemId);
            if (selectedFrameItemId) {
                const frameItem = await prisma.opticalItem.findFirst({
                    where: { id: selectedFrameItemId, branchId: existing.branchId },
                    select: { id: true, itemType: true },
                });
                if (!frameItem) return res.status(404).json({ message: 'Selected frame item not found' });
                if (frameItem.itemType && String(frameItem.itemType).toLowerCase() !== 'frame') {
                    return res.status(400).json({ message: 'Selected frame item must have type Frame' });
                }
            }
            data.frameItemId = selectedFrameItemId;
        }

        if (lensItemId !== undefined) {
            const selectedLensItemId = normalizeOptionalString(lensItemId);
            if (selectedLensItemId) {
                const lensItem = await prisma.opticalItem.findFirst({
                    where: { id: selectedLensItemId, branchId: existing.branchId },
                    select: { id: true, itemType: true },
                });
                if (!lensItem) return res.status(404).json({ message: 'Selected lens item not found' });
                if (lensItem.itemType && String(lensItem.itemType).toLowerCase() !== 'lens') {
                    return res.status(400).json({ message: 'Selected lens item must have type Lens' });
                }
            }
            data.lensItemId = selectedLensItemId;
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ message: 'No valid fields to update' });
        }

        const row = await prisma.opticalPrescription.update({
            where: { id: existing.id },
            data,
            include: opticalPrescriptionInclude,
        });

        res.status(200).json(row);
    } catch (error) {
        next(error);
    }
};

export const deleteOpticalPrescription = async (req, res, next) => {
    try {
        const existing = await prisma.opticalPrescription.findFirst({
            where: {
                id: req.params.id,
                ...getBranchFilter(req),
            },
            select: { id: true, branchId: true },
        });

        if (!existing) return res.status(404).json({ message: 'Optical prescription not found' });
        assertBranchAccess(req, existing.branchId);

        await prisma.opticalPrescription.delete({ where: { id: existing.id } });
        res.status(200).json({ message: 'Optical prescription deleted successfully' });
    } catch (error) {
        next(error);
    }
};
export const dispenseOpticalPrescription = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { 
            frameItemId, 
            lensItemId, 
            paymentMethod = 'CASH', 
            status = 'PAID', 
            notes = '' 
        } = req.body || {};

        const prescription = await prisma.opticalPrescription.findUnique({
            where: { id },
            include: {
                patient: true,
                branch: true,
                frameItem: true,
                lensItem: true,
            }
        });

        if (!prescription) return res.status(404).json({ message: 'Optical prescription not found' });
        if (prescription.status === 'DISPENSED') return res.status(400).json({ message: 'Prescription already dispensed' });

        const frameId = frameItemId || prescription.frameItemId;
        const lensId = lensItemId || prescription.lensItemId;

        if (!frameId && !lensId) {
            return res.status(400).json({ message: 'No items linked to this prescription. Please select frame or lens.' });
        }

        const transactions = [];
        let totalAmount = 0;
        const lineItems = [];

        if (frameId) {
            const frame = await prisma.opticalItem.findUnique({ where: { id: frameId } });
            if (!frame) return res.status(404).json({ message: 'Frame item not found' });
            if (frame.stockQuantity < 1) return res.status(400).json({ message: `Frame ${frame.itemName} is out of stock` });
            
            totalAmount += Number(frame.sellingPrice);
            lineItems.push({
                itemType: 'OPTICAL_FRAME',
                itemId: frame.id,
                description: `Frame: ${frame.itemName} (${frame.brand || ''})`,
                quantity: 1,
                unitPrice: frame.sellingPrice,
                lineTotal: frame.sellingPrice,
            });
            transactions.push(prisma.opticalItem.update({ where: { id: frame.id }, data: { stockQuantity: { decrement: 1 } } }));
            transactions.push(prisma.opticalStockTransaction.create({
                data: {
                    opticalItemId: frame.id,
                    branchId: prescription.branchId,
                    transactionType: 'SALE',
                    quantity: 1,
                    unitPrice: frame.sellingPrice,
                    performedById: req.user.id,
                }
            }));
        }

        if (lensId) {
            const lens = await prisma.opticalItem.findUnique({ where: { id: lensId } });
            if (!lens) return res.status(404).json({ message: 'Lens item not found' });
            if (lens.stockQuantity < 2) return res.status(400).json({ message: `Lens ${lens.itemName} insufficient stock (Need 2)` });
            
            totalAmount += Number(lens.sellingPrice) * 2;
            lineItems.push({
                itemType: 'OPTICAL_LENS',
                itemId: lens.id,
                description: `Lens: ${lens.itemName} (Pair)`,
                quantity: 2,
                unitPrice: lens.sellingPrice,
                lineTotal: Number(lens.sellingPrice) * 2,
            });
            transactions.push(prisma.opticalItem.update({ where: { id: lens.id }, data: { stockQuantity: { decrement: 2 } } }));
            transactions.push(prisma.opticalStockTransaction.create({
                data: {
                    opticalItemId: lens.id,
                    branchId: prescription.branchId,
                    transactionType: 'SALE',
                    quantity: 2,
                    unitPrice: lens.sellingPrice,
                    performedById: req.user.id,
                }
            }));
        }

        const result = await prisma.$transaction([
            ...transactions,
            prisma.billing.create({
                data: {
                    patientId: prescription.patientId,
                    branchId: prescription.branchId,
                    serviceType: 'OPTICAL',
                    totalAmount,
                    finalAmount: totalAmount,
                    status: status,
                    paymentMethod: paymentMethod,
                    notes: notes || null,
                    createdById: req.user.id,
                    lineItems: { create: lineItems }
                }
            }),
            prisma.opticalPrescription.update({
                where: { id: prescription.id },
                data: { status: 'DISPENSED', dispensedAt: new Date() }
            })
        ]);

        res.status(200).json({ message: 'Optical items dispensed and billed successfully', billing: result[result.length - 2] });
    } catch (error) {
        next(error);
    }
};
