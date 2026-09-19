import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateToken,
} from "../services/authService.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

/**
 * POST /api/v1/auth/login
 * Public authentication endpoint with BR-01 anti-enumeration protection.
 */
authRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Email and password are required",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await getPrisma().user.findUnique({
      where: { email: normalizedEmail },
    });

    // BR-01: Safe generic error for non-existent email, inactive account, or password mismatch
    if (!user || !user.isActive) {
      res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Invalid email or password",
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Invalid email or password",
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });

    res.cookie("toktickit_session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        isActive: user.isActive,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred during login.",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Clears session cookie and invalidates session.
 */
authRouter.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie("toktickit_session", { path: "/" });
  res.status(200).json({
    message: "Successfully logged out.",
  });
});

/**
 * GET /api/v1/auth/me
 * Retrieves current authenticated user profile.
 */
authRouter.get("/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getPrisma().user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mustChangePassword: true,
        isActive: true,
        department: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error("Get /me error:", err);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve user profile.",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * POST /api/v1/auth/change-password
 * Handles forced initial change or user-initiated password change.
 */
authRouter.post("/change-password", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Current password, new password, and confirmation are required.",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  try {
    const user = await getPrisma().user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Current password is incorrect.",
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Validate new password complexity
    const strengthResult = validatePasswordStrength(newPassword);
    if (!strengthResult.isValid) {
      res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Password does not meet complexity requirements.",
          fieldErrors: strengthResult.errors.map((msg) => ({
            field: "newPassword",
            message: msg,
          })),
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Verify confirmation match
    if (newPassword !== confirmPassword) {
      res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Passwords do not match.",
          fieldErrors: [
            {
              field: "confirmPassword",
              message: "Passwords do not match.",
            },
          ],
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Update password in DB
    const newHash = await hashPassword(newPassword);
    const updatedUser = await getPrisma().user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    // Generate fresh token with mustChangePassword = false
    const newToken = generateToken({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      mustChangePassword: false,
    });

    res.cookie("toktickit_session", newToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Password changed successfully.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        mustChangePassword: false,
        isActive: updatedUser.isActive,
      },
      token: newToken,
    });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while changing password.",
        timestamp: new Date().toISOString(),
      },
    });
  }
});
