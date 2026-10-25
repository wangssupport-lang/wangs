import os
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from marketplace.models import (
    User, CustomerProfile, Address, ManufacturerProfile,
    Category, Product, ProductImage, ProductReview, CommissionSetting, Coupon
)

class Command(BaseCommand):
    help = "Seeds initial artisanal pickle categories, products, verified businesses, and test users."

    def handle(self, *args, **options):
        self.stdout.write("Seeding Wangs marketplace data...")

        # 1. Commission Setting
        comm, _ = CommissionSetting.objects.get_or_create(
            id=1,
            defaults={
                'default_commission_rate': Decimal('10.00'),
                'customer_platform_fee': Decimal('5.00'),
                'default_delivery_fee': Decimal('50.00'),
                'free_delivery_threshold': Decimal('999.00'),
            }
        )

        # 2. Coupons
        Coupon.objects.get_or_create(
            code='WANGS10',
            defaults={
                'discount_type': Coupon.DiscountType.PERCENTAGE,
                'value': Decimal('10.00'),
                'min_spend': Decimal('300.00'),
                'max_discount_cap': Decimal('150.00'),
                'is_active': True
            }
        )
        Coupon.objects.get_or_create(
            code='WANGS50',
            defaults={
                'discount_type': Coupon.DiscountType.FLAT,
                'value': Decimal('50.00'),
                'min_spend': Decimal('400.00'),
                'is_active': True
            }
        )

        # 3. Users
        # Admin
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@wangs.in',
                'first_name': 'Wangs',
                'last_name': 'Admin',
                'role': User.Role.ADMIN,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            admin_user.set_password('admin12345')
            admin_user.save()

        # Arenla Heritage Craft (Primary founding manufacturer)
        arenla_user, created = User.objects.get_or_create(
            username='arenla_craft',
            defaults={
                'email': 'arenla@wangs.in',
                'first_name': 'Arenla',
                'last_name': 'Ao',
                'role': User.Role.MANUFACTURER,
                'phone_number': '+91 94360 12345',
            }
        )
        if created:
            arenla_user.set_password('arenla12345')
            arenla_user.save()

        arenla_profile, _ = ManufacturerProfile.objects.update_or_create(
            user=arenla_user,
            defaults={
                'business_name': "Arenla's Heritage Craft",
                'slug': 'arenlas-heritage-craft',
                'brand_story': (
                    "Handcrafted small-batch pickles cured with traditional oak firewood smoking, "
                    "sun-ripened King Chillies, and natural slow fermentations."
                ),
                'location_district': 'Ministers Hill, Kohima',
                'contact_email': 'arenla@wangs.in',
                'contact_phone': '+91 94360 12345',
                'business_address': 'Sector 4, Ministers Hill, Kohima - 797001',
                'postal_code': '797001',
                'fssai_license_number': '10023064000124',
                'gst_number': '13AABCA1234Z1Z5',
                'compliance_notes': 'Verified traditional micro-enterprise food processing unit in Kohima.',
                'bank_account_holder': "Arenla Ao",
                'bank_account_number': '302910482910',
                'bank_ifsc_code': 'SBIN0000214',
                'bank_name': 'State Bank of India Kohima',
                'status': ManufacturerProfile.Status.APPROVED,
                'commission_rate_override': Decimal('10.00'),
                'is_verified_producer': True,
                'is_featured': True,
                'brand_badge': 'Official Brand Store · Amazon Spotlight',
                'tagline': "Kohima's Heritage Wood-Smoked Pork & Fiery King Chilli Pantry",
                'hero_banner': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80',
            }
        )

        # Second approved manufacturer: Lia Chuka
        lia_user, created = User.objects.get_or_create(
            username='liachuka',
            defaults={
                'email': 'orders@liachuka.in',
                'first_name': 'Lia',
                'last_name': 'Chuka',
                'role': User.Role.MANUFACTURER,
                'phone_number': '+91 94360 88888',
            }
        )
        if created:
            lia_user.set_password('liachuka12345')
            lia_user.save()

        lia_profile, _ = ManufacturerProfile.objects.update_or_create(
            user=lia_user,
            defaults={
                'business_name': 'Lia Chuka',
                'slug': 'lia-chuka',
                'brand_story': 'Taste Our Hills. Local foods, real flavours, crafted with traditional recipes, bold earthy authentic spices, and zero artificial preservatives. Small batch and sourced responsibly.',
                'location_district': 'Kohima District',
                'contact_email': 'orders@liachuka.in',
                'contact_phone': '+91 94360 88888',
                'business_address': 'Main Market, Kohima - 797001',
                'postal_code': '797001',
                'fssai_license_number': '10023064000888',
                'status': ManufacturerProfile.Status.APPROVED,
                'commission_rate_override': Decimal('10.00'),
                'is_verified_producer': True,
                'is_featured': True,
                'brand_badge': 'Featured Brand · Taste Our Hills',
                'tagline': 'Local Foods. Real Flavours. Bold · Earthy · Authentic',
                'hero_banner': '/featured-pouches.jpg',
            }
        )

        # Third approved manufacturer: Dzüko Artisans
        dzuko_user, created = User.objects.get_or_create(
            username='dzuko_artisans',
            defaults={
                'email': 'contact@dzukocraft.in',
                'first_name': 'Temjen',
                'last_name': 'Jamir',
                'role': User.Role.MANUFACTURER,
                'phone_number': '+91 98621 54321',
            }
        )
        if created:
            dzuko_user.set_password('dzuko12345')
            dzuko_user.save()

        dzuko_profile, _ = ManufacturerProfile.objects.update_or_create(
            user=dzuko_user,
            defaults={
                'business_name': "Dzüko Valley Artisans",
                'slug': 'dzuko-valley-artisans',
                'brand_story': "Wild-harvested forest bamboo shoot pickles and smoked mountain condiments from Mokokchung.",
                'location_district': 'Mokokchung',
                'contact_email': 'contact@dzukocraft.in',
                'contact_phone': '+91 98621 54321',
                'business_address': 'Arkong Ward, Mokokchung - 798601',
                'postal_code': '798601',
                'fssai_license_number': '10024075000341',
                'status': ManufacturerProfile.Status.APPROVED,
                'commission_rate_override': Decimal('12.00'),
                'is_verified_producer': True,
                'is_featured': True,
                'brand_badge': 'Featured Brand · Wild Bamboo Harvest',
                'tagline': "Wild-Harvested Bastenga & Slow Fermented Forest Flavours",
                'hero_banner': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200&auto=format&fit=crop&q=80',
            }
        )

        # Pending manufacturer application: Highland Harvest
        hills_user, created = User.objects.get_or_create(
            username='highland_harvest',
            defaults={
                'email': 'hello@highlandharvest.com',
                'first_name': 'Kevi',
                'last_name': 'Kire',
                'role': User.Role.MANUFACTURER,
                'phone_number': '+91 94368 99887',
            }
        )
        if created:
            hills_user.set_password('hills12345')
            hills_user.save()

        ManufacturerProfile.objects.update_or_create(
            user=hills_user,
            defaults={
                'business_name': "Highland Harvest",
                'slug': 'highland-harvest',
                'brand_story': "Small-batch organic gooseberry, wild apple, and fiery chilli picklers.",
                'location_district': 'Dimapur',
                'contact_email': 'hello@highlandharvest.com',
                'contact_phone': '+91 94368 99887',
                'business_address': 'Padum Pukhuri, Dimapur - 797112',
                'postal_code': '797112',
                'fssai_license_number': '20024089000552',
                'status': ManufacturerProfile.Status.PENDING,
                'is_verified_producer': False,
            }
        )

        # Customer User
        cust_user, created = User.objects.get_or_create(
            username='customer',
            defaults={
                'email': 'customer@wangs.in',
                'first_name': 'Moa',
                'last_name': 'Longkumer',
                'role': User.Role.CUSTOMER,
                'phone_number': '+91 98765 43210',
            }
        )
        if created:
            cust_user.set_password('customer12345')
            cust_user.save()
            CustomerProfile.objects.get_or_create(user=cust_user)
            Address.objects.get_or_create(
                user=cust_user,
                full_name='Moa Longkumer',
                phone='+91 98765 43210',
                address_line1='Flat 402, Pineview Residency, DC Court Road',
                city='Dimapur',
                state='Assam',
                postal_code='797112',
                landmark='Near City Tower',
                is_default=True
            )

        # 4. Categories
        categories_data = [
            {
                'name': 'Pork Pickle',
                'slug': 'pork-pickle',
                'description': 'Slow-cured smoked pork chunks cured in pure mustard oil and fiery chillies.',
                'image_url': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
                'display_order': 1
            },
            {
                'name': 'Chilli Pickle',
                'slug': 'chilli-pickle',
                'description': 'King Chilli (Raja Mircha) fermented and seasoned with crushed mountain peppercorns.',
                'image_url': 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80',
                'display_order': 2
            },
            {
                'name': 'Bamboo Shoot Pickle',
                'slug': 'bamboo-shoot-pickle',
                'description': 'Tender wild bamboo shoot (Bastenga) fermented to tanginess with highland spices.',
                'image_url': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
                'display_order': 3
            },
            {
                'name': 'Fruit Pickle',
                'slug': 'fruit-pickle',
                'description': 'Sweet, sour and spicy wild apples, starfruits, and organic mountain gooseberries.',
                'image_url': 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=600&q=80',
                'display_order': 4
            },
            {
                'name': 'Vegetarian Pickles',
                'slug': 'vegetarian-pickles',
                'description': 'Rich plant-based pickles crafted with fermented soya and fire-roasted garlic.',
                'image_url': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
                'display_order': 5
            },
        ]

        cat_objs = {}
        for cdata in categories_data:
            cat, _ = Category.objects.update_or_create(slug=cdata['slug'], defaults=cdata)
            cat_objs[cat.slug] = cat

        # 5. Products
        products_data = [
            {
                'manufacturer': arenla_profile,
                'category': cat_objs['pork-pickle'],
                'title': "Arenla's Signature Smoked Pork & King Chilli Pickle",
                'slug': 'arenla-signature-smoked-pork-king-chilli-pickle',
                'short_description': "Oak firewood-smoked pork cubes cured with sun-ripened King Chilli and cold-pressed mustard oil.",
                'description': (
                    "Chunks of selected pork slow-smoked over aged oak firewood embers for 72 hours, "
                    "then hand-cut and simmered in cold-pressed mustard oil with ground King Chilli (Raja Mircha) "
                    "and fragrant wild mountain ginger. Rich, smoky, intensely savory."
                ),
                'price': Decimal('380.00'),
                'mrp': Decimal('420.00'),
                'weight_grams': 250,
                'spice_level': Product.SpiceLevel.FIERY_KING_CHILLI,
                'dietary_type': Product.DietaryType.NON_VEG,
                'ingredients': 'Smoked Pork (65%), Pure Mustard Oil, King Chilli (Raja Mircha), Garlic, Ginger, Salt, Wild Sichuan Peppercorns, Turmeric',
                'allergens': 'Prepared in a facility processing mustard and sesame.',
                'storage_instructions': 'Store in a cool dry place. Always ensure oil covers the meat. Use a clean dry spoon.',
                'shelf_life': '9 Months',
                'stock_quantity': 45,
                'status': Product.Status.APPROVED,
                'is_featured': True,
                'is_bestseller': True,
                'primary_image_url': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
            },
            {
                'manufacturer': arenla_profile,
                'category': cat_objs['pork-pickle'],
                'title': "Smoked Pork & Axone (Fermented Soybean) Pickle",
                'slug': 'smoked-pork-axone-fermented-soybean-pickle',
                'short_description': "Tender smoked pork infused with the deep umami of fermented soybean cakes.",
                'description': (
                    "Axone (fermented soybean) combined with cured smoked pork and roasted chillies "
                    "delivers an earthy, pungent umami profile that pairs with steamed warm rice."
                ),
                'price': Decimal('390.00'),
                'mrp': Decimal('430.00'),
                'weight_grams': 250,
                'spice_level': Product.SpiceLevel.HOT,
                'dietary_type': Product.DietaryType.NON_VEG,
                'ingredients': 'Smoked Pork, Axone (Fermented Soybean), Mustard Oil, Red Chilli Flakes, Garlic, Rock Salt',
                'allergens': 'Contains Soybeans (Axone) and Mustard.',
                'storage_instructions': 'Keep sealed in airtight glass jar. Oil layer preserves freshness.',
                'shelf_life': '9 Months',
                'stock_quantity': 30,
                'status': Product.Status.APPROVED,
                'is_featured': True,
                'is_bestseller': True,
                'primary_image_url': 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=800&q=80',
            },
            {
                'manufacturer': arenla_profile,
                'category': cat_objs['chilli-pickle'],
                'title': "Pure Raja Mircha (King Chilli) Pickle",
                'slug': 'pure-raja-mircha-king-chilli-pickle',
                'short_description': "Whole fresh King Chillies pickled in cold-pressed mustard oil with roasted mountain spices.",
                'description': (
                    "Made with 100% authentic GI-tagged King Chilli (Raja Mircha). Each chilli is sun-wilted and "
                    "steeped in pure virgin mustard oil with crushed wild coriander seed and garlic cloves."
                ),
                'price': Decimal('250.00'),
                'mrp': Decimal('280.00'),
                'weight_grams': 200,
                'spice_level': Product.SpiceLevel.FIERY_KING_CHILLI,
                'dietary_type': Product.DietaryType.VEG,
                'ingredients': 'Whole King Chilli (Raja Mircha), Cold Pressed Mustard Oil, Wild Garlic, Fenugreek, Mustard Seeds, Rock Salt, Vinegar',
                'allergens': 'Contains Mustard seeds.',
                'storage_instructions': 'Store at room temperature. Keep chilli submerged in oil.',
                'shelf_life': '12 Months',
                'stock_quantity': 60,
                'status': Product.Status.APPROVED,
                'is_featured': True,
                'is_bestseller': False,
                'primary_image_url': 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=800&q=80',
            },
            {
                'manufacturer': dzuko_profile,
                'category': cat_objs['bamboo-shoot-pickle'],
                'title': "Wild Fermented Bamboo Shoot (Bastenga) Pickle",
                'slug': 'wild-fermented-bamboo-shoot-pickle',
                'short_description': "Highland wild bamboo shoots naturally fermented in earthen pots with roasted garlic.",
                'description': (
                    "Tender young bamboo shoots harvested in highland forests undergo natural fermentation. "
                    "Crisp, sour, and zesty with roasted red chilli flakes and ginger."
                ),
                'price': Decimal('220.00'),
                'mrp': Decimal('250.00'),
                'weight_grams': 250,
                'spice_level': Product.SpiceLevel.MEDIUM,
                'dietary_type': Product.DietaryType.VEG,
                'ingredients': 'Fermented Bamboo Shoot (Bastenga), Mustard Oil, Red Chilli, Garlic, Ginger, Salt',
                'allergens': 'Prepared in a unit using mustard oil.',
                'storage_instructions': 'Keep away from moisture and direct sunlight.',
                'shelf_life': '12 Months',
                'stock_quantity': 50,
                'status': Product.Status.APPROVED,
                'is_featured': False,
                'is_bestseller': True,
                'primary_image_url': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
            },
            {
                'manufacturer': dzuko_profile,
                'category': cat_objs['bamboo-shoot-pickle'],
                'title': "Smoked Beef & Shredded Bamboo Shoot Pickle",
                'slug': 'smoked-beef-shredded-bamboo-shoot-pickle',
                'short_description': "Aromatic dried beef shreds slowly tossed with sour bamboo shoot and fiery dry chillies.",
                'description': (
                    "Slow-smoked hill beef cured and shredded by hand, pan-roasted with tangy fermented bamboo shoots "
                    "and infused with crushed garlic and King Chilli."
                ),
                'price': Decimal('360.00'),
                'mrp': Decimal('400.00'),
                'weight_grams': 200,
                'spice_level': Product.SpiceLevel.HOT,
                'dietary_type': Product.DietaryType.NON_VEG,
                'ingredients': 'Smoked Beef, Fermented Bamboo Shoot, Mustard Oil, Dry Red Chillies, Garlic, Salt',
                'allergens': 'Mustard oil.',
                'storage_instructions': 'Refrigerate after opening for extended freshness.',
                'shelf_life': '6 Months',
                'stock_quantity': 25,
                'status': Product.Status.APPROVED,
                'is_featured': True,
                'is_bestseller': False,
                'primary_image_url': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
            },
            {
                'manufacturer': arenla_profile,
                'category': cat_objs['fruit-pickle'],
                'title': "Wild Hill Apple & King Chilli Sweet-Spicy Pickle",
                'slug': 'wild-hill-apple-king-chilli-pickle',
                'short_description': "Tart organic wild apples from hill orchards spiced with sweet jaggery and a hint of King Chilli.",
                'description': (
                    "Wild hill apples simmered with organic jaggery, roasted cumin, and just enough King Chilli "
                    "to create a mouth-watering sweet and spicy balance."
                ),
                'price': Decimal('230.00'),
                'mrp': Decimal('260.00'),
                'weight_grams': 250,
                'spice_level': Product.SpiceLevel.MILD,
                'dietary_type': Product.DietaryType.VEG,
                'ingredients': 'Wild Apple, Organic Jaggery, Mustard Oil, Chilli Flakes, Roasted Cumin, Black Salt, Spices',
                'allergens': 'Mustard oil.',
                'storage_instructions': 'Store in cool dry place.',
                'shelf_life': '12 Months',
                'stock_quantity': 40,
                'status': Product.Status.APPROVED,
                'is_featured': False,
                'is_bestseller': False,
                'primary_image_url': 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=800&q=80',
            },
            {
                'manufacturer': arenla_profile,
                'category': cat_objs['vegetarian-pickles'],
                'title': "Roasted Garlic & Crushed Axone Paste Pickle",
                'slug': 'roasted-garlic-crushed-axone-paste-pickle',
                'short_description': "Fire-roasted whole hill garlic cloves pounded with seasoned fermented soybean.",
                'description': (
                    "Deep, caramelized hill garlic pounded with fermented soybean (Axone) and toasted red pepper flakes. "
                    "Pairs with warm rice or grain bowls."
                ),
                'price': Decimal('240.00'),
                'mrp': Decimal('270.00'),
                'weight_grams': 200,
                'spice_level': Product.SpiceLevel.MEDIUM,
                'dietary_type': Product.DietaryType.VEG,
                'ingredients': 'Roasted Garlic, Axone (Fermented Soybean), Mustard Oil, Red Chilli, Ginger, Sea Salt',
                'allergens': 'Contains Soybeans (Axone) and Mustard.',
                'storage_instructions': 'Ensure jar is kept tightly closed in a cool spot.',
                'shelf_life': '9 Months',
                'stock_quantity': 35,
                'status': Product.Status.APPROVED,
                'is_featured': False,
                'is_bestseller': True,
                'primary_image_url': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
            },
            {
                'manufacturer': dzuko_profile,
                'category': cat_objs['chilli-pickle'],
                'title': "Dzüko Roasted King Chilli & Mountain Sichuan Mash",
                'slug': 'dzuko-roasted-king-chilli-mountain-sichuan-mash',
                'short_description': "Fire-charred King Chillies blended with tingling mountain peppercorns.",
                'description': (
                    "Smoked over charcoal embers and crushed with mountain Sichuan peppercorns, "
                    "providing a citrus aroma followed by intense heat."
                ),
                'price': Decimal('270.00'),
                'mrp': Decimal('310.00'),
                'weight_grams': 180,
                'spice_level': Product.SpiceLevel.FIERY_KING_CHILLI,
                'dietary_type': Product.DietaryType.VEG,
                'ingredients': 'Fire-charred King Chilli, Mountain Sichuan Peppercorns, Mustard Oil, Garlic, Salt',
                'allergens': 'Mustard.',
                'storage_instructions': 'Store sealed in cool place.',
                'shelf_life': '12 Months',
                'stock_quantity': 30,
                'status': Product.Status.APPROVED,
                'is_featured': True,
                'is_bestseller': True,
                'primary_image_url': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=80',
            },
            {
                'manufacturer': arenla_profile,
                'category': cat_objs['pork-pickle'],
                'title': "Prawn Fusion & King Chilli Homemade Pickle",
                'slug': 'prawn-fusion-king-chilli-homemade-pickle',
                'short_description': "Succulent prawns flash-seared in cold-pressed mustard oil with fiery King Chilli, aromatic garlic, and warm fusion spices.",
                'description': (
                    "Inspired by the finest homemade seafood traditions and high-altitude chillies, "
                    "plump juicy prawns are carefully cleaned and sautéed in small batches with cold-pressed virgin mustard oil, "
                    "firewood-roasted garlic, ground King Chilli (Raja Mircha), and our signature warm fusion blend of cardamom, "
                    "cinnamon, and wild mountain pepper. The result is an intensely flavorful, spicy, and tangy pickle that "
                    "turns ordinary steamed rice, warm parathas, and comfort meals into an unforgettable feast."
                ),
                'price': Decimal('420.00'),
                'mrp': Decimal('480.00'),
                'weight_grams': 250,
                'spice_level': Product.SpiceLevel.HOT,
                'dietary_type': Product.DietaryType.NON_VEG,
                'ingredients': 'Fresh Prawns (60%), Cold-Pressed Pure Mustard Oil, King Chilli (Raja Mircha), Garlic, Ginger, Cinnamon, Cardamom, Cloves, Turmeric, Sea Salt, Vinegar',
                'allergens': 'Contains Crustaceans (Prawns) and Mustard.',
                'storage_instructions': 'Store in a cool, dry place. Ensure prawns remain submerged under oil. Always use a clean dry spoon.',
                'shelf_life': '6 Months',
                'stock_quantity': 40,
                'status': Product.Status.APPROVED,
                'is_featured': True,
                'is_bestseller': True,
                'primary_image_url': 'https://images.unsplash.com/photo-1559742811-822873691df8?auto=format&fit=crop&w=800&q=80',
            }
        ]

        # Update existing order items to clean titles
        from marketplace.models import OrderItem
        for oi in OrderItem.objects.all():
            changed = False
            clean_title = oi.product_title.replace("Aunt ", "").replace("aunt ", "").replace("Naga ", "").replace("naga ", "")
            if clean_title != oi.product_title:
                oi.product_title = clean_title
                changed = True
            if changed:
                oi.save()

        # Clean all existing products
        for p in Product.objects.all():
            p.title = p.title.replace('Naga ', '').replace('naga ', '')
            p.short_description = p.short_description.replace('Naga ', '').replace('naga ', '')
            p.description = p.description.replace('Naga ', '').replace('naga ', '')
            p.ingredients = p.ingredients.replace('Naga ', '').replace('naga ', '')
            p.save()

        for pdata in products_data:
            slug = pdata.pop('slug')
            img_url = pdata.pop('primary_image_url')
            prod, _ = Product.objects.update_or_create(
                slug=slug,
                defaults={'primary_image_url': img_url, **pdata}
            )
            ProductImage.objects.update_or_create(
                product=prod,
                image_url=img_url,
                defaults={'is_primary': True, 'alt_text': prod.title}
            )

        # 6. Customer Reviews (PickleFresh & D2C style verified ratings)
        sample_reviews = [
            # Prawn Fusion
            {
                'slug': 'prawn-fusion-king-chilli-homemade-pickle',
                'author_name': 'Rohan M.',
                'rating': 5,
                'title': 'The best prawn pickle I have ever tasted in India!',
                'comment': 'The prawns are tender and generous, not chewy like other brands. The blend of warm fusion spices with the King Chilli is absolutely addictive with hot dal-rice.',
                'is_verified_buyer': True
            },
            {
                'slug': 'prawn-fusion-king-chilli-homemade-pickle',
                'author_name': 'Deepika Nair',
                'rating': 5,
                'title': 'Pure homemade warmth in a glass jar',
                'comment': 'Zero chemical smell, pure mustard oil and authentic spices. Arrived in Mumbai within 3 days via air cargo perfectly bubble-wrapped. Ordering 1kg next time!',
                'is_verified_buyer': True
            },
            {
                'slug': 'prawn-fusion-king-chilli-homemade-pickle',
                'author_name': 'Karthik S.',
                'rating': 5,
                'title': 'Pairs heavenly with plain parathas',
                'comment': 'Just a spoonful transforms simple parathas or curd rice into a feast. The heat from Raja Mircha hits gently then builds up beautifully.',
                'is_verified_buyer': True
            },
            # Smoked Pork & King Chilli
            {
                'slug': 'arenla-signature-smoked-pork-king-chilli-pickle',
                'author_name': 'Aloto Yeptho',
                'rating': 5,
                'title': 'True artisanal firewood smoke flavor!',
                'comment': 'Takes me right back to our hearth back home in Mokokchung. Meat chunks are substantial and soaked in aromatic spicy oil. 10/10.',
                'is_verified_buyer': True
            },
            {
                'slug': 'arenla-signature-smoked-pork-king-chilli-pickle',
                'author_name': 'Priyanka Das',
                'rating': 5,
                'title': 'Extraordinary depth of flavor',
                'comment': 'You can taste the 72-hour slow wood smoke. Not overwhelmingly oily. FSSAI certified facility gives great trust too.',
                'is_verified_buyer': True
            },
            # Pure Raja Mircha
            {
                'slug': 'pure-raja-mircha-king-chilli-pickle',
                'author_name': 'Vikramaditya Roy',
                'rating': 5,
                'title': 'Fiery but wonderfully aromatic',
                'comment': 'One tiny cut of the King Chilli is enough for an entire meal. Authentic Raja Mircha flavor that you cannot find in city supermarkets.',
                'is_verified_buyer': True
            },
            # Wild Fermented Bamboo Shoot
            {
                'slug': 'wild-fermented-bamboo-shoot-pickle',
                'author_name': 'Sentila Jamir',
                'rating': 5,
                'title': 'Crunchy, tangy, and perfect',
                'comment': 'Crisp shoots with natural earthen pot fermentation. Tastes clean, pungent in the best way, and utterly delicious with boiled pork and rice.',
                'is_verified_buyer': True
            },
            # Lia Chuka Pork Pickle
            {
                'slug': 'lia-chuka-pork-pickle',
                'author_name': 'Temsu Ao',
                'rating': 5,
                'title': 'Exceptional smoky pork texture',
                'comment': 'Real wood-smoked pork chunks that melt in your mouth with authentic Raja Mircha heat. Outstanding quality from Lia Chuka.',
                'is_verified_buyer': True
            },
            {
                'slug': 'lia-chuka-pork-pickle',
                'author_name': 'Ananya Sharma',
                'rating': 5,
                'title': 'The aroma hits the moment you open the pouch',
                'comment': 'Rich mustard oil and distinct mountain smoke. Easily the best packaged pork pickle available online.',
                'is_verified_buyer': True
            },
            {
                'slug': 'lia-chuka-pork-pickle',
                'author_name': 'David Lotha',
                'rating': 5,
                'title': 'Tastes just like home',
                'comment': 'Generous meat cuts and well-balanced King Chilli spice. Perfect with steamed white rice.',
                'is_verified_buyer': True
            },
            {
                'slug': 'lia-chuka-pork-pickle',
                'author_name': 'Sunil Verma',
                'rating': 4,
                'title': 'Bold and spicy',
                'comment': 'Very authentic flavor. Quite hot so a small spoon goes a long way.',
                'is_verified_buyer': True
            },
            # Lia Chuka Bambooshoot Pickle
            {
                'slug': 'lia-chuka-bambooshoot-pickle',
                'author_name': 'Imli Pongen',
                'rating': 5,
                'title': 'Fresh tender bamboo shoots',
                'comment': 'Natural earthen fermentation with zero synthetic vinegar. Extremely crunchy and savory.',
                'is_verified_buyer': True
            },
            {
                'slug': 'lia-chuka-bambooshoot-pickle',
                'author_name': 'Meera Joshi',
                'rating': 5,
                'title': 'Authentic northeastern taste',
                'comment': 'Clean pungent aroma, perfectly spiced with mountain chillies. Arrived fast and fresh.',
                'is_verified_buyer': True
            },
            # Lia Chuka Chicken Pickle
            {
                'slug': 'lia-chuka-chicken-pickle',
                'author_name': 'Nehal Chawla',
                'rating': 5,
                'title': 'Juicy tender chicken shreds',
                'comment': 'Not dry at all. The King Chilli garlic blend gives it an unbelievable kick. High quality artisanal packaging.',
                'is_verified_buyer': True
            },
            {
                'slug': 'lia-chuka-chicken-pickle',
                'author_name': 'Renthungo Kikon',
                'rating': 5,
                'title': 'Five stars for authentic taste',
                'comment': 'Lia Chuka maintains consistent taste and hygienic preparation. Great accompaniment for any dinner.',
                'is_verified_buyer': True
            }
        ]

        for rev in sample_reviews:
            r_slug = rev.pop('slug')
            try:
                p = Product.objects.get(slug=r_slug)
                ProductReview.objects.update_or_create(
                    product=p,
                    author_name=rev['author_name'],
                    defaults={
                        'rating': rev['rating'],
                        'title': rev['title'],
                        'comment': rev['comment'],
                        'is_verified_buyer': rev['is_verified_buyer'],
                    }
                )
            except Product.DoesNotExist:
                pass

        self.stdout.write(self.style.SUCCESS("Successfully seeded Wangs marketplace with clean artisanal pickle products and verified reviews!"))
