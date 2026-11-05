import { spawnSync } from "node:child_process";
import type { PrivateObjectStore } from "./pipeline";

export const PRIVATE_BUCKET = "yorkstead-production-backups";
export const OBJECT_PREFIX = "ys-sys-001/preservation-baseline/v1/";

export type R2Credentials = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  privateHome: string;
};

function checkedKey(key: string) {
  if (!key.startsWith(OBJECT_PREFIX) || !/^[a-zA-Z0-9_./-]+\.json\.age$/.test(key) || key.includes("..")) {
    throw new Error("object_key_invalid");
  }
  return key;
}

export class CloudflareR2ObjectStore implements PrivateObjectStore {
  private readonly endpoint: string;
  constructor(private readonly credentials: R2Credentials) {
    if (!/^[a-f0-9]{32}$/i.test(credentials.accountId) || !credentials.accessKeyId || !credentials.secretAccessKey) {
      throw new Error("r2_configuration_invalid");
    }
    this.endpoint = `https://${credentials.accountId}.r2.cloudflarestorage.com`;
  }

  private run(args: string[]) {
    const result = spawnSync("aws", ["--no-cli-pager", "--region", "auto", "--endpoint-url", this.endpoint, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "ignore", "ignore"],
      timeout: 120_000,
      env: {
        PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
        HOME: this.credentials.privateHome,
        AWS_CONFIG_FILE: "/dev/null",
        AWS_SHARED_CREDENTIALS_FILE: "/dev/null",
        AWS_EC2_METADATA_DISABLED: "true",
        AWS_PAGER: "",
        AWS_DEFAULT_REGION: "auto",
        AWS_ACCESS_KEY_ID: this.credentials.accessKeyId,
        AWS_SECRET_ACCESS_KEY: this.credentials.secretAccessKey,
        NODE_ENV: "production",
      },
    });
    if (result.error || result.status !== 0) throw new Error("r2_operation_failed");
  }

  async put(key: string, filePath: string) {
    checkedKey(key);
    this.run(["s3api", "put-object", "--bucket", PRIVATE_BUCKET, "--key", key, "--body", filePath, "--output", "json"]);
  }

  async get(key: string, filePath: string) {
    checkedKey(key);
    this.run(["s3api", "get-object", "--bucket", PRIVATE_BUCKET, "--key", key, "--output", "json", filePath]);
  }

  async remove(key: string) {
    checkedKey(key);
    this.run(["s3api", "delete-object", "--bucket", PRIVATE_BUCKET, "--key", key, "--output", "json"]);
  }
}
