from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Cart, CartItem, Crop, Message, Order, OrderItem, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("email",)
    list_display = ("email", "fullname", "role", "is_staff")
    search_fields = ("email", "fullname", "farm_name")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("fullname", "role", "phone", "farm_name", "province", "profile_image")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "fullname", "role", "password1", "password2")}),
    )


@admin.register(Crop)
class CropAdmin(admin.ModelAdmin):
    list_display = ("name", "farmer", "category", "price", "status", "stock")
    list_filter = ("category", "status", "organic")
    search_fields = ("name", "farmer__email", "farmer__farm_name")


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "user", "total", "status", "created_at")
    inlines = [OrderItemInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("subject", "sender", "recipient", "created_at", "read_at")
    search_fields = ("subject", "body", "sender__email", "recipient__email")


admin.site.register(Cart)
admin.site.register(CartItem)
