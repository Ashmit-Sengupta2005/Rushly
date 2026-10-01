import { Navbar } from '@/components/layout/Navbar';
import { ProductGrid } from '@/features/catalog/ProductGrid';

export default function CatalogPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <ProductGrid />
      </main>
    </div>
  );
}
