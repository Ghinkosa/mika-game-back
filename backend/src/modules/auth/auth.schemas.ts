import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(3).max(40).transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(128)
});

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, underscores, periods, and hyphens')
    .transform((v) => v.toLowerCase()),
  displayName: z.string().trim().min(2).max(120),
  password: z.string().min(6).max(128),
  phoneNumber: z.string().trim().max(32).optional(),
  cbeAccount: z.string().trim().max(64).optional(),
  agentId: z.string().uuid().optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(6).max(128)
});
