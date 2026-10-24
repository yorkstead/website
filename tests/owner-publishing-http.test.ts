import { expect, test } from "bun:test";
import { createOwnerPublishingController } from "@/lib/owner-publishing-http";
import { ClientProjectAccessError, ClientProjectConflictError } from "@/lib/client-project-data";

const origin = "https://owner.example.test";
function fixture(owner=true) {
  const calls: unknown[][] = [];
  const service = {
    async publishingWorkspace(...args: unknown[]) { calls.push(["read", ...args]); return { projects: [], selected: null }; },
    async prepare(...args: unknown[]) { calls.push(["prepare", ...args]); },
    async approve(...args: unknown[]) { calls.push(["approve", ...args]); },
    async withdraw(...args: unknown[]) { calls.push(["withdraw", ...args]); },
  };
  const controller = createOwnerPublishingController({ verifyOwner: async () => owner ? { user: { id: "verified-owner" } } : null, service: service as never, origin });
  return { calls, service, controller };
}
const body = { action: "prepare", projectId: "project", kind: "project", sourceId: "project", includeDescription: false, expectedRevision: 0 };
function post(value: unknown=body, headers: Record<string,string>={}) {
  return new Request(`${origin}/api/owner-publishing`, { method: "POST", headers: { origin, "Content-Type": "application/json", ...headers }, body: JSON.stringify(value) });
}
test("every read and mutation rejects anonymous/customer/forged owners before service access", async () => {
  const f=fixture(false);
  for (const request of [new Request(`${origin}/api/owner-publishing?projectId=other`,{ headers:{"x-role":"owner","x-actor-id":"forged"} }),post()]) {
    const response=await f.controller(request);
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  }
  expect(f.calls).toHaveLength(0);
});
test("mutations enforce configured origin, Fetch Metadata, JSON and bounded bodies", async () => {
  const f=fixture();
  for (const headers of ([{origin:"https://evil.example.test"},{origin:"null"},{"sec-fetch-site":"cross-site"},{"Content-Type":"text/plain"}] as Record<string,string>[])) expect((await f.controller(post(body,headers))).status).toBe(403);
  const noOrigin=post(); noOrigin.headers.delete("origin");
  expect((await f.controller(noOrigin)).status).toBe(403);
  expect((await f.controller(post({ ...body, padding:"x".repeat(5000) }))).status).toBe(413);
  expect((await f.controller(post(body,{"content-length":"9000"}))).status).toBe(413);
  expect(f.calls).toHaveLength(0);
});
test("strict inputs reject browser identity, tenant, payload, state, bulk actions and malformed selectors", async () => {
  const f=fixture();
  for (const extra of [{actor:"forged"},{tenantId:"other"},{role:"owner"},{payload:{title:"injected"}},{state:"approved"},{workspace:{projects:[]}}]) expect((await f.controller(post({...body,...extra}))).status).toBe(400);
  for (const value of [{...body,action:"publishAll"},{...body,expectedRevision:-1},{action:"approve",projectId:"project",publicationId:"invalid",expectedRevision:1}]) expect((await f.controller(post(value))).status).toBe(400);
  for (const query of ["?tenantId=other","?projectId=x&projectId=y","?projectId=%20x"]) expect((await f.controller(new Request(`${origin}/api/owner-publishing${query}`))).status).toBe(400);
  expect(f.calls).toHaveLength(0);
});
test("valid actions forward only strict selectors/revisions and all responses are private", async () => {
  const f=fixture();
  expect((await f.controller(new Request(`${origin}/api/owner-publishing?projectId=project`))).status).toBe(200);
  expect((await f.controller(post())).status).toBe(200);
  for (const action of ["approve","withdraw"]) expect((await f.controller(post({action,projectId:"project",publicationId:"11111111-1111-4111-8111-111111111111",expectedRevision:3}))).status).toBe(200);
  expect(f.calls.map(c=>c[0])).toEqual(["read","prepare","approve","withdraw"]);
  expect(f.calls[1].slice(2)).toEqual(["project",{kind:"project",sourceId:"project",includeDescription:false,expectedRevision:0}]);
});
test("conflicts and unavailable sources have safe status without SQL or private errors", async () => {
  const f=fixture();
  for (const [error,status] of [[new ClientProjectConflictError(),409],[new ClientProjectAccessError(),403],[new Error("SECRET SQL connection password"),503]] as const) {
    f.service.prepare=async()=>{throw error;};
    const response=await f.controller(post());
    expect(response.status).toBe(status);
    expect(await response.text()).not.toContain("SECRET");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  }
});
