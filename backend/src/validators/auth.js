import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one digit'),
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .regex(/^[a-zA-Zа-яА-ЯёЁ'\-\s]+$/, 'First name must contain letters only'),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .regex(/^[a-zA-Zа-яА-ЯёЁ'\-\s]+$/, 'Last name must contain letters only'),
  phone: z
    .string()
    .refine((v) => !v || /^\D*(?:\d\D*){10,12}$/.test(v), 'Phone must be 10–12 digits')
    .optional(),
  tosAccepted: z.literal(true, { errorMap: () => ({ message: 'You must accept Terms of Service and Privacy Policy' }) }),
  role: z.enum(['USER', 'PROVIDER']).optional().default('USER'),
  businessName: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
