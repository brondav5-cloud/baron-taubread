import { NextResponse } from "next/server";

function getRuntimeVersion(): string {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA;
  if (commit && commit.length >= 7) return commit.slice(0, 7);

  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID;
  if (deploymentId) return deploymentId;

  return "local-dev";
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      version: getRuntimeVersion(),
      force_refresh: process.env.APP_FORCE_REFRESH === "1",
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
