/**
 * BACKEND — judge worker (BullMQ Consumer)
 * ----------------------------------------
 * This service is responsible for the actual evaluation of user code.
 * It is NOT an HTTP server; instead, it subscribes to the "judge" queue in Redis.
 * 
 * Responsibilities:
 * 1. Pick up a job containing a 'submissionId'.
 * 2. Execute the judge logic (currently a stub, ready for sandbox integration).
 * 3. Update the Submission status and verdict in Postgres.
 * 4. Record individual test results for the user to view.
 */
import { Worker } from "bullmq";
import { JUDGE_QUEUE_NAME } from "@scee/shared";
import { prisma, SubmissionStatus } from "@scee/db";
import { env } from "./env.js";
import { runStubJudge } from "./judge/stub-judge.js";


const connection = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
} as const;

const worker = new Worker(
  JUDGE_QUEUE_NAME,
  async (job) => {
    const { submissionId } = job.data as { submissionId: string };
    try {
      await runStubJudge(submissionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.submission.updateMany({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.failed,
          judgeMessage: message.slice(0, 2000),
          finishedAt: new Date(),
        },
      });
      throw err;
    }
  },
  { connection, concurrency: 2 },
);

worker.on("completed", (job) => {
  console.log(`[judge] completed ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`[judge] failed ${job?.id}`, err);
});

console.log(`Judge worker listening on queue "${JUDGE_QUEUE_NAME}"`);
