import {z} from 'zod'
// Reused password rules — one place to tighten.
// Length is the biggest single factor in password strength.
// Reject known-terrible patterns cheaply.
const passwordSchema=
z.string().min(8,'Password must be atleast 8 characters')
.max(128,'Password must not exceed 128 characters')
.refine((p)=>!/^(password|12345678|qwerty)/i.test(p), {
    message: 'Password is too common',
  });

export const registerSchema=z.object({
    email:z.email({ error: 'Invalid email address' }).trim().toLowerCase(),
    password: passwordSchema,
    name: z.string().trim().min(1, 'Name is required').max(100),
});
export type RegisterInput= z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),  // don't leak our password rules on login
});
export type LoginInput = z.infer<typeof loginSchema>;

export const googleLoginSchema = z.object({
  credential: z.string().min(1, 'Google credential is required'), // ID token (JWT) from Google Identity Services
});
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
