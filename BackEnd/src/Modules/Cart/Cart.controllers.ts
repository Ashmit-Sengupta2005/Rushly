import type {Request,Response} from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { cartService } from './Cart.services.js';

export const cartController={
    getMyCart: asyncHandler(async (req: Request, res: Response) => {
    const cart = await cartService.getCart(req.user!.id);
    res.json({ cart });}),

    addItem:asyncHandler(async(req:Request,res:Response)=>{
         const item = await cartService.addItem(req.user!.id, req.body);
         res.status(201).json({ item });}),
    
    updateItem:asyncHandler(async(req:Request,res:Response)=>{
        const item = await cartService.updateItemQuantity(
      req.user!.id,
      req.params.productId as string,
      req.body,
    );
    res.json({ item });}),

    removeItem:asyncHandler(async(req:Request,res:Response)=>{
        await cartService.removeItem(req.user!.id, req.params.productId as string);
    res.status(204).send();}),

    clear:asyncHandler(async(req:Request,res:Response)=>{
        await cartService.clearCart(req.user!.id);
    res.status(204).send();})

};