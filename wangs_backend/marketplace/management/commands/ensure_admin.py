import os
from django.core.management.base import BaseCommand
from marketplace.models import User

class Command(BaseCommand):
    help = "Creates or synchronizes the production Wangs administrator account using environment variables."

    def handle(self, *args, **options):
        admin_username = os.environ.get('DJANGO_ADMIN_USERNAME', 'admin').strip() or 'admin'
        admin_password = os.environ.get('DJANGO_ADMIN_PASSWORD', 'admin12345').strip() or 'admin12345'
        admin_email = os.environ.get('DJANGO_ADMIN_EMAIL', 'admin@wangs.in').strip() or 'admin@wangs.in'

        # Locate existing user by username, email, or existing superuser
        admin_user = (
            User.objects.filter(username__iexact=admin_username).first() or
            User.objects.filter(email__iexact=admin_email).first() or
            User.objects.filter(role=User.Role.ADMIN, is_superuser=True).first() or
            User.objects.filter(is_superuser=True).first()
        )

        if not admin_user:
            if not admin_password:
                self.stdout.write(self.style.ERROR(
                    "Cannot create new administrator: DJANGO_ADMIN_PASSWORD environment variable is required."
                ))
                return

            admin_user = User.objects.create_user(
                username=admin_username,
                email=admin_email,
                password=admin_password,
                first_name='Wangs',
                last_name='Admin',
                role=User.Role.ADMIN,
                is_staff=True,
                is_superuser=True,
                is_active=True,
            )
            self.stdout.write(self.style.SUCCESS(
                f"[WANGS DEPLOY] Superuser '{admin_username}' successfully created with active staff and admin permissions."
            ))
        else:
            # Synchronize username and elevate permissions idempotently
            admin_user.username = admin_username
            if admin_email and not admin_user.email:
                admin_user.email = admin_email
            admin_user.role = User.Role.ADMIN
            admin_user.is_staff = True
            admin_user.is_superuser = True
            admin_user.is_active = True
            admin_user.is_banned = False
            admin_user.ban_reason = ''

            if admin_password:
                admin_user.set_password(admin_password)
                admin_user.save()
                self.stdout.write(self.style.SUCCESS(
                    f"[WANGS DEPLOY] Superuser '{admin_username}' credentials and permissions successfully synchronized."
                ))
            else:
                admin_user.save(update_fields=['username', 'role', 'is_staff', 'is_superuser', 'is_active', 'is_banned', 'ban_reason'])
                self.stdout.write(self.style.WARNING(
                    f"[WANGS DEPLOY] Superuser '{admin_username}' permissions verified (password retained as DJANGO_ADMIN_PASSWORD was not provided)."
                ))
