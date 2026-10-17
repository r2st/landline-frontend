import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';

export default function GeminiKeyBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <KeyRound className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
      <div className="text-sm">
        <p className="font-medium text-amber-900">Add your Gemini API key to use document discovery</p>
        <p className="mt-1 text-amber-800">
          Finding companies in documents and drafting emails runs on your organization&apos;s own Gemini key.
          An org admin can add it in{' '}
          <Link to="/settings#api-keys" className="font-medium underline hover:text-amber-900">
            Settings → API Keys
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
