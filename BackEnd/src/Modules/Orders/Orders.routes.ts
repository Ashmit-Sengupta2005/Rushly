import { orderIdParamsSchema,listOrdersQuerySchema } from './Orders.schemas.js';
import { Router } from "express";
import { validate } from "../../utils/validate.js";
import { requireAuth } from "../Auth/Auth.middleware.js";
import { ordersController } from "./Orders.controllers.js";
export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.get('/', validate.query(listOrdersQuerySchema), ordersController.list);
ordersRouter.get('/:id', validate.params(orderIdParamsSchema), ordersController.getOne);