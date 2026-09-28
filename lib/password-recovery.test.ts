import { expect, test } from "bun:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";

test("recovery tokens reset only the requested account and cannot be reused", async () => {
  const db = { user: [], session: [], account: [], verification: [] };
  let token = "";
  let recipient = "";
  const auth = betterAuth({
    baseURL: "http://localhost:3000",
    secret: "test-only-recovery-48f20396a1b7c5d09e22",
    database: memoryAdapter(db),
    emailAndPassword: { enabled: true, minPasswordLength: 12, resetPasswordTokenExpiresIn: 900, revokeSessionsOnPasswordReset: true,
      sendResetPassword: async (data) => { token = data.token; recipient = data.user.email; },
    },
  });
  const email = "recovery@example.com";
  await auth.api.signUpEmail({ body: { email, password: "Original-password-123!", name: "Recovery Test" } });
  await auth.api.requestPasswordReset({ body: { email, redirectTo: "http://localhost:3000/recover" } });
  expect(recipient).toBe(email);
  expect(token.length).toBeGreaterThan(10);
  await expect(auth.api.resetPassword({ body: { token: "invalid", newPassword: "Replacement-password-123!" } })).rejects.toThrow();
  await auth.api.resetPassword({ body: { token, newPassword: "Replacement-password-123!" } });
  expect(db.session.length).toBe(0);
  await expect(auth.api.resetPassword({ body: { token, newPassword: "Another-password-123!" } })).rejects.toThrow();
  await expect(auth.api.signInEmail({ body: { email, password: "Original-password-123!" } })).rejects.toThrow();
  const login = await auth.api.signInEmail({ body: { email, password: "Replacement-password-123!" } });
  expect(login.user.email).toBe(email);
  recipient = "";
  await auth.api.requestPasswordReset({ body: { email: "unknown@example.com", redirectTo: "http://localhost:3000/recover" } });
  expect(recipient).toBe("");
});
