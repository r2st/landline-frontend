import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Upload,
  Sparkles,
  UserPlus,
  RotateCcw,
  Check,
  CreditCard,
  Building2,
  Mail,
  Phone,
  Smartphone,
  Printer,
  Globe,
  MapPin,
  Users,
  Linkedin,
  Search,
  ScanLine,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useScanCard } from '../hooks/useAI';
import { useContacts } from '../hooks/useContacts';
import { contactsApi, queryClient } from '../api/client';
import { getInitials, timeAgo, formatDate, contactPhones } from '../lib/utils';
import ContactDetailModal from '../components/ContactDetailModal';

const isScanned = (c) => /card|scan/.test((c?.source || '').toLowerCase());
const fullName = (c) =>
  [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || c.email || 'Unknown';

// Marks a contact as captured from a scanned business card. Must match the
// /card|scan/ test used by isScanned (and by the Contacts "Scanned" tab/counter).
const SCAN_SOURCE = 'card_scan';

/**
 * Normalize the OCR/Claude-vision result onto our form fields. The endpoint
 * isn't guaranteed to return our exact field names — map the common variants
 * (email_address, phone_number, job_title, organization, a single `name`, an
 * optional { data }/{ contact } wrapper, …). Phone numbers get special care:
 * we keep EVERY number found (phone/mobile/fax plus a `phones` array) as a
 * labelled list so none are lost.
 */
function normalizeScanResult(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const d =
    raw.data && typeof raw.data === 'object' ? { ...raw, ...raw.data }
    : raw.contact && typeof raw.contact === 'object' ? { ...raw, ...raw.contact }
    : raw;

  const pick = (...keys) => {
    for (const k of keys) {
      const v = d[k];
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  };

  let first = pick('first_name', 'firstName', 'given_name', 'givenName');
  let last = pick('last_name', 'lastName', 'family_name', 'familyName', 'surname');
  const whole = pick('name', 'full_name', 'fullName', 'contact_name');
  if (!first && !last && whole) {
    const parts = whole.split(/\s+/);
    first = parts.shift() || '';
    last = parts.join(' ');
  }

  // Collect all phone numbers, de-duplicated, into a labelled list.
  const phones = [];
  const seen = new Set();
  const digits = (s) => String(s).replace(/\D/g, '');
  const addPhone = (label, number) => {
    const num = (number == null ? '' : String(number)).trim();
    if (!num) return;
    const key = digits(num) || num.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    phones.push({ label: label || 'Phone', number: num });
  };
  addPhone('Office', pick('phone', 'phone_number', 'phoneNumber', 'tel', 'telephone', 'office', 'work'));
  addPhone('Mobile', pick('mobile', 'mobile_phone', 'cell', 'cell_phone'));
  addPhone('Fax', pick('fax', 'fax_number'));
  const rawPhones = Array.isArray(d.phones) ? d.phones : [];
  for (const p of rawPhones) {
    if (p && typeof p === 'object') addPhone(p.label || p.type, p.number || p.value);
    else addPhone(null, p);
  }

  const out = {
    first_name: first,
    last_name: last,
    title: pick('title', 'job_title', 'jobTitle', 'position', 'role', 'designation'),
    department: pick('department', 'dept', 'division'),
    company_name: pick('company_name', 'companyName', 'company', 'organization', 'organisation', 'employer', 'org'),
    email: pick('email', 'email_address', 'emailAddress', 'mail', 'e_mail'),
    website: pick('website', 'url', 'web', 'company_website', 'web_url'),
    address: pick('address', 'street', 'street_address', 'address_line', 'address1'),
    city: pick('city', 'town', 'locality'),
    state: pick('state', 'province', 'region'),
    postal_code: pick('postal_code', 'postalCode', 'zip', 'zip_code', 'zipcode', 'postcode'),
    country: pick('country', 'nation'),
    linkedin_url: pick('linkedin_url', 'linkedinUrl', 'linkedin', 'linked_in'),
    notes: pick('notes', 'note', 'additional_info'),
  };

  // Only return fields we actually found, so re-scanning never wipes edited values.
  const filtered = Object.fromEntries(Object.entries(out).filter(([, v]) => v !== ''));
  if (phones.length) filtered.phones = phones;
  return filtered;
}

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  title: '',
  department: '',
  company_name: '',
  email: '',
  phones: [], // [{ label, number }]
  website: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  linkedin_url: '',
  notes: '',
};

// Defined at module scope so it keeps a stable component identity across renders.
// Declaring it inside CardScanner would create a new component type on every
// keystroke, remounting each input and dropping the user's cursor/focus.
function FormField({ label, field, value, onChange, icon: Icon, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          placeholder={placeholder || label}
          className={`w-full rounded-lg border border-gray-200 bg-white py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition ${
            Icon ? 'pl-9 pr-3' : 'px-3'
          }`}
        />
      </div>
    </div>
  );
}

// Editable list of phone numbers (label + number), so a card with office,
// mobile and fax numbers keeps all of them.
function PhoneFields({ phones, onUpdate, onAdd, onRemove }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-gray-500">Phone Numbers</label>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add number
        </button>
      </div>
      {phones.length === 0 && (
        <p className="text-xs text-gray-400">No phone numbers detected — add one if needed.</p>
      )}
      {phones.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={p.label || ''}
            onChange={(e) => onUpdate(i, 'label', e.target.value)}
            placeholder="Label"
            className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="tel"
              value={p.number || ''}
              onChange={(e) => onUpdate(i, 'number', e.target.value)}
              placeholder="Number"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="rounded-md p-1.5 text-gray-300 transition hover:bg-red-50 hover:text-red-500"
            title="Remove number"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

const phoneIcon = (label) => {
  const l = (label || '').toLowerCase();
  if (/mobile|cell/.test(l)) return Smartphone;
  if (/fax/.test(l)) return Printer;
  return Phone;
};

/** Compact read-only card showing details extracted from one scanned business card. */
function ScannedContactCard({ contact, onOpen }) {
  const name = fullName(contact);
  const location = [contact.city, contact.state, contact.country].filter(Boolean).join(', ');
  const phones = contactPhones(contact);

  return (
    <button
      type="button"
      onClick={() => onOpen(contact)}
      className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
    >
      {/* Identity */}
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
          {getInitials(contact.first_name, contact.last_name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
          {(contact.title || contact.department) && (
            <p className="truncate text-xs text-gray-500">
              {[contact.title, contact.department].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        {contact.has_card_image && (
          <CreditCard className="ml-auto h-4 w-4 flex-shrink-0 text-blue-400" title="Card image saved" />
        )}
      </div>

      {/* Company */}
      {contact.company && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-700">
          <Building2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <span className="truncate">{contact.company}</span>
        </div>
      )}

      {location && (
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          <span className="truncate">{location}</span>
        </div>
      )}

      {/* Contact details */}
      <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
        {contact.email && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Mail className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            <span className="truncate">{contact.email}</span>
          </div>
        )}
        {phones.map((p, i) => {
          const Icon = phoneIcon(p.label);
          return (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
              <Icon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              <span className="truncate">{p.number}</span>
              {p.label && <span className="text-gray-400">· {p.label}</span>}
            </div>
          );
        })}
        {contact.website && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Globe className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            <span className="truncate">{contact.website.replace(/^https?:\/\//, '')}</span>
          </div>
        )}
        {contact.linkedin_url && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Linkedin className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            <span className="truncate">LinkedIn profile</span>
          </div>
        )}
      </div>

      {contact.created_at && (
        <div className="mt-3 border-t border-gray-100 pt-2.5">
          <span className="text-[11px] text-gray-400" title={formatDate(contact.created_at)}>
            Scanned {timeAgo(contact.created_at)} · tap for details
          </span>
        </div>
      )}
    </button>
  );
}

export default function CardScanner() {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [scanned, setScanned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedContact, setSavedContact] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [detailContact, setDetailContact] = useState(null);

  const [search, setSearch] = useState('');

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const scanCard = useScanCard();

  // All previously scanned business cards, newest first, filtered by search.
  const { data: contacts, isLoading: contactsLoading } = useContacts();
  const scannedCards = useMemo(() => {
    const list = (contacts || []).filter(isScanned);
    const q = search.trim().toLowerCase();
    const filtered = q
      ? list.filter((c) =>
          [c.first_name, c.last_name, c.email, c.title, c.company, ...contactPhones(c).map((p) => p.number)]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : list;
    return [...filtered].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [contacts, search]);
  const totalScanned = useMemo(() => (contacts || []).filter(isScanned).length, [contacts]);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large (max 10MB)');
      return;
    }
    setImageFile(file);
    setScanned(false);
    setScanError(null);
    setSavedContact(null);
    setFormData(INITIAL_FORM);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleScan = useCallback(() => {
    if (!imageFile) return;
    setScanError(null);
    scanCard.mutate(imageFile, {
      onSuccess: (data) => {
        const mapped = normalizeScanResult(data);
        setFormData((prev) => ({ ...prev, ...mapped }));
        setScanned(true);
        const found = Object.keys(mapped).length;
        if (found === 0) {
          toast('No details detected — enter them manually', { icon: '⚠️' });
        } else {
          toast.success('Card scanned successfully');
        }
      },
      onError: (err) => {
        setScanError(err?.response?.data?.detail || 'Could not read the card. Try a clearer photo.');
      },
    });
  }, [imageFile, scanCard]);

  const handleFieldChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // --- Phone row editing ---
  const updatePhone = useCallback((idx, key, value) => {
    setFormData((prev) => {
      const phones = [...(prev.phones || [])];
      phones[idx] = { ...phones[idx], [key]: value };
      return { ...prev, phones };
    });
  }, []);
  const addPhone = useCallback(() => {
    setFormData((prev) => ({ ...prev, phones: [...(prev.phones || []), { label: 'Phone', number: '' }] }));
  }, []);
  const removePhone = useCallback((idx) => {
    setFormData((prev) => ({ ...prev, phones: (prev.phones || []).filter((_, i) => i !== idx) }));
  }, []);

  const handleAddContact = useCallback(async () => {
    if (!formData.first_name && !formData.last_name && !formData.email) {
      toast.error('At least a name or email is required');
      return;
    }
    setSaving(true);
    try {
      // All phone numbers entered, de-duplicated. Derive the dedicated
      // office/mobile/fax slots from the labels for back-compat; the backend
      // merges + de-dupes everything anyway.
      const phones = (formData.phones || [])
        .map((p) => ({ label: (p.label || '').trim() || 'Phone', number: (p.number || '').trim() }))
        .filter((p) => p.number);
      const byLabel = (re) => phones.find((p) => re.test(p.label.toLowerCase()))?.number || '';
      const office = byLabel(/office|main|phone|direct|tel|work/) || phones[0]?.number || '';
      const mobile = byLabel(/mobile|cell/);
      const fax = byLabel(/fax/);

      const result = await contactsApi.quickAdd({
        first_name: formData.first_name,
        last_name: formData.last_name,
        title: formData.title,
        department: formData.department,
        company_name: formData.company_name,
        email: formData.email,
        phone: office,
        mobile,
        fax,
        additional_phones: phones,
        website: formData.website,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: formData.country,
        linkedin_url: formData.linkedin_url,
        notes: formData.notes,
        // The scanned image (already a base64 data URL from the FileReader).
        card_image: imagePreview || undefined,
        // Tag the contact so it surfaces under the "Scanned" tab and counter.
        source: SCAN_SOURCE,
      });

      setSavedContact(result);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Contact added successfully');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to add contact');
    } finally {
      setSaving(false);
    }
  }, [formData, imagePreview]);

  const handleReset = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(INITIAL_FORM);
    setScanned(false);
    setScanError(null);
    setSavedContact(null);
    scanCard.reset();
  }, [scanCard]);

  // quick-add response shape varies ({contact:{...}} or flat) — handle both.
  const savedC = savedContact?.contact || savedContact || null;
  const savedContactId = savedC?.id || null;
  const savedCompanyId = savedC?.company_id || savedContact?.company_id || null;
  const savedPhones = useMemo(() => contactPhones(savedC), [savedC]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <CreditCard className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Business Card Scanner</h1>
        </div>
        <p className="text-gray-500 text-sm ml-10">
          Snap a photo or upload a card to instantly add contacts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Upload area */}
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !imagePreview && fileInputRef.current?.click()}
            className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
              dragOver
                ? 'border-blue-500 bg-blue-50'
                : imagePreview
                ? 'border-gray-200 bg-gray-50'
                : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/50'
            }`}
            style={{ minHeight: '320px' }}
          >
            {imagePreview ? (
              <div className="p-4 flex items-center justify-center" style={{ minHeight: '320px' }}>
                <img
                  src={imagePreview}
                  alt="Business card"
                  className="max-w-full max-h-80 rounded-lg object-contain shadow-sm"
                />
                {scanCard.isPending && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
                    <p className="text-sm font-medium text-gray-700">Reading the card…</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center" style={{ minHeight: '320px' }}>
                <div className="rounded-full bg-blue-50 p-4 mb-4">
                  <Camera className="h-10 w-10 text-blue-500" />
                </div>
                <p className="text-gray-700 font-medium mb-1">
                  Drop a card image here or click to upload
                </p>
                <p className="text-gray-400 text-sm">
                  Supports JPG, PNG, HEIC up to 10MB
                </p>
              </div>
            )}
          </div>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {/* Scan error feedback */}
          {scanError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {!imagePreview && (
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <Camera className="h-4 w-4" />
                Use Camera
              </button>
            )}

            {imagePreview && !savedContact && (
              <>
                <button
                  onClick={handleScan}
                  disabled={scanCard.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {scanCard.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Analyzing card...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {scanned ? 'Re-scan Card' : 'Scan Card'}
                    </>
                  )}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  <Upload className="h-4 w-4" />
                  Change Image
                </button>
              </>
            )}

            {(scanned || savedContact) && (
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <RotateCcw className="h-4 w-4" />
                Scan Another
              </button>
            )}
          </div>
        </div>

        {/* Right column: Extracted data / form */}
        <div>
          {savedContact ? (
            /* Saved state — confirmation with all saved details */
            <div className="rounded-xl border border-green-200 bg-green-50 p-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center rounded-full bg-green-100 p-3 mb-3">
                  <Check className="h-7 w-7 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Contact Saved</h3>
                <p className="text-gray-600 text-sm mb-4">
                  {fullName(savedC || formData)}
                  {(savedC?.company_name || formData.company_name) ? ` at ${savedC?.company_name || formData.company_name}` : ''}
                  {' '}has been added to your contacts.
                </p>
              </div>

              {/* Saved details summary */}
              <div className="rounded-lg border border-green-200 bg-white p-4 text-sm">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Saved details</p>
                <dl className="space-y-1.5 text-gray-700">
                  {(savedC?.title || formData.title) && (
                    <div className="flex gap-2"><dt className="w-20 flex-shrink-0 text-gray-400">Title</dt><dd>{savedC?.title || formData.title}</dd></div>
                  )}
                  {(savedC?.department || formData.department) && (
                    <div className="flex gap-2"><dt className="w-20 flex-shrink-0 text-gray-400">Dept</dt><dd>{savedC?.department || formData.department}</dd></div>
                  )}
                  {(savedC?.email || formData.email) && (
                    <div className="flex gap-2"><dt className="w-20 flex-shrink-0 text-gray-400">Email</dt><dd className="break-all">{savedC?.email || formData.email}</dd></div>
                  )}
                  {savedPhones.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <dt className="w-20 flex-shrink-0 text-gray-400">{p.label || 'Phone'}</dt>
                      <dd>{p.number}</dd>
                    </div>
                  ))}
                  {(savedC?.website || formData.website) && (
                    <div className="flex gap-2"><dt className="w-20 flex-shrink-0 text-gray-400">Website</dt><dd className="break-all">{savedC?.website || formData.website}</dd></div>
                  )}
                  {[savedC?.address || formData.address, savedC?.city || formData.city, savedC?.state || formData.state, savedC?.postal_code || formData.postal_code, savedC?.country || formData.country].filter(Boolean).length > 0 && (
                    <div className="flex gap-2">
                      <dt className="w-20 flex-shrink-0 text-gray-400">Address</dt>
                      <dd>{[savedC?.address || formData.address, savedC?.city || formData.city, savedC?.state || formData.state, savedC?.postal_code || formData.postal_code, savedC?.country || formData.country].filter(Boolean).join(', ')}</dd>
                    </div>
                  )}
                  {savedContact?.contact?.has_card_image || imagePreview ? (
                    <div className="flex gap-2"><dt className="w-20 flex-shrink-0 text-gray-400">Card image</dt><dd className="text-green-700">Saved ✓</dd></div>
                  ) : null}
                </dl>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                {savedContactId && (
                  <button
                    onClick={() => setDetailContact(savedC)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <CreditCard className="h-4 w-4" />
                    View Details
                  </button>
                )}
                <a
                  href={savedContactId ? `/contacts?highlight=${savedContactId}` : '/contacts'}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Users className="h-4 w-4" />
                  View in Contacts
                </a>
                {savedCompanyId && (
                  <a
                    href={`/companies/${savedCompanyId}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Building2 className="h-4 w-4" />
                    View Company
                  </a>
                )}
              </div>
            </div>
          ) : scanned ? (
            /* Editable form */
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">Extracted Details</h3>
                <span className="text-xs text-gray-400 ml-auto">Edit before saving</span>
              </div>

              {/* Person */}
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Person</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="First Name" field="first_name" value={formData.first_name} onChange={handleFieldChange} icon={UserPlus} />
                <FormField label="Last Name" field="last_name" value={formData.last_name} onChange={handleFieldChange} icon={UserPlus} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Title" field="title" value={formData.title} onChange={handleFieldChange} />
                <FormField label="Department" field="department" value={formData.department} onChange={handleFieldChange} />
              </div>

              <FormField label="Email" field="email" value={formData.email} onChange={handleFieldChange} icon={Mail} type="email" />

              {/* All phone numbers */}
              <PhoneFields phones={formData.phones} onUpdate={updatePhone} onAdd={addPhone} onRemove={removePhone} />

              <FormField label="LinkedIn" field="linkedin_url" value={formData.linkedin_url} onChange={handleFieldChange} icon={Linkedin} placeholder="https://linkedin.com/in/..." />

              {/* Company */}
              <p className="pt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Company</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Company" field="company_name" value={formData.company_name} onChange={handleFieldChange} icon={Building2} />
                <FormField label="Website" field="website" value={formData.website} onChange={handleFieldChange} icon={Globe} />
              </div>

              {/* Location */}
              <p className="pt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Location</p>
              <FormField label="Street Address" field="address" value={formData.address} onChange={handleFieldChange} icon={MapPin} />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="City" field="city" value={formData.city} onChange={handleFieldChange} />
                <FormField label="State / Province" field="state" value={formData.state} onChange={handleFieldChange} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="ZIP / Postal Code" field="postal_code" value={formData.postal_code} onChange={handleFieldChange} />
                <FormField label="Country" field="country" value={formData.country} onChange={handleFieldChange} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition resize-none"
                  placeholder="Additional notes..."
                />
              </div>

              <button
                onClick={handleAddContact}
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Add to Contacts
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Empty state */
            <div className="rounded-xl border border-gray-200 bg-white p-8 flex flex-col items-center justify-center text-center" style={{ minHeight: '320px' }}>
              <div className="rounded-full bg-gray-100 p-4 mb-4">
                <CreditCard className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-gray-700 font-medium mb-1">No card scanned yet</h3>
              <p className="text-gray-400 text-sm max-w-xs">
                Upload or photograph a business card, then click "Scan Card" to extract contact details automatically.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom section: all previously scanned business cards */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Scanned Business Cards</h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {totalScanned}
              </span>
            </div>
            <p className="ml-7 text-sm text-gray-500">
              Every contact captured from a scanned card, with full details.
            </p>
          </div>

          {totalScanned > 0 && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search scanned contacts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {contactsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : scannedCards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <div className="mx-auto mb-3 w-fit rounded-full bg-gray-100 p-3">
              <ScanLine className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-700">
              {totalScanned === 0 ? 'No scanned cards yet' : 'No matches'}
            </h3>
            <p className="mx-auto mt-1 max-w-xs text-sm text-gray-400">
              {totalScanned === 0
                ? 'Scan your first business card above and it will appear here.'
                : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scannedCards.map((c) => (
              <ScannedContactCard key={c.id} contact={c} onOpen={setDetailContact} />
            ))}
          </div>
        )}
      </div>

      {detailContact && (
        <ContactDetailModal
          contactId={detailContact.id}
          initial={detailContact}
          onClose={() => setDetailContact(null)}
        />
      )}
    </div>
  );
}
