export {};

async function run(command: string[]) {
  const child = Bun.spawn(command, {
    env: process.env,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) process.exit(exitCode);
}

if (process.env.VERCEL_ENV === "production") {
  console.log("Applying ordered production database migrations before the Vercel build.");
  await run(["bun", "run", "db:migrate"]);
}

await run(["bun", "run", "build"]);
