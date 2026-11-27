from django.core.management.base import BaseCommand
from marketplace.models import ManufacturerProfile
from marketplace.withdrawal_service import sync_seller_balance_from_paid_orders


class Command(BaseCommand):
    help = 'Release eligible seller earnings from Pending to Available after the configured eligibility window (default 48h).'

    def handle(self, *args, **options):
        sellers = ManufacturerProfile.objects.all()
        processed = 0
        for seller in sellers:
            sync_seller_balance_from_paid_orders(seller)
            processed += 1
        self.stdout.write(self.style.SUCCESS(f'Synced and released eligible earnings for {processed} seller(s).'))
