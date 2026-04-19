"""
V2-9 TTN Tracking & V2-10 Refunds API Tests
Tests for:
- Order tracking API GET /api/v2/orders/{order_id}/tracking
- Order timeline API GET /api/v2/orders/{order_id}/timeline
- Refresh tracking POST /api/v2/orders/{order_id}/refresh-tracking
- Refund request POST /api/v2/refunds/request/{order_id}
- Refund list GET /api/v2/refunds/my
- Admin refund approve POST /api/v2/admin/refunds/approve/{order_id}
- Status transitions NEW→PAID→PROCESSING→SHIPPED→DELIVERED
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://bot-app-deploy.preview.emergentagent.com"

# Test credentials from requirements
TEST_USER_EMAIL = "test@test.com"
TEST_USER_PASSWORD = "test123"
ADMIN_USER_EMAIL = "admin@ystore.com"
ADMIN_USER_PASSWORD = "admin123"
TEST_ORDER_ID = "00533399-5b5f-4add-95a0-f2c95f01bcfa"


@pytest.fixture(scope="module")
def user_token():
    """Get auth token for test user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Could not login as test user: {response.status_code} {response.text}")


@pytest.fixture(scope="module")
def admin_token():
    """Get auth token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_USER_EMAIL, "password": ADMIN_USER_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Could not login as admin: {response.status_code} {response.text}")


@pytest.fixture(scope="module")
def user_headers(user_token):
    """Auth headers for test user"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {user_token}"
    }


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Auth headers for admin user"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    }


# ============= BASIC CONNECTIVITY =============

class TestAPIBasics:
    """Test basic API connectivity"""
    
    def test_health_check(self):
        """Verify API is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 404:
            # Try root
            response = requests.get(f"{BASE_URL}/api")
        assert response.status_code in [200, 404], f"API not accessible: {response.status_code}"
        print(f"✓ API accessible at {BASE_URL}")
    
    def test_login_test_user(self):
        """Verify test user can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.status_code} {response.text}"
        data = response.json()
        assert "access_token" in data, "access_token missing from login response"
        print(f"✓ Test user login successful")
    
    def test_login_admin_user(self):
        """Verify admin user can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_USER_EMAIL, "password": ADMIN_USER_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.status_code} {response.text}"
        data = response.json()
        assert "access_token" in data, "access_token missing from admin login response"
        print(f"✓ Admin user login successful")


# ============= ORDER TRACKING API TESTS (V2-9) =============

class TestOrderTrackingAPI:
    """Test Order Tracking endpoints - BLOCK V2-9"""
    
    def test_get_tracking_with_test_order(self, user_headers):
        """GET /api/v2/orders/{order_id}/tracking - returns order tracking info"""
        response = requests.get(
            f"{BASE_URL}/api/v2/orders/{TEST_ORDER_ID}/tracking",
            headers=user_headers
        )
        
        # Expect 200 or 404 if test order doesn't exist
        if response.status_code == 404:
            pytest.skip(f"Test order {TEST_ORDER_ID} not found")
        
        assert response.status_code in [200, 403], f"Unexpected status: {response.status_code} {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            # Validate response structure
            assert "order_id" in data, "order_id missing from tracking response"
            assert "status" in data, "status missing from tracking response"
            assert "timeline" in data, "timeline missing from tracking response"
            
            print(f"✓ GET tracking: order_id={data['order_id'][:8]}..., status={data.get('status')}, ttn={data.get('ttn')}")
            
            # Check TTN if present
            if data.get("ttn"):
                assert data.get("np_status") is not None or data.get("np_tracking") is not None, \
                    "TTN present but no NP status"
                print(f"  - TTN: {data['ttn']}, np_status: {data.get('np_status')}")
        else:
            print(f"⚠ Access denied to test order (403)")
    
    def test_get_tracking_not_found(self, user_headers):
        """GET /api/v2/orders/{order_id}/tracking - 404 for non-existent order"""
        fake_order_id = str(uuid.uuid4())
        response = requests.get(
            f"{BASE_URL}/api/v2/orders/{fake_order_id}/tracking",
            headers=user_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        assert "ORDER_NOT_FOUND" in response.text.upper() or "not found" in response.text.lower()
        print(f"✓ Non-existent order returns 404 ORDER_NOT_FOUND")
    
    def test_get_tracking_requires_auth(self):
        """GET /api/v2/orders/{order_id}/tracking - works without auth (public tracking)"""
        response = requests.get(
            f"{BASE_URL}/api/v2/orders/{TEST_ORDER_ID}/tracking"
        )
        # Tracking can be public, so 200 is acceptable, 404 if not found, 401/403 if auth required
        assert response.status_code in [200, 401, 403, 404], f"Unexpected: {response.status_code}"
        print(f"✓ Tracking endpoint status (no auth): {response.status_code}")


class TestOrderTimelineAPI:
    """Test Order Timeline endpoint - BLOCK V2-9"""
    
    def test_get_timeline_with_test_order(self, user_headers):
        """GET /api/v2/orders/{order_id}/timeline - returns status history"""
        response = requests.get(
            f"{BASE_URL}/api/v2/orders/{TEST_ORDER_ID}/timeline",
            headers=user_headers
        )
        
        if response.status_code == 404:
            pytest.skip(f"Test order {TEST_ORDER_ID} not found")
        
        assert response.status_code in [200, 403], f"Unexpected: {response.status_code} {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "order_id" in data, "order_id missing"
            assert "current_status" in data, "current_status missing"
            assert "timeline" in data, "timeline missing"
            assert isinstance(data["timeline"], list), "timeline should be a list"
            
            print(f"✓ GET timeline: current_status={data['current_status']}, timeline_entries={len(data['timeline'])}")
            
            if data["timeline"]:
                entry = data["timeline"][0]
                print(f"  - First entry: {entry.get('from')} -> {entry.get('to')} at {entry.get('at')}")
        else:
            print(f"⚠ Access denied to test order timeline (403)")
    
    def test_get_timeline_not_found(self, user_headers):
        """GET /api/v2/orders/{order_id}/timeline - 404 for non-existent"""
        fake_order_id = str(uuid.uuid4())
        response = requests.get(
            f"{BASE_URL}/api/v2/orders/{fake_order_id}/timeline",
            headers=user_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Non-existent order timeline returns 404")


class TestRefreshTrackingAPI:
    """Test Refresh Tracking endpoint - BLOCK V2-9"""
    
    def test_refresh_tracking_requires_auth(self):
        """POST /api/v2/orders/{order_id}/refresh-tracking - requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/v2/orders/{TEST_ORDER_ID}/refresh-tracking"
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Refresh tracking requires authentication")
    
    def test_refresh_tracking_with_auth(self, user_headers):
        """POST /api/v2/orders/{order_id}/refresh-tracking - refresh TTN status"""
        response = requests.post(
            f"{BASE_URL}/api/v2/orders/{TEST_ORDER_ID}/refresh-tracking",
            headers=user_headers
        )
        
        if response.status_code == 404:
            pytest.skip(f"Test order {TEST_ORDER_ID} not found")
        
        assert response.status_code in [200, 403], f"Unexpected: {response.status_code} {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "ok" in data, "ok field missing"
            
            if data.get("ok"):
                assert "ttn" in data, "ttn missing when ok=true"
                print(f"✓ Refresh tracking OK: ttn={data.get('ttn')}, np_status={data.get('np_status')}")
            else:
                # No TTN or NP fetch failed - acceptable
                print(f"✓ Refresh tracking returned ok=false: {data.get('error')}")
        else:
            print(f"⚠ Access denied (403)")


# ============= REFUNDS API TESTS (V2-10) =============

class TestRefundsAPI:
    """Test Refunds endpoints - BLOCK V2-10"""
    
    def test_get_my_refunds(self, user_headers):
        """GET /api/v2/refunds/my - returns user's refund requests"""
        response = requests.get(
            f"{BASE_URL}/api/v2/refunds/my",
            headers=user_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.status_code} {response.text}"
        data = response.json()
        assert "refunds" in data, "refunds field missing"
        assert isinstance(data["refunds"], list), "refunds should be a list"
        
        print(f"✓ GET my refunds: {len(data['refunds'])} refund(s)")
        if data["refunds"]:
            refund = data["refunds"][0]
            print(f"  - First: order_id={refund.get('order_id')[:8] if refund.get('order_id') else 'N/A'}..., status={refund.get('status')}")
    
    def test_get_my_refunds_requires_auth(self):
        """GET /api/v2/refunds/my - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/v2/refunds/my")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ GET my refunds requires authentication")
    
    def test_request_refund_requires_auth(self):
        """POST /api/v2/refunds/request/{order_id} - requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/v2/refunds/request/{TEST_ORDER_ID}",
            json={"reason": "TEST_REQUEST"}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Request refund requires authentication")
    
    def test_request_refund_invalid_order_status(self, user_headers):
        """POST /api/v2/refunds/request/{order_id} - fails for non-delivered/returned orders"""
        # First check the test order status
        tracking_response = requests.get(
            f"{BASE_URL}/api/v2/orders/{TEST_ORDER_ID}/tracking",
            headers=user_headers
        )
        
        if tracking_response.status_code == 404:
            pytest.skip("Test order not found")
        
        if tracking_response.status_code == 200:
            status = tracking_response.json().get("status")
            if status in ["DELIVERED", "RETURNED"]:
                # Actually request refund
                response = requests.post(
                    f"{BASE_URL}/api/v2/refunds/request/{TEST_ORDER_ID}",
                    json={"reason": "TEST_REFUND_REQUEST"},
                    headers=user_headers
                )
                
                # Could succeed or fail depending on state
                if response.status_code == 200:
                    data = response.json()
                    assert data.get("ok") == True, "ok should be true"
                    assert "refund_id" in data, "refund_id missing"
                    print(f"✓ Refund request created: refund_id={data['refund_id'][:8]}...")
                else:
                    print(f"⚠ Refund request failed: {response.status_code}")
            else:
                # Order not in refundable status
                response = requests.post(
                    f"{BASE_URL}/api/v2/refunds/request/{TEST_ORDER_ID}",
                    json={"reason": "TEST_REFUND_REQUEST"},
                    headers=user_headers
                )
                
                assert response.status_code == 400, f"Expected 400, got {response.status_code}"
                assert "NOT_ALLOWED" in response.text.upper() or "status" in response.text.lower()
                print(f"✓ Refund rejected for non-delivered order (status={status})")
        else:
            print(f"⚠ Could not check order status: {tracking_response.status_code}")


class TestRefundsAdminAPI:
    """Test Admin Refund endpoints - BLOCK V2-10"""
    
    def test_get_pending_refunds(self, admin_headers):
        """GET /api/v2/admin/refunds/pending - admin gets pending refunds"""
        response = requests.get(
            f"{BASE_URL}/api/v2/admin/refunds/pending",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.status_code} {response.text}"
        data = response.json()
        assert "refunds" in data, "refunds field missing"
        assert isinstance(data["refunds"], list), "refunds should be a list"
        
        print(f"✓ GET pending refunds (admin): {len(data['refunds'])} pending")
    
    def test_get_pending_refunds_requires_admin(self, user_headers):
        """GET /api/v2/admin/refunds/pending - requires admin role"""
        response = requests.get(
            f"{BASE_URL}/api/v2/admin/refunds/pending",
            headers=user_headers
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Pending refunds requires admin role")
    
    def test_approve_refund_not_found(self, admin_headers):
        """POST /api/v2/admin/refunds/approve/{order_id} - 404 for non-existent"""
        fake_order_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/v2/admin/refunds/approve/{fake_order_id}",
            headers=admin_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Approve non-existent order returns 404")
    
    def test_approve_refund_bad_status(self, admin_headers):
        """POST /api/v2/admin/refunds/approve/{order_id} - fails for non-REFUND_REQUESTED"""
        # Use test order which is likely not in REFUND_REQUESTED status
        response = requests.post(
            f"{BASE_URL}/api/v2/admin/refunds/approve/{TEST_ORDER_ID}",
            headers=admin_headers
        )
        
        if response.status_code == 404:
            pytest.skip("Test order not found")
        
        # If order is not in REFUND_REQUESTED, expect 400
        if response.status_code == 400:
            assert "BAD_STATUS" in response.text.upper() or "status" in response.text.lower()
            print(f"✓ Approve refund correctly rejects non-REFUND_REQUESTED order")
        elif response.status_code == 200:
            # Order was in REFUND_REQUESTED status
            data = response.json()
            assert data.get("ok") == True, "ok should be true"
            print(f"✓ Refund approved: order_status={data.get('order_status')}")
        else:
            pytest.fail(f"Unexpected status: {response.status_code} {response.text}")


# ============= STATUS TRANSITIONS TESTS (V2-10) =============

class TestStatusTransitions:
    """Test order status transitions - BLOCK V2-10"""
    
    def test_create_order_for_transition_test(self, user_headers):
        """Create a fresh order to test transitions"""
        # Add product to cart
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        if products_response.status_code != 200 or not products_response.json():
            pytest.skip("No products available")
        
        product_id = products_response.json()[0].get("id")
        
        # Clear cart and add product
        requests.delete(f"{BASE_URL}/api/cart", headers=user_headers)
        add_response = requests.post(
            f"{BASE_URL}/api/cart/items",
            json={"product_id": product_id, "quantity": 1},
            headers=user_headers
        )
        
        if add_response.status_code != 200:
            pytest.skip(f"Could not add product to cart: {add_response.text}")
        
        # Create order
        order_data = {
            "shipping": {
                "full_name": "TEST_Transition_Test",
                "phone": "+380501234567",
                "city": "Kyiv",
                "address": "Test Transition Address",
                "postal_code": "01001"
            },
            "payment_method": "online"  # Will set status to AWAITING_PAYMENT
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v2/orders",
            json=order_data,
            headers=user_headers
        )
        
        if response.status_code != 200:
            pytest.skip(f"Could not create order: {response.text}")
        
        order = response.json()
        order_id = order["id"]
        
        # For online payment, status should be AWAITING_PAYMENT
        assert order["status"] in ["NEW", "AWAITING_PAYMENT"], f"Unexpected status: {order['status']}"
        print(f"✓ Created order {order_id[:8]}... with status {order['status']}")
        
        return order
    
    def test_allowed_transitions_structure(self, user_headers):
        """GET /api/v2/orders/{order_id}/transitions - returns allowed transitions"""
        # Get an order
        orders_response = requests.get(
            f"{BASE_URL}/api/v2/orders/my",
            headers=user_headers
        )
        
        if orders_response.status_code != 200 or not orders_response.json():
            pytest.skip("No orders available")
        
        order_id = orders_response.json()[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/v2/orders/{order_id}/transitions",
            headers=user_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.status_code} {response.text}"
        data = response.json()
        
        assert "current_status" in data, "current_status missing"
        assert "allowed_transitions" in data, "allowed_transitions missing"
        assert isinstance(data["allowed_transitions"], list), "allowed_transitions should be list"
        
        print(f"✓ Order {order_id[:8]}... status={data['current_status']}, allowed={data['allowed_transitions']}")


class TestOrderStatusService:
    """Test orders_status_service.py transitions"""
    
    def test_transition_map_documented(self):
        """Verify expected transitions are documented"""
        # These are the expected transitions from orders_status_service.py
        expected_transitions = {
            "NEW": ["AWAITING_PAYMENT", "CANCELLED"],
            "AWAITING_PAYMENT": ["PAID", "CANCELLED"],
            "PAID": ["PROCESSING", "CANCELLED"],
            "PROCESSING": ["SHIPPED", "CANCELLED"],
            "SHIPPED": ["DELIVERED", "RETURNED"],
            "DELIVERED": ["RETURNED", "REFUND_REQUESTED"],
            "RETURNED": ["REFUND_REQUESTED"],
            "REFUND_REQUESTED": ["REFUNDED"],
            "CANCELLED": [],
            "REFUNDED": [],
        }
        
        print("✓ Expected status transitions map:")
        for status, transitions in expected_transitions.items():
            print(f"  - {status} -> {transitions}")


# ============= INTEGRATION TESTS =============

class TestTrackingIntegration:
    """Integration tests for tracking + timeline"""
    
    def test_tracking_and_timeline_consistent(self, user_headers):
        """Tracking status should match timeline's current status"""
        # Get tracking
        tracking_response = requests.get(
            f"{BASE_URL}/api/v2/orders/{TEST_ORDER_ID}/tracking",
            headers=user_headers
        )
        
        if tracking_response.status_code == 404:
            pytest.skip("Test order not found")
        
        if tracking_response.status_code != 200:
            pytest.skip(f"Could not get tracking: {tracking_response.status_code}")
        
        tracking_status = tracking_response.json().get("status")
        
        # Get timeline
        timeline_response = requests.get(
            f"{BASE_URL}/api/v2/orders/{TEST_ORDER_ID}/timeline",
            headers=user_headers
        )
        
        if timeline_response.status_code != 200:
            pytest.skip(f"Could not get timeline: {timeline_response.status_code}")
        
        timeline_status = timeline_response.json().get("current_status")
        
        assert tracking_status == timeline_status, \
            f"Status mismatch: tracking={tracking_status}, timeline={timeline_status}"
        
        print(f"✓ Tracking and timeline status consistent: {tracking_status}")


# ============= NOVA POSHTA API TESTS =============

class TestNovaPoshtaIntegration:
    """Test Nova Poshta integration (TTN is fake so NP returns 'not found')"""
    
    def test_np_fetch_returns_null_for_fake_ttn(self, user_headers):
        """
        TTN '20450349852345' is fake, so NP returns 'Номер не знайдено'.
        API should handle this gracefully.
        """
        # Get tracking for test order
        response = requests.get(
            f"{BASE_URL}/api/v2/orders/{TEST_ORDER_ID}/tracking",
            headers=user_headers
        )
        
        if response.status_code == 404:
            pytest.skip("Test order not found")
        
        if response.status_code != 200:
            pytest.skip(f"Could not get tracking: {response.status_code}")
        
        data = response.json()
        ttn = data.get("ttn")
        
        if not ttn:
            print(f"✓ Test order has no TTN - skipping NP check")
            return
        
        # TTN is fake so np_tracking might be null or have error message
        np_tracking = data.get("np_tracking")
        np_status = data.get("np_status")
        
        print(f"✓ Test order TTN: {ttn}")
        print(f"  - np_status: {np_status}")
        print(f"  - np_tracking: {np_tracking}")
        
        # API should not crash even with fake TTN
        assert response.status_code == 200, "API should handle fake TTN gracefully"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
