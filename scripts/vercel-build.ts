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

// Production migrations require a separately authorized operator command.
// Building a production deployment must never advance the database ledger.

await run(["bun", "run", "build"]);
