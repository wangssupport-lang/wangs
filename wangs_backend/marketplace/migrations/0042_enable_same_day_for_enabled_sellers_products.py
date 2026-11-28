from django.db import migrations


def enable_same_day_for_enabled_sellers_products(apps, schema_editor):
    ManufacturerProfile = apps.get_model('marketplace', 'ManufacturerProfile')
    Product = apps.get_model('marketplace', 'Product')

    enabled_sellers = ManufacturerProfile.objects.filter(
        status='APPROVED',
        same_day_enabled=True,
    )
    Product.objects.filter(
        manufacturer__in=enabled_sellers,
        status='APPROVED',
        is_active=True,
        stock_quantity__gt=0,
        same_day_eligible=False,
    ).update(same_day_eligible=True)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0041_commissionsetting_same_day_cutoff_time'),
    ]

    operations = [
        migrations.RunPython(enable_same_day_for_enabled_sellers_products, noop_reverse),
    ]
