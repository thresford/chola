from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import mixins, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Cart, CartItem, Crop, Message, Order, OrderItem, User
from .permissions import IsFarmer, IsFarmerOwnerOrReadOnly
from .serializers import (
    CartItemSerializer,
    CartSerializer,
    CheckoutSerializer,
    CropPublicSerializer,
    CropSerializer,
    LoginSerializer,
    MessageCreateSerializer,
    MessageSerializer,
    OrderSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .services import calculate_cart_totals


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        Cart.objects.get_or_create(user=user)
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        Cart.objects.get_or_create(user=user)
        return Response(
            {
                "token": serializer.validated_data["token"],
                "user": UserSerializer(user).data,
            }
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({"detail": "Logged out."})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class CropViewSet(viewsets.ModelViewSet):
    """
    Public read for active crops; farmers manage their own listings.
    """

    queryset = Crop.objects.select_related("farmer").all()
    permission_classes = [IsFarmerOwnerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if (
            user.is_authenticated
            and user.role == User.Role.FARMER
            and self.request.query_params.get("mine") == "1"
        ):
            return Crop.objects.filter(farmer=user).select_related("farmer")

        qs = Crop.objects.select_related("farmer")
        if self.action in ("list", "retrieve") and not self.request.user.is_staff:
            qs = qs.filter(status=Crop.Status.ACTIVE)
        category = self.request.query_params.get("category")
        if category and category != "all":
            if category == "organic":
                qs = qs.filter(organic=True)
            else:
                qs = qs.filter(category=category)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(description__icontains=search)
                | Q(farmer__fullname__icontains=search)
                | Q(farmer__farm_name__icontains=search)
            )
        return qs.distinct()

    def get_serializer_class(self):
        if self.action in ("list", "retrieve") and self.request.query_params.get("format") != "admin":
            return CropPublicSerializer
        return CropSerializer

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)


class CartViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CartSerializer

    def get_cart(self):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        return cart

    def list(self, request):
        cart = self.get_cart()
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=["post"])
    def add_item(self, request):
        cart = self.get_cart()
        crop_id = request.data.get("crop_id")
        qty = int(request.data.get("quantity", 1))
        crop = get_object_or_404(Crop, pk=crop_id, status=Crop.Status.ACTIVE)
        item, created = CartItem.objects.get_or_create(cart=cart, crop=crop, defaults={"quantity": qty})
        if not created:
            item.quantity += qty
            item.save(update_fields=["quantity"])
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=["post"])
    def update_item(self, request):
        cart = self.get_cart()
        crop_id = request.data.get("crop_id")
        delta = int(request.data.get("delta", 0))
        item = get_object_or_404(CartItem, cart=cart, crop_id=crop_id)
        item.quantity = max(1, item.quantity + delta)
        item.save(update_fields=["quantity"])
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=["post"])
    def remove_item(self, request):
        cart = self.get_cart()
        crop_id = request.data.get("crop_id")
        CartItem.objects.filter(cart=cart, crop_id=crop_id).delete()
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=["post"])
    def apply_promo(self, request):
        cart = self.get_cart()
        code = (request.data.get("code") or "").strip().upper()
        from .services import VALID_PROMOS

        if code and code not in VALID_PROMOS:
            return Response({"detail": "Invalid promo code."}, status=status.HTTP_400_BAD_REQUEST)
        cart.promo_code = code
        cart.save(update_fields=["promo_code"])
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=["post"])
    def clear(self, request):
        cart = self.get_cart()
        cart.items.all().delete()
        cart.promo_code = ""
        cart.save(update_fields=["promo_code"])
        return Response(CartSerializer(cart).data)


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        CheckoutSerializer(data=request.data).is_valid(raise_exception=True)
        cart, _ = Cart.objects.get_or_create(user=request.user)
        if not cart.items.exists():
            return Response({"detail": "Cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

        for item in cart.items.select_related("crop"):
            if item.crop.status != Crop.Status.ACTIVE:
                return Response(
                    {"detail": f"{item.crop.name} is no longer available."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if item.quantity > item.crop.stock:
                return Response(
                    {"detail": f"Not enough stock for {item.crop.name} (only {item.crop.stock} left)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        totals = calculate_cart_totals(cart)
        order = Order.objects.create(
            user=request.user,
            order_number=Order.generate_order_number(),
            subtotal=totals["subtotal"],
            delivery_fee=totals["delivery_fee"],
            platform_fee=totals["platform_fee"],
            discount=totals["discount"],
            total=totals["total"],
            promo_code=totals["promo_code"],
        )
        for item in cart.items.select_related("crop", "crop__farmer"):
            line_total = item.crop.price * item.quantity
            OrderItem.objects.create(
                order=order,
                crop=item.crop,
                crop_name=item.crop.name,
                farmer_name=item.crop.farmer.display_farmer_name,
                unit=item.crop.unit,
                unit_price=item.crop.price,
                quantity=item.quantity,
                line_total=line_total,
            )
            crop = item.crop
            crop.stock = max(0, crop.stock - item.quantity)
            crop.save(update_fields=["stock"])
        cart.items.all().delete()
        cart.promo_code = ""
        cart.save(update_fields=["promo_code"])
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        qs = Order.objects.filter(user=self.request.user).prefetch_related("items")
        if self.request.user.role == User.Role.FARMER:
            qs = Order.objects.prefetch_related("items").filter(
                items__crop__farmer=self.request.user
            ).distinct()
        return qs


class MessageViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(Q(sender=user) | Q(recipient=user)).select_related(
            "sender", "recipient"
        )

    def get_serializer_class(self):
        if self.action == "create":
            return MessageCreateSerializer
        return MessageSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = Message.objects.create(
            sender=request.user,
            recipient=serializer.validated_data["recipient"],
            subject=serializer.validated_data["subject"],
            body=serializer.validated_data["body"],
        )
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        message = self.get_object()
        if message.recipient_id != request.user.id:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        if not message.read_at:
            message.read_at = timezone.now()
            message.save(update_fields=["read_at"])
        return Response(MessageSerializer(message).data)


class FarmerAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, IsFarmer]

    def get(self, request):
        user = request.user
        items = OrderItem.objects.filter(crop__farmer=user).select_related("order", "crop")

        monthly_rows = (
            items.annotate(month=TruncMonth("order__created_at"))
            .values("month")
            .annotate(revenue=Sum("line_total"), order_count=Count("order_id", distinct=True))
            .order_by("month")
        )
        monthly = [
            {
                "month": row["month"].strftime("%Y-%m") if row["month"] else "",
                "label": row["month"].strftime("%b %Y") if row["month"] else "",
                "revenue": float(row["revenue"] or 0),
                "orders": row["order_count"] or 0,
            }
            for row in monthly_rows
        ][-6:]

        top_crops = [
            {
                "name": row["crop_name"],
                "revenue": float(row["revenue"] or 0),
                "quantity": row["qty"] or 0,
            }
            for row in items.values("crop_name")
            .annotate(revenue=Sum("line_total"), qty=Sum("quantity"))
            .order_by("-revenue")[:5]
        ]

        totals = items.aggregate(
            revenue=Sum("line_total"),
            units=Sum("quantity"),
            orders=Count("order_id", distinct=True),
        )

        return Response(
            {
                "monthly": monthly,
                "top_crops": top_crops,
                "totals": {
                    "revenue": float(totals["revenue"] or 0),
                    "units_sold": int(totals["units"] or 0),
                    "orders": int(totals["orders"] or 0),
                },
            }
        )


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        frontend_url = (
            serializer.validated_data.get("frontend_url")
            or getattr(settings, "FRONTEND_URL", "http://127.0.0.1:8000")
        ).rstrip("/")

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        payload = {"detail": "If an account exists for that email, password reset instructions were sent."}

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_link = f"{frontend_url}/reset-password.html?uid={uid}&token={token}"
            send_mail(
                subject="Reset your CropMarket password",
                message=(
                    "You requested a password reset for your CropMarket account.\n\n"
                    f"Open this link to choose a new password (valid for 24 hours):\n{reset_link}\n\n"
                    "If you did not request this, you can ignore this email."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            if settings.DEBUG:
                payload["reset_link"] = reset_link

        return Response(payload)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            uid = force_str(urlsafe_base64_decode(serializer.validated_data["uid"]))
            user = User.objects.get(pk=uid, is_active=True)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response({"detail": "Invalid reset link."}, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data["token"]
        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Invalid or expired reset link."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password"])
        Token.objects.filter(user=user).delete()
        return Response({"detail": "Password updated. You can sign in now."})
