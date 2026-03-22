/**
 * SHARED — types & validation
 * ---------------------------
 * Imported by FRONTEND (optional), BACKEND API, and worker. Keeps queue name + request shapes in sync.
 */
import { z } from "zod";

export const JUDGE_QUEUE_NAME = "judge";

export const registerBodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createSubmissionBodySchema = z.object({
  problemId: z.string().uuid(),
  language: z.enum(["python", "javascript", "cpp"]),
  sourceCode: z.string().min(1).max(256_000),
  kind: z.enum(["run", "submit"]).default("run"),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type CreateSubmissionBody = z.infer<typeof createSubmissionBodySchema>;
