import { z } from "zod";

export const AuthRegisterSchema = z.object({
  emailAddress: z.email().max(320),
  password: z.string().min(8).max(200),
});

export const AuthLoginSchema = z.object({
  emailAddress: z.email().max(320),
  password: z.string().min(1).max(200),
});

export const AuthVerifyEmailSchema = z.object({
  token: z.string().min(20).max(500),
});

export const AuthAccountSchema = z.object({
  accountId: z.number().int().positive(),
  emailAddress: z.email(),
  emailVerifiedAt: z.date().nullable(),
  status: z.string(),
  createdAt: z.date(),
  lastLoginAt: z.date().nullable(),
});

export const AuthResponseSchema = z.object({
  account: AuthAccountSchema,
});

export type AuthRegister = z.infer<typeof AuthRegisterSchema>;
export type AuthLogin = z.infer<typeof AuthLoginSchema>;
export type AuthVerifyEmail = z.infer<typeof AuthVerifyEmailSchema>;
export type AuthAccount = z.infer<typeof AuthAccountSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
