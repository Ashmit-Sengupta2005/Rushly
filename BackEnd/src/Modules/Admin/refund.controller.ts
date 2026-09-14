import type {Request,Response} from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { refundService } from './refund.service.js';
export const refundController={
    initiate:asyncHandler(async(req:Request,res:Response)=>{
        const result=await refundService.initiateRefund(req.params.id as string,req.user!.id,req.body);
        res.status(202).json(result);
    })
}