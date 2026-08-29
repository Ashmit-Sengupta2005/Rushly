import { Router } from "express";
import { checkHealth } from "../Controllers/healthControllers.js";
import { check } from "zod";
const router=Router();
router.get("/",checkHealth);
export const healthRoutes=router;