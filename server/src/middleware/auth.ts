import { Request, Response, NextFunction } from "express";
import { verifyToken, AuthTokenPayload } from "../services/authService.js";

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

/**
 * Extracts session token from cookie (`toktickit_session`) or Bearer header (`Authorization: Bearer <token>`).
 * Attaches decoded `req.user` if valid.
 */
export function authenticateUser(req: Request, _res: Response, next: NextFunction): void {
  let token: string | undefined;

  if (req.cookies?.toktickit_session) {
    token = req.cookies.toktickit_session;
  } else if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.slice(7).trim();
  }

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
}

/**
 * Rejects unauthenticated requests with HTTP 401 Unauthorized.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }
  next();
}

/**
 * Enforces BR-02: Blocks users with `mustChangePassword === true` from operational routes.
 * Whitelisted routes (such as /auth/change-password, /auth/logout, /auth/me) do not apply this middleware.
 */
export function requirePasswordChanged(req: Request, res: Response, next: NextFunction): void {
  if (req.user && req.user.mustChangePassword) {
    res.status(403).json({
      error: {
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "You must change your password before accessing the service desk.",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }
  next();
}

/**
 * Role-based authorization middleware.
 */
export function requireRole(...allowedRoles: Array<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to access this resource.",
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  };
}
