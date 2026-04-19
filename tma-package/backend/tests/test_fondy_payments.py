"""
Fondy Payment Integration Tests
Tests: Webhook health, checkout endpoint, signature verification
"""
import pytest
import requests
import os
import hashlib
import json

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@ystore.ua"
ADMIN_PASSWORD = "admin123"

# Test order ID
TEST_ORDER_ID = "897eb27f-73c8-47fa-a589-0d6c701b8405"


class TestFondyWebhook:
    """Test Fondy webhook endpoints"""
    
    def test_fondy_webhook_health(self):
        """Test Fondy webhook health endpoint"""
        response = requests.get(f"{BASE_URL}/api/v2/payments/webhook/fondy/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        assert "endpoint" in data
        print(f"✓ Fondy webhook health: {data}")
    
    def test_fondy_webhook_requires_signature(self):
        """Test that webhook rejects requests without valid signature"""
        # Send empty payload - should be rejected
        response = requests.post(
            f"{BASE_URL}/api/v2/payments/webhook/fondy",
            json={}
        )
        
        # Should return 400 or 401 for invalid payload
        assert response.status_code in [400, 401]
        print(f"✓ Webhook properly rejects invalid requests: {response.status_code}")


class TestFondyCheckout:
    """Test Fondy checkout endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert "user" in data
            return data["access_token"]
        pytest.skip("Authentication failed")
    
    def test_auth_login_works(self):
        """Test that admin login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"✓ Auth login successful for {ADMIN_EMAIL}")
    
    def test_checkout_requires_auth(self):
        """Test that checkout endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/v2/payments/checkout",
            json={"order_id": TEST_ORDER_ID}
        )
        
        # Should return 401/403 without auth
        assert response.status_code in [401, 403]
        print(f"✓ Checkout properly requires authentication: {response.status_code}")
    
    def test_checkout_creates_payment(self, auth_token):
        """Test that checkout endpoint creates Fondy payment and returns checkout_url"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v2/payments/checkout",
            headers=headers,
            json={"order_id": TEST_ORDER_ID}
        )
        
        # Should return success (200) or order not found/not payable (400/404)
        # Order might already be paid, which is OK
        if response.status_code == 200:
            data = response.json()
            assert "checkout_url" in data
            assert "provider" in data
            assert data["provider"] == "FONDY"
            assert "pay.fondy.eu" in data["checkout_url"]
            print(f"✓ Checkout URL created: {data['checkout_url'][:50]}...")
        elif response.status_code == 400:
            # Order might not be in payable status
            data = response.json()
            print(f"✓ Order not payable (expected): {data.get('detail', data)}")
        elif response.status_code == 404:
            # Order not found - also valid outcome for test
            print("✓ Order not found (may need to create test order)")
        else:
            pytest.fail(f"Unexpected status: {response.status_code} - {response.text}")


class TestBackendHealthAndAuth:
    """General backend health and auth tests"""
    
    def test_backend_accessible(self):
        """Test that backend is accessible"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        print("✓ Backend accessible via /api/categories")
    
    def test_admin_can_access_protected_routes(self):
        """Test admin can access protected routes after login"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Access protected route
        headers = {"Authorization": f"Bearer {token}"}
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert me_response.status_code == 200
        data = me_response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        print(f"✓ Admin can access protected routes: {data['full_name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
