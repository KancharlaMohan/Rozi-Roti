import { describe, expect, it } from "vitest";
import { buildTestApp } from "./helpers.js";

describe("GET /health", () => {
  it("returns ok", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("ok");
    expect(body.service).toBe("jobs");
  });
});
