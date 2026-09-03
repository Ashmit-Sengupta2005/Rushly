import express from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from 'cookie-parser';
import {pinoHttp} from 'pino-http';
import { env } from "./config/.env.js";
import { logger } from './utils/logger.js'
import { systemRouter } from "./Modules/System/System.route.js"
import { authRouter } from "./Modules/Auth/Auth.routes.js"
import { catalogRouter,catalogAdminRouter } from "./Modules/Catalog/Catalog.routes.js";
import { errorHandler } from "./Middlewares/errorHandler.js"

    const app=express();
    app.use(helmet()); // security and utility middleware
    app.use(cors({origin:env.CORS_ORIGIN,credentials:true}));
    app.use(express.json({limit:'1mb'}));
    app.use(cookieParser());// populates req.cookies from the Cookie header
    app.use(pinoHttp({ logger }));

    app.use('/api',systemRouter);
    app.use('/api/auth',authRouter);
    app.use('/api/products', catalogRouter);
    app.use('/api/admin/products', catalogAdminRouter);

    app.use(errorHandler);
    export default app;