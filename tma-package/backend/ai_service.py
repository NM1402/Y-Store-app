"""
AI Service for Product Descriptions and Recommendations
Uses OpenAI GPT-5-mini via Emergent LLM Key
"""

import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load .env before any imports that might use it
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=True)

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)


class AIService:
    """Service for AI-powered features using GPT-5-mini"""
    
    def __init__(self):
        # Re-load to ensure we have the latest values
        load_dotenv(ROOT_DIR / '.env', override=True)
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        self.model_provider = "openai"
        self.model_name = "gpt-5-mini"
        
        if not self.api_key:
            logger.warning("EMERGENT_LLM_KEY not found - AI features will be disabled")
            self.api_key = None  # Allow service to work without AI
        
        logger.info(f"AI Service initialized with {self.model_provider}/{self.model_name}")
    
    async def generate_product_description(
        self,
        product_name: str,
        category: str,
        existing_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate compelling product description using AI
        
        Args:
            product_name: Name of the product
            category: Product category
            existing_info: Optional dict with price, features, etc.
            
        Returns:
            Dict with generated description and SEO keywords
        """
        try:
            # Create unique session for this generation
            session_id = f"desc-{product_name[:20]}-{os.urandom(4).hex()}"
            
            # Prepare prompt
            prompt = f"""Ти — експерт з написання описів товарів для українського інтернет-магазину.

Створи привабливий опис товару для маркетплейсу в стилі Rozetka.ua.

**Товар:** {product_name}
**Категорія:** {category}
"""
            
            if existing_info:
                if existing_info.get('price'):
                    prompt += f"\n**Ціна:** {existing_info['price']} грн"
                if existing_info.get('features'):
                    prompt += f"\n**Характеристики:** {', '.join(existing_info['features'])}"
            
            prompt += """

**Вимоги до опису:**
1. 3-4 абзаци (150-200 слів)
2. Підкресли переваги та унікальні особливості
3. Використовуй емоційні тригери для покупки
4. Пиши природно, по-українськи
5. Згадай для кого підходить товар

**Формат відповіді:**
{
  "description": "повний опис товару",
  "short_description": "короткий опис (1-2 речення)",
  "keywords": ["ключове", "слово", "для", "SEO"]
}

Відповідай ТІЛЬКИ у форматі JSON, без додаткового тексту."""

            # Initialize chat
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message="Ти експерт з e-commerce контенту. Відповідай тільки у форматі JSON."
            ).with_model(self.model_provider, self.model_name)
            
            # Send message
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            # Parse response
            import json
            result = json.loads(response)
            
            logger.info(f"Generated description for: {product_name}")
            
            return {
                "success": True,
                "data": result
            }
        
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response: {str(e)}")
            logger.error(f"Response was: {response}")
            return {
                "success": False,
                "error": "Failed to parse AI response",
                "raw_response": response
            }
        except Exception as e:
            logger.error(f"Error generating description: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def generate_recommendations(
        self,
        user_history: List[Dict[str, Any]],
        current_product: Optional[Dict[str, Any]] = None,
        available_products: List[Dict[str, Any]] = None,
        limit: int = 5
    ) -> Dict[str, Any]:
        """
        Generate personalized product recommendations
        
        Args:
            user_history: List of user's viewed/purchased products
            current_product: Currently viewing product (optional)
            available_products: List of products to recommend from
            limit: Number of recommendations
            
        Returns:
            Dict with recommended product IDs and reasoning
        """
        try:
            session_id = f"rec-{os.urandom(6).hex()}"
            
            # Prepare context
            history_text = "\n".join([
                f"- {p.get('title', 'Unknown')} (категорія: {p.get('category', 'N/A')})"
                for p in user_history[:10]  # Last 10 items
            ])
            
            prompt = f"""Ти — AI система рекомендацій для маркетплейсу.

**Історія користувача (що переглядав/купував):**
{history_text}
"""
            
            if current_product:
                prompt += f"\n**Зараз дивиться:** {current_product.get('title')} ({current_product.get('category')})"
            
            if available_products:
                products_list = "\n".join([
                    f"{i+1}. ID: {p.get('id')} | {p.get('title')} | {p.get('category')} | {p.get('price')} грн"
                    for i, p in enumerate(available_products[:50])  # Top 50
                ])
                prompt += f"\n\n**Доступні товари:**\n{products_list}"
            
            prompt += f"""

**Завдання:** Порекомендуй {limit} найкращих товарів на основі інтересів користувача.

**Критерії:**
1. Схожість категорій
2. Ціновий діапазон
3. Популярні комбінації
4. Cross-sell можливості

**Формат відповіді:**
{{
  "recommendations": [
    {{
      "product_id": "id товару",
      "reason": "чому рекомендуємо (коротко)"
    }}
  ]
}}

Відповідай ТІЛЬКИ у форматі JSON."""

            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message="Ти AI система рекомендацій. Відповідай тільки у форматі JSON."
            ).with_model(self.model_provider, self.model_name)
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            import json
            result = json.loads(response)
            
            logger.info(f"Generated {len(result.get('recommendations', []))} recommendations")
            
            return {
                "success": True,
                "data": result
            }
        
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }


# Create singleton instance
ai_service = AIService()
