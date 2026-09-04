import { Router } from "express";
import { validate } from "../../utils/validate.js";
import { requireAuth } from "../Auth/Auth.middleware.js";
import { checkoutController } from "./Checkout.controller.js";
import { reservationIdParamsSchema } from "./Checkout.schemas.js";

export const checkoutRouter=Router();
checkoutRouter.use(requireAuth);

checkoutRouter.post('/reserve',checkoutController.reserve);
checkoutRouter.get('/reservations/:id',
    validate.params(reservationIdParamsSchema),
    checkoutController.getReservation,
);
checkoutRouter.delete('/reservations/:id',
    validate.params(reservationIdParamsSchema),
    checkoutController.cancel,
)
