import { NextRequest, NextResponse } from 'next/server';

const GITHUB_TOKEN = process.env.GITHUB_PAT || '';

export async function POST(req: NextRequest) {
  try {
    const { repoUrl, userId } = await req.json();
    if (!repoUrl || !userId) {
      return NextResponse.json({ error: 'Missing repoUrl or userId' }, { status: 400 });
    }

    if (!GITHUB_TOKEN) {
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
    }

    // Parse repo URL → owner/repo
    const match = repoUrl.trim().match(/github\.com\/([^/]+)\/([^/.\s]+)/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid GitHub repository URL' }, { status: 400 });
    }
    const [, owner, repo] = match;

    // Auto-accept any pending invitations for this repo
    try {
      const invRes = await fetch('https://api.github.com/user/repository_invitations', {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
        },
      });
      if (invRes.ok) {
        const invitations = await invRes.json();
        for (const inv of invitations) {
          if (inv.repository?.full_name === `${owner}/${repo}`) {
            await fetch(`https://api.github.com/user/repository_invitations/${inv.id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github+json',
              },
            });
          }
        }
      }
    } catch {}

    // Check if we have push access
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!repoRes.ok) {
      return NextResponse.json({ 
        error: "We don't have access yet. Please add henaihh as a collaborator in your repo settings." 
      }, { status: 403 });
    }

    const repoData = await repoRes.json();
    if (!repoData.permissions?.push) {
      return NextResponse.json({ 
        error: "We don't have push access yet. Please add henaihh as a collaborator with write permissions." 
      }, { status: 403 });
    }

    // We have access — create/update .taskbot file via GitHub API
    const date = new Date().toISOString();
    const content = Buffer.from(`TaskBot connected - ${date}\nRepository: ${repoUrl}\n`).toString('base64');
    const filePath = '.taskbot';

    // Check if file already exists (to get SHA for update)
    let sha: string | undefined;
    const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (fileRes.ok) {
      const fileData = await fileRes.json();
      sha = fileData.sha;
    }

    // Create or update the file
    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'TaskBot connected ✅',
        content,
        ...(sha ? { sha } : {}),
        committer: {
          name: 'TaskBot',
          email: 'bot@taskbot.app',
        },
      }),
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      console.error('GitHub PUT error:', err);
      return NextResponse.json({ 
        error: "We don't have write access. Please add henaihh as a collaborator with write permissions." 
      }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('verify-repo error:', error);
    return NextResponse.json({ 
      error: "We don't have access yet. Please add henaihh as a collaborator in your repo settings." 
    }, { status: 500 });
  }
}
