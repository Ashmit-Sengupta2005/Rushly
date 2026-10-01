import { Router } from "express";
import { categoriesController } from "./Categories.controller.js";

// Public — mounted at /api/categories. Filter products with
// GET /api/products?categorySlug=<slug>.
export const categoriesRouter = Router();
categoriesRouter.get('/', categoriesController.list);
