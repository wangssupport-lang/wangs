import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, ShieldCheck, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../api';

export default function ManufacturerRegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    business_name: '',
    brand_story: '',
    location_district: 'Kohima, Nagaland',
    contact_email: '',
    contact_phone: '',
    business_address: '',
    postal_code: '',
    fssai_license_number: '',
    gst_number: '',
    compliance_notes: '',
    bank_account_holder: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_name: '',
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.registerManufacturer(formData);
      setSuccessMsg(res.message || 'Application submitted successfully! Our compliance team will review your details.');
      setTimeout(() => {
        navigate('/manufacturer');
      }, 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit application. Please check input fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="w-14 h-14 bg-forest-100 text-forest-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Store size={28} />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-forest-800">
          Partner with Wangs
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-1">
          Manufacturer Registration & Onboarding
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-2">
          Join Nagaland’s authentic pickle and regional food marketplace.
          All manufacturer accounts undergo strict administrative review and FSSAI compliance verification.
        </p>
      </div>

      {successMsg ? (
        <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-2xl text-center space-y-3">
          <CheckCircle size={36} className="text-emerald-600 mx-auto" />
          <h3 className="font-serif font-bold text-lg text-emerald-900">Application Submitted</h3>
          <p className="text-xs text-emerald-800 max-w-md mx-auto">{successMsg}</p>
          <p className="text-xs text-stone-500">Redirecting to your manufacturer workspace...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-10 rounded-2xl border border-stone-200 shadow-sm text-xs">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: User Account */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-sm text-stone-900 border-b border-stone-100 pb-2">
              1. Seller Account Credentials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-stone-700 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="e.g. Arenla Ao"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Desired Username *</label>
                <input
                  type="text"
                  required
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="e.g. arenla_kitchen"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Personal / Business Email *</label>
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. contact@arenlafoods.in"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Password (min 6 characters) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Business & Food Licensing */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-sm text-stone-900 border-b border-stone-100 pb-2">
              2. Manufacturing Business & Food Compliance Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-stone-700 font-medium mb-1">Registered Business / Kitchen Name *</label>
                <input
                  type="text"
                  required
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                  placeholder="e.g. Dzüko Artisans"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">District / Region in Nagaland *</label>
                <input
                  type="text"
                  required
                  name="location_district"
                  value={formData.location_district}
                  onChange={handleChange}
                  placeholder="e.g. Kohima or Mokokchung"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">FSSAI Food Business License Number *</label>
                <input
                  type="text"
                  required
                  name="fssai_license_number"
                  value={formData.fssai_license_number}
                  onChange={handleChange}
                  placeholder="14-digit FSSAI License Number"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">GST Registration Number (if applicable)</label>
                <input
                  type="text"
                  name="gst_number"
                  value={formData.gst_number}
                  onChange={handleChange}
                  placeholder="15-digit GSTIN"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-stone-700 font-medium mb-1">Physical Kitchen / Manufacturing Facility Address *</label>
                <textarea
                  rows={2}
                  required
                  name="business_address"
                  value={formData.business_address}
                  onChange={handleChange}
                  placeholder="Full physical address in Nagaland"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-stone-700 font-medium mb-1">Brand Story & Pickling Heritage</label>
                <textarea
                  rows={3}
                  name="brand_story"
                  value={formData.brand_story}
                  onChange={handleChange}
                  placeholder="Tell our customers how your recipes originated, wood smoking techniques, wild hill sourcing..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Banking for Escrow Payouts */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-sm text-stone-900 border-b border-stone-100 pb-2">
              3. Settlement Bank Account Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-stone-700 font-medium mb-1">Account Holder Name *</label>
                <input
                  type="text"
                  required
                  name="bank_account_holder"
                  value={formData.bank_account_holder}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  placeholder="e.g. State Bank of India"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Bank Account Number *</label>
                <input
                  type="text"
                  required
                  name="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">IFSC Code *</label>
                <input
                  type="text"
                  required
                  name="bank_ifsc_code"
                  value={formData.bank_ifsc_code}
                  onChange={handleChange}
                  placeholder="e.g. SBIN0000214"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-forest-50 border border-forest-200 rounded-xl text-forest-900 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-700" /> Marketplace Agreement:
            </p>
            <p className="text-stone-600">
              Standard platform commission of 10% is deducted from gross sales upon customer delivery.
              New products will require admin approval before becoming visible to buyers.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            {loading ? <span>Submitting verification details...</span> : (
              <>
                <span>Submit Manufacturer Application for Review</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
