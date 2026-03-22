import {
  Difficulty,
  PrismaClient,
  Role,
  SubmissionKind,
  SubmissionStatus,
  Verdict,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@local.dev" },
    create: {
      email: "admin@local.dev",
      passwordHash,
      role: Role.admin,
    },
    update: {},
  });

  const problem = await prisma.problem.upsert({
    where: { slug: "two-sum" },
    create: {
      slug: "two-sum",
      title: "Two Sum",
      descriptionMd:
        "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume each input has exactly one solution.",
      difficulty: Difficulty.easy,
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      authorId: admin.id,
      isPublished: true,
      languages: {
        create: [
          {
            language: "python",
            starterCode:
              "def two_sum(nums, target):\n    # return [i, j]\n    pass\n",
          },
          {
            language: "javascript",
            starterCode:
              "function twoSum(nums, target) {\n  // return [i, j];\n}\n",
          },
        ],
      },
      testCases: {
        create: [
          {
            isHidden: false,
            input: JSON.stringify({ nums: [2, 7, 11, 15], target: 9 }),
            expectedOutput: JSON.stringify([0, 1]),
            orderIndex: 0,
          },
          {
            isHidden: true,
            input: JSON.stringify({ nums: [3, 2, 4], target: 6 }),
            expectedOutput: JSON.stringify([1, 2]),
            orderIndex: 1,
          },
        ],
      },
    },
    update: {
      isPublished: true,
    },
  });

  // Demo completed submission (stub judge could have produced this)
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@local.dev" },
    create: { email: "demo@local.dev", passwordHash, role: Role.student },
    update: {},
  });

  await prisma.submission.deleteMany({
    where: { userId: demoUser.id, problemId: problem.id },
  });

  const submission = await prisma.submission.create({
    data: {
      userId: demoUser.id,
      problemId: problem.id,
      language: "python",
      sourceCode: "def two_sum(nums, target):\n    return [0, 1]\n",
      status: SubmissionStatus.completed,
      kind: SubmissionKind.submit,
      verdict: Verdict.AC,
      totalTimeMs: 42,
      maxMemoryKb: 12_288,
      judgeMessage: "Stub seed: all tests passed",
      finishedAt: new Date(),
    },
  });

  const tests = await prisma.testCase.findMany({
    where: { problemId: problem.id },
    orderBy: { orderIndex: "asc" },
  });

  for (const t of tests) {
    await prisma.submissionTestResult.create({
      data: {
        submissionId: submission.id,
        testCaseId: t.id,
        passed: true,
        timeMs: 10,
        memoryKb: 8192,
        stdoutPreview: t.expectedOutput.slice(0, 200),
      },
    });
  }

  await prisma.leaderboardEntry.upsert({
    where: {
      problemId_userId: { problemId: problem.id, userId: demoUser.id },
    },
    create: {
      problemId: problem.id,
      userId: demoUser.id,
      bestTimeMs: 42,
      bestSubmissionId: submission.id,
    },
    update: {
      bestTimeMs: 42,
      bestSubmissionId: submission.id,
    },
  });

  console.log("Seed OK — users: admin@local.dev / demo@local.dev — password: password123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
