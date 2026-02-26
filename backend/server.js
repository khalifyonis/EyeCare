import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import branchRoutes from './src/routes/branchRoutes.js';
import errorMiddleware from './src/middlewares/errorMiddleware.js';

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

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'Eye Care System API is running' });
});

// Error Handling Middleware (Should be last)
app.use(errorMiddleware);

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
