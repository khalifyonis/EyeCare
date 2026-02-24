import { Prisma } from '@prisma/client';

const errorMiddleware = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Handle Prisma specific errors
    // P2002: Unique constraint failed
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            const field = err.meta?.target?.[0] || 'field';
            message = `This ${field} is already registered.`;
            statusCode = 400;
        } else if (err.code === 'P2025') {
            // Record not found
            message = 'Record not found.';
            statusCode = 404;
        }
    }

    // Log error for debugging
    console.error(`[Error] ${req.method} ${req.path}: ${message}`);
    if (statusCode === 500) {
        console.error(err.stack);
    }

    res.status(statusCode).json({
        success: false,
        message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

export default errorMiddleware;
