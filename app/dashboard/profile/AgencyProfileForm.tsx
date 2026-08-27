"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateAgencyProfile } from "./actions";

type Country = "NO" | "SE" | "DK" | "";

const COUNTRY_LABEL: Record<Exclude<Country, "">, string> = {
  NO: "Norway",
  SE: "Sweden",
  DK: "Denmark",
};

type AgencyDetails = {
  name: string;
  address: string;
  city: string;
  country: Country;
  mobilePhone: string;
  contactEmail: string;
  billingAddress: string;
  electronicInvoiceAddress: string;
  logoUrl: string | null;
};

async function uploadAgencyLogo(
  supabase: ReturnType<typeof createClient>,
  agencyId: string,
  file: File
) {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${agencyId}/logo/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from("agency-media")
    .upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);

  return supabase.storage.from("agency-media").getPublicUrl(path).data.publicUrl;
}

export function AgencyProfileForm({
  agencyId,
  initial,
  readOnly = false,
}: {
  agencyId: string;
  initial: AgencyDetails;
  readOnly?: boolean;
}) {
  const supabase = createClient();

  const [name, setName] = useState(initial.name);
  const [address, setAddress] = useState(initial.address);
  const [city, setCity] = useState(initial.city);
  const [country, setCountry] = useState<Country>(initial.country);
  const [mobilePhone, setMobilePhone] = useState(initial.mobilePhone);
  const [contactEmail, setContactEmail] = useState(initial.contactEmail);
  const [billingAddress, setBillingAddress] = useState(initial.billingAddress);
  const [electronicInvoiceAddress, setElectronicInvoiceAddress] = useState(
    initial.electronicInvoiceAddress
  );
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [logoUploading, setLogoUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setMessage(null);
    try {
      const url = await uploadAgencyLogo(supabase, agencyId, file);
      setLogoUrl(url);
      setMessage("Logo uploaded — remember to save.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't upload the logo.");
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setLoading(true);
    setMessage(null);
    try {
      await updateAgencyProfile({
        agencyId,
        name,
        address,
        city,
        country,
        mobilePhone,
        contactEmail,
        billingAddress,
        electronicInvoiceAddress,
        logoUrl,
      });
      setMessage("Profile saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink">
          Upload logo (used in your marketing materials)
        </label>
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Logo"
            className="mt-2 h-16 w-16 rounded-card border border-line object-cover"
          />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleLogoChange}
          disabled={logoUploading || readOnly}
          className="mt-2 text-sm text-ink/70"
        />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-ink">
          Company name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="address" className="block text-sm font-medium text-ink">
            Address
          </label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
          />
        </div>
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-ink">
            City
          </label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
          />
        </div>
      </div>

      <div>
        <label htmlFor="country" className="block text-sm font-medium text-ink">
          Country
        </label>
        <select
          id="country"
          value={country}
          onChange={(e) => setCountry(e.target.value as Country)}
          className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
        >
          <option value="">Select country</option>
          {(Object.keys(COUNTRY_LABEL) as Exclude<Country, "">[]).map((c) => (
            <option key={c} value={c}>
              {COUNTRY_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="mobilePhone" className="block text-sm font-medium text-ink">
            Mobile number
          </label>
          <input
            id="mobilePhone"
            type="tel"
            value={mobilePhone}
            onChange={(e) => setMobilePhone(e.target.value)}
            className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
          />
        </div>
        <div>
          <label htmlFor="contactEmail" className="block text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="contactEmail"
            type="email"
            required
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
          />
        </div>
      </div>

      <div>
        <label htmlFor="billingAddress" className="block text-sm font-medium text-ink">
          Billing address
        </label>
        <input
          id="billingAddress"
          type="text"
          value={billingAddress}
          onChange={(e) => setBillingAddress(e.target.value)}
          className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
        />
      </div>

      <div>
        <label
          htmlFor="electronicInvoiceAddress"
          className="block text-sm font-medium text-ink"
        >
          Electronic invoice address
        </label>
        <input
          id="electronicInvoiceAddress"
          type="text"
          value={electronicInvoiceAddress}
          onChange={(e) => setElectronicInvoiceAddress(e.target.value)}
          className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
        />
        <p className="mt-1 text-xs text-ink/50">Expected format: EHF/Peppol ID</p>
      </div>

      {message && <p className="text-sm text-wine">{message}</p>}

      {readOnly ? (
        <p className="text-xs text-ink/50">
          Actions are disabled while previewing as a customer.
        </p>
      ) : (
        <button
          type="submit"
          disabled={loading}
          className="rounded-card bg-wine px-4 py-2.5 font-semibold text-paper transition hover:bg-wine-dark disabled:opacity-60"
        >
          {loading ? "Please wait…" : "Save profile"}
        </button>
      )}
    </form>
  );
}
