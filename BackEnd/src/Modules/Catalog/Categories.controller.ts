import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { categoriesService } from "./Categories.service.js";

export const categoriesController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const categories = await categoriesService.listAll();
    res.json({ categories });
  }),
};
