"""
Email Notification Service
Sends notifications about orders and purchases
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.environ.get('SMTP_PORT', '587'))
        self.smtp_user = os.environ.get('SMTP_USER', '')
        self.smtp_password = os.environ.get('SMTP_PASSWORD', '')
        self.from_email = os.environ.get('FROM_EMAIL', self.smtp_user)
        self.admin_email = os.environ.get('ADMIN_EMAIL', 'admin@bazaar.com')
        
    def send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """
        Send email using SMTP
        """
        try:
            if not self.smtp_user or not self.smtp_password:
                logger.warning("SMTP credentials not configured. Email not sent.")
                return False
                
            msg = MIMEMultipart('alternative')
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    def send_order_confirmation(self, customer_email: str, order_data: Dict) -> bool:
        """
        Send order confirmation to customer
        """
        items_html = ""
        for item in order_data.get("items", []):
            items_html += f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{item.get('product_name', 'Unknown')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">{item.get('quantity', 0)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.get('price', 0):.2f}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${(item.get('price', 0) * item.get('quantity', 0)):.2f}</td>
            </tr>
            """
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .order-details {{ background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }}
                table {{ width: 100%; border-collapse: collapse; }}
                th {{ background: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; }}
                .total {{ font-size: 20px; font-weight: bold; color: #4F46E5; margin-top: 20px; text-align: right; }}
                .footer {{ text-align: center; color: #777; margin-top: 30px; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Ваш заказ подтвержден!</h1>
                </div>
                <div class="content">
                    <p>Здравствуйте, <strong>{order_data.get('customer_name', 'Покупатель')}</strong>!</p>
                    
                    <p>Благодарим вас за покупку! Ваш заказ <strong>#{order_data.get('order_number', 'N/A')}</strong> успешно оформлен.</p>
                    
                    <div class="order-details">
                        <h3>Детали заказа:</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Товар</th>
                                    <th style="text-align: center;">Количество</th>
                                    <th style="text-align: right;">Цена</th>
                                    <th style="text-align: right;">Сумма</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items_html}
                            </tbody>
                        </table>
                        <div class="total">
                            Итого: ${order_data.get('total_amount', 0):.2f}
                        </div>
                    </div>
                    
                    <p><strong>Статус:</strong> {order_data.get('status', 'pending')}</p>
                    <p><strong>Способ оплаты:</strong> {order_data.get('payment_method', 'N/A')}</p>
                    
                    <p>Мы обработаем ваш заказ в ближайшее время и отправим уведомление о доставке.</p>
                    
                    <p>С уважением,<br><strong>Команда Bazaar</strong></p>
                </div>
                <div class="footer">
                    <p>Это автоматическое письмо. Пожалуйста, не отвечайте на него.</p>
                    <p>&copy; 2024 Bazaar Marketplace. Все права защищены.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(
            customer_email,
            f"Заказ #{order_data.get('order_number')} подтвержден",
            html_content
        )
    
    def send_admin_notification(self, order_data: Dict) -> bool:
        """
        Send new order notification to admin
        """
        items_html = ""
        for item in order_data.get("items", []):
            items_html += f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{item.get('product_name', 'Unknown')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">{item.get('quantity', 0)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.get('price', 0):.2f}</td>
            </tr>
            """
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .order-details {{ background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }}
                table {{ width: 100%; border-collapse: collapse; }}
                th {{ background: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; }}
                .total {{ font-size: 20px; font-weight: bold; color: #10B981; margin-top: 20px; }}
                .customer-info {{ background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔔 Новый заказ!</h1>
                </div>
                <div class="content">
                    <h2>Получен новый заказ #{order_data.get('order_number', 'N/A')}</h2>
                    
                    <div class="customer-info">
                        <h3>Информация о покупателе:</h3>
                        <p><strong>Имя:</strong> {order_data.get('customer_name', 'N/A')}</p>
                        <p><strong>Email:</strong> {order_data.get('customer_email', 'N/A')}</p>
                        <p><strong>ID покупателя:</strong> {order_data.get('buyer_id', 'N/A')}</p>
                    </div>
                    
                    <div class="order-details">
                        <h3>Товары в заказе:</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Товар</th>
                                    <th style="text-align: center;">Количество</th>
                                    <th style="text-align: right;">Цена</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items_html}
                            </tbody>
                        </table>
                        <div class="total">
                            Сумма заказа: ${order_data.get('total_amount', 0):.2f}
                        </div>
                    </div>
                    
                    <p><strong>Статус:</strong> {order_data.get('status', 'pending')}</p>
                    <p><strong>Способ оплаты:</strong> {order_data.get('payment_method', 'N/A')}</p>
                    
                    <p style="margin-top: 30px;">Пожалуйста, обработайте этот заказ в админ-панели.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(
            self.admin_email,
            f"🔔 Новый заказ #{order_data.get('order_number')}",
            html_content
        )

# Global instance
email_service = EmailService()
