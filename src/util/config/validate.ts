/**
 * Validate required environment variables at startup.
 * Exits with a clear error message if any are missing.
 */

const REQUIRED_VARS = ["DISCORD_TOKEN", "APPLICATION_ID", "DB_URL", "REDIS_URL"] as const;

const OPTIONAL_WARN_VARS = ["SERVER_HD", "SERVER_S"] as const;

export function validateEnv(): void {
    const missing: string[] = [];

    for (const key of REQUIRED_VARS) {
        if (!process.env[key]) {
            missing.push(key);
        }
    }

    if (missing.length > 0) {
        console.error(`\n[FATAL] Missing required environment variables:\n`);
        for (const key of missing) {
            console.error(`  - ${key}`);
        }
        console.error(`\nCheck your .env file. See .env.example for reference.\n`);
        process.exit(1);
    }

    for (const key of OPTIONAL_WARN_VARS) {
        if (!process.env[key]) {
            console.warn(`[WARN] Optional env var ${key} is not set — some features may not work.`);
        }
    }
}
