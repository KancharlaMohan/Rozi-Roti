import { describe, expect, it, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, authHeader, SUBJECT_B } from "./helpers.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildTestApp();
});

async function createProfile() {
  await app.inject({
    method: "POST",
    url: "/v1/candidates/profile",
    headers: authHeader(SUBJECT_B),
    payload: { coreSubjectId: SUBJECT_B, displayName: "Jane Doe" },
  });
}

describe("Skills", () => {
  it("adds a skill", async () => {
    await createProfile();
    const res = await app.inject({
      method: "POST",
      url: "/v1/candidates/skills",
      headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, skillName: "TypeScript", proficiency: "advanced" },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.skillName).toBe("TypeScript");
    expect(body.proficiency).toBe("advanced");
    expect(body.coreSubjectId).toBe(SUBJECT_B);
  });

  it("lists skills", async () => {
    await createProfile();
    await app.inject({
      method: "POST", url: "/v1/candidates/skills", headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, skillName: "TypeScript", proficiency: "advanced" },
    });
    await app.inject({
      method: "POST", url: "/v1/candidates/skills", headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, skillName: "Node.js", proficiency: "expert" },
    });
    const res = await app.inject({ method: "GET", url: "/v1/candidates/skills", headers: authHeader(SUBJECT_B) });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).skills.length).toBe(2);
  });

  it("removes a skill", async () => {
    await createProfile();
    const addRes = await app.inject({
      method: "POST", url: "/v1/candidates/skills", headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, skillName: "TypeScript", proficiency: "advanced" },
    });
    const skillId = JSON.parse(addRes.body).id;
    const delRes = await app.inject({ method: "DELETE", url: `/v1/candidates/skills/${skillId}`, headers: authHeader(SUBJECT_B) });
    expect(delRes.statusCode).toBe(200);
    const listRes = await app.inject({ method: "GET", url: "/v1/candidates/skills", headers: authHeader(SUBJECT_B) });
    expect(JSON.parse(listRes.body).skills.length).toBe(0);
  });

  it("requires profile before adding skill", async () => {
    const res = await app.inject({
      method: "POST", url: "/v1/candidates/skills", headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, skillName: "TypeScript", proficiency: "advanced" },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe("profile_required");
  });
});

describe("Experience", () => {
  it("adds and lists experience entries", async () => {
    await createProfile();
    const addRes = await app.inject({
      method: "POST", url: "/v1/candidates/experience", headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, title: "Engineer", company: "Acme", startDate: "2020-01" },
    });
    expect(addRes.statusCode).toBe(201);
    expect(JSON.parse(addRes.body).title).toBe("Engineer");

    const listRes = await app.inject({ method: "GET", url: "/v1/candidates/experience", headers: authHeader(SUBJECT_B) });
    expect(JSON.parse(listRes.body).entries.length).toBe(1);
  });

  it("updates an experience entry", async () => {
    await createProfile();
    const addRes = await app.inject({
      method: "POST", url: "/v1/candidates/experience", headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, title: "Engineer", company: "Acme", startDate: "2020-01" },
    });
    const id = JSON.parse(addRes.body).id;
    const putRes = await app.inject({
      method: "PUT", url: `/v1/candidates/experience/${id}`, headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, title: "Senior Engineer", company: "Acme", startDate: "2020-01", endDate: "2024-06" },
    });
    expect(putRes.statusCode).toBe(200);
    expect(JSON.parse(putRes.body).title).toBe("Senior Engineer");
  });
});

describe("Education", () => {
  it("adds and lists education entries", async () => {
    await createProfile();
    const addRes = await app.inject({
      method: "POST", url: "/v1/candidates/education", headers: authHeader(SUBJECT_B),
      payload: { coreSubjectId: SUBJECT_B, institution: "MIT", degree: "BS", fieldOfStudy: "CS", startDate: "2016-09" },
    });
    expect(addRes.statusCode).toBe(201);
    expect(JSON.parse(addRes.body).institution).toBe("MIT");

    const listRes = await app.inject({ method: "GET", url: "/v1/candidates/education", headers: authHeader(SUBJECT_B) });
    expect(JSON.parse(listRes.body).entries.length).toBe(1);
  });
});

describe("Preferences", () => {
  it("sets and gets candidate preferences", async () => {
    await createProfile();
    const putRes = await app.inject({
      method: "PUT", url: "/v1/candidates/preferences", headers: authHeader(SUBJECT_B),
      payload: {
        coreSubjectId: SUBJECT_B,
        desiredJobTypes: ["full_time", "contract"],
        desiredWorkModes: ["remote"],
        salaryMin: 80000,
        salaryMax: 150000,
        salaryCurrency: "EUR",
        industries: ["technology", "finance"],
        availabilityStatus: "actively_looking",
      },
    });
    expect(putRes.statusCode).toBe(200);
    const body = JSON.parse(putRes.body);
    expect(body.desiredJobTypes).toEqual(["full_time", "contract"]);
    expect(body.availabilityStatus).toBe("actively_looking");
    expect(body.salaryCurrency).toBe("EUR");

    const getRes = await app.inject({ method: "GET", url: "/v1/candidates/preferences", headers: authHeader(SUBJECT_B) });
    expect(getRes.statusCode).toBe(200);
    expect(JSON.parse(getRes.body).salaryMin).toBe(80000);
  });

  it("returns 404 if preferences not set", async () => {
    await createProfile();
    const res = await app.inject({ method: "GET", url: "/v1/candidates/preferences", headers: authHeader(SUBJECT_B) });
    expect(res.statusCode).toBe(404);
  });
});

describe("Notification Preferences", () => {
  it("sets and gets notification preferences", async () => {
    const putRes = await app.inject({
      method: "PUT", url: "/v1/notifications/preferences", headers: authHeader(SUBJECT_B),
      payload: {
        coreSubjectId: SUBJECT_B,
        preferences: [
          { category: "application_updates", channel: "email", enabled: true },
          { category: "job_alerts", channel: "push", enabled: false },
        ],
      },
    });
    expect(putRes.statusCode).toBe(200);
    expect(JSON.parse(putRes.body).preferences.length).toBe(2);

    const getRes = await app.inject({ method: "GET", url: "/v1/notifications/preferences", headers: authHeader(SUBJECT_B) });
    expect(getRes.statusCode).toBe(200);
    expect(JSON.parse(getRes.body).preferences.length).toBe(2);
  });
});
