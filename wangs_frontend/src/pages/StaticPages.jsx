import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, MapPin, Phone, Truck, RefreshCw, Award } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      <div className="text-center space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-forest-800">Heritage & Mission</span>
        <h1 className="font-serif text-4xl font-bold text-stone-900">About Wangs (wangs.in)</h1>
        <p className="text-sm text-stone-600 max-w-xl mx-auto">
          Preserving and bringing authentic Naga culinary heritage, firewood curing, and indigenous fermentations to households across India.
        </p>
      </div>

      <div className="prose prose-stone text-xs sm:text-sm text-stone-700 space-y-6 leading-relaxed">
        <div className="bg-cream-100 p-6 rounded-2xl border border-stone-200">
          <h2 className="font-serif font-bold text-xl text-stone-900 mb-2">The Heritage Kitchens of Nagaland</h2>
          <p>
            Wangs began with a simple reality: in Nagaland, pickles are not casual condiments, but deeply preserved staples of survival and celebration. For more than 35 years, Master Pickler Arenla cured smoked pork, fiery King Chilli (Raja Mircha), and pungent fermented soybean (Axone) in her traditional kitchen atop Ministers Hill in Kohima.
          </p>
          <p className="mt-2">
            Relatives and friends visiting from Dimapur, Guwahati, Shillong, and Delhi would carry away dozens of glass jars packed with her signature firewood-smoked pork pickle. Recognizing that authentic Naga food was either impossible to find outside the state or diluted with artificial preservatives, we built Wangs.
          </p>
        </div>

        <div>
          <h3 className="font-serif font-bold text-lg text-stone-900 mb-2">From Single Kitchen to Multi-Vendor Platform</h3>
          <p>
            While launched to share authentic Kohima culinary preparations, Wangs is structured as a dedicated regional multi-vendor marketplace. We partner with verified small-batch women entrepreneurs, self-help groups, and micro-enterprises from Kohima, Mokokchung, and Dimapur.
          </p>
          <p className="mt-2">
            Every seller must hold a valid FSSAI food business registration, follow strict glass jar hermetic sealing protocols, and adhere to traditional firewood smoking and natural fermentation without synthetic colorants or industrial vinegar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="p-4 bg-white rounded-xl border border-stone-200">
            <h4 className="font-bold text-stone-900 text-sm mb-1">Authentic Oak Cure</h4>
            <p className="text-xs text-stone-500">Meat smoked 72 hours over seasoned hill oak wood.</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-stone-200">
            <h4 className="font-bold text-stone-900 text-sm mb-1">GI-Tagged Chilli</h4>
            <p className="text-xs text-stone-500">Genuine Naga King Chilli (Bhut Jolokia / Raja Mircha).</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-stone-200">
            <h4 className="font-bold text-stone-900 text-sm mb-1">Cold-Pressed Oil</h4>
            <p className="text-xs text-stone-500">Natural virgin mustard oil acting as traditional preservative.</p>
          </div>
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
          Wangs (operating under wangs.in) is an online marketplace facilitating sales between independent licensed food manufacturers in Nagaland and consumers across India. Product listings, descriptions, and packaging are provided by verified manufacturers subject to administrative review.
        </p>

        <h2 className="font-serif font-bold text-base text-stone-900">2. Customer Platform Fee & Pricing Transparency</h2>
        <p>
          In accordance with marketplace standards, every order incurs a customer platform fee of ₹5.00, dedicated to packaging quality audits, tamper-evident seals, and platform escrow management. Product prices are inclusive of GST.
        </p>

        <h2 className="font-serif font-bold text-base text-stone-900">3. Food Safety & Allergen Notice</h2>
        <p>
          Naga food products often utilize natural fermented soybeans (Axone), mustard oil, bamboo shoots, and indigenous chilli varieties. Customers with specific food allergies are advised to consult ingredient lists before placing orders.
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
          Authentic Naga pickles are prepared and bottled in Nagaland. To ensure maximum freshness and prevent oil seepage, all glass jars are bubble-wrapped, sealed in food-grade shrink wrap, and packed in reinforced corrugated shipping boxes.
        </p>
        <div className="bg-cream-100 p-5 rounded-xl border border-stone-200 space-y-2">
          <h3 className="font-bold text-stone-900 text-sm">Estimated Delivery Timelines:</h3>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>Nagaland & Northeast India:</strong> 2-3 business days.</li>
            <li><strong>Metro Cities (Delhi, Mumbai, Bengaluru, Kolkata, Chennai, Hyderabad):</strong> 4-5 business days via air cargo.</li>
            <li><strong>Rest of India:</strong> 5-7 business days.</li>
          </ul>
        </div>
        <p>
          Orders over ₹999 qualify for <strong>Free Standard Delivery</strong>. A flat delivery fee of ₹50 applies to orders below ₹999.
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
        <p className="text-xs text-stone-500">We are based in Kohima, Nagaland. Reach out with questions, wholesale inquiries, or seller onboarding support.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2 text-center">
          <MapPin size={24} className="text-forest-800 mx-auto" />
          <h3 className="font-serif font-bold text-sm text-stone-900">Kohima Kitchen & HQ</h3>
          <p className="text-stone-500">Ministers Hill, Sector 4, Kohima, Nagaland - 797001</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2 text-center">
          <Mail size={24} className="text-forest-800 mx-auto" />
          <h3 className="font-serif font-bold text-sm text-stone-900">Email Inquiries</h3>
          <p className="text-stone-500">support@wangs.in</p>
          <p className="text-stone-400 text-[11px]">Response within 24 hours</p>
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
