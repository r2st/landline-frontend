import React, { useState, useRef, useCallback } from 'react';
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
  Globe,
  MapPin,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useScanCard } from '../hooks/useAI';
import { contactsApi, queryClient } from '../api/client';

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  title: '',
  company_name: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  city: '',
  state: '',
  country: '',
  linkedin_url: '',
  notes: '',
};

export default function CardScanner() {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [scanned, setScanned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedContact, setSavedContact] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const scanCard = useScanCard();

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
    scanCard.mutate(imageFile, {
      onSuccess: (data) => {
        setFormData((prev) => ({ ...prev, ...data }));
        setScanned(true);
        toast.success('Card scanned successfully');
      },
    });
  }, [imageFile, scanCard]);

  const handleFieldChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAddContact = useCallback(async () => {
    if (!formData.first_name && !formData.last_name && !formData.email) {
      toast.error('At least a name or email is required');
      return;
    }
    setSaving(true);
    try {
      const result = await contactsApi.quickAdd({
        first_name: formData.first_name,
        last_name: formData.last_name,
        title: formData.title,
        company_name: formData.company_name,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        linkedin_url: formData.linkedin_url,
        notes: formData.notes,
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
  }, [formData]);

  const handleReset = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(INITIAL_FORM);
    setScanned(false);
    setSavedContact(null);
    scanCard.reset();
  }, [scanCard]);

  const FormField = ({ label, field, icon: Icon, type = 'text', placeholder }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        )}
        <input
          type={type}
          value={formData[field]}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          placeholder={placeholder || label}
          className={`w-full rounded-lg border border-gray-200 bg-white py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition ${
            Icon ? 'pl-9 pr-3' : 'px-3'
          }`}
        />
      </div>
    </div>
  );

  // quick-add response shape varies ({contact:{...}} or flat) — handle both.
  const savedContactId = savedContact?.contact?.id || savedContact?.id || null;
  const savedCompanyId = savedContact?.contact?.company_id || savedContact?.company_id || null;

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
                      Scan Card
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
            /* Saved state */
            <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
              <div className="inline-flex items-center justify-center rounded-full bg-green-100 p-3 mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Contact Added</h3>
              <p className="text-gray-600 text-sm mb-4">
                {formData.first_name} {formData.last_name}
                {formData.company_name ? ` at ${formData.company_name}` : ''}
                {' '}has been saved to your contacts.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href={savedContactId ? `/contacts?highlight=${savedContactId}` : '/contacts'}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
                <FormField label="First Name" field="first_name" icon={UserPlus} />
                <FormField label="Last Name" field="last_name" icon={UserPlus} />
              </div>
              <FormField label="Title" field="title" />

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Email" field="email" icon={Mail} type="email" />
                <FormField label="Phone" field="phone" icon={Phone} type="tel" />
              </div>
              <FormField label="LinkedIn" field="linkedin_url" icon={Globe} placeholder="https://linkedin.com/in/..." />

              {/* Company */}
              <p className="pt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Company</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Company" field="company_name" icon={Building2} />
                <FormField label="Website" field="website" icon={Globe} />
              </div>

              {/* Location */}
              <p className="pt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Location</p>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="City" field="city" icon={MapPin} />
                <FormField label="State" field="state" />
                <FormField label="Country" field="country" />
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
    </div>
  );
}
