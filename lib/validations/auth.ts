import { z } from 'zod';

export const signInSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const signUpSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  email: z.email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .max(128, 'Password is too long'),
});

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .max(128, 'Password is too long'),
});

export const selectContextSchema = z.object({
  role: z.enum(['parent', 'cashier', 'school_admin', 'super_admin']),
  schoolId: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.string().uuid().nullable(),
  ),
  next: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.string().optional(),
  ),
});
