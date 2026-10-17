import { Link } from 'react-router-dom';
import { ArrowRight, KeyRound } from 'lucide-react';
import { useOptionalAuth } from '../../context/AuthContext';
import { isOrgAdmin, isPlatformAdmin } from '../../lib/roles';

// Settings only shows the API Keys tab to org admins (not platform admins, who
// have no org of their own), so only they get a link that actually lands there.
//
// `feature` names what's blocked ("document discovery", "Gemini search"), and
// `uses` says what the key is spent on there.
export default function GeminiKeyBanner({
  feature = 'document discovery',
  uses = 'Finding companies in documents and drafting emails runs',
}) {
  const role = useOptionalAuth()?.user?.role;
  const canAddKey = !role || (isOrgAdmin(role) && !isPlatformAdmin(role));
  return (
    <div role="status" className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-start">
      <KeyRound className="h-5 w-5 flex-shrink-0 text-amber-600 sm:mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-amber-900">Add your Gemini API key to use {feature}</p>
        <p className="mt-1 text-amber-800">
          {uses} on your organization&apos;s own Gemini key.{' '}
          {canAddKey ? (
            <>
              Add it in{' '}
              <Link to="/settings#api-keys" className="font-medium underline hover:text-amber-900">
                Settings → API Keys
              </Link>
              .
            </>
          ) : (
            'Ask an org admin to add it in Settings → API Keys.'
          )}
        </p>
      </div>
      {canAddKey && (
        <Link
          to="/settings#api-keys"
          className="inline-flex flex-shrink-0 items-center gap-1.5 self-start rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
        >
          Add Gemini key
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
