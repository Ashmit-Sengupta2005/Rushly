import type { Request, Response } from 'express';
import { metricService } from './metrics.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const metricControllers={
    revenueByDay:asyncHandler(async(req:Request,res:Response)=>{
        const data=await metricService.revenueByDay(req.query as any);
        // Compute a small summary alongside the raw data — useful for the dashboard
        const totalRevenue = data.reduce((sum, d) => sum + d.revenuePaise, 0);
        const totalOrders = data.reduce((sum, d) => sum + d.orderCount, 0);
        const averageDailyRevenue = data.length > 0 ? totalRevenue / data.length : 0;
        res.json({
            data,
            summary: {
            totalRevenuePaise: totalRevenue,
            totalRevenueRupees: totalRevenue / 100,
            totalOrders,
            averageDailyRevenuePaise: Math.round(averageDailyRevenue),
            averageDailyRevenueRupees: averageDailyRevenue / 100,},
        });
        }),
};