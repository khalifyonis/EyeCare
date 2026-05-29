import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import { initSocket } from './src/lib/socket.js';
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import branchRoutes from './src/routes/branchRoutes.js';
import patientRoutes from './src/routes/patientRoutes.js';
import appointmentRoutes from './src/routes/appointmentRoutes.js';
import eyeExaminationRoutes from './src/routes/eyeExaminationRoutes.js';
import doctorRoutes from './src/routes/doctorRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import surgeryRoutes from './src/routes/surgeryRoutes.js';
import medicinePrescriptionRoutes from './src/routes/medicinePrescriptionRoutes.js';
import opticalPrescriptionRoutes from './src/routes/opticalPrescriptionRoutes.js';
import billingRoutes from './src/routes/billingRoutes.js';
import pharmacyItemRoutes from './src/routes/pharmacyItemRoutes.js';
import opticalItemRoutes from './src/routes/opticalItemRoutes.js';
import followUpRoutes from './src/routes/followUpRoutes.js';
import supplierRoutes from './src/routes/supplierRoutes.js';
import activityLogRoutes from './src/routes/activityLogRoutes.js';
import reportRoutes from './src/routes/reportRoutes.js';
import errorMiddleware from './src/middlewares/errorMiddleware.js';

// Keep process alive on uncaught errors (log and continue)
process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[unhandledRejection]', reason);
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/eye-examinations', eyeExaminationRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/surgeries', surgeryRoutes);
// Medicine prescriptions (pharmacy items)
app.use('/api/prescription-items', medicinePrescriptionRoutes);
// Optical prescriptions (frames/lenses/refraction)
app.use('/api/prescriptions', opticalPrescriptionRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/inventory/pharmacy', pharmacyItemRoutes);
app.use('/api/inventory/optical', opticalItemRoutes);
app.use('/api/follow-ups', followUpRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'Eye Care System API is running' });
});

// Error Handling Middleware (Should be last)
app.use(errorMiddleware);

// Start server (fixed port)
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the other process or run \"node scripts/kill-ports.js\" from the repo root.`);
        process.exit(1);
    }
    console.error('Server error:', err);
    process.exit(1);
});

