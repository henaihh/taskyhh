import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { rm, readFile } from 'fs/promises';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { repoUrl, userId } = await req.json();
    if (!repoUrl || !userId) {
      return NextResponse.json({ error: 'Missing repoUrl or userId' }, { status: 400 });
    }

    // Read git credentials
    const homedir = process.env.HOME || '/home/henai';
    let gitCredentials = '';
    try {
      gitCredentials = await readFile(`${homedir}/.git-credentials`, 'utf-8');
    } catch {
      return NextResponse.json({ error: 'Git credentials not configured on server' }, { status: 500 });
    }

    // Parse the repo URL to construct authenticated URL
    let authUrl = repoUrl.trim();
    if (gitCredentials.trim()) {
      // Extract token from credentials (format: https://user:token@github.com)
      const credLine = gitCredentials.trim().split('\n')[0];
      const credUrl = new URL(credLine);
      const repoUrlObj = new URL(repoUrl.trim());
      repoUrlObj.username = credUrl.username;
      repoUrlObj.password = credUrl.password;
      authUrl = repoUrlObj.toString();
    }

    const tmpDir = `/tmp/taskbot-verify-${randomUUID()}`;
    const date = new Date().toISOString();

    try {
      // Clone
      await execAsync(`git clone --depth 1 "${authUrl}" "${tmpDir}"`, { timeout: 30000 });

      // Create .taskbot file
      await execAsync(`echo "TaskBot connected - ${date}" > "${tmpDir}/.taskbot"`);

      // Configure git user
      await execAsync(`cd "${tmpDir}" && git config user.email "bot@taskbot.app" && git config user.name "TaskBot"`);

      // Commit and push
      await execAsync(`cd "${tmpDir}" && git add .taskbot && git commit -m "TaskBot connected" && git push origin HEAD`, { timeout: 30000 });

      return NextResponse.json({ success: true });
    } finally {
      // Cleanup
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  } catch (error: any) {
    console.error('verify-repo error:', error);
    const msg = error.stderr || error.message || 'Unknown error';
    if (msg.includes('Authentication') || msg.includes('403') || msg.includes('Permission') || msg.includes('could not read')) {
      return NextResponse.json({ error: "We don't have access yet. Please add henaihh as a collaborator in your repo settings." }, { status: 403 });
    }
    return NextResponse.json({ error: "We don't have access yet. Please add henaihh as a collaborator in your repo settings." }, { status: 500 });
  }
}
