import type { Request,Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { catalogService } from "./Catalog.service.js";
import type { ListProductsQuery } from "./Catalog.schemas.js";

export const catalogController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await catalogService.listProducts(req.validatedQuery as ListProductsQuery);
    res.json(result);
  }),
   getBySlug: asyncHandler(async (req: Request, res: Response) => {
    const product = await catalogService.getProductBySlug(req.params.slug as string);
    res.json({ product });
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const product = await catalogService.createProduct(req.body);
    res.status(201).json({ product });
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const product = await catalogService.updateProduct(req.params.id as string, req.body);
    res.json({ product });
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    await catalogService.deleteProduct(req.params.id as string);
    res.status(204).send();
  }),
  adjustInventory: asyncHandler(async (req: Request, res: Response) => {
    const inventory = await catalogService.adjustInventory(
      req.params.id as string,
      req.body,
      req.user!.id,
    );
    res.json({ inventory });
  }),
};