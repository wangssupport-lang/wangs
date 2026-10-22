import os
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from marketplace.models import (
    User, CustomerProfile, Address, ManufacturerProfile,
    Category, Product, ProductImage, CommissionSetting, Coupon
)

class Command(BaseCommand):
    help = "Seeds initial authentic Naga pickle categories, products, heritage business, and test users."

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
            code='NAGA50',
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

        # Arenla Heritage Kitchen (Primary founding manufacturer)
        arenla_user, created = User.objects.get_or_create(
            username='arenla_kitchen',
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

        arenla_profile, _ = ManufacturerProfile.objects.get_or_create(
            user=arenla_user,
            defaults={
                'business_name': "Arenla's Heritage Kitchen",
                'slug': 'arenlas-heritage-kitchen',
                'brand_story': (
                    "Born in the misty hills of Kohima, Arenla's Heritage Kitchen has been curing meats and crafting "
                    "authentic Naga pickles for over 35 years using traditional firewood smoking, "
                    "sun-dried King Chillies (Raja Mircha), and time-honored family fermentations."
                ),
                'location_district': 'Kohima, Nagaland',
                'contact_email': 'arenla@wangs.in',
                'contact_phone': '+91 94360 12345',
                'business_address': 'Sector 4, Ministers Hill, Kohima, Nagaland - 797001',
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
            }
        )

        # Second approved manufacturer: Dzüko Artisans
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

        dzuko_profile, _ = ManufacturerProfile.objects.get_or_create(
            user=dzuko_user,
            defaults={
                'business_name': "Dzüko Valley Artisans",
                'slug': 'dzuko-valley-artisans',
                'brand_story': "Specializing in wild harvested forest bamboo shoot pickles and smoked river fish pastes from Mokokchung.",
                'location_district': 'Mokokchung, Nagaland',
                'contact_email': 'contact@dzukocraft.in',
                'contact_phone': '+91 98621 54321',
                'business_address': 'Arkong Ward, Mokokchung, Nagaland - 798601',
                'postal_code': '798601',
                'fssai_license_number': '10024075000341',
                'status': ManufacturerProfile.Status.APPROVED,
                'commission_rate_override': Decimal('12.00'),
                'is_verified_producer': True,
            }
        )

        # Pending manufacturer application: Naga Hills Harvest
        hills_user, created = User.objects.get_or_create(
            username='naga_hills',
            defaults={
                'email': 'hello@nagahillsharvest.com',
                'first_name': 'Kevi',
                'last_name': 'Kire',
                'role': User.Role.MANUFACTURER,
                'phone_number': '+91 94368 99887',
            }
        )
        if created:
            hills_user.set_password('hills12345')
            hills_user.save()

        ManufacturerProfile.objects.get_or_create(
            user=hills_user,
            defaults={
                'business_name': "Naga Hills Harvest",
                'slug': 'naga-hills-harvest',
                'brand_story': "Small-batch organic gooseberry, wild apple, and fiery peri-peri Naga chilli picklers.",
                'location_district': 'Dimapur, Nagaland',
                'contact_email': 'hello@nagahillsharvest.com',
                'contact_phone': '+91 94368 99887',
                'business_address': 'Padum Pukhuri, Dimapur, Nagaland - 797112',
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
                state='Nagaland',
                postal_code='797112',
                landmark='Near City Tower',
                is_default=True
            )

        # 4. Categories
        categories_data = [
            {
                'name': 'Pork Pickle',
                'slug': 'pork-pickle',
                'description': 'Traditional Naga smoked pork chunks slowly cured in pure mustard oil and fiery king chillies.',
                'image_url': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
                'display_order': 1
            },
            {
                'name': 'Chilli Pickle',
                'slug': 'chilli-pickle',
                'description': 'Legendary Naga King Chilli (Bhut Jolokia / Raja Mircha) fermented and seasoned with Sichuan peppercorns.',
                'image_url': 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80',
                'display_order': 2
            },
            {
                'name': 'Bamboo Shoot Pickle',
                'slug': 'bamboo-shoot-pickle',
                'description': 'Tender wild Naga bamboo shoot (Bastenga) fermented to tanginess with indigenous highland spices.',
                'image_url': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
                'display_order': 3
            },
            {
                'name': 'Fruit Pickle',
                'slug': 'fruit-pickle',
                'description': 'Sweet, sour and spicy wild Naga apples, starfruits, and organic gooseberries (amla).',
                'image_url': 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=600&q=80',
                'display_order': 4
            },
            {
                'name': 'Vegetarian Pickles',
                'slug': 'vegetarian-pickles',
                'description': 'Rich traditional plant-based Naga pickles crafted with Axone (fermented soya) and roasted garlic.',
                'image_url': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
                'display_order': 5
            },
        ]

        cat_objs = {}
        for cdata in categories_data:
            cat, _ = Category.objects.get_or_create(slug=cdata['slug'], defaults=cdata)
            cat_objs[cat.slug] = cat

        # 5. Products
        products_data = [
            {
                'manufacturer': arenla_profile,
                'category': cat_objs['pork-pickle'],
                'title': "Arenla's Signature Smoked Pork & King Chilli Pickle",
                'slug': 'arenla-signature-smoked-pork-king-chilli-pickle',
                'short_description': "Legendary firewood-smoked Naga pork cubes cured with sun-ripened King Chilli and mustard oil.",
                'description': (
                    "Our flagship product: chunks of indigenous Nagaland pork traditionally smoked over aged oak firewood "
                    "for 72 hours, then hand-cut and simmered in cold-pressed mustard oil with ground Raja Mircha (King Chilli) "
                    "and fragrant wild mountain ginger. Rich, smoky, intensely savory, with a warming heat that lingers."
                ),
                'price': Decimal('380.00'),
                'mrp': Decimal('420.00'),
                'weight_grams': 250,
                'spice_level': Product.SpiceLevel.FIERY_KING_CHILLI,
                'dietary_type': Product.DietaryType.NON_VEG,
                'ingredients': 'Smoked Naga Pork (65%), Pure Mustard Oil, Naga King Chilli (Raja Mircha), Garlic, Ginger, Salt, Wild Sichuan Peppercorns, Turmeric',
                'allergens': 'Prepared in a traditional facility processing mustard and sesame.',
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
                'short_description': "Tender smoked pork infused with the deep umami of traditional Naga fermented soybean cakes.",
                'description': (
                    "Axone (fermented soybean) is the soul of Naga cuisine. Combined with cured smoked pork "
                    "and roasted local chillies, this pickle delivers an earthy, pungent umami profile that pairs magically "
                    "with steamed warm rice."
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
                'title': "Pure Raja Mircha (Naga King Chilli) Pickle",
                'slug': 'pure-raja-mircha-naga-king-chilli-pickle',
                'short_description': "Whole fresh King Chillies pickled in cold-pressed mustard oil with roasted mountain spices.",
                'description': (
                    "Made with 100% authentic GI-tagged Naga King Chilli (Bhut Jolokia). Each chilli is sun-wilted and "
                    "steeped in pure virgin mustard oil with crushed wild coriander seed and garlic cloves. Not for the faint of heart!"
                ),
                'price': Decimal('250.00'),
                'mrp': Decimal('280.00'),
                'weight_grams': 200,
                'spice_level': Product.SpiceLevel.FIERY_KING_CHILLI,
                'dietary_type': Product.DietaryType.VEG,
                'ingredients': 'Whole Naga King Chilli (Raja Mircha), Cold Pressed Mustard Oil, Wild Garlic, Fenugreek, Mustard Seeds, Rock Salt, Vinegar',
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
                'title': "Mokokchung Wild Fermented Bamboo Shoot (Bastenga) Pickle",
                'slug': 'mokokchung-wild-fermented-bamboo-shoot-pickle',
                'short_description': "Highland wild bamboo shoots naturally fermented in earthen pots with roasted hill garlic.",
                'description': (
                    "Harvested in the dense forests around Mokokchung, these tender young bamboo shoots undergo traditional "
                    "natural fermentation for months. Crisp, sour, zesty, with a touch of roasted red chilli flakes and ginger."
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
                    "and infused with crushed garlic and King Chilli. An intensely aromatic meat delicacy."
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
                'title': "Wild Naga Apple & King Chilli Sweet-Spicy Pickle",
                'slug': 'wild-naga-apple-king-chilli-pickle',
                'short_description': "Tart organic wild apples from Kohima orchards spiced with sweet jaggery and a hint of King Chilli.",
                'description': (
                    "Wild Naga apples (Docynia indica) are known for their firm bite and unique sour sweetness. "
                    "Simmered with organic jaggery, roasted cumin, and just enough King Chilli to create "
                    "a mouth-watering sweet and spicy chutney-pickle hybrid."
                ),
                'price': Decimal('230.00'),
                'mrp': Decimal('260.00'),
                'weight_grams': 250,
                'spice_level': Product.SpiceLevel.MILD,
                'dietary_type': Product.DietaryType.VEG,
                'ingredients': 'Wild Naga Apple, Organic Jaggery, Mustard Oil, Naga Chilli Flakes, Roasted Cumin, Black Salt, Spices',
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
                    "Deep, caramelized hill garlic pounded in traditional stone mortar with pungent fermented soybean (Axone) "
                    "and toasted red pepper flakes. Perfect as a condiment alongside everyday dal and rice or noodle bowls."
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
                'short_description': "Fire-charred King Chillies blended with tingling Nagaland mountain peppercorns.",
                'description': (
                    "Smoked over charcoal embers and crushed with local mountain prickly ash (Sichuan peppercorn), "
                    "providing a delightfully numbing citrus aroma followed by high heat."
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
            }
        ]

        for pdata in products_data:
            slug = pdata.pop('slug')
            img_url = pdata.pop('primary_image_url')
            prod, created = Product.objects.get_or_create(
                slug=slug,
                defaults={'primary_image_url': img_url, **pdata}
            )
            ProductImage.objects.get_or_create(
                product=prod,
                image_url=img_url,
                defaults={'is_primary': True, 'alt_text': prod.title}
            )

        self.stdout.write(self.style.SUCCESS("Successfully seeded Wangs marketplace with authentic Naga pickle products!"))
