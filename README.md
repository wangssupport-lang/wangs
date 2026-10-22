# Wangs — Authentic Naga Pickle Marketplace
**Domain:** [wangs.in](https://wangs.in)

Wangs is a production-oriented, multi-vendor e-commerce marketplace dedicated to authentic Naga pickles, smoked meats, and regional food products from Nagaland, India.

Born from over 35 years of traditional family culinary craft in Kohima, Wangs features traditional oak firewood-smoked pork, GI-tagged King Chilli (Raja Mircha / Bhut Jolokia), and fermented bamboo shoot pickles, while serving as a compliant, transparent marketplace for verified artisan manufacturers across Nagaland.

---

## 1. System Architecture & Tech Stack

### Frontend (`/wangs_frontend`)
- **React 18** with **Vite**
- **Tailwind CSS** with a custom Naga earth & forest design system:
  - Deep forest green (`#142721`, `#1e382f`)
  - Warm cream background (`#fdfbf7`, `#fbf7f0`)
  - Earthy wood tones (`#6d4c41`)
  - Subtle fiery chilli accents (`#dc2626`)
  - Typography: Serif headings (*Playfair Display*) and clean modern sans (*Inter*)
- **React Router DOM v6**
- **Lucide React** icons

### Backend (`/wangs_backend`)
- **Python 3.12+ / Django REST Framework**
- **PostgreSQL** database (supports automatic fallback to SQLite for local development)
- **Role-Based Access Control (RBAC)**: `CUSTOMER`, `MANUFACTURER`, `ADMIN`
- **SimpleJWT & Session Authentication**
- **Idempotent Payment Gateway Support** (Razorpay test mode & production signature verification)
- **Atomic Database Transactions** protecting inventory and immutable financial records

---

## 2. Strict Financial Calculation Rules (Section 6)

Wangs implements deterministic, backend-enforced financial calculations that protect both producers and customers:

```
Product price:               ₹100.00
Platform commission (10%):   ₹10.00   (Deducted from manufacturer gross)
Manufacturer gross payable:  ₹90.00
Customer platform fee:       ₹5.00
Standard delivery fee:       ₹50.00   (Free on orders ≥ ₹999.00)
------------------------------------
Total paid by customer:      ₹155.00
```

- Platform commission is deducted from the seller's product gross, **never charged a second time to the customer**.
- Order records store an **immutable snapshot** of product unit prices, weights, applied commission rates, and order-level fees so future commission changes do not alter historical records.

---

## 3. Project Structure

```
wangspickle/
├── .env.example
├── render.yaml                    # Render Blueprint (Backend + PostgreSQL)
├── README.md
│
├── wangs_backend/                 # Django REST Framework Backend
│   ├── manage.py
│   ├── requirements.txt
│   ├── config/                    # Settings, WSGI, URLs
│   │   ├── settings.py
│   │   └── urls.py
│   └── marketplace/               # Core domain application
│       ├── models.py              # User, Profile, Product, Order, Fee, Settlement
│       ├── serializers.py         # DRF Serializers
│       ├── views.py               # Public, Customer, Manufacturer & Admin Views
│       ├── urls.py                # API routing
│       ├── permissions.py         # Role-based access control
│       ├── services.py            # Financial calculator, order snapshotting, payments
│       ├── tests.py               # Automated unit & integration tests
│       └── management/commands/
│           └── seed_wangs_data.py # Sample Naga pickle products & demo users
│
└── wangs_frontend/                # React + Vite Frontend
    ├── package.json
    ├── tailwind.config.js
    ├── vite.config.js
    ├── vercel.json                # Vercel SPA deployment configuration
    ├── index.html
    └── src/
        ├── api.js                 # Central API service client
        ├── context/
        │   ├── AuthContext.jsx    # Authentication & roles
        │   └── CartContext.jsx    # Persistent basket & checkout quote
        ├── components/
        │   ├── Navbar.jsx         # Header, PIN serviceability, search
        │   ├── Footer.jsx         # Legal, brand story, FSSAI compliance
        │   ├── ProductCard.jsx    # Clean card with spice meter & weight
        │   ├── CartDrawer.jsx     # Slide-over cart preview
        │   └── SpiceMeter.jsx     # 4-tier chilli heat rating (Mild to Fiery)
        └── pages/
            ├── HomePage.jsx       # Hero, story, categories, bestsellers
            ├── ProductListPage.jsx# Search, filters (diet, spice, price), sort
            ├── ProductDetailPage.jsx # Gallery, ingredients, PIN code checker
            ├── CartPage.jsx       # Itemized fees, coupon codes
            ├── CheckoutPage.jsx   # Address, Razorpay test payment modal
            ├── OrderSuccessPage.jsx# Order confirmation & receipt
            ├── CustomerAccountPage.jsx # Orders, saved addresses, profile
            ├── ManufacturerPortalPage.jsx # Seller orders, products, earnings
            ├── ManufacturerRegisterPage.jsx # FSSAI seller onboarding
            ├── AdminDashboardPage.jsx # Commission manager, approvals, audit log
            ├── AuthPages.jsx      # Login, registration, quick demo switcher
            └── StaticPages.jsx    # About, Terms, Privacy, Shipping, Refunds, Contact
```

---

## 4. Local Setup & Quickstart

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Backend Setup
```bash
cd wangs_backend

# 1. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Apply database migrations
python manage.py migrate

# 4. Populate database with authentic Naga pickle products & demo accounts
python manage.py seed_wangs_data

# 5. Run automated tests
python manage.py test marketplace

# 6. Start the Django dev server
python manage.py runserver 8000
```

### Frontend Setup
```bash
cd wangs_frontend

# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```

Visit **http://localhost:3000** in your browser.

---

## 5. Pre-Seeded Demo Accounts

The database comes pre-populated with authentic test accounts:

| Role | Username | Password | Email | Purpose |
|---|---|---|---|---|
| **Administrator** | `admin` | `admin12345` | `admin@wangs.in` | Platform metrics, commission settings, seller review |
| **Arenla Heritage (Manufacturer)** | `arenla_kitchen` | `arenla12345` | `arenla@wangs.in` | Foundational seller: Smoked Pork & King Chilli |
| **Dzüko Artisans (Manufacturer)**| `dzuko_artisans` | `dzuko12345`| `contact@dzukocraft.in` | Approved seller: Bamboo shoot & river fish |
| **Customer** | `customer` | `customer12345`| `customer@wangs.in` | Placing orders, saving addresses, order tracking |

---

## 6. Testing

Run backend automated tests verifying financial calculations, seller access controls, order snapshotting, and payment idempotency:

```bash
cd wangs_backend
./venv/bin/python manage.py test marketplace
```

---

## 7. Production Deployment

### Backend (Render)
1. Fork or push this repository to GitHub.
2. In Render, select **New Blueprint** and connect your repository (uses `render.yaml`).
3. Render automatically provisions a managed PostgreSQL database, executes migrations, seeds the catalog, and starts Gunicorn on port 8000.

### Frontend (Vercel)
1. Import `wangs_frontend` into Vercel.
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Set environment variable `VITE_API_URL` pointing to your deployed backend or use the included `vercel.json` rewrite proxy.
