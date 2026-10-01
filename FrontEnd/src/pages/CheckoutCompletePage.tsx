import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useReservation } from '@/features/checkout/useReservation';
import { buttonVariants } from '@/components/ui/button';
import { queryKeys } from '@/config/queryClient';
import type { OrderDetailLocationState } from '@/pages/OrderDetailPage';

// Give the webhook this long before showing "still confirming". 60 s of 3 s
// polling = 20 requests, which stays under the 30/min checkout rate limit.
const MAX_WAIT_MS = 60_000;

// Module scope — a component defined inside render remounts every render.
function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center text-center max-w-sm gap-2">{children}</div>
    </div>
  );
}

export default function CheckoutCompletePage() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // After a 3-D Secure redirect, Stripe appends ?redirect_status=succeeded|failed|processing
  const redirectFailed = searchParams.get('redirect_status') === 'failed';

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => clearTimeout(t);
  }, []);

  const { data: reservation, isLoading, isError } = useReservation(reservationId, {
    poll: !redirectFailed && !timedOut,
  });

  const orderId = reservation?.status === 'PAID' ? reservation.order?.id : undefined;
  useEffect(() => {
    if (!orderId) return;
    // New order exists → any cached order list is stale
    qc.invalidateQueries({ queryKey: queryKeys.orders.all });
    // Brief pause so the success state is visible
    // justPlaced → OrderDetailPage shows the "order confirmed" banner (only on this redirect)
    const state: OrderDetailLocationState = { justPlaced: true };
    const t = setTimeout(() => navigate(`/orders/${orderId}`, { replace: true, state }), 1200);
    return () => clearTimeout(t);
  }, [orderId, navigate, qc]);

  if (redirectFailed) {
    return (
      <Centered>
        <XCircle className="h-12 w-12 text-destructive mb-2" />
        <h1 className="text-xl font-semibold">Payment failed</h1>
        <p className="text-sm text-muted-foreground">Your card was not charged. You can try again while your hold lasts.</p>
        <Link to={`/checkout/payment/${reservationId}`} className={buttonVariants({ className: 'mt-4' })}>
          Try again
        </Link>
      </Centered>
    );
  }

  if (isLoading) {
    return (
      <Centered>
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-2" />
        <h1 className="text-xl font-semibold">Loading…</h1>
      </Centered>
    );
  }

  if (isError || !reservation) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold">Reservation not found</h1>
        <Link to="/orders" className={buttonVariants({ className: 'mt-4' })}>View my orders</Link>
      </Centered>
    );
  }

  if (reservation.status === 'PAID') {
    return (
      <Centered>
        <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-2" />
        <h1 className="text-xl font-semibold">Payment successful</h1>
        <p className="text-sm text-muted-foreground">Taking you to your order…</p>
      </Centered>
    );
  }

  if (reservation.status === 'PENDING') {
    return timedOut ? (
      <Centered>
        <h1 className="text-xl font-semibold">Still confirming your payment</h1>
        <p className="text-sm text-muted-foreground">
          This is taking longer than usual. Your order will appear in My Orders once the
          payment is confirmed — no need to pay again.
        </p>
        <Link to="/orders" className={buttonVariants({ className: 'mt-4' })}>View my orders</Link>
      </Centered>
    ) : (
      <Centered>
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-2" />
        <h1 className="text-xl font-semibold">Confirming your payment…</h1>
        <p className="text-sm text-muted-foreground">This usually takes a few seconds. Please don't close this page.</p>
      </Centered>
    );
  }

  // EXPIRED / CANCELLED while we were waiting. If a charge went through after
  // expiry the backend does NOT auto-refund (it only logs it) — so don't promise one.
  return (
    <Centered>
      <h1 className="text-xl font-semibold">
        {reservation.status === 'EXPIRED' ? 'Reservation expired' : 'Reservation cancelled'}
      </h1>
      <p className="text-sm text-muted-foreground">
        We couldn't complete this order. If your card was charged, please contact support with
        reference <code className="font-mono">{reservation.id}</code>.
      </p>
      <Link to="/" className={buttonVariants({ className: 'mt-4' })}>Back to shop</Link>
    </Centered>
  );
}
