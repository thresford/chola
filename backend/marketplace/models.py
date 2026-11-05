from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
import uuid


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.FARMER)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        FARMER = "farmer", "Farmer"

    username = None
    email = models.EmailField(unique=True)
    fullname = models.CharField(max_length=200)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    phone = models.CharField(max_length=30, blank=True)
    farm_name = models.CharField(max_length=200, blank=True)
    province = models.CharField(max_length=100, blank=True)
    profile_image = models.URLField(max_length=500, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["fullname"]

    objects = UserManager()

    def __str__(self):
        return self.email

    @property
    def display_farmer_name(self):
        if self.role == self.Role.FARMER and self.farm_name:
            return self.farm_name
        return self.fullname


class Crop(models.Model):
    class Category(models.TextChoices):
        GRAINS = "grains", "Grains"
        VEGETABLES = "vegetables", "Vegetables"
        TUBERS = "tubers", "Tubers"
        LEGUMES = "legumes", "Legumes"
        FRUITS = "fruits", "Fruits"
        HERBS = "herbs", "Herbs & Spices"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    farmer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="crops",
        limit_choices_to={"role": User.Role.FARMER},
    )
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=30, choices=Category.choices)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    image = models.URLField(max_length=500)
    badge = models.CharField(max_length=50, default="Fresh")
    organic = models.BooleanField(default=False)
    location = models.CharField(max_length=100, default="Zambia")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    stock = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="cart")
    promo_code = models.CharField(max_length=20, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    crop = models.ForeignKey(Crop, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ("cart", "crop")


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    order_number = models.CharField(max_length=20, unique=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    promo_code = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PAID)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    @staticmethod
    def generate_order_number():
        return f"OCM-{uuid.uuid4().hex[:6].upper()}"


class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_messages")
    subject = models.CharField(max_length=200)
    body = models.TextField()
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.subject} ({self.sender.email} → {self.recipient.email})"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    crop = models.ForeignKey(Crop, on_delete=models.SET_NULL, null=True, blank=True)
    crop_name = models.CharField(max_length=200)
    farmer_name = models.CharField(max_length=200, blank=True)
    unit = models.CharField(max_length=100)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
