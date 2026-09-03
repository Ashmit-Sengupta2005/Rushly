import { Router } from "express";
import { validate } from "../../utils/validate.js";
import { requireAuth } from "../Auth/Auth.middleware.js";
import { cartController } from "./Cart.controllers.js";
import { addItemSchema,updateItemSchema,productIdParamsSchema } from "./Cart.schemas.js";

export const cartRouter = Router();
cartRouter.use(requireAuth);

cartRouter.get('/', cartController.getMyCart);
cartRouter.post('/items', validate.body(addItemSchema), cartController.addItem);
cartRouter.patch(
  '/items/:productId',
  validate.params(productIdParamsSchema),
  validate.body(updateItemSchema),
  cartController.updateItem,
);
cartRouter.delete(
  '/items/:productId',
  validate.params(productIdParamsSchema),
  cartController.removeItem,
);
cartRouter.delete('/', cartController.clear);