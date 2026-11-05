from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView
from django.views.static import serve


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("marketplace.urls")),
    path("", TemplateView.as_view(template_name="index.html"), name="home"),
]

if settings.DEBUG:
    urlpatterns += [
        re_path(
            r"^(?P<path>(?!api/|admin/)[^/]+\.(html|css|js|svg|png|jpg|jpeg|webp|ico))$",
            serve,
            {"document_root": settings.FRONTEND_DIR},
        ),
        re_path(
            r"^images/(?P<path>.*)$",
            serve,
            {"document_root": settings.FRONTEND_DIR / "images"},
        ),
    ]
