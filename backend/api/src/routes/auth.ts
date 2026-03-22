/** BACKEND — register / login / refresh / logout (JWT + refresh tokens in DB). */
import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { prisma, Role } from "@scee/db";
import {
  loginBodySchema,
  registerBodySchema,
} from "@scee/shared";
import { hashToken, newRefreshToken } from "../lib/tokens.js";

const ACCESS_TTL_SEC = 15 * 60;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/auth/register",
    {
      schema: {
        tags: ["auth"],
        summary: "Register student account",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
          },
        },
      },
    },
    async (req, reply) => {
      const parsed = registerBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }
      const { email, password } = parsed.data;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.status(409).send({ error: "Email already registered" });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, passwordHash, role: Role.student },
      });
      const accessToken = req.server.jwt.sign(
        { sub: user.id, role: user.role },
        { expiresIn: ACCESS_TTL_SEC },
      );
      const refreshRaw = newRefreshToken();
      const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(refreshRaw),
          expiresAt,
        },
      });
      return reply.status(201).send({
        accessToken,
        refreshToken: refreshRaw,
        expiresIn: ACCESS_TTL_SEC,
        user: { id: user.id, email: user.email, role: user.role },
      });
    },
  );

  app.post(
    "/auth/login",
    {
      schema: {
        tags: ["auth"],
        summary: "Login",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string" },
            password: { type: "string" },
          },
        },
      },
    },
    async (req, reply) => {
      const parsed = loginBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }
      const { email, password } = parsed.data;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }
      const accessToken = req.server.jwt.sign(
        { sub: user.id, role: user.role },
        { expiresIn: ACCESS_TTL_SEC },
      );
      const refreshRaw = newRefreshToken();
      const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(refreshRaw),
          expiresAt,
        },
      });
      return reply.send({
        accessToken,
        refreshToken: refreshRaw,
        expiresIn: ACCESS_TTL_SEC,
        user: { id: user.id, email: user.email, role: user.role },
      });
    },
  );

  app.post(
    "/auth/refresh",
    {
      schema: {
        tags: ["auth"],
        summary: "Rotate refresh token and issue new access token",
        body: {
          type: "object",
          required: ["refreshToken"],
          properties: { refreshToken: { type: "string" } },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as { refreshToken?: string };
      if (!body?.refreshToken) {
        return reply.status(400).send({ error: "refreshToken required" });
      }
      const tokenHash = hashToken(body.refreshToken);
      const row = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });
      if (!row || row.revokedAt || row.expiresAt < new Date()) {
        return reply.status(401).send({ error: "Invalid refresh token" });
      }
      await prisma.refreshToken.update({
        where: { id: row.id },
        data: { revokedAt: new Date() },
      });
      const newRaw = newRefreshToken();
      const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
      await prisma.refreshToken.create({
        data: {
          userId: row.userId,
          tokenHash: hashToken(newRaw),
          expiresAt,
        },
      });
      const accessToken = req.server.jwt.sign(
        { sub: row.user.id, role: row.user.role },
        { expiresIn: ACCESS_TTL_SEC },
      );
      return reply.send({
        accessToken,
        refreshToken: newRaw,
        expiresIn: ACCESS_TTL_SEC,
      });
    },
  );

  app.post(
    "/auth/logout",
    {
      schema: {
        tags: ["auth"],
        summary: "Revoke a refresh token",
        body: {
          type: "object",
          required: ["refreshToken"],
          properties: { refreshToken: { type: "string" } },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as { refreshToken?: string };
      if (!body?.refreshToken) {
        return reply.status(400).send({ error: "refreshToken required" });
      }
      const tokenHash = hashToken(body.refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return reply.status(204).send();
    },
  );
}
