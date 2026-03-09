'use client';

import { AlertTriangle, ExternalLink, GitMerge } from 'lucide-react';
import { UserProfile } from '@/lib/types';

interface ManualDeployNoticeProps {
  profile: UserProfile | null;
}

export default function ManualDeployNotice({ profile }: ManualDeployNoticeProps) {
  if (!profile?.manual_deploy_required) return null;

  return (
    <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-amber-800">Manual Deployment Required</h3>
          </div>
          
          <p className="text-amber-700 text-sm mt-1 mb-3">
            {profile.manual_deploy_reason || 
             'After PRs are merged, manual deployment is required to update your live site.'}
          </p>
          
          <div className="bg-amber-100 rounded-md p-3 text-sm text-amber-800">
            <div className="font-medium mb-1">Deployment Instructions:</div>
            <ol className="space-y-1 text-xs">
              <li>1. Pull latest changes from main branch</li>
              <li>2. Run deployment script: <code className="bg-amber-200 px-1 rounded">./deploy.sh</code></li>
              <li>3. Verify deployment at your live site</li>
            </ol>
          </div>
          
          <div className="flex items-center gap-2 mt-3">
            <a 
              href={profile.repo_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 underline"
            >
              <ExternalLink className="w-3 h-3" />
              Repository
            </a>
            {profile.website_url && (
              <a 
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 underline"
              >
                <ExternalLink className="w-3 h-3" />
                Live Site
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}