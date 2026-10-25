import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, MapPin, Phone, Truck, RefreshCw, Award, Flame, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 text-xs sm:text-sm text-stone-700 leading-relaxed">
      {/* Header */}
      <div className="border-b border-stone-200 pb-5">
        <span className="text-xs font-bold uppercase tracking-wider text-forest-800">
          Store Policies & Producer Autonomy
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-1">
          No-Return & Manufacturer-Governed Refund Policy
        </h1>
        <p className="text-xs text-stone-500 mt-1.5">
          Wangs Artisanal Multi-Vendor Marketplace · Verified Regional Producers
        </p>
      </div>

      {/* Strict No-Return Banner */}
      <div className="p-5 sm:p-6 bg-amber-50/80 border border-amber-200/90 rounded-2xl sm:rounded-3xl flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
          <ShieldAlert size={20} />
        </div>
        <div>
          <h3 className="font-serif font-bold text-stone-900 text-sm sm:text-base">
            Strict No-Return Policy (Edible & Perishable Food Items)
          </h3>
          <p className="text-xs text-stone-600 mt-1 leading-relaxed">
            Due to the perishable nature of handcrafted food products, slow-cured preserves, and strict FSSAI food hygiene protocols, <strong>we cannot accept physical returns under any circumstances</strong> once an order has been dispatched or delivered.
          </p>
        </div>
      </div>

      {/* Manufacturer Discretion Highlight Banner */}
      <div className="p-5 sm:p-6 bg-forest-950 text-cream-100 rounded-2xl sm:rounded-3xl border border-forest-800 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
          <Award size={15} />
          <span>Manufacturer Autonomy & Decision-Making</span>
        </div>
        <h2 className="font-serif text-lg sm:text-xl font-bold text-white">
          Refunds are Fully Dependent on the Manufacturer
        </h2>
        <p className="text-xs text-cream-200/90 leading-relaxed">
          Wangs is a dedicated marketplace connecting customers directly with independent verified producers. Because each batch is cured, sealed, and packaged directly by the respective brand, <strong>the decision to approve or reject a refund or replacement is completely and fully dependent on the manufacturer</strong>. Each manufacturer reserves the full right to evaluate whether they want to allow a refund based on the evidence provided.
        </p>
      </div>

      {/* Refunds: Only for Genuine Reasons */}
      <div className="space-y-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-stone-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>Refunds Considered Only for Genuine, Verified Reasons</span>
          </h2>
          <p className="text-xs text-stone-600 mt-1">
            Manufacturers will only review and consider claims where there is a <strong>clear, genuine physical defect or transit mishap</strong> supported by unboxing photos/video within 48 hours of delivery:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Genuine Reasons (Subject to Manufacturer Approval) */}
          <div className="p-5 bg-white rounded-2xl border border-emerald-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wide">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Genuine Reasons (Reviewed by Manufacturer)</span>
            </div>
            <ul className="space-y-2 text-xs text-stone-600">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Severe Transit Breakage:</strong> Glass jar or vacuum pouch arrived cracked, broken, or crushed during courier transport.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Damaged Seal or Oil Leakage:</strong> Safety pop-up vacuum seal was compromised or leaked heavily inside shipping bubble wrap upon arrival.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Incorrect Product Dispatched:</strong> The received item does not match the product listed on your confirmed order invoice.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Proven Quality Defect on Arrival:</strong> Verified freshness or spoilage anomaly reported immediately with unboxing proof.</span>
              </li>
            </ul>
          </div>

          {/* Non-Eligible Reasons (Disallowed by Manufacturers) */}
          <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-stone-700 font-bold text-xs uppercase tracking-wide">
              <XCircle size={16} className="text-rose-600" />
              <span>Non-Eligible Claims (Declined by Manufacturers)</span>
            </div>
            <ul className="space-y-2 text-xs text-stone-600">
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                <span><strong>Change of Mind:</strong> Ordering errors, buyer remorse, or personal cancellation requests made after courier dispatch.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                <span><strong>Subjective Taste & Aroma:</strong> Individual preferences regarding traditional saltiness, mustard oil pungency, or fermented aroma.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                <span><strong>Spice Tolerance:</strong> King Chilli preserves are authentically fiery by design and are not eligible for returns based on heat level.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">✕</span>
                <span><strong>Claims Without Proof / Past 48 Hours:</strong> Requests submitted without clear unboxing photos/videos or delayed beyond the 48-hour delivery window.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Claim Submission & Review Workflow */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-3">
        <h3 className="font-serif font-bold text-base text-stone-900">
          How the Manufacturer Review Process Works
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-xs text-stone-600 leading-relaxed">
          <li>
            <strong>Customer Submits Claim within 48 Hours:</strong> Email <strong>wangssupport@gmail.com</strong> with your Order Number (#WNG-...), clear photos/video of the courier label (AWB), and photos of the damaged or defective item.
          </li>
          <li>
            <strong>Forwarded to Respective Manufacturer:</strong> Wangs forwards your claim and unboxing evidence directly to the independent brand manufacturer who produced the batch.
          </li>
          <li>
            <strong>Manufacturer Decision:</strong> The manufacturer reviews the genuine evidence and decides whether to approve a refund or dispatch an immediate replacement.
          </li>
          <li>
            <strong>Resolution Execution:</strong> If the manufacturer authorizes the refund, the amount is credited directly to your original payment method (reflecting in 5–7 banking days). If the manufacturer authorizes a replacement, a fresh jar is dispatched at zero cost.
          </li>
        </ol>
      </div>

      {/* Support Card */}
      <div className="p-5 bg-stone-100 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-stone-700">
        <div>
          <span className="font-bold text-stone-900">Have a genuine issue with an order?</span>
          <p className="text-[11px] text-stone-500">Contact our support team to submit your evidence for manufacturer review.</p>
        </div>
        <Link
          to="/contact"
          className="px-4 py-2 bg-forest-900 text-white rounded-xl font-bold text-xs hover:bg-forest-950 transition-colors self-start sm:self-auto text-center"
        >
          Contact Support
        </Link>
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
