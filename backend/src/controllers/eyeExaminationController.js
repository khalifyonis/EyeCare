import prisma from '../lib/prisma.js';
import { getPaginationParams, sendPaginated } from '../lib/pagination.js';

const getBranchFilter = (req) => {
  return req.user.role === 'SUPERADMIN' || !req.user.branchId ? {} : { branchId: req.user.branchId };
};

const resolveBranchIdForWrite = (req, bodyBranchId) => {
  if (req.user.role === 'SUPERADMIN') {
    const b = (bodyBranchId || req.user.branchId || '').trim();
    if (!b) {
      const err = new Error('branchId is required');
      err.statusCode = 400;
      throw err;
    }
    return b;
  }
  if (!req.user.branchId) {
    const err = new Error('branchId missing for current user');
    err.statusCode = 400;
    throw err;
  }
  return req.user.branchId;
};

const coerceIntOrNull = (v) => {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const n = typeof v === 'string' ? Number(v) : v;
  if (Number.isNaN(n)) return null;
  return typeof n === 'number' ? Math.trunc(n) : null;
};

export const getEyeExaminations = async (req, res, next) => {
  try {
    const { search, date } = req.query;
    const { skip, take, page, limit } = getPaginationParams(req.query);

    const where = {
      ...getBranchFilter(req),
      ...(search
        ? {
            OR: [
              { patient: { fullName: { contains: String(search), mode: 'insensitive' } } },
              { patient: { patientNumber: { contains: String(search), mode: 'insensitive' } } },
              { patient: { id: { equals: String(search) } } },
            ],
          }
        : {}),
      ...(date
        ? {
            createdAt: {
              gte: new Date(`${date}T00:00:00.000Z`),
              lte: new Date(`${date}T23:59:59.999Z`),
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.eyeExamination.count({ where }),
      prisma.eyeExamination.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          patient: { select: { id: true, fullName: true, patientNumber: true } },
          doctor: { include: { user: { select: { id: true, fullName: true } } } },
        },
      }),
    ]);

    return sendPaginated(res, items, total, page, limit);
  } catch (err) {
    next(err);
  }
};

export const getEyeExaminationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const exam = await prisma.eyeExamination.findFirst({
      where: { id, ...getBranchFilter(req) },
      include: {
        patient: { select: { id: true, fullName: true, patientNumber: true, phone: true, email: true } },
        doctor: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        branch: { select: { id: true, branchName: true } },
      },
    });

    if (!exam) return res.status(404).json({ message: 'Eye examination not found' });
    return res.json(exam);
  } catch (err) {
    next(err);
  }
};

export const createEyeExamination = async (req, res, next) => {
  try {
    const branchId = resolveBranchIdForWrite(req, req.body.branchId);
    const {
      patientId,
      doctorId,
      chiefComplaint,
      historyOfPresentIllness,
      vaScale,
      vaUnaidedOD,
      vaUnaidedOS,
      vaUnaidedNearOD,
      vaUnaidedNearOS,
      vaBcvaOD,
      vaBcvaOS,
      vaBcvaNearOD,
      vaBcvaNearOS,
      vaPinholeOD,
      vaPinholeOS,
      refractionSphereOD,
      refractionSphereOS,
      refractionCylinderOD,
      refractionCylinderOS,
      refractionAxisOD,
      refractionAxisOS,
      iopOD,
      iopOS,
      iopMethod,
      iopTime,
      targetIopOD,
      targetIopOS,
      anteriorSegmentFindings,
      fundusFindings,
      diagnosis,
      plan,
      followUpDate,
      nextVisitReason,
    } = req.body;

    const created = await prisma.eyeExamination.create({
      data: {
        branchId,
        patientId,
        doctorId,
        chiefComplaint,
        historyOfPresentIllness: historyOfPresentIllness || null,
        vaScale: vaScale || 'SNELLEN',
        vaUnaidedOD: vaUnaidedOD || null,
        vaUnaidedOS: vaUnaidedOS || null,
        vaUnaidedNearOD: vaUnaidedNearOD || null,
        vaUnaidedNearOS: vaUnaidedNearOS || null,
        vaBcvaOD: vaBcvaOD || null,
        vaBcvaOS: vaBcvaOS || null,
        vaBcvaNearOD: vaBcvaNearOD || null,
        vaBcvaNearOS: vaBcvaNearOS || null,
        vaPinholeOD: vaPinholeOD || null,
        vaPinholeOS: vaPinholeOS || null,
        refractionSphereOD: refractionSphereOD || null,
        refractionSphereOS: refractionSphereOS || null,
        refractionCylinderOD: refractionCylinderOD || null,
        refractionCylinderOS: refractionCylinderOS || null,
        refractionAxisOD: refractionAxisOD || null,
        refractionAxisOS: refractionAxisOS || null,
        iopOD: coerceIntOrNull(iopOD),
        iopOS: coerceIntOrNull(iopOS),
        iopMethod: iopMethod || null,
        iopTime: iopTime || null,
        targetIopOD: coerceIntOrNull(targetIopOD),
        targetIopOS: coerceIntOrNull(targetIopOS),
        anteriorSegmentFindings: anteriorSegmentFindings ?? null,
        fundusFindings: fundusFindings ?? null,
        diagnosis: diagnosis || null,
        plan: plan || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        nextVisitReason: nextVisitReason || null,
      },
      include: {
        patient: { select: { id: true, fullName: true, patientNumber: true } },
        doctor: { include: { user: { select: { id: true, fullName: true } } } },
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

export const updateEyeExamination = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.eyeExamination.findFirst({
      where: { id, ...getBranchFilter(req) },
      select: { id: true, branchId: true },
    });
    if (!existing) return res.status(404).json({ message: 'Eye examination not found' });

    const {
      patientId,
      doctorId,
      chiefComplaint,
      historyOfPresentIllness,
      vaScale,
      vaUnaidedOD,
      vaUnaidedOS,
      vaUnaidedNearOD,
      vaUnaidedNearOS,
      vaBcvaOD,
      vaBcvaOS,
      vaBcvaNearOD,
      vaBcvaNearOS,
      vaPinholeOD,
      vaPinholeOS,
      refractionSphereOD,
      refractionSphereOS,
      refractionCylinderOD,
      refractionCylinderOS,
      refractionAxisOD,
      refractionAxisOS,
      iopOD,
      iopOS,
      iopMethod,
      iopTime,
      targetIopOD,
      targetIopOS,
      anteriorSegmentFindings,
      fundusFindings,
      diagnosis,
      plan,
      followUpDate,
      nextVisitReason,
    } = req.body;

    const updated = await prisma.eyeExamination.update({
      where: { id: existing.id },
      data: {
        patientId,
        doctorId,
        chiefComplaint,
        historyOfPresentIllness: historyOfPresentIllness === undefined ? undefined : historyOfPresentIllness || null,
        vaScale,
        vaUnaidedOD: vaUnaidedOD === undefined ? undefined : vaUnaidedOD || null,
        vaUnaidedOS: vaUnaidedOS === undefined ? undefined : vaUnaidedOS || null,
        vaUnaidedNearOD: vaUnaidedNearOD === undefined ? undefined : vaUnaidedNearOD || null,
        vaUnaidedNearOS: vaUnaidedNearOS === undefined ? undefined : vaUnaidedNearOS || null,
        vaBcvaOD: vaBcvaOD === undefined ? undefined : vaBcvaOD || null,
        vaBcvaOS: vaBcvaOS === undefined ? undefined : vaBcvaOS || null,
        vaBcvaNearOD: vaBcvaNearOD === undefined ? undefined : vaBcvaNearOD || null,
        vaBcvaNearOS: vaBcvaNearOS === undefined ? undefined : vaBcvaNearOS || null,
        vaPinholeOD: vaPinholeOD === undefined ? undefined : vaPinholeOD || null,
        vaPinholeOS: vaPinholeOS === undefined ? undefined : vaPinholeOS || null,
        refractionSphereOD: refractionSphereOD === undefined ? undefined : refractionSphereOD || null,
        refractionSphereOS: refractionSphereOS === undefined ? undefined : refractionSphereOS || null,
        refractionCylinderOD: refractionCylinderOD === undefined ? undefined : refractionCylinderOD || null,
        refractionCylinderOS: refractionCylinderOS === undefined ? undefined : refractionCylinderOS || null,
        refractionAxisOD: refractionAxisOD === undefined ? undefined : refractionAxisOD || null,
        refractionAxisOS: refractionAxisOS === undefined ? undefined : refractionAxisOS || null,
        iopOD: iopOD === undefined ? undefined : coerceIntOrNull(iopOD),
        iopOS: iopOS === undefined ? undefined : coerceIntOrNull(iopOS),
        iopMethod: iopMethod === undefined ? undefined : iopMethod || null,
        iopTime: iopTime === undefined ? undefined : iopTime || null,
        targetIopOD: targetIopOD === undefined ? undefined : coerceIntOrNull(targetIopOD),
        targetIopOS: targetIopOS === undefined ? undefined : coerceIntOrNull(targetIopOS),
        anteriorSegmentFindings: anteriorSegmentFindings === undefined ? undefined : anteriorSegmentFindings ?? null,
        fundusFindings: fundusFindings === undefined ? undefined : fundusFindings ?? null,
        diagnosis: diagnosis === undefined ? undefined : diagnosis || null,
        plan: plan === undefined ? undefined : plan || null,
        followUpDate: followUpDate === undefined ? undefined : followUpDate ? new Date(followUpDate) : null,
        nextVisitReason: nextVisitReason === undefined ? undefined : nextVisitReason || null,
      },
      include: {
        patient: { select: { id: true, fullName: true, patientNumber: true } },
        doctor: { include: { user: { select: { id: true, fullName: true } } } },
      },
    });

    return res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteEyeExamination = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.eyeExamination.findFirst({
      where: { id, ...getBranchFilter(req) },
      select: { id: true },
    });

    if (!existing) return res.status(404).json({ message: 'Eye examination not found' });

    await prisma.eyeExamination.delete({ where: { id: existing.id } });
    return res.json({ message: 'Eye examination deleted' });
  } catch (err) {
    next(err);
  }
};

export const getEyeExaminationStats = async (req, res, next) => {
  try {
    const branchFilter = getBranchFilter(req);
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay(); // 0-6 (Sun-Sat)
    const diff = (day + 6) % 7; // Monday as start
    startOfWeek.setDate(startOfWeek.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const highIopThreshold = 22;

    const [todays, thisWeek, highIop, total] = await Promise.all([
      prisma.eyeExamination.count({
        where: { ...branchFilter, createdAt: { gte: startOfToday, lte: endOfToday } },
      }),
      prisma.eyeExamination.count({
        where: { ...branchFilter, createdAt: { gte: startOfWeek } },
      }),
      prisma.eyeExamination.count({
        where: {
          ...branchFilter,
          OR: [{ iopOD: { gte: highIopThreshold } }, { iopOS: { gte: highIopThreshold } }],
        },
      }),
      prisma.eyeExamination.count({ where: { ...branchFilter } }),
    ]);

    return res.json({
      todays,
      thisWeek,
      highIop,
      total,
    });
  } catch (err) {
    next(err);
  }
};

