import { BrowserRouter, Routes, Route } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/config/queryClient';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import CatalogPage from '@/pages/CatalogPage';
import ProductPage from '@/pages/ProductPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
import PaymentPage from '@/pages/PaymentPage';
import CheckoutCompletePage from '@/pages/CheckoutCompletePage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <CatalogPage />
                </ProtectedRoute>
              }
            />
            {/* Must be :slug — ProductPage reads useParams().slug, ProductCard
                links to /products/<slug>, and the backend looks products up by slug */}
            <Route
              path="/products/:slug"
              element={
                <ProtectedRoute>
                  <ProductPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <CartPage />
                </ProtectedRoute>
              }
            />
            {/* Checkout: address → reserve → pay (Stripe) → wait for webhook → order */}
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout/payment/:reservationId"
              element={
                <ProtectedRoute>
                  <PaymentPage />
                </ProtectedRoute>
              }
            />
            {/* Also Stripe's 3-D Secure return_url — must stay in sync with StripePaymentForm */}
            <Route
              path="/checkout/complete/:reservationId"
              element={
                <ProtectedRoute>
                  <CheckoutCompletePage />
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}