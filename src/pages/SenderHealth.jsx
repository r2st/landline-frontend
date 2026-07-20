import { Gauge } from 'lucide-react';

/**
 * Sender Health — per-account reputation, bounce & throttle.
 *
 * Placeholder scaffold: the route, nav entry, and command-palette entry all
 * point here already. Real per-sender reputation UI lands in a follow-up.
 */
export default function SenderHealth() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3">
        <Gauge className="h-6 w-6 text-indigo-500" />
        <h1 className="text-xl font-semibold text-gray-900">Sender Health</h1>
      </div>
      <p className="mt-4 text-gray-500">Coming soon</p>
    </div>
  );
}
