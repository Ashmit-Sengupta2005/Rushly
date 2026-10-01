import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/formatMoney';

interface Props {
  reservationId: string;
  amount: number; // paise — display only; the charge is computed server-side
  /** True once the hold has expired: paying now would charge without an order. */
  disabled?: boolean;
}

export function StripePaymentForm({ reservationId, amount, disabled }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const completePath = `/checkout/complete/${reservationId}`;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || disabled) return;

    setIsProcessing(true);
    setErrorMessage(null);

    // 'if_required': plain cards finish here; 3-D Secure cards redirect to
    // return_url, which lands on the same completion page with ?redirect_status=…
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}${completePath}` },
      redirect: 'if_required',
    });

    if (error) {
      // Card declined, validation errors, etc. — Stripe's message is user-safe
      setErrorMessage(error.message ?? 'Payment failed. Please try again.');
      setIsProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      // The ORDER is created asynchronously by the webhook — the completion
      // page polls for it. Don't assume success here.
      navigate(completePath, { replace: true });
    } else {
      setErrorMessage('Payment did not complete. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {errorMessage && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || !elements || isProcessing || disabled}
      >
        {isProcessing ? 'Processing…' : `Pay ${formatMoney(amount)}`}
      </Button>
    </form>
  );
}
