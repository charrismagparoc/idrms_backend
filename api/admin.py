from django.contrib import admin
from .models import SystemUser, Incident, Alert, EvacCenter, Resident, Resource, ActivityLog


@admin.register(SystemUser)
class SystemUserAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'role', 'status', 'created_at']
    list_filter = ['role', 'status']
    search_fields = ['name', 'email']


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ['type', 'zone', 'severity', 'status', 'reporter', 'date_reported']
    list_filter = ['type', 'zone', 'severity', 'status']
    search_fields = ['location', 'reporter']


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['level', 'zone', 'sent_by', 'recipients_count', 'sent_at']
    list_filter = ['level', 'zone']


@admin.register(EvacCenter)
class EvacCenterAdmin(admin.ModelAdmin):
    list_display = ['name', 'zone', 'status', 'occupancy', 'capacity']
    list_filter = ['zone', 'status']


@admin.register(Resident)
class ResidentAdmin(admin.ModelAdmin):
    list_display = ['name', 'zone', 'evacuation_status', 'household_members', 'source', 'added_at']
    list_filter = ['zone', 'evacuation_status', 'source']
    search_fields = ['name', 'address']


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'quantity', 'available', 'status']
    list_filter = ['category', 'status']


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'type', 'user_name', 'urgent', 'created_at']
    list_filter = ['type', 'urgent']
    readonly_fields = ['created_at']
