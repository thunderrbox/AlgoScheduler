/**
 * BACKGROUND JOB — “judge” implementation (worker)
 * --------------------------------------------------
 * This module is the core execution logic for the judge worker. 
 * Currently, it implements the "Stub Judge" pattern — it simulateously 
 * marks test cases as passing to verify the system's end-to-end connectivity.
 * 
 * TODO for Production:
 * 1. Integrate with a sandbox (e.g., Isolate, Docker-in-Docker).
 * 2. Implement resource limits (CPU, RAM, Time).
 * 3. Securely handle user-submitted code in an ephemeral environment.
 */
import {
  prisma,
  SubmissionKind,
  SubmissionStatus,
  Verdict,
} from "@scee/db";

/**
 * Execution Engine:
 * 1. Locks the submission in Postgres (Running state).
 * 2. Fetches relevant test cases (Public-only for 'Run', all for 'Submit').
 * 3. Simulates code execution results.
 * 4. Atomically updates the database with results and leaderboard entry.
 */
export async function runStubJudge(submissionId: string): Promise<void> {
  // Step 1: Transactional Lock (ensure no other worker is processing this)
  const locked = await prisma.submission.updateMany({
    where: { id: submissionId, status: SubmissionStatus.queued },
    data: { status: SubmissionStatus.running, startedAt: new Date() },
  });

  if (locked.count === 0) {
    // Already in progress or finished
    return;
  }

  const submission = await prisma.submission.findUniqueOrThrow({
    where: { id: submissionId },
  });

  // Step 2: Fetch Test Cases
  // For 'submit' kind, we include hidden tests. For 'run', we only use public samples.
  const tests = await prisma.testCase.findMany({
    where: {
      problemId: submission.problemId,
      ...(submission.kind === SubmissionKind.run ? { isHidden: false } : {}),
    },
    orderBy: { orderIndex: "asc" },
  });

  // Step 3: Mock Execution Logic (Stub)
  const perTest = tests.map((t, i) => ({
    testCaseId: t.id,
    passed: true,
    timeMs: 8 + i * 3,
    memoryKb: 4096 + i * 128,
    stdoutPreview: t.expectedOutput.slice(0, 500),
  }));

  const totalTimeMs = perTest.reduce((a, b) => a + b.timeMs, 0);
  const maxMemoryKb = perTest.reduce((a, b) => Math.max(a, b.memoryKb), 0);

  // Step 4: Atomic Update
  // We use a transaction to ensure results and leaderboard are synchronized.
  await prisma.$transaction(async (tx) => {
    // Clear any stale results (defensive)
    await tx.submissionTestResult.deleteMany({ where: { submissionId } });

    // Store individual test results
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

    // Mark submission as Completed
    await tx.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.completed,
        verdict: Verdict.AC,
        totalTimeMs,
        maxMemoryKb,
        judgeMessage: "Stub judge: replace with sandboxed execution",
        finishedAt: new Date(),
      },
    });

    // Step 5: Leaderboard Update
    // Only update leaderboard for 'submit' kinds that pass all tests.
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
      // Update only if this run is faster than the previous best
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

