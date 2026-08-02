import { z } from 'zod';
import {
  MAX_TEXT_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
} from './constants';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean(),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(1, 'Enter your name').max(60, 'Name is too long'),
    username: z
      .string()
      .min(MIN_USERNAME_LENGTH, `Username must be at least ${MIN_USERNAME_LENGTH} characters`)
      .max(MAX_USERNAME_LENGTH, `Username must be ${MAX_USERNAME_LENGTH} characters or fewer`)
      .regex(/^[a-zA-Z0-9_.]+$/, 'Use only letters, numbers, _ and .')
      .regex(/^[a-zA-Z]/, 'Username must start with a letter'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((v) => v, 'You must accept the terms'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotSchema = z.object({
  email: z.string().email('Enter a valid email'),
});
export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ResetValues = z.infer<typeof resetSchema>;

export const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(60),
  username: z
    .string()
    .min(MIN_USERNAME_LENGTH)
    .max(MAX_USERNAME_LENGTH)
    .regex(/^[a-zA-Z0-9_.]+$/, 'Use only letters, numbers, _ and .')
    .regex(/^[a-zA-Z]/, 'Username must start with a letter'),
  bio: z.string().max(200, 'Bio is too long').optional().or(z.literal('')),
  phone: z
    .string()
    .max(20, 'Phone number is too long')
    .optional()
    .or(z.literal('')),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const messageSchema = z.object({
  body: z.string().min(1).max(MAX_TEXT_LENGTH),
});
export type MessageValues = z.infer<typeof messageSchema>;

/** 0-4 strength score for the password meter. */
export function passwordStrength(pw: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  score = Math.min(score, 4);
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#059669'];
  return { score, label: labels[score], color: colors[score] };
}
