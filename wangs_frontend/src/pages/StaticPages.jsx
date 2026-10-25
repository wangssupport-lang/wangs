import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, MapPin, Phone, Truck, RefreshCw, Award, Flame } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      <div className="text-center space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-forest-800">Quality & Standards</span>
        <h1 className="font-serif text-4xl font-bold text-stone-900">About Wangs (wangs.in)</h1>
        <p className="text-sm text-stone-600 max-w-xl mx-auto">
          India's dedicated multi-vendor marketplace connecting verified artisanal food producers with culinary enthusiasts nationwide.
        </p>
      </div>

      <div className="prose prose-stone text-xs sm:text-sm text-stone-700 space-y-6 leading-relaxed">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-xl bg-forest-50 text-forest-800 flex items-center justify-center">
              <Award size={18} />
            </div>
            <h4 className="font-serif font-bold text-stone-900 text-sm">72h Firewood Smoke</h4>
            <p className="text-xs text-stone-500 leading-relaxed">Meats cured over aged oak firewood embers for distinctive campfire depth.</p>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-xl bg-chilli-50 text-chilli-700 flex items-center justify-center">
              <Flame size={18} />
            </div>
            <h4 className="font-serif font-bold text-stone-900 text-sm">Authentic King Chilli</h4>
            <p className="text-xs text-stone-500 leading-relaxed">Genuine Raja Mircha steeped in virgin cold-pressed mustard oil.</p>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <h4 className="font-serif font-bold text-stone-900 text-sm">Verified Producers</h4>
            <p className="text-xs text-stone-500 leading-relaxed">All producers hold active FSSAI registration with verified hygiene protocols.</p>
          </div>
        </div>

        <div className="bg-cream-100 p-6 rounded-2xl border border-stone-200 text-xs sm:text-sm space-y-3">
          <h3 className="font-serif font-bold text-base text-stone-900">Marketplace Standards</h3>
          <p>
            Wangs provides direct nationwide logistics, transparent 10% platform commission, and tamper-evident packaging for certified artisanal food entrepreneurs. Every glass jar is sealed with food-grade safety film and shipped via express air delivery.
          </p>
        </div>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 text-xs sm:text-sm text-stone-700 leading-relaxed">
      <h1 className="font-serif text-3xl font-bold text-stone-900">Terms & Conditions</h1>
      <p className="text-stone-500 text-xs">Last updated: October 2026 · wangs.in</p>

      <div className="space-y-4">
        <h2 className="font-serif font-bold text-base text-stone-900">1. Platform Nature & Multi-Vendor Operation</h2>
        <p>
          Wangs (operating under wangs.in) is an online marketplace facilitating sales between independent licensed food manufacturers and consumers across India. Product listings, descriptions, and packaging are provided by verified manufacturers subject to administrative review.
        </p>

        <h2 className="font-serif font-bold text-base text-stone-900">2. Customer Platform Fee & Pricing Transparency</h2>
        <p>
          In accordance with marketplace standards, every order incurs a customer platform fee of ₹5.00, dedicated to packaging quality audits, tamper-evident seals, and platform escrow management. Product prices are inclusive of GST.
        </p>

        <h2 className="font-serif font-bold text-base text-stone-900">3. Food Safety & Allergen Notice</h2>
        <p>
          Artisanal pickle products often utilize natural fermented soybeans (Axone), mustard oil, bamboo shoots, and indigenous chilli varieties. Customers with specific food allergies are advised to consult ingredient lists before placing orders.
        </p>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 text-xs sm:text-sm text-stone-700 leading-relaxed">
      <h1 className="font-serif text-3xl font-bold text-stone-900">Privacy Policy</h1>
      <p className="text-stone-500 text-xs">Commitment to Data Security & Compliance · wangs.in</p>

      <div className="space-y-4">
        <p>
          At Wangs, we value your privacy. We collect customer information (name, delivery address, contact email, and mobile number) strictly to facilitate courier dispatch, delivery status notifications, and lawful tax compliance.
        </p>
        <h2 className="font-serif font-bold text-base text-stone-900">Payment Security</h2>
        <p>
          We do NOT store credit or debit card credentials, CVVs, or banking PINs. All payment transactions are securely handled through PCI-DSS compliant Indian payment gateways with 256-bit SSL encryption.
        </p>
      </div>
    </div>
  );
}

export function ShippingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 text-xs sm:text-sm text-stone-700 leading-relaxed">
      <h1 className="font-serif text-3xl font-bold text-stone-900">Shipping & Delivery Policy</h1>
      <div className="space-y-4">
        <p>
          Our artisanal pickles are prepared in small batches and securely packed in tempered glass jars. To ensure maximum freshness and prevent oil seepage, all glass jars are bubble-wrapped, sealed in food-grade shrink wrap, and packed in reinforced corrugated shipping boxes.
        </p>
        <div className="bg-cream-100 p-5 rounded-xl border border-stone-200 space-y-2">
          <h3 className="font-bold text-stone-900 text-sm">Estimated Delivery Timelines:</h3>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>Regional Priority:</strong> 2-3 business days.</li>
            <li><strong>Metro Cities (Delhi, Mumbai, Bengaluru, Kolkata, Chennai, Hyderabad):</strong> 4-5 business days via air cargo.</li>
            <li><strong>Rest of India:</strong> 5-7 business days.</li>
          </ul>
        </div>
        <p>
          All customer orders across India qualify for <strong>100% Free Standard & Express Air Delivery</strong>. Delivery logistics costs are included in the listed pricing so customers never pay any shipping fees.
        </p>
      </div>
    </div>
  );
}

export function RefundsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 text-xs sm:text-sm text-stone-700 leading-relaxed">
      <h1 className="font-serif text-3xl font-bold text-stone-900">Returns & Refund Policy</h1>
      <div className="space-y-4">
        <p>
          Due to the perishable nature of handcrafted food products and traditional meat preserves, we cannot accept returns once a seal has been opened.
        </p>
        <h3 className="font-serif font-bold text-base text-stone-900">Damaged or Broken in Transit Replacement Guarantee:</h3>
        <p>
          If a glass jar arrives broken or damaged due to courier mishandling, contact us within 48 hours of delivery with a photograph of the damaged parcel. We will issue a 100% full refund or dispatch an immediate replacement at zero cost.
        </p>
      </div>
    </div>
  );
}

export function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-serif text-3xl font-bold text-stone-900">Contact Wangs Support</h1>
        <p className="text-xs text-stone-500">We are based in Kohima. Reach out with questions, wholesale inquiries, or seller onboarding support.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2 text-center">
          <MapPin size={24} className="text-forest-800 mx-auto" />
          <h3 className="font-serif font-bold text-sm text-stone-900">Artisan Workshop & HQ</h3>
          <p className="text-stone-500">Ministers Hill, Sector 4, Kohima - 797001</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2 text-center">
          <Mail size={24} className="text-forest-800 mx-auto" />
          <h3 className="font-serif font-bold text-sm text-stone-900">Support Email</h3>
          <p className="text-stone-700 font-semibold">wangssupport@gmail.com</p>
          <p className="text-stone-400 text-[11px]">Direct Support & Inquiries</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2 text-center">
          <Phone size={24} className="text-forest-800 mx-auto" />
          <h3 className="font-serif font-bold text-sm text-stone-900">Customer Helpline</h3>
          <p className="text-stone-500">+91 94360 12345</p>
          <p className="text-stone-400 text-[11px]">Mon - Sat: 9 AM to 6 PM IST</p>
        </div>
      </div>
    </div>
  );
}
