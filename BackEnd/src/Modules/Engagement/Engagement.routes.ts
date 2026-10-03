import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAuth } from "../Auth/Auth.middleware.js";
import { wishlistService } from "./Wishlist.service.js";
import { restockAlertsService } from "./RestockAlerts.service.js";

const productIdParamsSchema = z.object({ productId: z.cuid2() });

// Mounted at /api/wishlist
export const wishlistRouter = Router();
wishlistRouter.use(requireAuth);
wishlistRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ items: await wishlistService.list(req.user!.id) });
  }),
);
wishlistRouter.put(
  '/:productId',
  validate.params(productIdParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await wishlistService.add(req.user!.id, req.params.productId as string);
    res.status(204).send();
  }),
);
wishlistRouter.delete(
  '/:productId',
  validate.params(productIdParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await wishlistService.remove(req.user!.id, req.params.productId as string);
    res.status(204).send();
  }),
);

// Mounted at /api/restock-alerts — "notify me when it's back"
export const restockAlertsRouter = Router();
restockAlertsRouter.use(requireAuth);
restockAlertsRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ productIds: await restockAlertsService.listActive(req.user!.id) });
  }),
);
restockAlertsRouter.put(
  '/:productId',
  validate.params(productIdParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await restockAlertsService.subscribe(req.user!.id, req.params.productId as string);
    res.status(204).send();
  }),
);
restockAlertsRouter.delete(
  '/:productId',
  validate.params(productIdParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await restockAlertsService.unsubscribe(req.user!.id, req.params.productId as string);
    res.status(204).send();
  }),
);
