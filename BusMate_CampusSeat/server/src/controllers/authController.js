import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'busmate_super_secret_jwt_key_2026_xyz';

// In-memory user store for seamless offline/fallback operations
const memoryUsers = new Map();

// Preload demo user in memory fallback
(async () => {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('Password@123', salt);
  memoryUsers.set('commuter@gmail.com', {
    id: 'user_default_01',
    email: 'commuter@gmail.com',
    password: hash,
    name: 'Rahul Sharma',
    phone: '+91 98765 43210',
    role: 'passenger',
    createdAt: new Date().toISOString()
  });
})();

export const register = async (req, res, next) => {
  try {
    const { email, password, name, phone, role, agencyName } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Name, email, and password are required fields.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (prisma) {
      try {
        const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (existing) {
          return res.status(409).json({
            success: false,
            error: 'ConflictError',
            message: 'An account with this email address already exists.'
          });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
          data: {
            email: cleanEmail,
            password: hashedPassword,
            name: name.trim(),
            phone: phone || null,
            role: role || 'passenger',
            agencyName: agencyName || null
          },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            agencyName: true,
            createdAt: true
          }
        });

        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role, name: user.name },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        return res.status(201).json({
          success: true,
          source: 'PostgreSQL Database (Prisma)',
          message: 'User registered successfully',
          token,
          user
        });
      } catch (dbErr) {
        console.warn('[AuthController] PostgreSQL unavailable, falling back to memory store.');
      }
    }

    // In-memory fallback
    if (memoryUsers.has(cleanEmail)) {
      return res.status(409).json({
        success: false,
        error: 'ConflictError',
        message: 'An account with this email address already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = {
      id: `usr_${Date.now()}`,
      email: cleanEmail,
      password: hashedPassword,
      name: name.trim(),
      phone: phone || null,
      role: role || 'passenger',
      agencyName: agencyName || null,
      createdAt: new Date().toISOString()
    };
    memoryUsers.set(cleanEmail, newUser);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = { ...newUser };
    delete safeUser.password;

    res.status(201).json({
      success: true,
      source: 'In-Memory Store (Fallback)',
      message: 'User registered successfully',
      token,
      user: safeUser
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Email and password are required.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (prisma) {
      try {
        const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (user) {
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return res.status(401).json({
              success: false,
              error: 'AuthenticationError',
              message: 'Invalid email or password.'
            });
          }

          const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          return res.status(200).json({
            success: true,
            source: 'PostgreSQL Database (Prisma)',
            message: 'Login successful',
            token,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              phone: user.phone,
              role: user.role,
              agencyName: user.agencyName,
              createdAt: user.createdAt
            }
          });
        }
      } catch (dbErr) {
        console.warn('[AuthController] PostgreSQL unavailable for login, checking memory store.');
      }
    }

    // In-memory fallback
    const memUser = memoryUsers.get(cleanEmail);
    if (!memUser) {
      return res.status(401).json({
        success: false,
        error: 'AuthenticationError',
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, memUser.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'AuthenticationError',
        message: 'Invalid email or password.'
      });
    }

    const token = jwt.sign(
      { id: memUser.id, email: memUser.email, role: memUser.role, name: memUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = { ...memUser };
    delete safeUser.password;

    res.status(200).json({
      success: true,
      source: 'In-Memory Store (Fallback)',
      message: 'Login successful',
      token,
      user: safeUser
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    if (prisma) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            agencyName: true,
            createdAt: true,
            _count: { select: { bookings: true } }
          }
        });

        if (user) {
          return res.status(200).json({
            success: true,
            source: 'PostgreSQL Database (Prisma)',
            user
          });
        }
      } catch (dbErr) {}
    }

    const memUser = Array.from(memoryUsers.values()).find(u => u.id === req.user.id || u.email === req.user.email);
    if (memUser) {
      const safe = { ...memUser };
      delete safe.password;
      return res.status(200).json({
        success: true,
        source: 'In-Memory Store (Fallback)',
        user: safe
      });
    }

    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};
