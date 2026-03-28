# IDRMS Backend — Django REST Framework

**Integrated Disaster Risk Management System**  
Barangay Kauswagan, Cagayan de Oro City — BDRRMC

---

## System Overview

This is the backend API for IDRMS, serving both the **web dashboard** (React/Vite) and **mobile app** (Expo/React Native).

**Key rule:**
- 📱 **Mobile app** — can ADD residents (and other records)
- 🖥️ **Web dashboard** — can VIEW and EDIT residents (cannot add)
- Both share all other CRUD operations for incidents, alerts, resources, etc.

---

## Quick Start

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd idrms-backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run migrations
python manage.py migrate

# 5. Seed initial data
python manage.py seed_data

# 6. Create Django admin superuser (optional)
python manage.py createsuperuser

# 7. Run the server
python manage.py runserver
```

Server runs at: **http://127.0.0.1:8000**

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | Login (web + mobile) |
| POST | `/api/auth/register/` | Register new user |
| GET/POST | `/api/users/` | List / Add users |
| GET/PATCH/DELETE | `/api/users/<id>/` | User detail |
| GET/POST | `/api/incidents/` | List / Add incidents |
| GET/PATCH/DELETE | `/api/incidents/<id>/` | Incident detail |
| GET/POST | `/api/alerts/` | List / Add alerts |
| GET/PATCH/DELETE | `/api/alerts/<id>/` | Alert detail |
| GET/POST | `/api/evacuation-centers/` | List / Add evac centers |
| GET/PATCH/DELETE | `/api/evacuation-centers/<id>/` | Evac center detail |
| GET/POST | `/api/residents/` | List (web+mobile) / Add (mobile only) |
| GET/PATCH/DELETE | `/api/residents/<id>/` | Edit/Delete (web+mobile) |
| GET/POST | `/api/resources/` | List / Add resources |
| GET/PATCH/DELETE | `/api/resources/<id>/` | Resource detail |
| GET/POST | `/api/activity-log/` | Audit trail |
| GET | `/api/dashboard/` | Summary stats |

---

## Testing with httpie

```bash
# Install httpie
pip install httpie

# Test login
http POST http://127.0.0.1:8000/api/auth/login/ email="admin@kauswagan.gov.ph" password="admin123"

# Get all residents
http GET http://127.0.0.1:8000/api/residents/

# Add a resident (mobile)
http POST http://127.0.0.1:8000/api/residents/ \
  name="Juan Santos" zone="Zone 3" address="Purok 2" \
  household_members:=4 contact="09123456789" \
  evacuation_status="Safe" vulnerability_tags:='["Senior Citizen"]' \
  added_by="Mobile" source="mobile"

# Get all incidents
http GET http://127.0.0.1:8000/api/incidents/

# Dashboard summary
http GET http://127.0.0.1:8000/api/dashboard/
```

---

## Django Admin

Access at: **http://127.0.0.1:8000/admin/**

Run `python manage.py createsuperuser` to create admin credentials.

---

## Django MVT Mapping

| UI Feature | Model | View | API Endpoint |
|------------|-------|------|-------------|
| Login Page | SystemUser | auth_login | `/api/auth/login/` |
| Dashboard | All models | dashboard_summary | `/api/dashboard/` |
| Incidents | Incident | incidents_list/detail | `/api/incidents/` |
| Alerts | Alert | alerts_list/detail | `/api/alerts/` |
| Evacuation | EvacCenter | evac_list/detail | `/api/evacuation-centers/` |
| Residents | Resident | residents_list/detail | `/api/residents/` |
| Resources | Resource | resources_list/detail | `/api/resources/` |
| Activity Log | ActivityLog | activity_log_list | `/api/activity-log/` |
| Users | SystemUser | users_list/detail | `/api/users/` |

---

## Commit Message

```
AppDev: DRF backend for system implemented
```
