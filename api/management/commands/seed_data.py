from django.core.management.base import BaseCommand
from api.models import SystemUser, Incident, Alert, EvacCenter, Resident, Resource, ActivityLog


class Command(BaseCommand):
    help = 'Seed initial data for IDRMS Barangay Kauswagan'

    def handle(self, *args, **options):
        self.stdout.write('Seeding IDRMS data...')

        # Users
        users = [
            {'name': 'Admin User',     'email': 'admin@kauswagan.gov.ph', 'password': 'admin123', 'role': 'Admin',  'status': 'Active'},
            {'name': 'Staff User',     'email': 'staff@kauswagan.gov.ph', 'password': 'admin123', 'role': 'Staff',  'status': 'Active'},
            {'name': 'Juan Dela Cruz', 'email': 'juan@kauswagan.gov.ph',  'password': 'staff123', 'role': 'Staff',  'status': 'Active'},
        ]
        for u in users:
            SystemUser.objects.get_or_create(email=u['email'], defaults=u)
        self.stdout.write('  ✓ Users seeded')

        # Evac Centers
        centers = [
            {'name': 'Kauswagan Elementary School', 'zone': 'Zone 1', 'address': 'Purok 1, Brgy. Kauswagan, CDO', 'capacity': 300, 'occupancy': 0,  'status': 'Open', 'facilities_available': ['Water','Restroom','Medical','Power','Food'], 'contact_person': 'Maria Santos', 'contact': '09171234567', 'lat': 8.4945, 'lng': 124.6415},
            {'name': 'Covered Court Tamparong',     'zone': 'Zone 2', 'address': 'Tamparong St., Brgy. Kauswagan', 'capacity': 200, 'occupancy': 45, 'status': 'Open', 'facilities_available': ['Water','Restroom','Power'],                      'contact_person': 'Pedro Reyes',  'contact': '09181234567', 'lat': 8.4932, 'lng': 124.6462},
            {'name': 'Barangay Hall Kauswagan',     'zone': 'Zone 3', 'address': 'Kauswagan Main Road, CDO',      'capacity': 150, 'occupancy': 0,  'status': 'Open', 'facilities_available': ['Water','Restroom','Medical','Power','Food','Sleeping Area'], 'contact_person': 'Ana Lim', 'contact': '09191234567', 'lat': 8.4922, 'lng': 124.6498},
            {'name': 'Zone 5 Community Center',     'zone': 'Zone 5', 'address': 'Purok 5, Brgy. Kauswagan',     'capacity': 120, 'occupancy': 0,  'status': 'Open', 'facilities_available': ['Water','Restroom'],                                'contact_person': 'Jose Tan',    'contact': '09201234567', 'lat': 8.4872, 'lng': 124.6448},
        ]
        for c in centers:
            EvacCenter.objects.get_or_create(name=c['name'], defaults=c)
        self.stdout.write('  ✓ Evacuation centers seeded')

        # Incidents
        incidents = [
            {'type': 'Flood',  'zone': 'Zone 3', 'location': 'Near Cagayan River embankment', 'severity': 'High',   'status': 'Active',  'description': 'Rising water level detected. Residents warned to evacuate.', 'reporter': 'Kagawad Torres', 'source': 'web', 'lat': 8.4908, 'lng': 124.6508},
            {'type': 'Fire',   'zone': 'Zone 1', 'location': 'Purok 2, beside sari-sari store','severity': 'Medium', 'status': 'Pending', 'description': 'Small fire reported, fire truck dispatched.',               'reporter': 'Tanod Flores',   'source': 'web', 'lat': 8.4945, 'lng': 124.6415},
            {'type': 'Storm',  'zone': 'Zone 2', 'location': 'Open areas near Tamparong',      'severity': 'Low',    'status': 'Verified','description': 'Tropical depression causing strong winds.',               'reporter': 'PAGASA Advisory','source': 'web', 'lat': 8.4932, 'lng': 124.6462},
        ]
        if Incident.objects.count() == 0:
            for i in incidents:
                Incident.objects.create(**i)
        self.stdout.write('  ✓ Incidents seeded')

        # Resources
        resources = [
            {'name': 'Life Jackets',         'category': 'Safety Gear',  'quantity': 50,  'available': 45,  'unit': 'pcs',   'location': 'Barangay Hall Bodega',  'status': 'Available'},
            {'name': 'Emergency Food Packs',  'category': 'Food Supply',  'quantity': 200, 'available': 180, 'unit': 'packs', 'location': 'Hall Storage Room',     'status': 'Available'},
            {'name': 'First Aid Kits',        'category': 'Medical',      'quantity': 30,  'available': 28,  'unit': 'kits',  'location': 'Health Center',         'status': 'Available'},
            {'name': 'Rescue Boats',          'category': 'Equipment',    'quantity': 3,   'available': 2,   'unit': 'units', 'location': 'Riverside Depot',       'status': 'Partially Deployed'},
            {'name': 'Flashlights',           'category': 'Equipment',    'quantity': 80,  'available': 70,  'unit': 'pcs',   'location': 'Hall Storage Room',     'status': 'Available'},
            {'name': 'Raincoats',             'category': 'Safety Gear',  'quantity': 100, 'available': 95,  'unit': 'pcs',   'location': 'Barangay Hall Bodega',  'status': 'Available'},
        ]
        for r in resources:
            Resource.objects.get_or_create(name=r['name'], defaults=r)
        self.stdout.write('  ✓ Resources seeded')

        # Activity Log
        if ActivityLog.objects.count() == 0:
            ActivityLog.objects.create(action='System initialized — IDRMS v3.0 ready', type='System', user_name='System', urgent=False)
            ActivityLog.objects.create(action='Flood incident reported in Zone 3',     type='Incident', user_name='Kagawad Torres', urgent=True)
            ActivityLog.objects.create(action='Evacuation center Barangay Hall status checked', type='Evacuation', user_name='Admin User', urgent=False)
        self.stdout.write('  ✓ Activity log seeded')

        self.stdout.write(self.style.SUCCESS('\n✅ IDRMS seed data loaded successfully!'))
        self.stdout.write('   Login: admin@kauswagan.gov.ph / admin123')
