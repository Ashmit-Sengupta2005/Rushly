import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ShippingAddressInput } from '@/types/api';

// Mirrors BackEnd/src/Modules/CheckOut/Checkout.schemas.ts so users see errors
// inline instead of a 400 from the server. Keep the two in sync.
// No `.default()` here: it makes the schema's input and output types differ,
// which breaks useForm's typing — the default lives in defaultValues instead.
const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, 'Phone must be 10–15 digits'),
  line1: z.string().trim().min(3, 'Address is required').max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2, 'City is required').max(100),
  state: z.string().trim().min(2, 'State is required').max(100),
  pincode: z.string().trim().min(4, 'Enter a valid pincode').max(10),
  country: z.string().trim().min(2, 'Country is required').max(100),
});

type AddressFormValues = z.infer<typeof addressSchema>;

interface Props {
  onSubmit: (values: ShippingAddressInput) => void;
  isSubmitting?: boolean;
}

type FieldName = keyof AddressFormValues;

export function AddressForm({ onSubmit, isSubmitting }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: '', phone: '', line1: '', line2: '',
      city: '', state: '', pincode: '', country: 'India',
    },
  });

  const field = (name: FieldName, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        {...props}
        {...register(name)}
      />
      {errors[name] && (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {errors[name]?.message}
        </p>
      )}
    </div>
  );

  return (
    <form
      // Drop an empty optional line2 rather than sending ""
      onSubmit={handleSubmit(({ line2, ...rest }) => onSubmit(line2 ? { ...rest, line2 } : rest))}
      className="space-y-4"
      noValidate
    >
      {field('fullName', 'Full name', { autoComplete: 'name' })}
      {field('phone', 'Phone', { type: 'tel', autoComplete: 'tel', inputMode: 'tel' })}
      {field('line1', 'Address line 1', { autoComplete: 'address-line1' })}
      {field('line2', 'Address line 2 (optional)', { autoComplete: 'address-line2' })}
      <div className="grid grid-cols-2 gap-4">
        {field('city', 'City', { autoComplete: 'address-level2' })}
        {field('state', 'State', { autoComplete: 'address-level1' })}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {field('pincode', 'Pincode', { autoComplete: 'postal-code', inputMode: 'numeric' })}
        {field('country', 'Country', { autoComplete: 'country-name' })}
      </div>

      {/* Disabled while pending: a double-click would create two reservations */}
      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Reserving stock…' : 'Continue to payment'}
      </Button>
    </form>
  );
}
