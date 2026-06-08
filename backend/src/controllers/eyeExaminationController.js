import prisma from '../lib/prisma.js';
import { getPaginationParams, sendPaginated } from '../lib/pagination.js';
import { emitEvent } from '../lib/socket.js';

const verifyStagePermissions = async (role, body, isUpdate, existingExam = null) => {
  if (role === 'SUPERADMIN') return;

  const permissions = await prisma.rolePermission.findMany({
    where: { roleName: role }
  });

  const getPermission = (mod) => {
    return permissions.find(p => p.module === mod) || { canRead: false, canCreate: false, canUpdate: false, canDelete: false };
  };

  const prelimPerm = getPermission('preliminary_exams');
  const clinicalPerm = getPermission('clinical_exams');

  const action = isUpdate ? 'canUpdate' : 'canCreate';

  // 1. Check if trying to perform clinical exam actions
  const hasStage2Fields = 
    body.anteriorSegmentFindings !== undefined ||
    body.fundusFindings !== undefined ||
    (body.diagnosis && body.diagnosis.trim().length > 0) ||
    (body.plan && body.plan.trim().length > 0) ||
    body.followUpDate !== undefined ||
    body.nextVisitReason !== undefined;

  const isTransitioningToClinicalOrCompleted = 
    body.stage === 'CLINICAL' || body.stage === 'COMPLETED';

  if (hasStage2Fields || isTransitioningToClinicalOrCompleted) {
    if (!clinicalPerm[action]) {
      const err = new Error('Forbidden. You do not have permission to create or modify Clinical (Stage 2) eye examinations.');
      err.statusCode = 403;
      throw err;
    }
  }

  // 2. Check if modifying a clinical/completed exam
  if (isUpdate && existingExam) {
    if (existingExam.stage === 'CLINICAL' || existingExam.stage === 'COMPLETED') {
      if (!clinicalPerm.canUpdate) {
        const err = new Error('Forbidden. You do not have permission to modify eye examinations that are in the Clinical or Completed stage.');
        err.statusCode = 403;
        throw err;
      }
    }
  }

  // 3. Check preliminary permission if writing stage 1 fields
  const hasStage1Fields =
    body.chiefComplaint !== undefined ||
    body.historyOfPresentIllness !== undefined ||
    body.vaScale !== undefined ||
    body.vaUnaidedOD !== undefined ||
    body.vaBcvaOD !== undefined ||
    body.refractionSphereOD !== undefined ||
    body.iopOD !== undefined;

  if (hasStage1Fields && !prelimPerm[action]) {
    const err = new Error('Forbidden. You do not have permission to create or modify Preliminary (Stage 1) eye examinations.');
    err.statusCode = 403;
    throw err;
  }
};

const redactClinicalFields = async (role, examOrExams) => {
  if (role === 'SUPERADMIN' || !examOrExams) return examOrExams;

  const permission = await prisma.rolePermission.findFirst({
    where: { roleName: role, module: 'clinical_exams' }
  });

  if (permission && permission.canRead) {
    return examOrExams;
  }

  // Redact clinical fields
  const redact = (exam) => {
    const obj = typeof exam.toJSON === 'function' ? exam.toJSON() : JSON.parse(JSON.stringify(exam));
    delete obj.anteriorSegmentFindings;
    delete obj.fundusFindings;
    delete obj.diagnosis;
    delete obj.plan;
    return obj;
  };

  if (Array.isArray(examOrExams)) {
    return examOrExams.map(redact);
  } else {
    return redact(examOrExams);
  }
};

const isEyeExamStoreNotReadyError = (err) => {
  // P2021: table does not exist, P2022: column does not exist
  // This keeps the UI usable when eye-exam migrations are not applied yet.
  return err?.code === 'P2021' || err?.code === 'P2022';
};

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
    const { search, date, from, to, doctorId, patientId } = req.query;
    const { skip, take, page, limit } = getPaginationParams(req.query);

    const where = {
      ...getBranchFilter(req),
      ...(patientId ? { patientId: String(patientId) } : {}),
      ...(doctorId ? { doctorId: String(doctorId) } : {}),
      ...(req.query.stage 
        ? { stage: { in: String(req.query.stage).split(',').map(s => s.trim()) } } 
        : {}),
      ...(search
        ? {
            OR: [
              { patient: { fullName: { contains: String(search), mode: 'insensitive' } } },
              { patient: { patientNumber: { contains: String(search), mode: 'insensitive' } } },
              { patient: { id: { equals: String(search) } } },
            ],
          }
        : {}),
      ...((date || from || to || !search)
        ? {
            createdAt: {
              gte: from ? new Date(`${from}T00:00:00.000Z`) : (date ? new Date(`${date}T00:00:00.000Z`) : new Date(`${new Date().toISOString().split('T')[0]}T00:00:00.000Z`)),
              lte: to ? new Date(`${to}T23:59:59.999Z`) : (date ? new Date(`${date}T23:59:59.999Z`) : new Date(`${new Date().toISOString().split('T')[0]}T23:59:59.999Z`)),
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

    const redactedItems = await redactClinicalFields(req.user.role, items);
    return sendPaginated(res, redactedItems, total, page, limit);
  } catch (err) {
    if (isEyeExamStoreNotReadyError(err)) {
      const { page, limit } = getPaginationParams(req.query);
      return sendPaginated(res, [], 0, page, limit);
    }
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
    const redactedExam = await redactClinicalFields(req.user.role, exam);
    return res.json(redactedExam);
  } catch (err) {
    next(err);
  }
};

export const createEyeExamination = async (req, res, next) => {
  try {
    await verifyStagePermissions(req.user.role, req.body, false);
    const branchId = resolveBranchIdForWrite(req, req.body.branchId);
    const {
      patientId,
      doctorId,
      appointmentId,
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
        appointmentId: appointmentId || null,
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
        stage: req.user.role === 'SUPERADMIN' || (await prisma.rolePermission.findFirst({
          where: { roleName: req.user.role, module: 'clinical_exams' }
        }))?.canCreate
          ? (req.body.stage || 'PRELIMINARY')
          : 'PRELIMINARY',
      },
      include: {
        patient: { select: { id: true, fullName: true, patientNumber: true } },
        doctor: { include: { user: { select: { id: true, fullName: true } } } },
      },
    });

    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'EXAMINING' }
      });
      // Emit appointment update for real-time tracking
      emitEvent('appointment:updated', { id: appointmentId, status: 'EXAMINING' }, branchId);
    }

    emitEvent('exam:created', created, branchId);

    const redactedCreated = await redactClinicalFields(req.user.role, created);
    return res.status(201).json(redactedCreated);
  } catch (err) {
    next(err);
  }
};

export const updateEyeExamination = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.eyeExamination.findFirst({
      where: { id, ...getBranchFilter(req) },
      select: { id: true, branchId: true, stage: true, appointmentId: true },
    });
    if (!existing) return res.status(404).json({ message: 'Eye examination not found' });

    await verifyStagePermissions(req.user.role, req.body, true, existing);

    const {
      patientId,
      doctorId,
      appointmentId,
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
      stage,
    } = req.body;

    let newStage = stage || existing.stage;
    
    const permissions = req.user.role === 'SUPERADMIN' ? [] : await prisma.rolePermission.findMany({
      where: { roleName: req.user.role }
    });
    const clinicalPerm = permissions.find(p => p.module === 'clinical_exams');
    const hasClinicalUpdate = req.user.role === 'SUPERADMIN' || (clinicalPerm && clinicalPerm.canUpdate);

    if (!hasClinicalUpdate) {
      newStage = 'PRELIMINARY';
    } else {
      // Logic for transition:
      // 1. From PRELIMINARY to CLINICAL: When tech saves preliminary data
      const isPreliminaryUpdate = vaScale || vaUnaidedOD || vaBcvaOD || iopOD;
      if (newStage === 'PRELIMINARY' && isPreliminaryUpdate && !req.body.isPartialSave) {
          newStage = 'CLINICAL';
      }

      // 2. From CLINICAL to COMPLETED: When doctor saves diagnosis and plan
      // If diagnosis and plan are present, or if stage is explicitly set to COMPLETED
      const hasDiagnosis = diagnosis && diagnosis.length > 0;
      const hasPlan = plan && plan.length > 0;
      
      if (stage === 'COMPLETED' || (hasDiagnosis && hasPlan)) {
          newStage = 'COMPLETED';
      }
    }

    const updated = await prisma.eyeExamination.update({
      where: { id: existing.id },
      data: {
        patientId,
        doctorId,
        stage: newStage,
        appointmentId: appointmentId === undefined ? undefined : (appointmentId || null),
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

    const finalAppointmentId = appointmentId || updated.appointmentId;
    if (finalAppointmentId) {
      const isActuallyCompleted = newStage === 'COMPLETED';
      await prisma.appointment.update({
        where: { id: finalAppointmentId },
        data: { status: isActuallyCompleted ? 'COMPLETED' : 'EXAMINING' }
      });
      // Emit appointment update
      emitEvent('appointment:updated', { id: finalAppointmentId, status: isActuallyCompleted ? 'COMPLETED' : 'EXAMINING' }, updated.branchId);
    }

    emitEvent('exam:updated', updated, updated.branchId);

    const redactedUpdated = await redactClinicalFields(req.user.role, updated);
    return res.json(redactedUpdated);
  } catch (err) {
    next(err);
  }
};

export const deleteEyeExamination = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.eyeExamination.findFirst({
      where: { id, ...getBranchFilter(req) },
      select: { id: true, branchId: true },
    });

    if (!existing) return res.status(404).json({ message: 'Eye examination not found' });

    await prisma.eyeExamination.delete({ where: { id: existing.id } });
    emitEvent('exam:deleted', { id: existing.id }, existing.branchId);
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
    if (isEyeExamStoreNotReadyError(err)) {
      return res.json({ todays: 0, thisWeek: 0, highIop: 0, total: 0 });
    }
    next(err);
  }
};

