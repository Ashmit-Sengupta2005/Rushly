import { Router } from "express";
import { validate } from "../../utils/validate.js";
import { requireAuth } from "../Auth/Auth.middleware.js";
import { checkoutController } from "./Checkout.controller.js";
import { paymentController } from "./Payment.controllers.js";
import { reservationIdParamsSchema } from "./Checkout.schemas.js";
import { createPaymentIntentSchema } from "./Payment.schemas.js";

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

checkoutRouter.post(
  '/pay',
  validate.body(createPaymentIntentSchema),
  paymentController.createPaymentIntent,
);
