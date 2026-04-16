/**
 * SUBMISSION ROUTES
 * -----------------
 * Handles the logic for students submitting code for evaluation.
 * 
 * Flow:
 * 1. User POSTs source code + problem ID to `/submissions`.
 * 2. API validates the request and creates a "queued" row in Postgres.
 * 3. API enqueues a job in BullMQ (Redis) with the submission ID.
 * 4. The `backend-worker` picks up the job, marks it "running", and judges it.
 * 5. The frontend polls GET `/submissions/:id` to show results once "completed".
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  prisma,
  Role,
  SubmissionKind,
  SubmissionStatus,
} from "@scee/db";
import { createSubmissionBodySchema } from "@scee/shared";
import { enqueueJudgeJob } from "../queue/judge-queue.js";


async function authenticate(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await req.jwtVerify();
  } catch {
    reply.status(401).send({ error: "Unauthorized" });
  }
}

function userId(req: FastifyRequest): string {
  const u = req.user as { sub: string; role: string };
  return u.sub;
}

function isAdmin(req: FastifyRequest): boolean {
  const u = req.user as { sub: string; role: string };
  return u.role === Role.admin;
}

export async function submissionRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/submissions",
    {
      onRequest: [authenticate],
      schema: {
        tags: ["submissions"],
        summary: "Queue a submission for judging",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["problemId", "language", "sourceCode"],
          properties: {
            problemId: { type: "string", format: "uuid" },
            language: { type: "string", enum: ["python", "javascript", "cpp"] },
            sourceCode: { type: "string" },
            kind: { type: "string", enum: ["run", "submit"], default: "run" },
          },
        },
      },
    },
    async (req, reply) => {
      const parsed = createSubmissionBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }
      const { problemId, language, sourceCode, kind } = parsed.data;
      const problem = await prisma.problem.findFirst({
        where: { id: problemId, isPublished: true },
        include: { languages: { where: { language } } },
      });
      if (!problem) {
        return reply.status(404).send({ error: "Problem not found or unpublished" });
      }
      if (problem.languages.length === 0) {
        return reply.status(400).send({ error: `Language not supported: ${language}` });
      }
      const submission = await prisma.submission.create({
        data: {
          userId: userId(req),
          problemId,
          language,
          sourceCode,
          kind: kind === "submit" ? SubmissionKind.submit : SubmissionKind.run,
          status: SubmissionStatus.queued,
        },
      });
      await enqueueJudgeJob(submission.id);
      const base = `${req.protocol}://${req.hostname}`;
      const port = (req.socket as { localPort?: number }).localPort;
      const pollUrl =
        port && port !== 80 && port !== 443
          ? `${base}:${port}/api/submissions/${submission.id}`
          : `${base}/api/submissions/${submission.id}`;
      return reply.status(202).send({
        submissionId: submission.id,
        status: submission.status,
        pollUrl,
      });
    },
  );

  app.get(
    "/submissions/:id",
    {
      onRequest: [authenticate],
      schema: {
        tags: ["submissions"],
        summary: "Get submission status and per-test summary",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", format: "uuid" } },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const uid = userId(req);
      const submission = await prisma.submission.findUnique({
        where: { id },
        include: {
          testResults: {
            include: { testCase: { select: { orderIndex: true, isHidden: true } } },
            orderBy: { testCase: { orderIndex: "asc" } },
          },
        },
      });
      if (!submission) {
        return reply.status(404).send({ error: "Not found" });
      }
      if (submission.userId !== uid && !isAdmin(req)) {
        return reply.status(403).send({ error: "Forbidden" });
      }
      const hideDetails = submission.status !== "completed";
      return reply.send({
        id: submission.id,
        status: submission.status,
        verdict: submission.verdict,
        kind: submission.kind,
        language: submission.language,
        totalTimeMs: submission.totalTimeMs,
        maxMemoryKb: submission.maxMemoryKb,
        judgeMessage: submission.judgeMessage,
        perTest: submission.testResults.map((t) => ({
          testCaseId: t.testCaseId,
          orderIndex: t.testCase.orderIndex,
          passed: t.passed,
          timeMs: t.timeMs,
          isHidden: t.testCase.isHidden,
          ...(hideDetails ? {} : {}),
        })),
      });
    },
  );
}
