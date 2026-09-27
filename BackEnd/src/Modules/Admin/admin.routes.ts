import { Router } from "express";
import { validate } from "../../utils/validate.js";
import { requireAuth,requireRole } from "../Auth/Auth.middleware.js";
import { refundController } from "./refund.controller.js";
import { metricControllers } from "./metrics.controllers.js";
import { initiateRefundSchema,orderIdParamsSchema } from "./refund.schemas.js";
import { revenueByDayQuerySchema } from "./metrics.schemas.js";

export const adminRouter=Router();

// All admin routes require ADMIN role
adminRouter.use(requireAuth, requireRole('ADMIN'));

// Refund endpoint
adminRouter.post(
  '/orders/:id/refund',
  validate.params(orderIdParamsSchema),
  validate.body(initiateRefundSchema),
  refundController.initiate,
);

// Metrics Endpoint
adminRouter.get(
  '/metrics/revenue',
  validate.query(revenueByDayQuerySchema),
  metricControllers.revenueByDay,
);