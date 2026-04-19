"""
Test Cabinet V2 APIs - OTP authentication and guest orders
Tests for Y-STORE V2.1 Cabinet 2.0 with OTP feature (V2-18)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCabinetOTP:
    """Test OTP request and verify endpoints"""
    
    def test_otp_request_invalid_phone(self):
        """Test OTP request with invalid phone format"""
        response = requests.post(
            f"{BASE_URL}/api/v2/cabinet/otp/request",
            json={"phone": "123"}  # Too short
        )
        assert response.status_code == 400, f"Expected 400 for invalid phone, got {response.status_code}"
        print(f"✓ OTP request correctly rejects invalid phone: {response.json()}")
    
    def test_otp_request_no_orders(self):
        """Test OTP request for phone with no orders - should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/v2/cabinet/otp/request",
            json={"phone": "+380501234567"}
        )
        # Should return 404 as there are no orders with this phone
        assert response.status_code == 404, f"Expected 404 for phone with no orders, got {response.status_code}"
        data = response.json()
        assert "Немає замовлень" in data.get("detail", ""), f"Unexpected error: {data}"
        print(f"✓ OTP request correctly returns 404 for phone with no orders")
    
    def test_otp_verify_no_otp_exists(self):
        """Test OTP verify when no OTP was requested"""
        response = requests.post(
            f"{BASE_URL}/api/v2/cabinet/otp/verify",
            json={"phone": "+380509999999", "code": "123456"}
        )
        assert response.status_code == 400, f"Expected 400 for non-existent OTP, got {response.status_code}"
        print(f"✓ OTP verify correctly rejects when no OTP exists")
    
    def test_otp_verify_wrong_code(self):
        """Test OTP verify with wrong code"""
        # This will fail since there's no OTP, but tests the endpoint works
        response = requests.post(
            f"{BASE_URL}/api/v2/cabinet/otp/verify",
            json={"phone": "+380508888888", "code": "000000"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ OTP verify endpoint responds correctly")


class TestCabinetGuestAPI:
    """Test guest cabinet API endpoints"""
    
    def test_guest_orders_unauthorized(self):
        """Test guest orders without token - should return 401"""
        response = requests.get(f"{BASE_URL}/api/v2/cabinet/guest/orders")
        assert response.status_code == 401, f"Expected 401 without token, got {response.status_code}"
        print(f"✓ Guest orders correctly requires authorization")
    
    def test_guest_orders_invalid_token(self):
        """Test guest orders with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/v2/cabinet/guest/orders",
            headers={"X-Cabinet-Token": "invalid-token"}
        )
        assert response.status_code == 401, f"Expected 401 with invalid token, got {response.status_code}"
        print(f"✓ Guest orders correctly rejects invalid token")
    
    def test_guest_order_detail_unauthorized(self):
        """Test guest order detail without auth"""
        fake_order_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/v2/cabinet/guest/orders/{fake_order_id}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Guest order detail requires authorization")


class TestCabinetAuthenticatedAPI:
    """Test authenticated cabinet API endpoints"""
    
    def test_cabinet_profile_unauthorized(self):
        """Test profile without auth - should return 401"""
        response = requests.get(f"{BASE_URL}/api/v2/cabinet/profile")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Profile endpoint requires authentication")
    
    def test_cabinet_orders_unauthorized(self):
        """Test orders without auth - should return 401"""
        response = requests.get(f"{BASE_URL}/api/v2/cabinet/orders")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Orders endpoint requires authentication")
    
    def test_cabinet_wishlist_unauthorized(self):
        """Test wishlist without auth - should return 401"""
        response = requests.get(f"{BASE_URL}/api/v2/cabinet/wishlist")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Wishlist endpoint requires authentication")


class TestProductAPI:
    """Test Product API for V3 page"""
    
    def test_get_product_by_id(self):
        """Test fetching product by ID for Product Page V3"""
        product_id = "d67dabd4-e7e0-49c6-ae0e-9c4db45dd8c3"
        response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("id") == product_id, "Product ID mismatch"
        assert "title" in data, "Product should have title"
        assert "price" in data, "Product should have price"
        assert "stock_level" in data, "Product should have stock_level"
        print(f"✓ Product API returns correct product data: {data.get('title')}")
    
    def test_get_product_reviews(self):
        """Test fetching product reviews"""
        product_id = "d67dabd4-e7e0-49c6-ae0e-9c4db45dd8c3"
        response = requests.get(f"{BASE_URL}/api/reviews/product/{product_id}")
        # Reviews endpoint may return empty array or 200/404
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        print(f"✓ Product reviews endpoint responds correctly")
    
    def test_list_products(self):
        """Test products listing for catalog"""
        response = requests.get(f"{BASE_URL}/api/products?limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Should return array of products"
        assert len(data) > 0, "Should have at least one product"
        print(f"✓ Products list returns {len(data)} products")


class TestOrderCreateAPI:
    """Test Order creation API for Checkout V3"""
    
    def test_create_order_missing_fields(self):
        """Test order creation with missing required fields"""
        response = requests.post(
            f"{BASE_URL}/api/v2/orders/create",
            json={}
        )
        # Should reject with 422 (validation error) or 400
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print(f"✓ Order creation correctly validates required fields")
    
    def test_create_order_invalid_items(self):
        """Test order creation with empty items"""
        response = requests.post(
            f"{BASE_URL}/api/v2/orders/create",
            json={
                "customer": {
                    "full_name": "Test User",
                    "phone": "+380501234567"
                },
                "delivery": {
                    "method": "nova_poshta",
                    "city_name": "Київ",
                    "warehouse_name": "Відділення №1"
                },
                "items": [],
                "payment_method": "cash_on_delivery"
            }
        )
        # Should reject empty items
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print(f"✓ Order creation correctly rejects empty items")


class TestNovaPoshtaAPI:
    """Test Nova Poshta integration APIs"""
    
    def test_search_cities(self):
        """Test Nova Poshta cities search"""
        response = requests.get(f"{BASE_URL}/api/np/cities?q=Киї")
        # May return 200 with results or empty array
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Nova Poshta cities search responds correctly")
    
    def test_get_warehouses(self):
        """Test Nova Poshta warehouses"""
        # Use Kyiv ref if available
        response = requests.get(f"{BASE_URL}/api/np/warehouses?city_ref=cart-upgrade-5")
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}"
        print(f"✓ Nova Poshta warehouses endpoint responds correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
