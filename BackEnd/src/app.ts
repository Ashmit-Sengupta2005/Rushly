import express from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from 'cookie-parser';
import {pinoHttp} from 'pino-http';
import { env } from "./config/.env.js";
import { logger } from './utils/logger.js'
import { errorHandler } from "./Middlewares/errorHandler.js";
import {rateLimit} from "./utils/rateLimiter.js"
import { systemRouter } from "./Modules/System/System.route.js";
import { authRouter } from "./Modules/Auth/Auth.routes.js"
import { catalogRouter,catalogAdminRouter } from "./Modules/Catalog/Catalog.routes.js";
import { categoriesRouter } from "./Modules/Catalog/Categories.routes.js";
import { cartRouter } from "./Modules/Cart/Cart.routes.js";
import { checkoutRouter } from "./Modules/CheckOut/Checkout.routes.js";
import { stripeWebhookRouter } from "./Modules/WebHooks/stripeWebhooks.routes.js";
import { adminRouter } from "./Modules/Admin/admin.routes.js";
import { ordersRouter } from "./Modules/Orders/Orders.routes.js";
import { eventsRouter } from "./Modules/Events/Events.routes.js";
import { wishlistRouter, restockAlertsRouter } from "./Modules/Engagement/Engagement.routes.js";
import { activityRouter } from "./Modules/Activity/Activity.routes.js";

    const app=express();
    // Number of proxies in front of the app whose X-Forwarded-For entries we trust.
    // req.ip feeds the per-IP rate limiters, so this MUST match the real chain:
    //   1 = Render's load balancer only (browser → Render)
    //   2 = Vercel's /api rewrite + Render (browser → Vercel → Render)
    // Too low → every user gets the proxy's IP and shares ONE rate-limit bucket
    // (e.g. 5 logins/min for the whole site). Too high → clients can spoof their
    // IP via X-Forwarded-For. Verify with the `clientIp` field in request logs.
    app.set('trust proxy', env.TRUST_PROXY_HOPS);
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
    // clientIp = what the rate limiters see; check it matches your real IP after deploys
    app.use(pinoHttp({ logger, customProps: (req) => ({ clientIp: (req as express.Request).ip }) }));
    app.use('/api', rateLimit.general);

    app.use('/api',systemRouter);
    app.use('/api/auth',authRouter);
    app.use('/api/products', catalogRouter);
    app.use('/api/categories', categoriesRouter);
    app.use('/api/admin/products', catalogAdminRouter);
    app.use('/api/admin', adminRouter);
    app.use('/api/cart', cartRouter);
    app.use('/api/checkout',checkoutRouter);
    app.use('/api/orders',ordersRouter);
    app.use('/api/events', eventsRouter);
    app.use('/api/wishlist', wishlistRouter);
    app.use('/api/restock-alerts', restockAlertsRouter);
    app.use('/api/activity', activityRouter);

    app.use(errorHandler);
    export default app;