import type {Request,Response} from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { reservationService } from './Reservation.service.js';

export const checkoutController={
    reserve:asyncHandler(async(req:Request,res:Response)=>{
        const reservation = await reservationService.createReservation(req.user!.id);
        res.status(201).json({ reservation });
    }),
    getReservation: asyncHandler(async (req: Request, res: Response) => {
    const reservation = await reservationService.getReservation(
      req.params.id as string,
      req.user!.id,
    );
    res.json({ reservation });
  }),
  cancel: asyncHandler(async (req: Request, res: Response) => {
    const result = await reservationService.cancelReservation(
      req.params.id as string,
      req.user!.id,
    );
    res.json(result);
  }),
}