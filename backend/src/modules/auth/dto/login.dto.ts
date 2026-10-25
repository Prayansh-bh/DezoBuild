import { z } from "zod";

export const loginDtoSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .min(1, "Email must not be empty.")
    .email("Invalid email address format.")
    .max(255, "Email is too long."),
  password: z
    .string({ required_error: "Password is required." })
    .min(1, "Password must not be empty.")
    .max(255, "Password is too long."),
});

export type LoginDto = z.infer<typeof loginDtoSchema>;
