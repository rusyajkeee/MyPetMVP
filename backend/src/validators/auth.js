import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  tosAccepted: z.literal(true, { errorMap: () => ({ message: 'You must accept Terms of Service and Privacy Policy' }) }),
  role: z.enum(['USER', 'PROVIDER']).optional().default('USER'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
