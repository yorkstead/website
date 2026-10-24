import { expect, test } from "bun:test";
import {
  createCustomerCommunicationsController,
  createCustomerCommunicationsService,
} from "@/lib/customer-communications";
import { createCommunicationsHistoryFixture } from "./fixtures/customer-communications-history";
const dbtest = process.env.TEST_DATABASE_URL ? test : test.skip;
const owner = async () => ({ user: { id: "fictional-history-owner" } });

for (const [jobs, audit] of [
  [0, 51],
  [0, 101],
  [1, 151],
  [52, 1],
  [26, 101],
  [25, 50],
]) {
  dbtest(
    `all communications history is reachable with ${jobs} jobs and ${audit} audit records`,
    async () => {
      const fixture = await createCommunicationsHistoryFixture(jobs, audit);
      try {
        const controller = createCustomerCommunicationsController({
          verifyOwner: owner,
          service: createCustomerCommunicationsService(fixture.pool, owner),
        });
        const jobIds: string[] = [],
          auditIds: string[] = [];
        const pages = Math.max(1, Math.ceil(jobs / 25), Math.ceil(audit / 50));
        for (let page = 0; page < pages; page++) {
          const response = await controller(
            new Request(
              `https://portal.example.test/api/customer-communications?page=${page}`,
            ),
          );
          expect(response.status).toBe(200);
          expect(response.headers.get("cache-control")).toBe(
            "private, no-store",
          );
          expect(response.headers.get("referrer-policy")).toBe("no-referrer");
          const view = await response.json();
          expect(view.jobs).toHaveLength(
            Math.min(25, Math.max(0, jobs - page * 25)),
          );
          expect(view.audit).toHaveLength(
            Math.min(50, Math.max(0, audit - page * 50)),
          );
          expect(view.hasMore).toBe(page + 1 < pages);
          jobIds.push(...view.jobs.map((j: { id: string }) => j.id));
          auditIds.push(...view.audit.map((a: { id: string }) => a.id));
        }
        expect(jobIds.toSorted()).toEqual(fixture.jobIds.toSorted());
        expect(auditIds).toEqual([...fixture.auditIds].reverse());
        expect(new Set(jobIds).size).toBe(jobs);
        expect(new Set(auditIds).size).toBe(audit);
      } finally {
        await fixture.dispose();
      }
    },
  );
}
