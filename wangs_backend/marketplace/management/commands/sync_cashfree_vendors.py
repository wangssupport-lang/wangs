import logging
from django.core.management.base import BaseCommand
from marketplace.models import ManufacturerProfile
from marketplace.cashfree_service import CashfreeService

logger = logging.getLogger('marketplace.cashfree')


class Command(BaseCommand):
    help = 'Syncs all approved marketplace manufacturers to Cashfree Easy Split as Vendors'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Sync all manufacturers regardless of approval status'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Starting Cashfree Easy Split vendor synchronization..."))

        if not CashfreeService.is_configured():
            self.stdout.write(self.style.WARNING(
                "Cashfree credentials (CASHFREE_APP_ID / CASHFREE_SECRET_KEY) are not set in environment. "
                "Running in simulated mode."
            ))

        sync_all = options.get('all', False)
        if sync_all:
            mfgs = ManufacturerProfile.objects.all().order_by('id')
        else:
            mfgs = ManufacturerProfile.objects.filter(
                status=ManufacturerProfile.Status.APPROVED
            ).order_by('id')

        total = mfgs.count()
        self.stdout.write(f"Found {total} manufacturer(s) to synchronize.")

        success_count = 0
        error_count = 0

        for mfg in mfgs:
            b_name = mfg.business_name or f"Maker #{mfg.id}"
            has_bank = bool(mfg.bank_account_number and mfg.bank_ifsc_code)
            bank_info = f"A/C: {mfg.bank_account_number[-4:] if mfg.bank_account_number else 'None'}" if has_bank else "No Bank Info"

            try:
                res = CashfreeService.sync_manufacturer_vendor(mfg)
                if res.get('success'):
                    success_count += 1
                    v_id = mfg.cashfree_vendor_id or res.get('vendor_id')
                    self.stdout.write(self.style.SUCCESS(
                        f"  [OK] {b_name} (ID: {mfg.id}) -> Vendor ID: {v_id} ({mfg.cashfree_vendor_status}) | {bank_info}"
                    ))
                else:
                    error_count += 1
                    detail = res.get('detail', 'Unknown error')
                    self.stdout.write(self.style.WARNING(
                        f"  [PENDING] {b_name} (ID: {mfg.id}) -> {detail} | {bank_info}"
                    ))
            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(
                    f"  [ERROR] {b_name} (ID: {mfg.id}) -> {str(e)}"
                ))

        self.stdout.write(self.style.SUCCESS(
            f"\nSync complete: {success_count} succeeded, {error_count} pending/failed out of {total} total."
        ))
