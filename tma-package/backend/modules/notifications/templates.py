# O2: Notification Templates
def render_sms(template: str, ctx: dict) -> str:
    if template == "TTN_CREATED":
        return f"Y-Store: Посилка відправлена. ТТН: {ctx.get('ttn', '')}. Очікуйте доставку!"
    if template == "ORDER_PAID":
        return f"Y-Store: Оплата підтверджена. Замовлення #{ctx.get('order_id', '')[:8]}. Дякуємо!"
    if template == "ORDER_DELIVERED":
        return f"Y-Store: Замовлення #{ctx.get('order_id', '')[:8]} доставлено. Дякуємо за покупку!"
    if template == "MANUAL":
        return ctx.get("text", "Y-Store повідомлення")
    return "Y-Store повідомлення"

def render_email_subject(template: str, ctx: dict) -> str:
    if template == "TTN_CREATED":
        return f"Y-Store: Відправлено (ТТН {ctx.get('ttn', '')})"
    if template == "ORDER_PAID":
        return f"Y-Store: Оплата підтверджена (#{ctx.get('order_id', '')[:8]})"
    if template == "ORDER_DELIVERED":
        return f"Y-Store: Доставлено (#{ctx.get('order_id', '')[:8]})"
    return "Y-Store"

def render_email_body(template: str, ctx: dict) -> str:
    if template == "TTN_CREATED":
        return f"""
Вітаємо!

Ваше замовлення #{ctx.get('order_id', '')[:8]} відправлено.

ТТН: {ctx.get('ttn', '')}
Відстежити: https://novaposhta.ua/tracking/?cargo_number={ctx.get('ttn', '')}

Дякуємо за покупку в Y-Store!
"""
    if template == "ORDER_PAID":
        return f"""
Вітаємо!

Оплата замовлення #{ctx.get('order_id', '')[:8]} підтверджена.
Ми вже готуємо вашу посилку.

Дякуємо за покупку в Y-Store!
"""
    if template == "ORDER_DELIVERED":
        return f"""
Вітаємо!

Ваше замовлення #{ctx.get('order_id', '')[:8]} доставлено.

Дякуємо за покупку в Y-Store!
Будемо раді бачити вас знову!
"""
    return ctx.get("body", "Y-Store повідомлення")
