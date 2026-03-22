/**
 * BACKEND — BullMQ producer (API side)
 * ------------------------------------
 * Pushes judge jobs to Redis when a user submits code. Queue is created lazily on first enqueue
 * so OpenAPI generation does not need Redis. Consumer: `backend/worker` .
 */
import { Queue } from "bullmq";
import { JUDGE_QUEUE_NAME } from "@scee/shared";
import { env } from "../env.js";

const connection = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
} as const;

let judgeQueue: Queue | null = null;

function getJudgeQueue(): Queue {
  if (!judgeQueue) {
    judgeQueue = new Queue(JUDGE_QUEUE_NAME, { connection });
  }
  return judgeQueue;
}

export async function enqueueJudgeJob(submissionId: string): Promise<void> {
  await getJudgeQueue().add(
    "evaluate",
    { submissionId },
    {
      jobId: submissionId,
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    },
  );
}
