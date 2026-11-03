import os
from django.apps import AppConfig
from django.db.models.signals import post_migrate

def sync_admin_user_on_migrate(sender, **kwargs):
    if sender.name != 'marketplace':
        return
    try:
        from .models import User
        admin_username = os.environ.get('DJANGO_ADMIN_USERNAME', '').strip()
        admin_password = os.environ.get('DJANGO_ADMIN_PASSWORD', '').strip()
        admin_email = os.environ.get('DJANGO_ADMIN_EMAIL', 'admin@wangs.in').strip() or 'admin@wangs.in'
        
        if not admin_username or not admin_password:
            return

        admin_user = User.objects.filter(username=admin_username).first()
        if not admin_user:
            admin_user = User.objects.filter(role=User.Role.ADMIN, is_superuser=True).first()

        if not admin_user:
            User.objects.create_user(
                username=admin_username,
                email=admin_email,
                password=admin_password,
                first_name='Wangs',
                last_name='Admin',
                role=User.Role.ADMIN,
                is_staff=True,
                is_superuser=True,
            )
            print(f"[WANGS DEPLOY] Superuser '{admin_username}' created successfully from environment.")
        else:
            admin_user.username = admin_username
            admin_user.email = admin_email
            admin_user.role = User.Role.ADMIN
            admin_user.is_staff = True
            admin_user.is_superuser = True
            admin_user.set_password(admin_password)
            admin_user.save()
            print(f"[WANGS DEPLOY] Superuser '{admin_username}' synchronized from environment.")
    except Exception as exc:
        print(f"[WANGS DEPLOY] Superuser auto-sync notice: {exc}")


class MarketplaceConfig(AppConfig):
    name = 'marketplace'

    def ready(self):
        post_migrate.connect(sync_admin_user_on_migrate, sender=self)

