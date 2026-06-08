import 'dotenv/config';
import prisma from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import { logActivity, LOG_MODULES, ACTIVITY_ACTIONS, ENTITY_TYPES } from '../lib/logging/index.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';



export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const identifier = typeof username === 'string' ? username.trim() : '';

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Accept login by username or email, ignoring case for better interoperability.
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: identifier, mode: 'insensitive' } },
          { email: { equals: identifier, mode: 'insensitive' } },
        ],
      },
      include: {
        staffAssignments: {
          include: { branch: true }
        },
        doctor: {
          select: { specialization: true }
        }
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password and tolerate legacy plain-text rows from older datasets.
    const hashLike = typeof user.password === 'string' && /^\$2[aby]\$/.test(user.password);
    let isPasswordValid = false;

    if (hashLike) {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      isPasswordValid = password === user.password;
      if (isPasswordValid) {
        const upgradedHash = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: upgradedHash },
        });
        user.password = upgradedHash;
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    // Use role.name and branchId in token (branchId needed for list filtering)
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        branchId: user.branchId ?? null,
        specialization: user.doctor?.specialization ?? null 
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const branches = user.staffAssignments.map(sa => sa.branch);
    const { password: _, staffAssignments: ____, ...userDetails } = user;

    logActivity(req, {
      branchId: user.branchId || null,
      userId: user.id,
      action: ACTIVITY_ACTIONS.LOGIN,
      module: LOG_MODULES.AUTH,
      entityType: ENTITY_TYPES.USER,
      entityId: user.id,
      details: 'Logged in',
    }).catch(() => {});

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { ...userDetails, role: user.role, branches, doctor: user.doctor },
    });
  } catch (error) {
    next(error);
  }
};

const validateEmail = (email) => {
  return String(email)
    .toLowerCase()
    .match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // For security reasons, don't reveal that the user doesn't exist
      return res.status(200).json({ message: 'If a user with that email exists, a reset link has been sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request - Al-Ixsaan Eye Hospital',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0EA5E9; text-align: center;">Al-Ixsaan Eye Hospital</h2>
          <p>Hello ${user.fullName},</p>
          <p>You requested a password reset. Please click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
          </div>
          <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">© 2026 Al-Ixsaan Medical Group</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'If a user with that email exists, a reset link has been sent' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        branch: true,
        staffAssignments: {
          include: { branch: true }
        },
        doctor: {
          select: { specialization: true }
        }
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password: _, staffAssignments, ...sanitizedUser } = user;
    const branches = staffAssignments.map(sa => sa.branch);
    res.status(200).json({ ...sanitizedUser, branches, doctor: user.doctor });
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const { fullName, phone } = req.body;
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName.trim();
    if (phone !== undefined) updateData.phone = phone?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      include: {
        branch: true,
        staffAssignments: { include: { branch: true } },
      },
    });

    const { password: _, staffAssignments, ...sanitizedUser } = user;
    const branches = staffAssignments.map(sa => sa.branch);
    res.status(200).json({ ...sanitizedUser, branches });
  } catch (error) {
    next(error);
  }
};
