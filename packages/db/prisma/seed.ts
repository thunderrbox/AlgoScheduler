/**
 * DATABASE SEEDING
 * ----------------
 * Populates the database with demo users + a rich set of problems.
 * Run: npm run db:seed
 */
import {
  Difficulty,
  PrismaClient,
  Role,
  SubmissionKind,
  SubmissionStatus,
  Verdict,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Starter code templates ────────────────────────────────────────────────────
const problems = [
  {
    slug: "two-sum",
    title: "Two Sum",
    descriptionMd:
      "Given an array of integers `nums` and an integer `target`, return **indices** of the two numbers such that they add up to `target`.\n\nYou may assume each input has exactly one solution, and you may not use the same element twice.\n\n**Example:**\n```\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\n```",
    difficulty: Difficulty.easy,
    languages: [
      {
        language: "python",
        starterCode: "def two_sum(nums, target):\n    # return [i, j]\n    pass\n",
      },
      {
        language: "javascript",
        starterCode:
          "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n  // return [i, j];\n}\n",
      },
      {
        language: "cpp",
        starterCode:
          "#include <vector>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    // return {i, j};\n    return {};\n}\n",
      },
    ],
    testCases: [
      { isHidden: false, input: JSON.stringify({ nums: [2, 7, 11, 15], target: 9 }), expectedOutput: JSON.stringify([0, 1]), orderIndex: 0 },
      { isHidden: false, input: JSON.stringify({ nums: [3, 2, 4], target: 6 }), expectedOutput: JSON.stringify([1, 2]), orderIndex: 1 },
      { isHidden: true,  input: JSON.stringify({ nums: [3, 3], target: 6 }), expectedOutput: JSON.stringify([0, 1]), orderIndex: 2 },
    ],
  },
  {
    slug: "reverse-string",
    title: "Reverse String",
    descriptionMd:
      "Write a function that reverses a string. Return the reversed string.\n\n**Example:**\n```\nInput: s = \"hello\"\nOutput: \"olleh\"\n```",
    difficulty: Difficulty.easy,
    languages: [
      { language: "python", starterCode: "def reverse_string(s: str) -> str:\n    pass\n" },
      { language: "javascript", starterCode: "function reverseString(s) {\n  // return reversed string\n}\n" },
      { language: "cpp", starterCode: "#include <string>\nusing namespace std;\n\nstring reverseString(string s) {\n    return \"\";\n}\n" },
    ],
    testCases: [
      { isHidden: false, input: JSON.stringify({ s: "hello" }), expectedOutput: JSON.stringify("olleh"), orderIndex: 0 },
      { isHidden: false, input: JSON.stringify({ s: "Hannah" }), expectedOutput: JSON.stringify("hannaH"), orderIndex: 1 },
      { isHidden: true,  input: JSON.stringify({ s: "abcde" }), expectedOutput: JSON.stringify("edcba"), orderIndex: 2 },
    ],
  },
  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    descriptionMd:
      "Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n- Open brackets must be closed by the same type of brackets.\n- Open brackets must be closed in the correct order.\n\n**Example:**\n```\nInput: s = \"()[]{}\"\nOutput: true\n\nInput: s = \"(]\"\nOutput: false\n```",
    difficulty: Difficulty.easy,
    languages: [
      { language: "python", starterCode: "def is_valid(s: str) -> bool:\n    pass\n" },
      { language: "javascript", starterCode: "function isValid(s) {\n  // return true or false\n}\n" },
      { language: "cpp", starterCode: "#include <string>\nusing namespace std;\n\nbool isValid(string s) {\n    return false;\n}\n" },
    ],
    testCases: [
      { isHidden: false, input: JSON.stringify({ s: "()" }), expectedOutput: JSON.stringify(true), orderIndex: 0 },
      { isHidden: false, input: JSON.stringify({ s: "()[]{}" }), expectedOutput: JSON.stringify(true), orderIndex: 1 },
      { isHidden: false, input: JSON.stringify({ s: "(]" }), expectedOutput: JSON.stringify(false), orderIndex: 2 },
      { isHidden: true,  input: JSON.stringify({ s: "([)]" }), expectedOutput: JSON.stringify(false), orderIndex: 3 },
      { isHidden: true,  input: JSON.stringify({ s: "{[]}" }), expectedOutput: JSON.stringify(true), orderIndex: 4 },
    ],
  },
  {
    slug: "palindrome-number",
    title: "Palindrome Number",
    descriptionMd:
      "Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.\n\nAn integer is a palindrome when it reads the same forward and backward.\n\n**Example:**\n```\nInput: x = 121 → Output: true\nInput: x = -121 → Output: false\nInput: x = 10 → Output: false\n```",
    difficulty: Difficulty.easy,
    languages: [
      { language: "python", starterCode: "def is_palindrome(x: int) -> bool:\n    pass\n" },
      { language: "javascript", starterCode: "function isPalindrome(x) {\n  // return true or false\n}\n" },
      { language: "cpp", starterCode: "bool isPalindrome(int x) {\n    return false;\n}\n" },
    ],
    testCases: [
      { isHidden: false, input: JSON.stringify({ x: 121 }),  expectedOutput: JSON.stringify(true),  orderIndex: 0 },
      { isHidden: false, input: JSON.stringify({ x: -121 }), expectedOutput: JSON.stringify(false), orderIndex: 1 },
      { isHidden: false, input: JSON.stringify({ x: 10 }),   expectedOutput: JSON.stringify(false), orderIndex: 2 },
      { isHidden: true,  input: JSON.stringify({ x: 0 }),    expectedOutput: JSON.stringify(true),  orderIndex: 3 },
      { isHidden: true,  input: JSON.stringify({ x: 12321 }),expectedOutput: JSON.stringify(true),  orderIndex: 4 },
    ],
  },
  {
    slug: "maximum-subarray",
    title: "Maximum Subarray",
    descriptionMd:
      "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\nThis is the classic **Kadane's Algorithm** problem.\n\n**Example:**\n```\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6   (subarray [4,-1,2,1])\n```",
    difficulty: Difficulty.medium,
    languages: [
      { language: "python", starterCode: "def max_sub_array(nums: list[int]) -> int:\n    pass\n" },
      { language: "javascript", starterCode: "function maxSubArray(nums) {\n  // return number\n}\n" },
      { language: "cpp", starterCode: "#include <vector>\nusing namespace std;\n\nint maxSubArray(vector<int>& nums) {\n    return 0;\n}\n" },
    ],
    testCases: [
      { isHidden: false, input: JSON.stringify({ nums: [-2,1,-3,4,-1,2,1,-5,4] }), expectedOutput: JSON.stringify(6), orderIndex: 0 },
      { isHidden: false, input: JSON.stringify({ nums: [1] }),                      expectedOutput: JSON.stringify(1), orderIndex: 1 },
      { isHidden: false, input: JSON.stringify({ nums: [5,4,-1,7,8] }),             expectedOutput: JSON.stringify(23),orderIndex: 2 },
      { isHidden: true,  input: JSON.stringify({ nums: [-1,-2,-3] }),               expectedOutput: JSON.stringify(-1),orderIndex: 3 },
    ],
  },
  {
    slug: "climbing-stairs",
    title: "Climbing Stairs",
    descriptionMd:
      "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?\n\n**Example:**\n```\nInput: n = 2 → Output: 2  (1+1, 2)\nInput: n = 3 → Output: 3  (1+1+1, 1+2, 2+1)\n```",
    difficulty: Difficulty.easy,
    languages: [
      { language: "python", starterCode: "def climb_stairs(n: int) -> int:\n    pass\n" },
      { language: "javascript", starterCode: "function climbStairs(n) {\n  // return number of ways\n}\n" },
      { language: "cpp", starterCode: "int climbStairs(int n) {\n    return 0;\n}\n" },
    ],
    testCases: [
      { isHidden: false, input: JSON.stringify({ n: 2 }),  expectedOutput: JSON.stringify(2), orderIndex: 0 },
      { isHidden: false, input: JSON.stringify({ n: 3 }),  expectedOutput: JSON.stringify(3), orderIndex: 1 },
      { isHidden: true,  input: JSON.stringify({ n: 5 }),  expectedOutput: JSON.stringify(8), orderIndex: 2 },
      { isHidden: true,  input: JSON.stringify({ n: 10 }), expectedOutput: JSON.stringify(89),orderIndex: 3 },
    ],
  },
  {
    slug: "best-time-to-buy-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    descriptionMd:
      "You are given an array `prices` where `prices[i]` is the price of a given stock on the `i`th day.\n\nYou want to maximize your profit by choosing a **single day to buy** and a **different day in the future to sell**.\n\nReturn the maximum profit you can achieve. If you cannot achieve any profit, return `0`.\n\n**Example:**\n```\nInput: prices = [7,1,5,3,6,4]\nOutput: 5  (buy at 1, sell at 6)\n```",
    difficulty: Difficulty.easy,
    languages: [
      { language: "python", starterCode: "def max_profit(prices: list[int]) -> int:\n    pass\n" },
      { language: "javascript", starterCode: "function maxProfit(prices) {\n  // return max profit\n}\n" },
      { language: "cpp", starterCode: "#include <vector>\nusing namespace std;\n\nint maxProfit(vector<int>& prices) {\n    return 0;\n}\n" },
    ],
    testCases: [
      { isHidden: false, input: JSON.stringify({ prices: [7,1,5,3,6,4] }), expectedOutput: JSON.stringify(5), orderIndex: 0 },
      { isHidden: false, input: JSON.stringify({ prices: [7,6,4,3,1] }),   expectedOutput: JSON.stringify(0), orderIndex: 1 },
      { isHidden: true,  input: JSON.stringify({ prices: [1,2] }),         expectedOutput: JSON.stringify(1), orderIndex: 2 },
      { isHidden: true,  input: JSON.stringify({ prices: [2,4,1] }),       expectedOutput: JSON.stringify(2), orderIndex: 3 },
    ],
  },
  {
    slug: "contains-duplicate",
    title: "Contains Duplicate",
    descriptionMd:
      "Given an integer array `nums`, return `true` if any value appears **at least twice** in the array, and return `false` if every element is distinct.\n\n**Example:**\n```\nInput: nums = [1,2,3,1] → Output: true\nInput: nums = [1,2,3,4] → Output: false\n```",
    difficulty: Difficulty.easy,
    languages: [
      { language: "python", starterCode: "def contains_duplicate(nums: list[int]) -> bool:\n    pass\n" },
      { language: "javascript", starterCode: "function containsDuplicate(nums) {\n  // return true or false\n}\n" },
      { language: "cpp", starterCode: "#include <vector>\nusing namespace std;\n\nbool containsDuplicate(vector<int>& nums) {\n    return false;\n}\n" },
    ],
    testCases: [
      { isHidden: false, input: JSON.stringify({ nums: [1,2,3,1] }),    expectedOutput: JSON.stringify(true),  orderIndex: 0 },
      { isHidden: false, input: JSON.stringify({ nums: [1,2,3,4] }),    expectedOutput: JSON.stringify(false), orderIndex: 1 },
      { isHidden: false, input: JSON.stringify({ nums: [1,1,1,3,3,4,3,2,4,2] }), expectedOutput: JSON.stringify(true), orderIndex: 2 },
      { isHidden: true,  input: JSON.stringify({ nums: [1] }),          expectedOutput: JSON.stringify(false), orderIndex: 3 },
    ],
  },
  {
    slug: "merge-intervals",
    title: "Merge Intervals",
    descriptionMd:
      "Given an array of `intervals` where `intervals[i] = [starti, endi]`, merge all overlapping intervals, and return an array of **non-overlapping intervals** that cover all the intervals in the input.\n\n**Example:**\n```\nInput: intervals = [[1,3],[2,6],[8,10],[15,18]]\nOutput: [[1,6],[8,10],[15,18]]\n```",
    difficulty: Difficulty.medium,
    languages: [
      { language: "python", starterCode: "def merge(intervals: list[list[int]]) -> list[list[int]]:\n    pass\n" },
      { language: "javascript", starterCode: "function merge(intervals) {\n  // return merged intervals array\n}\n" },
      { language: "cpp", starterCode: "#include <vector>\n#include <algorithm>\nusing namespace std;\n\nvector<vector<int>> merge(vector<vector<int>>& intervals) {\n    return {};\n}\n" },
    ],
    testCases: [
      { isHidden: false, input: JSON.stringify({ intervals: [[1,3],[2,6],[8,10],[15,18]] }), expectedOutput: JSON.stringify([[1,6],[8,10],[15,18]]), orderIndex: 0 },
      { isHidden: false, input: JSON.stringify({ intervals: [[1,4],[4,5]] }),                expectedOutput: JSON.stringify([[1,5]]),              orderIndex: 1 },
      { isHidden: true,  input: JSON.stringify({ intervals: [[1,4],[0,4]] }),                expectedOutput: JSON.stringify([[0,4]]),              orderIndex: 2 },
      { isHidden: true,  input: JSON.stringify({ intervals: [[1,4],[2,3]] }),                expectedOutput: JSON.stringify([[1,4]]),              orderIndex: 3 },
    ],
  },
  {
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    descriptionMd:
      "Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.\n\n**Example:**\n```\nInput: height = [0,1,0,2,1,0,1,3,2,1,2,1]\nOutput: 6\n```\n\nThis classic problem tests your understanding of two-pointer technique and dynamic programming.",
    difficulty: Difficulty.hard,
    languages: [
      { language: "python", starterCode: "def trap(height: list[int]) -> int:\n    pass\n" },
      { language: "javascript", starterCode: "function trap(height) {\n  // return amount of water trapped\n}\n" },
      { language: "cpp", starterCode: "#include <vector>\nusing namespace std;\n\nint trap(vector<int>& height) {\n    return 0;\n}\n" },
    ],
    testCases: [
      { isHidden: false, input: JSON.stringify({ height: [0,1,0,2,1,0,1,3,2,1,2,1] }), expectedOutput: JSON.stringify(6), orderIndex: 0 },
      { isHidden: false, input: JSON.stringify({ height: [4,2,0,3,2,5] }),             expectedOutput: JSON.stringify(9), orderIndex: 1 },
      { isHidden: true,  input: JSON.stringify({ height: [3,0,2,0,4] }),               expectedOutput: JSON.stringify(7), orderIndex: 2 },
      { isHidden: true,  input: JSON.stringify({ height: [1,0,1] }),                   expectedOutput: JSON.stringify(1), orderIndex: 3 },
    ],
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────
async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@local.dev" },
    create: { email: "admin@local.dev", passwordHash, role: Role.admin },
    update: {},
  });

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@local.dev" },
    create: { email: "demo@local.dev", passwordHash, role: Role.student },
    update: {},
  });

  for (const p of problems) {
    // Upsert the problem itself
    const problem = await prisma.problem.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        title: p.title,
        descriptionMd: p.descriptionMd,
        difficulty: p.difficulty,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        authorId: admin.id,
        isPublished: true,
      },
      update: {
        title: p.title,
        descriptionMd: p.descriptionMd,
        difficulty: p.difficulty,
        isPublished: true,
      },
    });

    // Upsert language starters
    for (const lang of p.languages) {
      await prisma.problemLanguage.upsert({
        where: { problemId_language: { problemId: problem.id, language: lang.language } },
        create: { problemId: problem.id, language: lang.language, starterCode: lang.starterCode },
        update: { starterCode: lang.starterCode },
      });
    }

    // Delete existing test cases and recreate (simpler than upsert for ordered items)
    const existingTests = await prisma.testCase.findMany({ where: { problemId: problem.id } });
    if (existingTests.length === 0) {
      await prisma.testCase.createMany({
        data: p.testCases.map((t) => ({ ...t, problemId: problem.id })),
      });
    }
  }

  // Demo submission for Two Sum (so leaderboard has data)
  const twoSumProblem = await prisma.problem.findUnique({ where: { slug: "two-sum" } });
  if (twoSumProblem) {
    await prisma.submission.deleteMany({
      where: { userId: demoUser.id, problemId: twoSumProblem.id },
    });

    const submission = await prisma.submission.create({
      data: {
        userId: demoUser.id,
        problemId: twoSumProblem.id,
        language: "python",
        sourceCode: "def two_sum(nums, target):\n    seen = {}\n    for i, v in enumerate(nums):\n        if target - v in seen:\n            return [seen[target - v], i]\n        seen[v] = i\n",
        status: SubmissionStatus.completed,
        kind: SubmissionKind.submit,
        verdict: Verdict.AC,
        totalTimeMs: 18,
        maxMemoryKb: 8192,
        judgeMessage: "All tests passed",
        finishedAt: new Date(),
      },
    });

    const tests = await prisma.testCase.findMany({
      where: { problemId: twoSumProblem.id },
      orderBy: { orderIndex: "asc" },
    });

    for (const t of tests) {
      await prisma.submissionTestResult.create({
        data: {
          submissionId: submission.id,
          testCaseId: t.id,
          passed: true,
          timeMs: 6,
          memoryKb: 8192,
          stdoutPreview: t.expectedOutput,
        },
      });
    }

    await prisma.leaderboardEntry.upsert({
      where: { problemId_userId: { problemId: twoSumProblem.id, userId: demoUser.id } },
      create: { problemId: twoSumProblem.id, userId: demoUser.id, bestTimeMs: 18, bestSubmissionId: submission.id },
      update: { bestTimeMs: 18, bestSubmissionId: submission.id },
    });
  }

  console.log(`✅ Seeded ${problems.length} problems — accounts: admin@local.dev / demo@local.dev (password: password123)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
