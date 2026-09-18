import express from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from 'cookie-parser';
import {pinoHttp} from 'pino-http';
import { env } from "./config/.env.js";
import { logger } from './utils/logger.js'
import { errorHandler } from "./Middlewares/errorHandler.js"
import { systemRouter } from "./Modules/System/System.route.js"
import { authRouter } from "./Modules/Auth/Auth.routes.js"
import { catalogRouter,catalogAdminRouter } from "./Modules/Catalog/Catalog.routes.js";
import { cartRouter } from "./Modules/Cart/Cart.routes.js";
import { checkoutRouter } from "./Modules/CheckOut/Checkout.routes.js";
import { stripeWebhookRouter } from "./Modules/WebHooks/stripeWebhooks.routes.js";
import { adminRouter } from "./Modules/Admin/admin.routes.js";
import { ordersRouter } from "./Modules/Orders/Orders.routes.js";

    const app=express();
    app.use(helmet()); // security and utility middleware
    app.use(cors({origin:env.CORS_ORIGIN,credentials:true}));
    // ========================================================
  // CRITICAL: raw body for Stripe webhook ONLY.
  // This MUST come BEFORE express.json(). If express.json() runs first,
  // the body becomes a parsed object and signature verification fails.
  //
  // We scope it to just this one route by mounting it at the exact path.
  // ========================================================
  app.use(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    stripeWebhookRouter,
  );

  // JSON parsing for everything else
    app.use(express.json({limit:'1mb'}));
    app.use(cookieParser());// populates req.cookies from the Cookie header
    app.use(pinoHttp({ logger }));

    app.use('/api',systemRouter);
    app.use('/api/auth',authRouter);
    app.use('/api/products', catalogRouter);
    app.use('/api/admin/products', catalogAdminRouter);
    app.use('/api/admin', adminRouter);
    app.use('/api/cart', cartRouter);
    app.use('/api/checkout',checkoutRouter);
    app.use('/api/orders',ordersRouter);

    app.use(errorHandler);
    export default app;