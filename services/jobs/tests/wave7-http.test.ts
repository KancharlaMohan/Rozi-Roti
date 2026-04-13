import { describe, expect, it, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "./helpers.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildTestApp();
});

describe("SEO — slug-based lookup (Wave 7b)", () => {
  it("returns 404 for non-existent slug", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/jobs/by-slug/non-existent-job" });
    expect(res.statusCode).toBe(404);
  });

  it("returns 404 for non-existent employer slug", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/employers/by-slug/non-existent" });
    expect(res.statusCode).toBe(404);
  });
});

describe("SEO — sitemap (Wave 7c)", () => {
  it("returns valid XML sitemap", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/seo/sitemap.xml" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/xml");
    expect(res.body).toContain("<?xml version");
    expect(res.body).toContain("<urlset");
  });
});

describe("SEO — robots.txt (Wave 7d)", () => {
  it("returns robots.txt with sitemap reference", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/seo/robots.txt" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("text/plain");
    expect(res.body).toContain("User-agent: *");
    expect(res.body).toContain("Sitemap:");
    expect(res.body).toContain("Disallow: /v1/admin/");
    expect(res.body).toContain("Allow: /v1/jobs");
  });
});
