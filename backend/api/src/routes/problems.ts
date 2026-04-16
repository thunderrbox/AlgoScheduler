/**
 * PROBLEM CATALOG ROUTES
 * ----------------------
 * Responsible for serving the "Core Product" content:
 * 1. GET /problems - Paginated list of all published coding challenges.
 * 2. GET /problems/:slug - Detailed metadata for a single problem, including starter code.
 * 3. GET /problems/:slug/leaderboard - Ranking of the fastest solutions per user.
 * 
 * Note: These routes are public (no authentication required) to allow SEO indexing 
 * and guest browsing of the catalog.
 */
import type { FastifyInstance } from "fastify";
import { prisma } from "@scee/db";

export async function problemRoutes(app: FastifyInstance): Promise<void> {
  /**
   * List Problems: Returns high-level metadata (ID, title, difficulty) for display in a table.
   */
  app.get(
    "/problems",
    {
      schema: {
        tags: ["problems"],
        summary: "List published problems",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            pageSize: { type: "integer", minimum: 1, maximum: 50, default: 20 },
          },
        },
      },
    },
    async (req) => {
      const q = req.query as { page?: number; pageSize?: number };
      const page = q.page ?? 1;
      const pageSize = q.pageSize ?? 20;
      const where = { isPublished: true };
      
      const [total, rows] = await Promise.all([
        prisma.problem.count({ where }),
        prisma.problem.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            slug: true,
            title: true,
            difficulty: true,
            timeLimitMs: true,
            memoryLimitMb: true,
          },
        }),
      ]);
      return { items: rows, total };
    },
  );

  /**
   * Get Problem Details: Returns full description, test counts, and language-specific boilerplates.
   * ⚠️ Hidden tests are NEVER returned to the client to prevent cheating.
   */
  app.get(
    "/problems/:slug",
    {
      schema: {
        tags: ["problems"],
        summary: "Get problem details by unique slug",
        params: {
          type: "object",
          required: ["slug"],
          properties: { slug: { type: "string" } },
        },
      },
    },
    async (req, reply) => {
      const { slug } = req.params as { slug: string };
      const problem = await prisma.problem.findFirst({
        where: { slug, isPublished: true },
        include: {
          languages: true,
          testCases: { where: { isHidden: false }, select: { id: true } },
        },
      });

      if (!problem) {
        return reply.status(404).send({ error: "Problem not found" });
      }

      return {
        id: problem.id,
        slug: problem.slug,
        title: problem.title,
        descriptionMd: problem.descriptionMd,
        difficulty: problem.difficulty,
        timeLimitMs: problem.timeLimitMs,
        memoryLimitMb: problem.memoryLimitMb,
        languages: problem.languages.map((l) => ({
          language: l.language,
          starterCode: l.starterCode,
        })),
        publicSampleCount: problem.testCases.length,
      };
    },
  );

  /**
   * Problem Leaderboard: Aggregates the fastest (TimeMs) accepted submissions for this challenge.
   */
  app.get(
    "/problems/:slug/leaderboard",
    {
      schema: {
        tags: ["problems"],
        summary: "View fastest solutions for a challenge",
        params: {
          type: "object",
          required: ["slug"],
          properties: { slug: { type: "string" } },
        },
        querystring: {
          type: "object",
          properties: { limit: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
        },
      },
    },
    async (req, reply) => {
      const { slug } = req.params as { slug: string };
      const q = req.query as { limit?: number };
      const limit = q.limit ?? 50;

      const problem = await prisma.problem.findFirst({
        where: { slug, isPublished: true },
        select: { id: true },
      });

      if (!problem) {
        return reply.status(404).send({ error: "Problem not found" });
      }

      const rows = await prisma.leaderboardEntry.findMany({
        where: { problemId: problem.id },
        orderBy: { bestTimeMs: "asc" },
        take: limit,
        include: { user: { select: { email: true } } },
      });

      return {
        problemId: problem.id,
        entries: rows.map((r, i) => ({
          rank: i + 1,
          userId: r.userId,
          email: r.user.email,
          bestTimeMs: r.bestTimeMs,
          bestSubmissionId: r.bestSubmissionId,
        })),
      };
    },
  );
}

