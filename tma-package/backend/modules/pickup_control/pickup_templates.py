"""
O20: Pickup SMS/Email Templates (Ukrainian)
"""


def sms_pickup_template(level: str, ttn: str, order_id: str = None, days: int = None, deadline: str = None) -> str:
    """Generate SMS text for pickup reminders"""
    
    # Branch reminders (D2, D5, D7)
    if level == "D2":
        return f"📦 Ваше замовлення вже у відділенні Нової Пошти. Будь ласка, заберіть найближчим часом. ТТН: {ttn}"
    
    if level == "D5":
        return f"⏳ Нагадуємо: посилка у відділенні вже {days or 5} дн. Безкоштовне зберігання скоро завершиться. ТТН: {ttn}"
    
    if level == "D7":
        return f"⚠️ Відправлення у відділенні вже {days or 7} дн. Заберіть, щоб уникнути платного зберігання/повернення. ТТН: {ttn}"

    # Locker reminders (L1, L3, L5)
    if level == "L1":
        return f"📦 Посилка у поштоматі. Будь ласка, заберіть її найближчим часом. ТТН: {ttn}"
    
    if level == "L3":
        return f"⏳ Нагадуємо: посилка у поштоматі вже {days or 3} дні. Залишилось мало часу. ТТН: {ttn}"
    
    if level == "L5":
        return f"⚠️ Останній день зберігання у поштоматі. Якщо не заберете — її перемістять у відділення. ТТН: {ttn}"

    # Default
    return f"📦 Нагадування про отримання відправлення. ТТН: {ttn}"


def email_pickup_template(level: str, ttn: str, days: int = None, deadline: str = None) -> tuple:
    """Generate email subject and body for pickup reminders"""
    subject = "Нагадування: заберіть посилку з Нової Пошти"
    body = sms_pickup_template(level, ttn, days=days, deadline=deadline)
    body += "\n\nДякуємо за покупку!\nY-Store"
    return subject, body


def admin_alert_pickup_risk(count: int, total_amount: float, items: list) -> str:
    """Generate admin alert text for high-risk pickups"""
    text = (
        f"⚠️ <b>Ризик повернення / платного зберігання</b>\n"
        f"Відправлень 7+ днів: <b>{count}</b>\n"
        f"Сума під ризиком: <b>{total_amount:.2f} грн</b>\n\n"
        f"Приклади:\n"
    )
    for item in items[:5]:
        text += f"• ТТН <code>{item['ttn']}</code> — {item['days']} дн — {item['amount']:.0f} грн\n"
    return text
