/**
 * BACKGROUND JOB — “judge” implementation (worker)
 * --------------------------------------------------
 * Called by `backend/worker` when a submission job runs. Reads/writes Postgres via @scee/db .
 * MVP stub: marks tests passed without running Docker. Replace with sandboxed execution.
 */
import {
  prisma,
  SubmissionKind,
  SubmissionStatus,
  Verdict,
} from "@scee/db";

/**
 * MVP stub: marks all selected tests as passed and updates leaderboard on AC submit.
 * Replace with Docker-backed runner + real stdout vs expected comparison.
 */
export async function runStubJudge(submissionId: string): Promise<void> {
  const locked = await prisma.submission.updateMany({
    where: { id: submissionId, status: SubmissionStatus.queued },
    data: { status: SubmissionStatus.running, startedAt: new Date() },
  });

  if (locked.count === 0) {
    const existing = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { status: true },
    });
    if (!existing || existing.status === SubmissionStatus.completed) {
      return;
    }
    return;
  }

  const submission = await prisma.submission.findUniqueOrThrow({
    where: { id: submissionId },
  });

  const tests = await prisma.testCase.findMany({
    where: {
      problemId: submission.problemId,
      ...(submission.kind === SubmissionKind.run ? { isHidden: false } : {}),
    },
    orderBy: { orderIndex: "asc" },
  });

  const perTest = tests.map((t, i) => ({
    testCaseId: t.id,
    passed: true,
    timeMs: 8 + i * 3,
    memoryKb: 4096 + i * 128,
    stdoutPreview: t.expectedOutput.slice(0, 500),
  }));

  const totalTimeMs = perTest.reduce((a, b) => a + b.timeMs, 0);
  const maxMemoryKb = perTest.reduce((a, b) => Math.max(a, b.memoryKb), 0);

  await prisma.$transaction(async (tx) => {
    await tx.submissionTestResult.deleteMany({ where: { submissionId } });

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
