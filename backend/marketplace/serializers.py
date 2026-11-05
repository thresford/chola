from decimal import Decimal
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework.authtoken.models import Token

from .models import Cart, CartItem, Crop, Message, Order, OrderItem, User
from .services import calculate_cart_totals


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "fullname",
            "role",
            "phone",
            "farm_name",
            "province",
            "profile_image",
        )
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    confirm = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = (
            "email",
            "password",
            "confirm",
            "fullname",
            "phone",
            "role",
            "farm_name",
            "province",
            "profile_image",
        )

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm"):
            raise serializers.ValidationError({"confirm": "Passwords do not match."})
        role = attrs.get("role", User.Role.CUSTOMER)
        if role not in (User.Role.CUSTOMER, User.Role.FARMER):
            raise serializers.ValidationError({"role": "Invalid account type."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            username=attrs["email"],
            password=attrs["password"],
        )
        if not user:
            raise serializers.ValidationError("Invalid email or password.")
        token, _ = Token.objects.get_or_create(user=user)
        attrs["user"] = user
        attrs["token"] = token.key
        return attrs


class CropSerializer(serializers.ModelSerializer):
    farmer_name = serializers.SerializerMethodField()
    farmer_email = serializers.EmailField(source="farmer.email", read_only=True)

    class Meta:
        model = Crop
        fields = (
            "id",
            "name",
            "category",
            "price",
            "unit",
            "description",
            "image",
            "badge",
            "organic",
            "location",
            "status",
            "stock",
            "farmer",
            "farmer_name",
            "farmer_email",
            "created_at",
        )
        read_only_fields = ("farmer", "created_at")

    def get_farmer_name(self, obj):
        return obj.farmer.display_farmer_name

    def create(self, validated_data):
        validated_data["farmer"] = self.context["request"].user
        user = validated_data["farmer"]
        if not validated_data.get("location"):
            validated_data["location"] = user.province or "Zambia"
        return super().create(validated_data)


class CropPublicSerializer(serializers.ModelSerializer):
    """Shape aligned with the existing frontend catalog."""

    farmer = serializers.CharField(source="farmer.display_farmer_name")
    farmer_id = serializers.IntegerField(source="farmer.id", read_only=True)
    desc = serializers.CharField(source="description")
    img = serializers.URLField(source="image")

    class Meta:
        model = Crop
        fields = (
            "id",
            "name",
            "category",
            "price",
            "unit",
            "desc",
            "img",
            "badge",
            "organic",
            "location",
            "farmer",
            "farmer_id",
            "status",
            "stock",
        )


class CartItemSerializer(serializers.ModelSerializer):
    crop = CropPublicSerializer(read_only=True)
    crop_id = serializers.PrimaryKeyRelatedField(
        queryset=Crop.objects.filter(status=Crop.Status.ACTIVE),
        source="crop",
        write_only=True,
    )

    class Meta:
        model = CartItem
        fields = ("id", "crop", "crop_id", "quantity")


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    summary = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ("promo_code", "items", "summary")

    def get_summary(self, obj):
        return calculate_cart_totals(obj)


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = (
            "crop_name",
            "farmer_name",
            "unit",
            "unit_price",
            "quantity",
            "line_total",
        )


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "subtotal",
            "delivery_fee",
            "platform_fee",
            "discount",
            "total",
            "promo_code",
            "status",
            "created_at",
            "items",
        )


class CheckoutSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    payment_method = serializers.CharField(required=False, allow_blank=True)


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = (
            "id",
            "sender",
            "recipient",
            "sender_name",
            "recipient_name",
            "subject",
            "body",
            "read_at",
            "is_read",
            "created_at",
        )
        read_only_fields = ("sender", "read_at", "created_at")

    def get_sender_name(self, obj):
        return obj.sender.fullname

    def get_recipient_name(self, obj):
        return obj.recipient.fullname

    def get_is_read(self, obj):
        return obj.read_at is not None

    def create(self, validated_data):
        validated_data["sender"] = self.context["request"].user
        return super().create(validated_data)


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("recipient", "subject", "body")

    def validate_recipient(self, user):
        if user.id == self.context["request"].user.id:
            raise serializers.ValidationError("You cannot message yourself.")
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    frontend_url = serializers.URLField(required=False, allow_blank=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(min_length=6, write_only=True)
    confirm = serializers.CharField(min_length=6, write_only=True)

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm"]:
            raise serializers.ValidationError({"confirm": "Passwords do not match."})
        return attrs
