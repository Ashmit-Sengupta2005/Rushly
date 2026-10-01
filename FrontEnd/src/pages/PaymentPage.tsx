import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Elements } from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import { getStripe } from '@/config/stripe';
import { useReservation } from '@/features/checkout/useReservation';
import { useCreatePaymentIntent } from '@/features/checkout/useCreatePaymentIntent';
import { useCancelReservation } from '@/features/checkout/useCancelReservation';
import { StripePaymentForm } from '@/features/checkout/StripePaymentForm';
import { CountdownTimer } from '@/features/checkout/CountdownTimer';
import { Button, buttonVariants } from '@/components/ui/button';
import { extractApiError } from '@/lib/apiClient';
import { formatMoney } from '@/lib/formatMoney';

// Module scope (not inside the component) so it isn't re-created — and its
// children remounted — on every render.
function Message({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="max-w-md mx-auto p-8 text-center space-y-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}

export default function PaymentPage() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();

  const { data: reservation, isLoading, isError } = useReservation(reservationId);
  const createIntent = useCreatePaymentIntent();
  const cancel = useCancelReservation();

  // Local "time's up" — the backend's expiry worker may flip status to EXPIRED a
  // little late. Paying after expiry charges the card but creates NO order
  // (the webhook ignores non-PENDING reservations), so stop payment at 0:00.
  // CountdownTimer reports this (immediately on mount if already past expiresAt).
  // If /pay races it on an already-expired hold, the backend rejects with 409.
  const [timeUp, setTimeUp] = useState(false);
  const expired = timeUp || reservation?.status === 'EXPIRED';

  // Create the PaymentIntent exactly once per reservation. A ref (not
  // createIntent.isPending) guards it: StrictMode runs effects twice before any
  // state update lands, which would otherwise fire two /checkout/pay calls.
  const intentRequestedFor = useRef<string | null>(null);
  useEffect(() => {
    if (reservation?.status !== 'PENDING' || expired) return;
    if (intentRequestedFor.current === reservation.id) return;
    intentRequestedFor.current = reservation.id;
    createIntent.mutate(reservation.id);
  }, [reservation?.status, reservation?.id, expired, createIntent]);

  // Already paid (e.g. Back button after paying) → go to the order
  useEffect(() => {
    if (reservation?.status !== 'PAID') return;
    navigate(
      reservation.order ? `/orders/${reservation.order.id}` : `/checkout/complete/${reservation.id}`,
      { replace: true },
    );
  }, [reservation?.status, reservation?.order, reservation?.id, navigate]);

  const clientSecret = createIntent.data?.clientSecret;
  const elementsOptions = useMemo(
    () => (clientSecret ? { clientSecret, appearance: { theme: 'stripe' as const } } : null),
    [clientSecret],
  );

  const handleCancel = () => {
    if (!reservation) return;
    cancel.mutate(reservation.id, {
      onSuccess: () => {
        toast.success('Reservation cancelled — items released');
        navigate('/', { replace: true });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="h-64 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  if (isError || !reservation) {
    return (
      <Message title="Reservation not found">
        <Link to="/" className={buttonVariants()}>Back to shop</Link>
      </Message>
    );
  }

  if (reservation.status === 'PAID') return null; // redirecting (effect above)

  if (reservation.status === 'CANCELLED') {
    return (
      <Message title="Reservation cancelled">
        <p className="text-sm text-muted-foreground">The held items were released.</p>
        <Link to="/" className={buttonVariants()}>Back to shop</Link>
      </Message>
    );
  }

  if (expired) {
    return (
      <Message title="Your hold expired">
        {/* The cart was emptied when the reservation was made */}
        <p className="text-sm text-muted-foreground">
          The 10-minute hold ran out and the items were released. You were not charged —
          add them to your cart again to retry.
        </p>
        <Link to="/" className={buttonVariants()}>Back to shop</Link>
      </Message>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {/* No "Back to cart": the cart was cleared by the reservation. Cancel
              releases the stock instead of leaving it held for 10 minutes. */}
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={cancel.isPending}>
            {cancel.isPending ? 'Cancelling…' : 'Cancel checkout'}
          </Button>
          <CountdownTimer expiresAt={reservation.expiresAt} onExpire={() => setTimeUp(true)} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr_380px] gap-8">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Payment</h1>

          {createIntent.isError ? (
            <div role="alert" className="border border-destructive/40 rounded-md p-4 text-sm space-y-2">
              <p className="text-destructive">
                Could not start payment: {extractApiError(createIntent.error).message}
              </p>
              <Button variant="outline" size="sm" onClick={() => createIntent.mutate(reservation.id)}>
                Try again
              </Button>
            </div>
          ) : !elementsOptions ? (
            <div className="h-48 bg-muted animate-pulse rounded-md" />
          ) : (
            // key: a new clientSecret needs a fresh <Elements> (options are read once)
            <Elements key={elementsOptions.clientSecret} stripe={getStripe()} options={elementsOptions}>
              <StripePaymentForm
                reservationId={reservation.id}
                amount={reservation.totalAmount}
                disabled={expired}
              />
            </Elements>
          )}

          <p className="text-xs text-muted-foreground border-t border-border pt-4">
            Test card: <code className="font-mono">4242 4242 4242 4242</code>, any future expiry,
            any CVC. 3-D Secure test: <code className="font-mono">4000 0025 0000 3155</code>.
          </p>
        </div>

        <aside className="border border-border rounded-lg p-4 h-fit space-y-4 lg:sticky lg:top-24">
          <h2 className="font-semibold">Order summary</h2>
          <div className="space-y-3">
            {/* Reservation items have no snapshots — name/image come from `product` */}
            {reservation.items.map((item) => {
              const image = item.product.images[0];
              return (
                <div key={item.id} className="flex gap-3 text-sm">
                  <div className="h-14 w-14 bg-muted rounded-md flex-shrink-0 overflow-hidden">
                    {image && (
                      <img src={image.url} alt={image.alt ?? item.product.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                  </div>
                  <p className="font-medium">{formatMoney(item.priceSnapshot * item.quantity)}</p>
                </div>
              );
            })}
          </div>
          {reservation.shippingAddress && (
            <div className="pt-4 border-t border-border text-sm">
              <p className="font-medium">Shipping to</p>
              <p className="text-muted-foreground">
                {reservation.shippingAddress.fullName}, {reservation.shippingAddress.city}{' '}
                {reservation.shippingAddress.pincode}
              </p>
            </div>
          )}
          <div className="pt-4 border-t border-border flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatMoney(reservation.totalAmount)}</span>
          </div>
        </aside>
      </main>
    </div>
  );
}
