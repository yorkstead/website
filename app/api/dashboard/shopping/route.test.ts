import { describe, expect, test } from 'bun:test';
const route=await Bun.file(new URL('./route.ts',import.meta.url)).text();

describe('owner shopping command BFF',()=>{
  test('requires the Better Auth owner session before forwarding',()=>{
    const owner=route.indexOf("getOwnerSession(await headers())");
    const forward=route.indexOf('postAutomationHubShoppingCommand(input)');
    expect(owner).toBeGreaterThanOrEqual(0);expect(owner).toBeLessThan(forward);
    expect(route).toContain("status:401");
  });
  test('bounds same-origin JSON and keeps the Hub credential server-only',()=>{
    expect(route).toContain('size>8192');expect(route).toContain("sec-fetch-site");expect(route).toContain("AutomationHubShoppingCommand.parse");
    expect(route).toContain("private, no-store");expect(route).not.toContain('YORKSTEAD_SHOPPING_WRITE_SECRET');
    expect(route).not.toContain('request.headers.get(\'authorization\')');
  });
  test('preserves Hub processing responses as HTTP 202 for browser reconciliation',()=>{
    expect(route).toContain('outcome.httpStatus===202?202:outcome.httpStatus>=400?outcome.httpStatus:200');
    expect(route).toContain('Response.json(outcome.result,{status,headers:privateHeaders})');
  });
});
