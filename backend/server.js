import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import branchRoutes from './src/routes/branchRoutes.js';
import patientRoutes from './src/routes/patientRoutes.js';
import appointmentRoutes from './src/routes/appointmentRoutes.js';
import doctorRoutes from './src/routes/doctorRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
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
app.use('/api/doctors', doctorRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'Eye Care System API is running' });
});

// Error Handling Middleware (Should be last)
app.use(errorMiddleware);

// Start server – if port in use, try next (5001, 5002, ...)
function tryListen(port) {
    const p = Number(port) || 5000;
    const server = app.listen(p, () => {
        console.log(`Server is running on port ${p}`);
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && p < 5010) {
            server.close(() => tryListen(p + 1));
        } else {
            console.error('Server error:', err);
        }
    });
}
tryListen(PORT);
