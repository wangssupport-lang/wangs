from django.db import migrations

def cleanup_test_data(apps, schema_editor):
    StorefrontNotice = apps.get_model('marketplace', 'StorefrontNotice')
    CommissionSetting = apps.get_model('marketplace', 'CommissionSetting')

    # Remove junk/test notices
    StorefrontNotice.objects.filter(text__icontains='wem hfkjwf').delete()
    StorefrontNotice.objects.filter(text__icontains='clksck').delete()

    # Re-normalize display order of remaining notices
    notices = StorefrontNotice.objects.all().order_by('display_order', 'id')
    for idx, n in enumerate(notices, start=1):
        if n.display_order != idx:
            n.display_order = idx
            n.save(update_fields=['display_order'])

    # Reset test maintenance message to standard professional message
    default_msg = "We're currently undergoing scheduled maintenance & pantry inventory updates. We'll be back shortly!"
    for setting in CommissionSetting.objects.all():
        if 'cgtuk' in (setting.maintenance_message or '') or len((setting.maintenance_message or '').split()) <= 1:
            setting.maintenance_message = default_msg
            setting.save(update_fields=['maintenance_message'])

def reverse_cleanup(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0020_rewardsettings_order_assigned_courier_and_more'),
    ]

    operations = [
        migrations.RunPython(cleanup_test_data, reverse_cleanup),
    ]
