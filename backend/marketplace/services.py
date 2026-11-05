from decimal import Decimal

DELIVERY_FEE = Decimal("25.00")
PLATFORM_RATE = Decimal("0.05")
VALID_PROMOS = {"FRESH10": Decimal("0.10")}


def calculate_cart_totals(cart):
    subtotal = Decimal("0.00")
    items_payload = []
    for item in cart.items.select_related("crop", "crop__farmer").all():
        line = item.crop.price * item.quantity
        subtotal += line
        items_payload.append(
            {
                "id": item.crop_id,
                "name": item.crop.name,
                "qty": item.quantity,
                "price": item.crop.price,
                "unit": item.crop.unit,
                "farmer": item.crop.farmer.display_farmer_name,
                "img": item.crop.image,
            }
        )

    discount = Decimal("0.00")
    promo = (cart.promo_code or "").upper()
    if subtotal > 0 and promo in VALID_PROMOS:
        discount = (subtotal * VALID_PROMOS[promo]).quantize(Decimal("1"))

    after_promo = subtotal - discount
    delivery = DELIVERY_FEE if after_promo > 0 else Decimal("0.00")
    platform = (after_promo * PLATFORM_RATE).quantize(Decimal("1")) if after_promo > 0 else Decimal("0.00")
    total = after_promo + delivery + platform

    return {
        "subtotal": subtotal,
        "discount": discount,
        "delivery_fee": delivery,
        "platform_fee": platform,
        "total": total,
        "promo_code": promo if discount > 0 else "",
        "items": items_payload,
    }
