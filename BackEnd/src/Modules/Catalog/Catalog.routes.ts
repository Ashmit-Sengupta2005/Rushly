import { Router } from "express";
import { validate } from "../../utils/validate.js";
import { requireAuth,requireRole } from "../Auth/Auth.middleware.js";
import { catalogController } from "./Catalog.controller.js";
import { listProductsQuerySchema,productSlugParamsSchema,createProductSchema,updateProductSchema,adjustInventorySchema,productIdParamsSchema } from "./Catalog.schemas.js";

// Public catalog
export const catalogRouter=Router();
catalogRouter.get('/', validate.query(listProductsQuerySchema), catalogController.list);
catalogRouter.get('/:slug', validate.params(productSlugParamsSchema), catalogController.getBySlug);

// Admin catalog — mounted at /api/admin/products
export const catalogAdminRouter = Router();
catalogAdminRouter.use(requireAuth, requireRole('ADMIN'));

catalogAdminRouter.post('/', validate.body(createProductSchema), catalogController.create);
catalogAdminRouter.patch(
  '/:id',
  validate.params(productIdParamsSchema),
  validate.body(updateProductSchema),
  catalogController.update,
);
catalogAdminRouter.delete(
  '/:id',
  validate.params(productIdParamsSchema),
  catalogController.delete,
);
catalogAdminRouter.patch(
  '/:id/inventory',
  validate.params(productIdParamsSchema),
  validate.body(adjustInventorySchema),
  catalogController.adjustInventory,
);