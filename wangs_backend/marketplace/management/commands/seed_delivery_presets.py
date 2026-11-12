from django.core.management.base import BaseCommand
from marketplace.delivery_service import DeliveryService

class Command(BaseCommand):
    help = "Seeds SwiftZone and courier partner delivery presets (zones, rates, services)"

    def add_arguments(self, parser):
        parser.add_argument(
            '--activate',
            action='store_true',
            help='Activate the seeded presets immediately rather than leaving them inactive for admin review'
        )

    def handle(self, *args, **options):
        activate = options.get('activate', False)
        res = DeliveryService.seed_swiftzone_and_partner_presets(activate=activate)
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded presets: {res['couriers']} couriers, {res['zones']} zones, {res['rates']} rates (active={activate})"
            )
        )
