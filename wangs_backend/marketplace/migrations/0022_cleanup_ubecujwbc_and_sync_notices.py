from django.db import migrations

DEFAULT_STOREFRONT_NOTICES = [
    {
        "text": "Complimentary Express Delivery on Sun-Cured Heritage Pickles above ₹499 Across India",
        "highlight": "100% Free",
        "badge_color": "bg-emerald-600 text-white",
        "link": "/products",
        "display_order": 1,
        "is_active": True,
    },
    {
        "text": "Kohima Delivery: Delivered within 12 hrs (30m–1h best case) • Nagaland: 1–2 days",
        "highlight": "Express Local",
        "badge_color": "bg-amber-400 text-stone-900 font-bold",
        "link": "/delivery",
        "display_order": 2,
        "is_active": True,
    },
    {
        "text": "Orders above ₹699 receive a Free Handcrafted Neem Wood Tasting Spoon!",
        "highlight": "Free Gift",
        "badge_color": "bg-amber-300 text-stone-900 font-bold",
        "link": "/products?bestsellers=true",
        "display_order": 3,
        "is_active": True,
    },
    {
        "text": "Over 1,480+ heirloom packs cured & dispatched to connoisseurs across India this week",
        "highlight": "High Demand",
        "badge_color": "bg-white/20 text-white border border-white/30",
        "link": "/products",
        "display_order": 4,
        "is_active": True,
    },
]

def cleanup_ubecujwbc_and_sync(apps, schema_editor):
    StorefrontNotice = apps.get_model('marketplace', 'StorefrontNotice')

    # Remove or fix any junk test strings
    StorefrontNotice.objects.filter(text__icontains='ubecujwbc').delete()
    StorefrontNotice.objects.filter(text__icontains='wecwe').delete()

    # Ensure all 4 standard notices exist
    existing_texts = list(StorefrontNotice.objects.values_list('text', flat=True))
    for item in DEFAULT_STOREFRONT_NOTICES:
        if not any(item['text'].lower() in existing.lower() or existing.lower() in item['text'].lower() for existing in existing_texts):
            StorefrontNotice.objects.create(**item)

    # Re-normalize order and ensure all standard notices are active
    notices = StorefrontNotice.objects.all().order_by('display_order', 'id')
    for idx, n in enumerate(notices, start=1):
        n.display_order = idx
        n.is_active = True
        n.save(update_fields=['display_order', 'is_active'])

def reverse_cleanup(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0021_cleanup_test_notice_and_maintenance'),
    ]

    operations = [
        migrations.RunPython(cleanup_ubecujwbc_and_sync, reverse_cleanup),
    ]
