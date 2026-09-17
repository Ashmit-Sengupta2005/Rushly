import type {Request,Response} from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { paymentService } from './Payment.services.js';

export const paymentController={
    createPaymentIntent:asyncHandler(async (req:Request,res:Response)=>{
        const result=await paymentService.createPaymentIntent(req.body.reservationId,req.user!.id);
        res.status(201).json(result);}),
};