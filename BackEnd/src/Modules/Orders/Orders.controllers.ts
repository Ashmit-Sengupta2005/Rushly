import type {Request,Response} from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ordersService } from './Orders.services.js';
import type { ListOrdersQuery } from './Orders.schemas.js';

export const ordersController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await ordersService.listMyOrders(req.user!.id, req.validatedQuery as ListOrdersQuery);
    res.json(result);
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersService.getOrder(req.params.id as string, req.user!.id);
    res.json({ order });
  }),
};