const allowedEnvironment = new Set([
  "PATH", "HOME", "USER", "LOGNAME", "SHELL", "TERM", "LANG", "LC_ALL", "LC_CTYPE", "TMPDIR", "PWD", "SHLVL", "_",
  "WSL_DISTRO_NAME", "WSL_INTEROP",
  "YS_SYS_001_DB_HOST", "YS_SYS_001_DB_USER", "YS_SYS_001_DB_PASSWORD",
  "YS_SYS_001_R2_ACCESS_KEY_ID", "YS_SYS_001_R2_SECRET_ACCESS_KEY",
]);
export const SAFE_SYSTEM_PATH = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";

export type BoundaryInput = {
  platform: string;
  wslDistro?: string;
  isInteractive: boolean;
  ci?: boolean;
  argvCount: number;
  environment: Record<string, string | undefined>;
};

export function validateExecutionBoundary(input: BoundaryInput) {
  if (input.platform !== "linux" || !input.wslDistro?.toLowerCase().includes("ubuntu")) throw new Error("approved_ubuntu_wsl_required");
  if (input.ci || Object.keys(input.environment).some((name) => /^GITHUB_/.test(name))) throw new Error("ci_execution_rejected");
  if (!input.isInteractive) throw new Error("interactive_owner_session_required");
  if (input.argvCount !== 0) throw new Error("no_cli_options_are_supported");
  if (input.environment.PATH !== SAFE_SYSTEM_PATH) throw new Error("system_path_must_be_fixed");
  for (const name of Object.keys(input.environment)) if (!allowedEnvironment.has(name)) throw new Error("unexpected_environment_rejected");
  for (const prefix of ["PG", "AWS_", "NEON_", "VERCEL_"]) {
    if (Object.keys(input.environment).some((name) => name.startsWith(prefix))) throw new Error("inherited_provider_environment_rejected");
  }
  if (input.environment.DATABASE_URL || input.environment.POSTGRES_URL || input.environment.DIRECT_URL) throw new Error("connection_string_environment_rejected");
}
