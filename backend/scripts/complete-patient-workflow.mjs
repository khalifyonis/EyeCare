import 'dotenv/config';
import prisma from '../src/lib/prisma.js';

function parseArgs(argv) {
  const args = { yes: false, name: '', phone: '' };
  for (const token of argv) {
    if (token === '--yes') args.yes = true;
    if (token.startsWith('--name=')) args.name = token.slice('--name='.length).trim();
    if (token.startsWith('--phone=')) args.phone = token.slice('--phone='.length).trim();
  }
  return args;
}

function slugify(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);
}

async function pickPatient({ name, phone }) {
  if (phone) {
    const byPhone = await prisma.patient.findUnique({ where: { phone } });
    if (byPhone) return byPhone;
  }

  if (name) {
    const rows = await prisma.patient.findMany({
      where: { fullName: { contains: name, mode: 'insensitive' } },
      orderBy: [{ updatedAt: 'desc' }],
      take: 5,
    });
    if (rows.length > 0) return rows[0];
  }

  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.yes) {
    console.error('Refusing to modify clinical data without --yes.');
    console.error('Usage: node scripts/complete-patient-workflow.mjs --name="yonis" --yes');
    process.exit(1);
  }

  if (!args.name && !args.phone) {
    console.error('Provide at least one selector: --name or --phone');
    process.exit(1);
  }

  const patient = await pickPatient({ name: args.name, phone: args.phone });
  if (!patient) {
    console.error(`Patient not found for selector name="${args.name}" phone="${args.phone}"`);
    process.exit(1);
  }

  const branchId = patient.branchId;

  const actor =
    (await prisma.user.findFirst({
      where: { branchId, role: { name: { in: ['RECEPTIONIST', 'ADMIN', 'SUPERADMIN'] } } },
      orderBy: { createdAt: 'asc' },
    })) ||
    (await prisma.user.findFirst({ where: { branchId }, orderBy: { createdAt: 'asc' } }));

  if (!actor) {
    console.error('No actor user found in branch to create workflow records.');
    process.exit(1);
  }

  const doctor = await prisma.doctor.findFirst({
    where: { branchId },
    include: { user: { select: { fullName: true } } },
    orderBy: { createdAt: 'asc' },
  });

  if (!doctor) {
    console.error('No doctor found in the patient branch.');
    process.exit(1);
  }

  const now = new Date();

  let appointment = await prisma.appointment.findFirst({
    where: { patientId: patient.id },
    orderBy: { appointmentDate: 'desc' },
  });

  const patientSlug = slugify(patient.fullName || patient.id);
  const bookingBase = `WF-${patientSlug.toUpperCase()}`.slice(0, 24);

  if (!appointment) {
    appointment = await prisma.appointment.create({
      data: {
        bookingNumber: `${bookingBase}-001`,
        appointmentDate: now,
        status: 'COMPLETED',
        amount: 25,
        type: 'consultation',
        notes: 'Workflow auto-completion for demo patient.',
        location: 'Room 1',
        branchId,
        patientId: patient.id,
        doctorId: doctor.id,
        createdById: actor.id,
      },
    });
  } else {
    appointment = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'COMPLETED',
        doctorId: appointment.doctorId || doctor.id,
        notes: appointment.notes || 'Workflow auto-completion for demo patient.',
        amount: appointment.amount ?? 25,
      },
    });
  }

  const erExam = await prisma.eRExamination.upsert({
    where: { appointmentId: appointment.id },
    update: {
      vaRight: '6/12',
      vaLeft: '6/9',
      phRight: '6/9',
      phLeft: '6/9',
      iopRight: 17,
      iopLeft: 16,
      notes: 'Auto-completed ER exam.',
      recordedById: actor.id,
    },
    create: {
      appointmentId: appointment.id,
      vaRight: '6/12',
      vaLeft: '6/9',
      phRight: '6/9',
      phLeft: '6/9',
      iopRight: 17,
      iopLeft: 16,
      notes: 'Auto-completed ER exam.',
      recordedById: actor.id,
    },
  });

  const clinicalExam = await prisma.clinicalExamination.upsert({
    where: { appointmentId: appointment.id },
    update: {
      sphRight: -0.75,
      cylRight: -0.5,
      axisRight: 95,
      sphLeft: -0.5,
      cylLeft: -0.25,
      axisLeft: 85,
      diagnosis: 'Mild myopia and eye strain',
      managementPlan: 'Artificial tears and visual hygiene',
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      nextReviewReason: 'Follow-up review',
      examinedById: doctor.id,
    },
    create: {
      appointmentId: appointment.id,
      sphRight: -0.75,
      cylRight: -0.5,
      axisRight: 95,
      sphLeft: -0.5,
      cylLeft: -0.25,
      axisLeft: 85,
      diagnosis: 'Mild myopia and eye strain',
      managementPlan: 'Artificial tears and visual hygiene',
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      nextReviewReason: 'Follow-up review',
      examinedById: doctor.id,
    },
  });

  const eyeExamMarkerComplaint = 'Blurred distance vision and eye strain';
  let eyeExam = await prisma.eyeExamination.findFirst({
    where: {
      branchId,
      patientId: patient.id,
      doctorId: doctor.id,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!eyeExam) {
    eyeExam = await prisma.eyeExamination.create({
      data: {
        branchId,
        patientId: patient.id,
        doctorId: doctor.id,
        chiefComplaint: eyeExamMarkerComplaint,
        historyOfPresentIllness: 'Symptoms increase with prolonged screen exposure.',
        vaScale: 'SNELLEN',
        vaUnaidedOD: '6/12',
        vaUnaidedOS: '6/9',
        vaBcvaOD: '6/9',
        vaBcvaOS: '6/6',
        vaPinholeOD: '6/9',
        vaPinholeOS: '6/9',
        refractionSphereOD: '-0.75',
        refractionSphereOS: '-0.50',
        refractionCylinderOD: '-0.50',
        refractionCylinderOS: '-0.25',
        refractionAxisOD: '95',
        refractionAxisOS: '85',
        iopOD: 17,
        iopOS: 16,
        iopMethod: 'goldmann',
        diagnosis: 'Mild myopia and eye strain',
        plan: 'Artificial tears, visual hygiene, and 1-month review.',
        followUpDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        nextVisitReason: 'Follow-up review',
      },
    });
  } else {
    eyeExam = await prisma.eyeExamination.update({
      where: { id: eyeExam.id },
      data: {
        vaBcvaOD: '6/9',
        vaBcvaOS: '6/6',
        iopOD: 17,
        iopOS: 16,
        diagnosis: 'Mild myopia and eye strain',
        plan: 'Artificial tears, visual hygiene, and 1-month review.',
        followUpDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        nextVisitReason: 'Follow-up review',
      },
    });
  }

  const pharmacyItem = await prisma.pharmacyItem.findFirst({
    where: { branchId, isActive: true, stockQuantity: { gt: 0 } },
    orderBy: { createdAt: 'asc' },
  });

  let prescription = await prisma.prescription.findFirst({ where: { appointmentId: appointment.id } });
  if (!prescription) {
    prescription = await prisma.prescription.create({
      data: {
        appointmentId: appointment.id,
        examId: clinicalExam.id,
        branchId,
        itemType: 'PHARMACY',
        itemId: pharmacyItem?.id || null,
        quantity: 1,
        instructions: 'Use as directed twice daily for 14 days.',
        reviewAfterDays: 30,
      },
    });
  }

  let appointmentBilling = await prisma.billing.findFirst({
    where: { appointmentId: appointment.id, serviceType: 'APPOINTMENT' },
  });
  if (!appointmentBilling) {
    appointmentBilling = await prisma.billing.create({
      data: {
        patientId: patient.id,
        branchId,
        appointmentId: appointment.id,
        prescriptionId: prescription.id,
        serviceType: 'APPOINTMENT',
        totalAmount: 25,
        discount: 0,
        finalAmount: 25,
        paymentMethod: 'CASH',
        referenceNumber: `${bookingBase}-APPT`,
        status: 'PAID',
        createdById: actor.id,
      },
    });
  }

  let pharmacyBilling = null;
  if (pharmacyItem) {
    pharmacyBilling = await prisma.billing.findFirst({
      where: { referenceNumber: `${bookingBase}-PHARM`, serviceType: 'PHARMACY' },
    });

    if (!pharmacyBilling) {
      pharmacyBilling = await prisma.billing.create({
        data: {
          patientId: patient.id,
          branchId,
          prescriptionId: prescription.id,
          serviceType: 'PHARMACY',
          totalAmount: pharmacyItem.sellingPrice,
          discount: 0,
          finalAmount: pharmacyItem.sellingPrice,
          paymentMethod: 'CASH',
          referenceNumber: `${bookingBase}-PHARM`,
          status: 'PAID',
          createdById: actor.id,
        },
      });

      await prisma.billingLineItem.create({
        data: {
          billingId: pharmacyBilling.id,
          itemType: 'PHARMACY',
          itemId: pharmacyItem.id,
          description: pharmacyItem.itemName,
          quantity: 1,
          unitPrice: pharmacyItem.sellingPrice,
          lineTotal: pharmacyItem.sellingPrice,
        },
      });

      await prisma.pharmacyStockTransaction.create({
        data: {
          pharmacyItemId: pharmacyItem.id,
          branchId,
          transactionType: 'OUT',
          quantity: 1,
          unitPrice: pharmacyItem.sellingPrice,
          billingId: pharmacyBilling.id,
          performedById: actor.id,
        },
      });

      await prisma.pharmacyItem.update({
        where: { id: pharmacyItem.id },
        data: { stockQuantity: { decrement: 1 } },
      });
    }
  }

  const followUpDate = new Date();
  followUpDate.setDate(followUpDate.getDate() + 30);
  followUpDate.setHours(10, 0, 0, 0);

  const followUpAppointment = await prisma.appointment.upsert({
    where: { bookingNumber: `${bookingBase}-FU1` },
    update: {
      patientId: patient.id,
      doctorId: doctor.id,
      branchId,
      appointmentDate: followUpDate,
      status: 'PENDING',
      type: 'follow-up',
      amount: 15,
      notes: 'Scheduled follow-up visit.',
      location: 'Room 1',
      createdById: actor.id,
    },
    create: {
      bookingNumber: `${bookingBase}-FU1`,
      patientId: patient.id,
      doctorId: doctor.id,
      branchId,
      appointmentDate: followUpDate,
      status: 'PENDING',
      type: 'follow-up',
      amount: 15,
      notes: 'Scheduled follow-up visit.',
      location: 'Room 1',
      createdById: actor.id,
    },
  });

  const existingFollowUp = await prisma.followUp.findFirst({
    where: {
      patientId: patient.id,
      sourceType: 'EXAMINATION',
      sourceId: eyeExam.id,
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  let followUp;
  if (existingFollowUp) {
    followUp = await prisma.followUp.update({
      where: { id: existingFollowUp.id },
      data: {
        dueDate: followUpDate,
        status: 'PENDING',
        notes: 'Auto-created follow-up from script.',
        clinicalExaminationId: clinicalExam.id,
        completedAppointmentId: null,
      },
    });
  } else {
    followUp = await prisma.followUp.create({
      data: {
        patientId: patient.id,
        branchId,
        sourceType: 'EXAMINATION',
        sourceId: eyeExam.id,
        dueDate: followUpDate,
        status: 'PENDING',
        notes: 'Auto-created follow-up from script.',
        clinicalExaminationId: clinicalExam.id,
        prescriptionId: prescription.id,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        message: 'Patient workflow completed successfully',
        patient: { id: patient.id, fullName: patient.fullName, phone: patient.phone },
        doctor: { id: doctor.id, name: doctor.user?.fullName || 'Unknown' },
        appointment: { id: appointment.id, bookingNumber: appointment.bookingNumber, status: appointment.status },
        erExam: { id: erExam.id },
        clinicalExam: { id: clinicalExam.id },
        eyeExam: { id: eyeExam.id },
        prescription: { id: prescription.id, itemId: prescription.itemId },
        appointmentBilling: appointmentBilling ? { id: appointmentBilling.id } : null,
        pharmacyBilling: pharmacyBilling ? { id: pharmacyBilling.id } : null,
        followUpAppointment: { id: followUpAppointment.id, bookingNumber: followUpAppointment.bookingNumber },
        followUp: { id: followUp.id, dueDate: followUp.dueDate, status: followUp.status },
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(String(err?.message || err));
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
  });
