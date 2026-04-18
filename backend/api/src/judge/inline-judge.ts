/**
 * INLINE JUDGE (Serverless Mode)
 * ------------------------------
 * This is a copy of the stub judge logic that runs INSIDE the API process,
 * eliminating the need for Redis + a separate BullMQ worker.
 *
 * WHY: Vercel serverless functions cannot run persistent background workers.
 * Instead, we run the judge synchronously when a submission is created.
 *
 * HOW: After creating the submission row in Postgres, the API calls this
 * function directly — no queue, no Redis, no worker process needed.
 *
 * TODO for Production: Replace mock logic with real sandbox execution.
 */
import {
  prisma,
  SubmissionKind,
  SubmissionStatus,
  Verdict,
} from "@scee/db";

/**
 * Runs the judge logic inline (synchronously within the API request).
 * Steps:
 * 1. Lock the submission (mark as "running")
 * 2. Fetch relevant test cases
 * 3. Simulate execution (stub — always passes)
 * 4. Atomically update results + leaderboard
 */
export async function runInlineJudge(submissionId: string): Promise<void> {
  // Step 1: Lock — mark submission as "running" to prevent double-processing
  const locked = await prisma.submission.updateMany({
    where: { id: submissionId, status: SubmissionStatus.queued },
    data: { status: SubmissionStatus.running, startedAt: new Date() },
  });

  if (locked.count === 0) {
    // Already processed by another request (race condition guard)
    return;
  }

  const submission = await prisma.submission.findUniqueOrThrow({
    where: { id: submissionId },
  });

  // Step 2: Fetch test cases
  // "run" mode = public tests only, "submit" mode = all tests (including hidden)
  const tests = await prisma.testCase.findMany({
    where: {
      problemId: submission.problemId,
      ...(submission.kind === SubmissionKind.run ? { isHidden: false } : {}),
    },
    orderBy: { orderIndex: "asc" },
  });

  // Step 3: Stub execution — simulates passing all tests
  const perTest = tests.map((t, i) => ({
    testCaseId: t.id,
    passed: true,
    timeMs: 8 + i * 3,
    memoryKb: 4096 + i * 128,
    stdoutPreview: t.expectedOutput.slice(0, 500),
  }));

  const totalTimeMs = perTest.reduce((a, b) => a + b.timeMs, 0);
  const maxMemoryKb = perTest.reduce((a, b) => Math.max(a, b.memoryKb), 0);

  // Step 4: Atomic transaction — update results and leaderboard together
  await prisma.$transaction(async (tx) => {
    // Clear stale results (defensive)
    await tx.submissionTestResult.deleteMany({ where: { submissionId } });

    // Write individual test results
    for (const p of perTest) {
      await tx.submissionTestResult.create({
        data: {
          submissionId,
          testCaseId: p.testCaseId,
          passed: p.passed,
          timeMs: p.timeMs,
          memoryKb: p.memoryKb,
          stdoutPreview: p.stdoutPreview,
        },
      });
    }

    // Mark submission as completed
    await tx.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.completed,
        verdict: Verdict.AC,
        totalTimeMs,
        maxMemoryKb,
        judgeMessage: "Stub judge (serverless mode)",
        finishedAt: new Date(),
      },
    });

    // Update leaderboard for "submit" kind if all tests passed
    const allPassed = perTest.length > 0 && perTest.every((x) => x.passed);
    if (submission.kind === SubmissionKind.submit && allPassed) {
      const prev = await tx.leaderboardEntry.findUnique({
        where: {
          problemId_userId: {
            problemId: submission.problemId,
            userId: submission.userId,
          },
        },
      });
      // Only update if this is a faster solution
      if (!prev || totalTimeMs < prev.bestTimeMs) {
        await tx.leaderboardEntry.upsert({
          where: {
            problemId_userId: {
              problemId: submission.problemId,
              userId: submission.userId,
            },
          },
          create: {
            problemId: submission.problemId,
            userId: submission.userId,
            bestTimeMs: totalTimeMs,
            bestSubmissionId: submissionId,
          },
          update: {
            bestTimeMs: totalTimeMs,
            bestSubmissionId: submissionId,
          },
        });
      }
    }
  });
}
