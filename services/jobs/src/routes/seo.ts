import { SeoMetadataPublicSchema } from "@jobs/contracts";
import type { FastifyInstance } from "fastify";
import type { BuildJobsAppInput } from "../build-app.js";
import { errorReply, jobRowToPublic } from "./_shared.js";

/** Generate a URL-safe slug from a string. Region-agnostic — no locale assumptions. */
function toSlug(text: string, suffix?: string): string {
  let slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");
  if (suffix) slug += `-${suffix}`;
  return slug;
}

export function registerSeoRoutes(
  app: FastifyInstance,
  input: BuildJobsAppInput,
): void {
  /* --- SEO-friendly job detail by slug --- */
  app.get("/v1/jobs/by-slug/:slug", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const seo = await input.seo.findBySlug(slug);
    if (!seo || seo.entityType !== "job") {
      return errorReply(reply, 404, "not_found", "Job not found.", req.id);
    }
    const job = await input.jobs.findById(seo.entityId);
    if (!job || (job.status !== "published" && job.status !== "closed")) {
      return errorReply(reply, 404, "not_found", "Job not found.", req.id);
    }
    const body = jobRowToPublic(job);
    // Add canonical URL header
    reply.header("Link", `</v1/jobs/by-slug/${slug}>; rel="canonical"`);
    return reply.send({ ...body, seoMetadata: SeoMetadataPublicSchema.parse(seo) });
  });

  /* --- SEO-friendly employer page by slug --- */
  app.get("/v1/employers/by-slug/:slug", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const seo = await input.seo.findBySlug(slug);
    if (!seo || seo.entityType !== "employer") {
      return errorReply(reply, 404, "not_found", "Employer not found.", req.id);
    }
    const employer = await input.employers.findById(seo.entityId);
    if (!employer) {
      return errorReply(reply, 404, "not_found", "Employer not found.", req.id);
    }
    reply.header("Link", `</v1/employers/by-slug/${slug}>; rel="canonical"`);
    return reply.send({
      id: employer.id,
      companyName: employer.companyName,
      description: employer.description,
      website: employer.website,
      industry: employer.industry,
      companySize: employer.companySize,
      seoMetadata: SeoMetadataPublicSchema.parse(seo),
    });
  });

  /* --- Dynamic XML sitemap --- */
  app.get("/v1/seo/sitemap.xml", async (_req, reply) => {
    const { slugs: jobSlugs } = await input.seo.listSlugs("job", 50000, 0);
    const { slugs: employerSlugs } = await input.seo.listSlugs("employer", 50000, 0);

    const baseUrl = input.env.BASE_URL ?? "https://jobs.example.com";
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const slug of jobSlugs) {
      xml += `  <url><loc>${baseUrl}/v1/jobs/by-slug/${slug}</loc></url>\n`;
    }
    for (const slug of employerSlugs) {
      xml += `  <url><loc>${baseUrl}/v1/employers/by-slug/${slug}</loc></url>\n`;
    }

    xml += `</urlset>`;
    reply.header("Content-Type", "application/xml");
    return reply.send(xml);
  });

  /* --- Robots.txt --- */
  app.get("/v1/seo/robots.txt", async (_req, reply) => {
    const baseUrl = input.env.BASE_URL ?? "https://jobs.example.com";
    const robots = [
      "User-agent: *",
      "Allow: /v1/jobs",
      "Allow: /v1/jobs/by-slug/",
      "Allow: /v1/employers/by-slug/",
      "Disallow: /v1/admin/",
      "Disallow: /v1/candidates/",
      `Sitemap: ${baseUrl}/v1/seo/sitemap.xml`,
    ].join("\n");
    reply.header("Content-Type", "text/plain");
    return reply.send(robots);
  });
}
