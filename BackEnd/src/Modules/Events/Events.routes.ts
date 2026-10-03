import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { eventsService } from "./Events.service.js";

const scheduleQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(14).default(7),
});
type ScheduleQuery = z.infer<typeof scheduleQuerySchema>;

// Public — mounted at /api/events
export const eventsRouter = Router();
eventsRouter.get(
  '/',
  validate.query(scheduleQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { days } = req.validatedQuery as ScheduleQuery;
    res.json(await eventsService.listSchedule(days));
  }),
);
