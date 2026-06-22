import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { api } from '../api/client';

/**
 * Renders a saved business-card image for the gallery. The card-image endpoint
 * requires the X-API-Key header, so a bare <img src> can't load it — we fetch
 * the bytes as a blob and render an object URL (revoked on unmount).
 */
export default function CardImageThumb({ contactId, alt = 'Business card', className = '' }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    api
      .get(`/contacts/${contactId}/card-image`, { responseType: 'blob' })
      .then((r) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(r.data);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [contactId]);

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 text-gray-300 ${className}`}>
        <CreditCard className="h-6 w-6" />
      </div>
    );
  }
  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 ${className}`}>
        <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
