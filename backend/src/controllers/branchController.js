import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const getAllBranches = async (req, res, next) => {
    try {
        const branches = await prisma.branch.findMany({
            orderBy: { branchName: 'asc' },
        });
        res.status(200).json(branches);
    } catch (error) {
        next(error);
    }
};

export const getBranchById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const branch = await prisma.branch.findUnique({
            where: { id },
        });

        if (!branch) {
            const error = new Error('Branch not found');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json(branch);
    } catch (error) {
        next(error);
    }
};

export const createBranch = async (req, res, next) => {
    try {
        let { branchName, address, phone } = req.body;

        branchName = branchName?.trim();
        address = address?.trim();
        phone = phone?.trim();

        if (!branchName || !address || !phone) {
            const error = new Error('Branch name, address, and phone are required');
            error.statusCode = 400;
            throw error;
        }

        if (branchName.length < 3) {
            const error = new Error('Branch name must be at least 3 characters');
            error.statusCode = 400;
            throw error;
        }

        const newBranch = await prisma.branch.create({
            data: { branchName, address, phone },
        });

        res.status(201).json({ message: 'Branch created successfully', branch: newBranch });
    } catch (error) {
        next(error);
    }
};

export const updateBranch = async (req, res, next) => {
    try {
        const { id } = req.params;
        let { branchName, address, phone } = req.body;

        const existing = await prisma.branch.findUnique({ where: { id } });
        if (!existing) {
            const error = new Error('Branch not found');
            error.statusCode = 404;
            throw error;
        }

        let updateData = {};
        if (branchName !== undefined) {
            const trimmed = branchName.trim();
            if (trimmed.length < 3) throw new Error('Branch name must be at least 3 characters');
            updateData.branchName = trimmed;
        }
        if (address !== undefined) updateData.address = address.trim();
        if (phone !== undefined) updateData.phone = phone.trim();

        const updatedBranch = await prisma.branch.update({
            where: { id },
            data: updateData,
        });

        res.status(200).json({ message: 'Branch updated successfully', branch: updatedBranch });
    } catch (error) {
        next(error);
    }
};

export const deleteBranch = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.branch.findUnique({ where: { id } });
        if (!existing) {
            const error = new Error('Branch not found');
            error.statusCode = 404;
            throw error;
        }

        await prisma.branch.delete({ where: { id } });
        res.status(200).json({ message: 'Branch deleted successfully' });
    } catch (error) {
        next(error);
    }
};
