from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from marketplace.models import Cart, Crop, Message, User

DEMO_CROPS = [
    {
        "name": "Sweet Maize",
        "category": "grains",
        "price": "45.00",
        "unit": "per 50kg bag",
        "description": "Sun-dried, freshly harvested maize from the fertile soils of Lusaka Province. High starch, perfect for milling.",
        "image": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&q=80",
        "badge": "Fresh",
        "organic": False,
        "location": "Lusaka Province",
        "stock": 120,
        "farmer_email": "farmer@demo.com",
    },
    {
        "name": "Ripe Tomatoes",
        "category": "vegetables",
        "price": "30.00",
        "unit": "per 20kg crate",
        "description": "Plump, vine-ripened tomatoes, carefully selected for freshness. Ideal for sauces, salads, and cooking.",
        "image": "images/tomatoes.png",
        "badge": "Organic",
        "organic": True,
        "location": "Copperbelt Province",
        "stock": 80,
        "farmer_email": "grace@demo.com",
    },
    {
        "name": "Irish Potatoes",
        "category": "tubers",
        "price": "55.00",
        "unit": "per 50kg bag",
        "description": "Premium Irish potatoes from cool highland farms. Smooth skin, creamy flesh — great for any recipe.",
        "image": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&q=80",
        "badge": "Fresh",
        "organic": False,
        "location": "Northern Province",
        "stock": 90,
        "farmer_email": "moses@demo.com",
    },
    {
        "name": "Basmati Rice",
        "category": "grains",
        "price": "120.00",
        "unit": "per 25kg bag",
        "description": "Aromatic, long-grain rice grown in fertile river valleys. Fluffy texture and exquisite aroma.",
        "image": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80",
        "badge": "Premium",
        "organic": False,
        "location": "Western Province",
        "stock": 40,
        "farmer_email": "fatuma@demo.com",
    },
    {
        "name": "Kidney Beans",
        "category": "legumes",
        "price": "80.00",
        "unit": "per 25kg bag",
        "description": "Nutrient-rich kidney beans, sun-dried and hand-sorted. High protein, great for traditional stews.",
        "image": "https://images.pexels.com/photos/4197928/pexels-photo-4197928.jpeg?auto=compress&cs=tinysrgb&w=600",
        "badge": "Organic",
        "organic": True,
        "location": "Eastern Province",
        "stock": 60,
        "farmer_email": "peter@demo.com",
    },
    {
        "name": "Groundnuts",
        "category": "legumes",
        "price": "65.00",
        "unit": "per 25kg bag",
        "description": "Raw, unsalted groundnuts grown in well-drained sandy loam soils. Perfect for peanut butter and relishes.",
        "image": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600&q=80",
        "badge": "Fresh",
        "organic": False,
        "location": "Central Province",
        "stock": 70,
        "farmer_email": "mary@demo.com",
    },
    {
        "name": "Red Onions",
        "category": "vegetables",
        "price": "25.00",
        "unit": "per 10kg bag",
        "description": "Pungent, firm red onions. Adds bold flavour to any dish. Naturally grown without pesticides.",
        "image": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&q=80",
        "badge": "Organic",
        "organic": True,
        "location": "Southern Province",
        "stock": 100,
        "farmer_email": "james@demo.com",
    },
    {
        "name": "Green Cabbage",
        "category": "vegetables",
        "price": "20.00",
        "unit": "per head",
        "description": "Tightly-packed, crisp cabbage heads. Freshly harvested and naturally grown on smallholder farms.",
        "image": "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600&q=80",
        "badge": "Fresh",
        "organic": False,
        "location": "Lusaka Province",
        "stock": 150,
        "farmer_email": "rose@demo.com",
    },
]

DEMO_USERS = [
    {
        "email": "farmer@demo.com",
        "password": "123456",
        "fullname": "John Banda",
        "role": User.Role.FARMER,
        "farm_name": "Green Valley Farm",
        "province": "Lusaka Province",
        "profile_image": "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=200&q=80",
    },
    {
        "email": "buyer@demo.com",
        "password": "123456",
        "fullname": "Namukolo Mwanza",
        "role": User.Role.CUSTOMER,
        "profile_image": "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80",
    },
    {"email": "grace@demo.com", "password": "123456", "fullname": "Grace Mwale", "role": User.Role.FARMER, "farm_name": "Mwale Tomatoes", "province": "Copperbelt Province"},
    {"email": "moses@demo.com", "password": "123456", "fullname": "Moses Zulu", "role": User.Role.FARMER, "farm_name": "Highland Potatoes", "province": "Northern Province"},
    {"email": "fatuma@demo.com", "password": "123456", "fullname": "Fatuma Phiri", "role": User.Role.FARMER, "farm_name": "River Valley Rice", "province": "Western Province"},
    {"email": "peter@demo.com", "password": "123456", "fullname": "Peter Tembo", "role": User.Role.FARMER, "farm_name": "Eastern Legumes", "province": "Eastern Province"},
    {"email": "mary@demo.com", "password": "123456", "fullname": "Mary Nkosi", "role": User.Role.FARMER, "farm_name": "Central Groundnuts", "province": "Central Province"},
    {"email": "james@demo.com", "password": "123456", "fullname": "James Lungu", "role": User.Role.FARMER, "farm_name": "Southern Onions", "province": "Southern Province"},
    {"email": "rose@demo.com", "password": "123456", "fullname": "Rose Chileshe", "role": User.Role.FARMER, "farm_name": "Lusaka Greens", "province": "Lusaka Province"},
]


class Command(BaseCommand):
    help = "Load demo users and crop catalog for Online Crop Market"

    @transaction.atomic
    def handle(self, *args, **options):
        farmers_by_email = {}
        for data in DEMO_USERS:
            email = data["email"]
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "fullname": data["fullname"],
                    "role": data["role"],
                    "farm_name": data.get("farm_name", ""),
                    "province": data.get("province", ""),
                    "profile_image": data.get("profile_image", ""),
                },
            )
            if created or options.get("force_passwords"):
                user.set_password(data["password"])
                user.fullname = data["fullname"]
                user.role = data["role"]
                user.farm_name = data.get("farm_name", "")
                user.province = data.get("province", "")
                user.profile_image = data.get("profile_image", "")
                user.save()
            Cart.objects.get_or_create(user=user)
            if user.role == User.Role.FARMER:
                farmers_by_email[email] = user
            self.stdout.write(self.style.SUCCESS(f"{'Created' if created else 'Updated'} user {email}"))

        Crop.objects.all().delete()
        for row in DEMO_CROPS:
            farmer = farmers_by_email.get(row["farmer_email"]) or User.objects.get(email="farmer@demo.com")
            Crop.objects.create(
                farmer=farmer,
                name=row["name"],
                category=row["category"],
                price=Decimal(row["price"]),
                unit=row["unit"],
                description=row["description"],
                image=row["image"],
                badge=row["badge"],
                organic=row["organic"],
                location=row["location"],
                stock=row["stock"],
                status=Crop.Status.ACTIVE,
            )
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(DEMO_CROPS)} demo crops."))

        buyer = User.objects.filter(email="buyer@demo.com").first()
        farmer = User.objects.filter(email="farmer@demo.com").first()
        if buyer and farmer:
            demo_messages = [
                {
                    "sender": buyer,
                    "recipient": farmer,
                    "subject": "Bulk maize for restaurant",
                    "body": "Hi, I run a small restaurant in Lusaka and need 10 bags of sweet maize weekly. Can you deliver?",
                },
                {
                    "sender": buyer,
                    "recipient": farmer,
                    "subject": "Question about organic certification",
                    "body": "Do you have any organic certification documents for the maize? Thanks!",
                },
            ]
            for row in demo_messages:
                Message.objects.get_or_create(
                    sender=row["sender"],
                    recipient=row["recipient"],
                    subject=row["subject"],
                    defaults={"body": row["body"]},
                )
            self.stdout.write(self.style.SUCCESS("Seeded demo buyer → farmer messages."))
