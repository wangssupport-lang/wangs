#!/usr/bin/env bash
# Exit on error
set -o errexit

cd wangs_backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_wangs_data
python manage.py ensure_admin
python manage.py collectstatic --noinput
