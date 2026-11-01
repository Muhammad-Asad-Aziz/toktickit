import { Router } from "express";
import {
  getRequesterDashboard,
  getStaffDashboard,
  getAdminDashboard,
} from "../controllers/dashboard.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const dashboardRoutes = Router();

// GET /api/v1/dashboards/requester
dashboardRoutes.get("/requester", requireAuth, getRequesterDashboard);

// GET /api/v1/dashboards/staff
dashboardRoutes.get(
  "/staff",
  requireAuth,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  getStaffDashboard
);

// GET /api/v1/dashboards/admin
dashboardRoutes.get(
  "/admin",
  requireAuth,
  requireRole("ADMINISTRATOR"),
  getAdminDashboard
);

export const dashboardsRouter = dashboardRoutes;

