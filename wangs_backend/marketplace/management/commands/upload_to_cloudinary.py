import os
from django.core.management.base import BaseCommand
from marketplace.models import Product, ProductImage, HeroBanner, ManufacturerProfile
from marketplace.cloudinary_service import upload_image_to_cloudinary, is_cloudinary_configured

class Command(BaseCommand):
    help = 'Uploads all marketplace images (products, gallery, hero banners, manufacturer logos) to Cloudinary.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Preview upload without modifying records')

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)

        if not is_cloudinary_configured():
            self.stderr.write(self.style.ERROR(
                "Cloudinary credentials are not configured.\n"
                "Please set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env"
            ))
            return

        self.stdout.write(self.style.SUCCESS("Starting Cloudinary media library synchronization..."))
        uploaded_count = 0

        # 1. Product Primary Images
        for product in Product.objects.all():
            img_val = product.primary_image_url
            if img_val and not img_val.startswith('https://res.cloudinary.com'):
                self.stdout.write(f"Uploading Product #{product.id} primary image: {product.title[:30]}...")
                if not dry_run:
                    cloud_url = upload_image_to_cloudinary(img_val, folder="wangs/products", public_id=f"prod_{product.id}_primary")
                    if cloud_url:
                        product.primary_image_url = cloud_url
                        product.save(update_fields=['primary_image_url'])
                        uploaded_count += 1
                        self.stdout.write(self.style.SUCCESS(f"  -> Saved to Cloudinary: {cloud_url}"))
                else:
                    self.stdout.write(f"  [DRY-RUN] Would upload {img_val[:50]}...")

        # 2. Product Gallery Images
        for pi in ProductImage.objects.all():
            img_val = pi.image_url
            if img_val and not img_val.startswith('https://res.cloudinary.com'):
                self.stdout.write(f"Uploading ProductImage #{pi.id}...")
                if not dry_run:
                    cloud_url = upload_image_to_cloudinary(img_val, folder="wangs/products", public_id=f"prod_gallery_{pi.id}")
                    if cloud_url:
                        pi.image_url = cloud_url
                        pi.save(update_fields=['image_url'])
                        uploaded_count += 1
                        self.stdout.write(self.style.SUCCESS(f"  -> Saved to Cloudinary: {cloud_url}"))

        # 3. Hero Promo Banners
        for banner in HeroBanner.objects.all():
            img_val = banner.image_url
            if img_val and not img_val.startswith('https://res.cloudinary.com'):
                self.stdout.write(f"Uploading HeroBanner #{banner.id}...")
                if not dry_run:
                    cloud_url = upload_image_to_cloudinary(img_val, folder="wangs/banners", public_id=f"banner_{banner.id}")
                    if cloud_url:
                        banner.image_url = cloud_url
                        banner.save(update_fields=['image_url'])
                        uploaded_count += 1
                        self.stdout.write(self.style.SUCCESS(f"  -> Saved to Cloudinary: {cloud_url}"))

        # 4. Manufacturer Logos & Banners
        for mfg in ManufacturerProfile.objects.all():
            if mfg.logo_image and not mfg.logo_image.startswith('https://res.cloudinary.com'):
                self.stdout.write(f"Uploading Logo for {mfg.business_name}...")
                if not dry_run:
                    cloud_url = upload_image_to_cloudinary(mfg.logo_image, folder="wangs/manufacturers", public_id=f"mfg_logo_{mfg.slug}")
                    if cloud_url:
                        mfg.logo_image = cloud_url
                        mfg.save(update_fields=['logo_image'])
                        uploaded_count += 1
            if mfg.hero_banner and not mfg.hero_banner.startswith('https://res.cloudinary.com'):
                self.stdout.write(f"Uploading Hero Banner for {mfg.business_name}...")
                if not dry_run:
                    cloud_url = upload_image_to_cloudinary(mfg.hero_banner, folder="wangs/manufacturers", public_id=f"mfg_banner_{mfg.slug}")
                    if cloud_url:
                        mfg.hero_banner = cloud_url
                        mfg.save(update_fields=['hero_banner'])
                        uploaded_count += 1

        self.stdout.write(self.style.SUCCESS(f"Cloudinary synchronization finished! Successfully uploaded {uploaded_count} images."))
