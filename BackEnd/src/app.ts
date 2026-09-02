import express from "express"
import cors from "cors"
import helmet from "helmet"
import { systemRouter } from "./Modules/System/System.route.js"
import { errorHandler } from "./Middlewares/errorHandler.js"
const app=express();
app.use(helmet()); // security and utility middleware
app.use(cors({origin:process.env.CORS_ORIGIN,credentials:true}));
app.use(express.json());
app.use('/api',systemRouter);
app.use(errorHandler);
export default app;