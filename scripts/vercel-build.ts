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

// Database migrations require a separately authorized operator command.
// A Vercel build, including a production build triggered by merging main,
// must not advance the application_migrations ledger.

await run(["bun", "run", "build"]);
