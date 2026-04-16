/**
 * @scee/shared
 * -------------
 * This package acts as the "Single Source of Truth" for data contracts 
 * across the entire monorepo. 
 * 
 * Why:
 * 1. The Frontend and Backend use the same Zod schemas to validate requests.
 * 2. The API (Producer) and Worker (Consumer) use the same queue name constant.
 * 3. It prevents duplication and "drift" in the API contract.
 */
import { z } from "zod";

/**
 * Unique name for the BullMQ queue used for judge jobs.
 */
export const JUDGE_QUEUE_NAME = "judge";

/**
 * Validation schema for User Registration.
 */
export const registerBodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

/**
 * Validation schema for User Login.
 */
export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Validation schema for creating a Submission.
 */
export const createSubmissionBodySchema = z.object({
  problemId: z.string().uuid(),
  language: z.enum(["python", "javascript", "cpp"]),
  sourceCode: z.string().min(1).max(256_000),
  kind: z.enum(["run", "submit"]).default("run"),
});

// TypeScript types inferred automatically from the Zod schemas
export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type CreateSubmissionBody = z.infer<typeof createSubmissionBodySchema>;

