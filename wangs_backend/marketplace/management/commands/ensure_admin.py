import os
from django.core.management.base import BaseCommand
from marketplace.models import User

class Command(BaseCommand):
    help = "Ensures superuser account is created or updated from DJANGO_ADMIN_USERNAME and DJANGO_ADMIN_PASSWORD"

    def handle(self, *args, **options):
        admin_username = os.environ.get('DJANGO_ADMIN_USERNAME', 'admin').strip() or 'admin'
        admin_password = os.environ.get('DJANGO_ADMIN_PASSWORD', 'admin12345').strip() or 'admin12345'
        admin_email = os.environ.get('DJANGO_ADMIN_EMAIL', 'admin@wangs.in').strip() or 'admin@wangs.in'

        admin_user = User.objects.filter(username=admin_username).first()
        if not admin_user:
            admin_user = User.objects.filter(role=User.Role.ADMIN, is_superuser=True).first()

        if not admin_user:
            admin_user = User.objects.create_user(
                username=admin_username,
                email=admin_email,
                password=admin_password,
                first_name='Wangs',
                last_name='Admin',
                role=User.Role.ADMIN,
                is_staff=True,
                is_superuser=True,
            )
            self.stdout.write(self.style.SUCCESS(f"Superuser '{admin_username}' successfully created."))
        else:
            admin_user.username = admin_username
            admin_user.email = admin_email
            admin_user.role = User.Role.ADMIN
            admin_user.is_staff = True
            admin_user.is_superuser = True
            admin_user.set_password(admin_password)
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f"Superuser '{admin_username}' synchronized with environment credentials."))
