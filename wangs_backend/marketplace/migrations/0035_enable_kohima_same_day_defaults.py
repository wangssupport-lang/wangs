from datetime import time
from django.db import migrations


def enable_kohima_same_day(apps, schema_editor):
    ManufacturerProfile = apps.get_model('marketplace', 'ManufacturerProfile')
    Product = apps.get_model('marketplace', 'Product')

    kohima_sellers = ManufacturerProfile.objects.filter(
        status='APPROVED',
        location_district__icontains='Kohima',
    )
    for seller in kohima_sellers:
        if not seller.same_day_enabled:
            seller.same_day_enabled = True
            seller.same_day_paused = False
            if not seller.same_day_dispatch_town:
                seller.same_day_dispatch_town = 'Kohima'
            if not seller.same_day_dispatch_district:
                seller.same_day_dispatch_district = 'Kohima'
            if not seller.same_day_dispatch_state:
                seller.same_day_dispatch_state = 'Nagaland'
            if not seller.same_day_operating_days:
                seller.same_day_operating_days = [0, 1, 2, 3, 4, 5, 6]
            if not seller.same_day_cutoff_time:
                seller.same_day_cutoff_time = time(20, 0)
            if not seller.same_day_covered_towns:
                seller.same_day_covered_towns = ['kohima']
            if not seller.same_day_covered_pincodes:
                seller.same_day_covered_pincodes = ['797001', '797002', '797003', '797004', '797005']
            seller.save()

        Product.objects.filter(
            manufacturer=seller,
            status='APPROVED',
            is_active=True,
            stock_quantity__gt=0,
            same_day_eligible=False,
        ).update(same_day_eligible=True)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0034_manufacturerprofile_same_day_covered_pincodes_and_more'),
    ]

    operations = [
        migrations.RunPython(enable_kohima_same_day, noop_reverse),
    ]
