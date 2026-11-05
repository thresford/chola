from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CartViewSet,
    CheckoutView,
    CropViewSet,
    FarmerAnalyticsView,
    LoginView,
    LogoutView,
    MeView,
    MessageViewSet,
    OrderViewSet,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
)

router = DefaultRouter()
router.register(r"crops", CropViewSet, basename="crop")
router.register(r"cart", CartViewSet, basename="cart")
router.register(r"orders", OrderViewSet, basename="order")
router.register(r"messages", MessageViewSet, basename="message")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("auth/password-reset/", PasswordResetRequestView.as_view(), name="auth-password-reset"),
    path(
        "auth/password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="auth-password-reset-confirm",
    ),
    path("analytics/farmer/", FarmerAnalyticsView.as_view(), name="farmer-analytics"),
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("", include(router.urls)),
]
