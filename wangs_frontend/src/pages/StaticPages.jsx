import React from 'react';
import { Link } from 'react-router-dom';
import SeoHead from '../components/SeoHead';
import { ShieldCheck, Mail, MapPin, Phone, Truck, RefreshCw, Award, Flame, ShieldAlert, CheckCircle2, XCircle, Check, X } from 'lucide-react';

export function AboutPage() {
  const faqs = [
    {
      q: 'What is Wangs?',
      a: 'Wangs is an India-based online marketplace developed in Nagaland, connecting customers with authentic regional food products and independent food makers.',
    },
    {
      q: 'Where did Wangs originate?',
      a: 'Wangs originated as a marketplace initiative developed in Nagaland, India.',
    },
    {
      q: 'What does Wangs sell?',
      a: 'Wangs focuses on authentic Naga pickles and regional food products, with plans to expand its marketplace to include products from different parts of India.',
    },
    {
      q: 'What is the purpose of Wangs?',
      a: 'Wangs aims to connect regional food makers with customers and make traditional regional food products easier to discover and purchase.',
    },
    {
      q: 'Is Wangs a food manufacturer?',
      a: 'No. Wangs operates as a multi-vendor marketplace. Independent sellers and manufacturers manage their own products.',
    },
    {
      q: 'Can manufacturers sell through Wangs?',
      a: "Yes. Manufacturers and eligible food businesses can apply to become sellers. Sellers must complete Wangs' verification and approval process.",
    },
    {
      q: 'Does Wangs operate across India?',
      a: "Wangs is designed as an India-focused marketplace. Actual product availability and delivery destinations depend on each seller's shipping permissions and applicable delivery arrangements.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12 text-stone-700">
      <SeoHead
        title="About Wangs | Indian Regional Food Marketplace"
        description="Wangs is an India-based online marketplace developed in Nagaland, connecting customers with authentic regional food products and independent food makers."
        canonicalPath="/about"
      />

      {/* About Wangs */}
      <section className="space-y-4">
        <span className="inline-block text-[11px] font-bold uppercase tracking-[0.18em] text-[#ab331c]">
          Indian Regional Food Marketplace · Nagaland, India
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
          About Wangs
        </h1>
        <div className="space-y-3 text-sm sm:text-base leading-relaxed text-stone-700">
          <p>
            Wangs (<span className="font-medium text-stone-900">wangs.in</span>) is an India-based online marketplace developed in Nagaland, connecting customers with authentic regional food products and independent food makers.
          </p>
          <p>
            Starting with the rich culinary traditions of Nagaland, Wangs aims to connect independent food makers, traditional producers and regional brands with people who appreciate authentic flavours and locally crafted food products.
          </p>
          <p>
            From traditional Naga pickles to regional delicacies from different parts of India, Wangs is building a platform where customers can discover food products that reflect India's diverse culinary heritage.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 pt-2 text-xs font-semibold">
          <Link
            to="/products"
            className="px-4 py-2 rounded-full bg-[#ab331c] text-white hover:bg-[#8e2815] transition-colors"
          >
            Explore Pickles &amp; Foods
          </Link>
          <Link
            to="/brands"
            className="px-4 py-2 rounded-full border border-stone-300 bg-white text-stone-800 hover:border-stone-900 transition-colors"
          >
            Browse Independent Makers
          </Link>
          <Link
            to="/manufacturer/register"
            className="px-4 py-2 rounded-full border border-stone-300 bg-white text-stone-800 hover:border-stone-900 transition-colors"
          >
            Become a Seller
          </Link>
        </div>
      </section>

      {/* Our Story */}
      <section className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-8 space-y-3 shadow-xs">
        <h2 className="font-serif text-2xl font-bold text-stone-900">Our Story</h2>
        <p className="text-sm leading-relaxed">
          Wangs began with an appreciation for traditional food, regional flavours and the people behind them.
        </p>
        <p className="text-sm leading-relaxed">
          Many independent food makers create distinctive products rooted in local ingredients, recipes and traditions. However, reaching customers beyond their immediate communities can be challenging.
        </p>
        <p className="text-sm leading-relaxed">
          Wangs aims to bridge this gap by providing an online marketplace where regional food makers can showcase their products and customers can discover flavours from different parts of India.
        </p>
      </section>

      {/* Mission & Vision */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#fbf8f3] rounded-3xl border border-stone-200/80 p-6 space-y-2.5">
          <h2 className="font-serif text-xl font-bold text-stone-900">Our Mission</h2>
          <p className="text-sm leading-relaxed">
            To connect regional food makers with customers, make authentic regional food products more accessible and support independent food businesses through digital commerce.
          </p>
        </div>
        <div className="bg-[#fbf8f3] rounded-3xl border border-stone-200/80 p-6 space-y-2.5">
          <h2 className="font-serif text-xl font-bold text-stone-900">Our Vision</h2>
          <p className="text-sm leading-relaxed">
            To become a trusted destination for discovering authentic regional food products from across India, while celebrating the people, traditions and culinary heritage behind them.
          </p>
        </div>
      </section>

      {/* What We Offer & Our Marketplace */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 space-y-3 shadow-xs">
          <h2 className="font-serif text-xl font-bold text-stone-900">What We Offer</h2>
          <p className="text-xs text-stone-500">
            Currently focused on Naga pickles and regional food products, with plans to expand into more regional categories across India.
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
              <span>Authentic Naga pickles (currently available).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
              <span>Regional pickles and traditional food products.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
              <span>Products from independent food makers.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
              <span>A marketplace for discovering regional flavours.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
              <span>An online platform connecting sellers and customers.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 space-y-3 shadow-xs">
          <h2 className="font-serif text-xl font-bold text-stone-900">Our Marketplace</h2>
          <div className="space-y-2.5 text-sm leading-relaxed">
            <p>Wangs operates as a multi-vendor marketplace.</p>
            <p>
              Independent sellers can register, create their stores and manage their product listings after seller verification and approval.
            </p>
            <p>
              Customers can discover products, compare offerings and place orders through the Wangs platform.
            </p>
            <p>
              Wangs aims to make regional food discovery and online shopping easier for both customers and manufacturers.
            </p>
          </div>
        </div>
      </section>

      {/* Our Commitment */}
      <section className="bg-[#28452e] text-white rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="font-serif text-2xl font-bold">Our Commitment</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-stone-100">
          <li className="flex items-start gap-2">
            <Check size={16} className="text-emerald-300 shrink-0 mt-0.5" />
            <span>Promoting authentic regional food products.</span>
          </li>
          <li className="flex items-start gap-2">
            <Check size={16} className="text-emerald-300 shrink-0 mt-0.5" />
            <span>Supporting independent food makers.</span>
          </li>
          <li className="flex items-start gap-2">
            <Check size={16} className="text-emerald-300 shrink-0 mt-0.5" />
            <span>Making product information transparent.</span>
          </li>
          <li className="flex items-start gap-2">
            <Check size={16} className="text-emerald-300 shrink-0 mt-0.5" />
            <span>Building a reliable online shopping experience.</span>
          </li>
          <li className="flex items-start gap-2 sm:col-span-2">
            <Check size={16} className="text-emerald-300 shrink-0 mt-0.5" />
            <span>Celebrating India's diverse culinary heritage.</span>
          </li>
        </ul>
      </section>

      {/* FAQ Section */}
      <section className="space-y-5" aria-labelledby="about-faq-heading">
        <div>
          <h2 id="about-faq-heading" className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Key facts about Wangs (wangs.in), our marketplace model, and regional food sellers.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((item) => (
            <div
              key={item.q}
              className="bg-white rounded-2xl border border-stone-200/80 p-5 space-y-1.5 shadow-xs"
            >
              <h3 className="font-serif text-base font-bold text-stone-900">{item.q}</h3>
              <p className="text-sm text-stone-700 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 text-xs sm:text-sm text-stone-700 leading-relaxed">
      <SeoHead
        title="Terms & Conditions | Wangs"
        description="Read the terms and conditions for shopping and selling on the Wangs regional food marketplace."
        canonicalPath="/terms"
      />
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
      <SeoHead
        title="Privacy Policy | Wangs"
        description="Read how Wangs handles customer data, order details, and payment security on wangs.in."
        canonicalPath="/privacy"
      />
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
      <SeoHead
        title="Shipping & Delivery Policy | Wangs"
        description="View Wangs packaging standards and delivery timelines for Naga pickles and regional food orders."
        canonicalPath="/shipping"
      />
      <h1 className="font-serif text-3xl font-bold text-stone-900">Shipping & Delivery Policy</h1>
      <div className="space-y-4">
        <p>
          Our artisanal pickles are prepared in small batches and securely packed in tempered glass containers. To ensure maximum freshness and prevent oil seepage, all glass containers are bubble-wrapped, sealed in food-grade shrink wrap, and packed in reinforced corrugated shipping boxes.
        </p>
        <div className="bg-cream-100 p-5 rounded-xl border border-stone-200 space-y-2">
          <h3 className="font-bold text-stone-900 text-sm">Estimated Delivery Timelines:</h3>
          <ul className="list-disc pl-5 space-y-2 text-xs">
            <li>
              <strong>Within Kohima:</strong> Delivered within <strong>12 hours</strong> (in best case <strong>30 minutes – 1 hour</strong>) via hyper-local courier.
            </li>
            <li>
              <strong>Out of Kohima (Within Nagaland):</strong> Delivered in <strong>1 – 2 days</strong> via regional priority logistics.
            </li>
            <li>
              <strong>Out of Nagaland (Pan-India):</strong> Delivered in <strong>4 – 10 days</strong> via certified domestic express network.
            </li>
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
      <SeoHead
        title="Refund & Return Policy | Wangs"
        description="Understand Wangs food safety, return, and refund policies for artisanal pickles and regional foods."
        canonicalPath="/refunds"
      />
      {/* Header */}
      <div className="border-b border-stone-200 pb-5">
        <span className="text-xs font-bold uppercase tracking-wider text-red-600">
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
      <div className="p-5 sm:p-6 bg-stone-900 text-white rounded-2xl sm:rounded-3xl border border-stone-800 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
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
                <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Severe Transit Breakage:</strong> Glass container or vacuum pouch arrived cracked, broken, or crushed during courier transport.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Damaged Seal or Oil Leakage:</strong> Safety pop-up vacuum seal was compromised or leaked heavily inside shipping bubble wrap upon arrival.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Incorrect Product Dispatched:</strong> The received item does not match the product listed on your confirmed order invoice.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
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
                <X size={14} className="text-rose-500 shrink-0 mt-0.5" />
                <span><strong>Change of Mind:</strong> Ordering errors, buyer remorse, or personal cancellation requests made after courier dispatch.</span>
              </li>
              <li className="flex items-start gap-2">
                <X size={14} className="text-rose-500 shrink-0 mt-0.5" />
                <span><strong>Subjective Taste & Aroma:</strong> Individual preferences regarding traditional saltiness, mustard oil pungency, or fermented aroma.</span>
              </li>
              <li className="flex items-start gap-2">
                <X size={14} className="text-rose-500 shrink-0 mt-0.5" />
                <span><strong>Spice Tolerance:</strong> King Chilli preserves are authentically fiery by design and are not eligible for returns based on heat level.</span>
              </li>
              <li className="flex items-start gap-2">
                <X size={14} className="text-rose-500 shrink-0 mt-0.5" />
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
            <strong>Resolution Execution:</strong> If the manufacturer authorizes the refund, the amount is credited directly to your original payment method (reflecting in 5–7 banking days). If the manufacturer authorizes a replacement, a fresh item is dispatched at zero cost.
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
          className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-colors self-start sm:self-auto text-center shadow-xs"
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
      <SeoHead
        title="Contact Wangs"
        description="Wangs is an India-based online marketplace developed in Nagaland, connecting customers with authentic regional food products and independent food makers."
        canonicalPath="/contact"
      />
      <div className="text-center space-y-2">
        <h1 className="font-serif text-3xl font-bold text-stone-900">Contact Wangs</h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto">
          Wangs is an India-based online marketplace developed in Nagaland, connecting customers with authentic regional food products and independent food makers. Reach out for customer support, product questions, or seller onboarding inquiries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2 text-center">
          <MapPin size={24} className="text-red-600 mx-auto" />
          <h3 className="font-serif font-bold text-sm text-stone-900">Artisan Workshop & HQ</h3>
          <p className="text-stone-500">Ministers Hill, Sector 4, Kohima - 797001</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2 text-center">
          <Mail size={24} className="text-red-600 mx-auto" />
          <h3 className="font-serif font-bold text-sm text-stone-900">Support Email</h3>
          <p className="text-stone-700 font-semibold">wangssupport@gmail.com</p>
          <p className="text-stone-400 text-[11px]">Direct Support & Inquiries</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2 text-center">
          <Phone size={24} className="text-red-600 mx-auto" />
          <h3 className="font-serif font-bold text-sm text-stone-900">Customer Helpline</h3>
          <p className="text-stone-500">+91 94360 12345</p>
          <p className="text-stone-400 text-[11px]">Mon - Sat: 9 AM to 6 PM IST</p>
        </div>
      </div>
    </div>
  );
}
