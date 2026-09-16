import { Router, Request, Response } from "express";
import { Role } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { hashPassword, validatePasswordStrength } from "../services/authService.js";
import { requireAuth, requirePasswordChanged, requireRole } from "../middleware/auth.js";

export const adminUsersRouter = Router();

// Layered role guard: all routes require authenticated ADMINISTRATOR who has satisfied password change
adminUsersRouter.use(requireAuth);
adminUsersRouter.use(requirePasswordChanged);
adminUsersRouter.use(requireRole("ADMINISTRATOR"));

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES: Role[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];

const USER_SELECT_FIELDS = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * GET /api/v1/admin/users
 * Returns list of users supporting search (name or email) and role filtering.
 */
adminUsersRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  const prisma = getPrisma();
  const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
  const roleQuery = typeof req.query.role === "string" ? req.query.role.trim() : undefined;

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (roleQuery && VALID_ROLES.includes(roleQuery as Role)) {
    where.role = roleQuery as Role;
  }

  try {
    const users = await prisma.user.findMany({
      where,
      select: USER_SELECT_FIELDS,
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({
      users,
      totalCount: users.length,
    });
  } catch (err) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch user directory",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * POST /api/v1/admin/users
 * Provisions a new user with initial password, sets mustChangePassword = true,
 * and enforces unique email constraint (BR-10) and single role policy (BR-09).
 */
adminUsersRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const prisma = getPrisma();
  const { name, email, role, isActive, initialPassword } = req.body;

  // 1. Name validation
  if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Name must be between 2 and 100 characters",
        field: "name",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // 2. Email validation
  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "A valid email address is required",
        field: "email",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();

  // 3. Role validation (BR-09)
  if (!role || !VALID_ROLES.includes(role)) {
    res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Role must be one of REQUESTER, IT_STAFF, or ADMINISTRATOR",
        field: "role",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // 4. Initial password complexity validation
  if (!initialPassword || typeof initialPassword !== "string") {
    res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Initial password is required",
        field: "initialPassword",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const passwordValidation = validatePasswordStrength(initialPassword);
  if (!passwordValidation.isValid) {
    res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: passwordValidation.errors.join(" "),
        field: "initialPassword",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  try {
    // 5. Duplicate Email Constraint (BR-10)
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      res.status(409).json({
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "Email is already registered to another account.",
          field: "email",
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 6. Persistence with hashed password and mustChangePassword = true
    const passwordHash = await hashPassword(initialPassword);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        role: role as Role,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        mustChangePassword: true,
        passwordHash,
      },
      select: USER_SELECT_FIELDS,
    });

    res.status(201).json({ user });
  } catch (err) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create user account",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * PATCH /api/v1/admin/users/:id
 * Updates user profile, role, or activation status while enforcing:
 * - BR-10: Unique email constraint
 * - BR-11: Self-deactivation/demotion prevention
 * - BR-12: Last active Administrator preservation
 */
adminUsersRouter.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  const prisma = getPrisma();
  const targetId = parseInt(req.params.id, 10);

  if (isNaN(targetId)) {
    res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Invalid user ID parameter",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const { name, email, role, isActive } = req.body;

  try {
    // 1. Target user lookup
    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!targetUser) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "User not found",
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 2. Self-deactivation / demotion prevention rule (BR-11)
    if (targetId === req.user?.id) {
      if (isActive === false) {
        res.status(400).json({
          error: {
            code: "CANNOT_DEACTIVATE_SELF",
            message: "Administrators cannot deactivate their own active account.",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      if (role !== undefined && role !== "ADMINISTRATOR") {
        res.status(400).json({
          error: {
            code: "CANNOT_DEMOTE_SELF",
            message: "Administrators cannot demote their own account.",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    // 3. Last active Administrator preservation rule (BR-12)
    if (targetUser.role === "ADMINISTRATOR" && targetUser.isActive) {
      const isAttemptingDeactivation = isActive === false;
      const isAttemptingDemotion = role !== undefined && role !== "ADMINISTRATOR";

      if (isAttemptingDeactivation || isAttemptingDemotion) {
        const activeAdminCount = await prisma.user.count({
          where: {
            role: "ADMINISTRATOR",
            isActive: true,
          },
        });

        if (activeAdminCount <= 1) {
          res.status(409).json({
            error: {
              code: "CANNOT_DEACTIVATE_LAST_ADMIN",
              message: "Cannot deactivate or demote the system's last active Administrator.",
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
      }
    }

    // 4. Validate and construct update fields
    const dataToUpdate: any = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
        res.status(400).json({
          error: {
            code: "VALIDATION_FAILED",
            message: "Name must be between 2 and 100 characters",
            field: "name",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
      dataToUpdate.name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
        res.status(400).json({
          error: {
            code: "VALIDATION_FAILED",
            message: "A valid email address is required",
            field: "email",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== targetUser.email) {
        // Duplicate Email check against other users (BR-10)
        const conflict = await prisma.user.findFirst({
          where: {
            email: normalizedEmail,
            NOT: { id: targetId },
          },
        });

        if (conflict) {
          res.status(409).json({
            error: {
              code: "EMAIL_ALREADY_EXISTS",
              message: "Email is already registered to another account.",
              field: "email",
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
        dataToUpdate.email = normalizedEmail;
      }
    }

    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        res.status(400).json({
          error: {
            code: "VALIDATION_FAILED",
            message: "Role must be one of REQUESTER, IT_STAFF, or ADMINISTRATOR",
            field: "role",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
      dataToUpdate.role = role as Role;
    }

    if (isActive !== undefined) {
      dataToUpdate.isActive = Boolean(isActive);
    }

    // 5. Persist updates
    const updatedUser = await prisma.user.update({
      where: { id: targetId },
      data: dataToUpdate,
      select: USER_SELECT_FIELDS,
    });

    res.status(200).json({ user: updatedUser });
  } catch (err) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update user account",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * POST /api/v1/admin/users/:id/reset-password
 * Resets user's initial password and sets mustChangePassword = true.
 */
adminUsersRouter.post("/:id/reset-password", async (req: Request, res: Response): Promise<void> => {
  const prisma = getPrisma();
  const targetId = parseInt(req.params.id, 10);

  if (isNaN(targetId)) {
    res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Invalid user ID parameter",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const { initialPassword } = req.body;

  if (!initialPassword || typeof initialPassword !== "string") {
    res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Initial password is required",
        field: "initialPassword",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const passwordValidation = validatePasswordStrength(initialPassword);
  if (!passwordValidation.isValid) {
    res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: passwordValidation.errors.join(" "),
        field: "initialPassword",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!targetUser) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "User not found",
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const newHash = await hashPassword(initialPassword);

    await prisma.user.update({
      where: { id: targetId },
      data: {
        passwordHash: newHash,
        mustChangePassword: true,
      },
    });

    res.status(200).json({
      message: "Initial password has been reset. User will be required to change it at next login.",
      userId: targetId,
    });
  } catch (err) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to reset password",
        timestamp: new Date().toISOString(),
      },
    });
  }
});
