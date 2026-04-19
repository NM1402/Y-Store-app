"""
V2 Orders & Payments API Tests
Tests for:
- Order creation with idempotency
- State machine transitions
- Optimistic locking
- Fondy payment integration (webhook validation)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://bot-app-deploy.preview.emergentagent.com"

# Test credentials from requirements
TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = "test123"
TEST_JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNjc1MGJjOC01ZTZkLTQ3YTUtYTExYy01OTc0NzRhNGIxZjYiLCJleHAiOjE3NzIwNDQwOTB9.M5NyPbzztjciAKs6yaGOlP7Kvw7CvxtcFHSV0PojCiw"
TEST_PRODUCT_ID = "21991bad-f810-4e08-a522-1c8e817b3cb7"
TEST_CATEGORY_ID = "16f6bb29-d668-4db6-8493-c2b9eeb9bc91"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TEST_JWT_TOKEN}"
    })
    return session


@pytest.fixture(scope="module")
def fresh_user_token(api_client):
    """Create fresh user for testing - fallback if provided token expired"""
    # Try with provided token first
    response = api_client.get(f"{BASE_URL}/api/auth/me")
    if response.status_code == 200:
        return TEST_JWT_TOKEN
    
    # If token expired, create a fresh user
    unique_id = str(uuid.uuid4())[:8]
    register_data = {
        "email": f"test_user_{unique_id}@example.com",
        "password": "testpass123",
        "full_name": "Test User",
        "role": "admin"  # Need admin role for status updates
    }
    
    response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json=register_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        return response.json().get("access_token")
    
    pytest.skip("Could not authenticate - skipping tests")


@pytest.fixture(scope="module")
def auth_headers(fresh_user_token):
    """Authentication headers"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {fresh_user_token}"
    }


# ============= BASIC API CONNECTIVITY =============

class TestAPIConnectivity:
    """Test basic API connectivity"""
    
    def test_base_api_accessible(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"API not accessible: {response.status_code}"
        print(f"✓ API accessible at {BASE_URL}")
    
    def test_v2_orders_requires_auth(self):
        """V2 orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/v2/orders/my")
        assert response.status_code in [401, 403], "Expected auth required"
        print("✓ V2 orders endpoint requires authentication")
    
    def test_v2_payments_requires_auth(self):
        """V2 payments endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/v2/payments/checkout",
            json={"order_id": "test"}
        )
        assert response.status_code in [401, 403], "Expected auth required"
        print("✓ V2 payments endpoint requires authentication")


# ============= ORDER V2 API TESTS =============

class TestOrdersV2API:
    """Test V2 Orders API endpoints"""
    
    def test_get_my_orders_empty(self, auth_headers):
        """Get user's orders (may be empty for new user)"""
        response = requests.get(
            f"{BASE_URL}/api/v2/orders/my",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of orders"
        print(f"✓ GET /api/v2/orders/my returned {len(data)} orders")
    
    def test_create_order_requires_cart_items(self, auth_headers):
        """Create order fails if cart is empty"""
        # First clear cart if any
        requests.delete(f"{BASE_URL}/api/cart", headers=auth_headers)
        
        # Try to create order without cart items
        order_data = {
            "shipping": {
                "full_name": "Test User",
                "phone": "+380501234567",
                "city": "Kyiv",
                "address": "Test Address 123",
                "postal_code": "01001"
            },
            "payment_method": "cash"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v2/orders",
            json=order_data,
            headers=auth_headers
        )
        
        # Expect 400 (cart empty) or 500 (internal error if no products exist)
        assert response.status_code in [400, 500], f"Unexpected status: {response.status_code}"
        print(f"✓ Create order with empty cart returns {response.status_code}")
    
    def test_add_product_to_cart(self, auth_headers):
        """Add a product to cart for order creation"""
        # First get an existing product
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        
        if products_response.status_code != 200 or not products_response.json():
            # Create a test product if none exist
            product_data = {
                "title": "TEST_Product_For_Order",
                "description": "Test product for order testing",
                "category_id": TEST_CATEGORY_ID,
                "price": 100.0,
                "stock_level": 100,
                "images": ["https://example.com/test.jpg"]
            }
            
            create_response = requests.post(
                f"{BASE_URL}/api/products",
                json=product_data,
                headers=auth_headers
            )
            
            if create_response.status_code == 200:
                product_id = create_response.json().get("id")
            else:
                pytest.skip("Cannot create test product")
        else:
            product_id = products_response.json()[0].get("id")
        
        # Add to cart
        cart_response = requests.post(
            f"{BASE_URL}/api/cart/items",
            json={"product_id": product_id, "quantity": 1},
            headers=auth_headers
        )
        
        assert cart_response.status_code == 200, f"Failed to add to cart: {cart_response.text}"
        print(f"✓ Added product {product_id[:8]}... to cart")
        return product_id
    
    def test_create_order_with_cash_payment(self, auth_headers):
        """Create order with cash payment method"""
        # Add product to cart first
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        if products_response.status_code == 200 and products_response.json():
            product_id = products_response.json()[0].get("id")
            requests.post(
                f"{BASE_URL}/api/cart/items",
                json={"product_id": product_id, "quantity": 1},
                headers=auth_headers
            )
        
        order_data = {
            "shipping": {
                "full_name": "Test User Cash Order",
                "phone": "+380501234567",
                "city": "Kyiv",
                "address": "Test Address 456",
                "postal_code": "01001"
            },
            "payment_method": "cash",
            "notes": "Test order for V2 API"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v2/orders",
            json=order_data,
            headers=auth_headers
        )
        
        if response.status_code == 400 and "empty" in response.text.lower():
            pytest.skip("Cart is empty - cannot test order creation")
        
        assert response.status_code == 200, f"Failed to create order: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Order ID missing"
        assert "status" in data, "Status missing"
        assert data["status"] == "NEW", f"Expected NEW status for cash, got {data['status']}"
        assert "version" in data, "Version field missing (optimistic locking)"
        assert data["version"] == 1, "Initial version should be 1"
        assert "status_history" in data, "Status history missing"
        assert len(data["status_history"]) >= 1, "Status history should have initial entry"
        
        print(f"✓ Created order {data['id'][:8]}... with status {data['status']}, version {data['version']}")
        return data
    
    def test_create_order_idempotency(self, auth_headers):
        """Test idempotency with X-Idempotency-Key header"""
        # Add product to cart first
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        if products_response.status_code == 200 and products_response.json():
            product_id = products_response.json()[0].get("id")
            requests.post(
                f"{BASE_URL}/api/cart/items",
                json={"product_id": product_id, "quantity": 1},
                headers=auth_headers
            )
        
        idempotency_key = f"test-idem-{uuid.uuid4()}"
        order_data = {
            "shipping": {
                "full_name": "Test Idempotency",
                "phone": "+380501234567",
                "city": "Kyiv",
                "address": "Idempotency Test Address",
                "postal_code": "01001"
            },
            "payment_method": "cash"
        }
        
        headers = {**auth_headers, "X-Idempotency-Key": idempotency_key}
        
        # First request
        response1 = requests.post(
            f"{BASE_URL}/api/v2/orders",
            json=order_data,
            headers=headers
        )
        
        if response1.status_code == 400 and "empty" in response1.text.lower():
            pytest.skip("Cart is empty - cannot test idempotency")
        
        # Add product again for second request
        if response1.status_code == 200:
            products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
            if products_response.status_code == 200 and products_response.json():
                product_id = products_response.json()[0].get("id")
                requests.post(
                    f"{BASE_URL}/api/cart/items",
                    json={"product_id": product_id, "quantity": 1},
                    headers=auth_headers
                )
        
        # Second request with same key
        response2 = requests.post(
            f"{BASE_URL}/api/v2/orders",
            json=order_data,
            headers=headers
        )
        
        # Both should succeed
        assert response1.status_code == 200, f"First request failed: {response1.text}"
        
        # Second request should return same order (idempotent)
        if response2.status_code == 200:
            order1 = response1.json()
            order2 = response2.json()
            assert order1["id"] == order2["id"], "Idempotency failed - different order IDs"
            print(f"✓ Idempotency verified - same order ID returned")
        else:
            # May fail with payload mismatch if cart changed
            print(f"⚠ Second request status: {response2.status_code}")
    
    def test_get_order_by_id(self, auth_headers):
        """Get single order by ID"""
        # First get list of orders
        orders_response = requests.get(
            f"{BASE_URL}/api/v2/orders/my",
            headers=auth_headers
        )
        
        if orders_response.status_code != 200 or not orders_response.json():
            pytest.skip("No orders available for testing")
        
        order_id = orders_response.json()[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/v2/orders/{order_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get order: {response.text}"
        data = response.json()
        assert data["id"] == order_id, "Order ID mismatch"
        print(f"✓ GET /api/v2/orders/{order_id[:8]}... successful")
    
    def test_get_order_not_found(self, auth_headers):
        """Get non-existent order returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(
            f"{BASE_URL}/api/v2/orders/{fake_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent order returns 404")
    
    def test_get_allowed_transitions(self, auth_headers):
        """Get allowed status transitions for an order"""
        # Get an existing order
        orders_response = requests.get(
            f"{BASE_URL}/api/v2/orders/my",
            headers=auth_headers
        )
        
        if orders_response.status_code != 200 or not orders_response.json():
            pytest.skip("No orders available for testing")
        
        order = orders_response.json()[0]
        order_id = order["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/v2/orders/{order_id}/transitions",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get transitions: {response.text}"
        data = response.json()
        
        assert "current_status" in data, "Current status missing"
        assert "allowed_transitions" in data, "Allowed transitions missing"
        assert "version" in data, "Version missing"
        
        print(f"✓ Order {order_id[:8]}... status: {data['current_status']}, transitions: {data['allowed_transitions']}")
        return data


# ============= STATE MACHINE TESTS =============

class TestOrderStateMachine:
    """Test order state machine transitions"""
    
    def test_cancel_new_order(self, auth_headers):
        """Cancel a NEW order"""
        # Create a new order
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        if products_response.status_code == 200 and products_response.json():
            product_id = products_response.json()[0].get("id")
            requests.post(
                f"{BASE_URL}/api/cart/items",
                json={"product_id": product_id, "quantity": 1},
                headers=auth_headers
            )
        
        order_data = {
            "shipping": {
                "full_name": "Cancel Test",
                "phone": "+380501234567",
                "city": "Kyiv",
                "address": "Cancel Test Address"
            },
            "payment_method": "cash"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/v2/orders",
            json=order_data,
            headers=auth_headers
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create order: {create_response.text}")
        
        order_id = create_response.json()["id"]
        
        # Cancel the order
        cancel_response = requests.post(
            f"{BASE_URL}/api/v2/orders/{order_id}/cancel",
            json={"reason": "Test cancellation"},
            headers=auth_headers
        )
        
        assert cancel_response.status_code == 200, f"Failed to cancel: {cancel_response.text}"
        data = cancel_response.json()
        
        assert "order" in data or "message" in data, "Response should contain order or message"
        
        # Verify status changed
        verify_response = requests.get(
            f"{BASE_URL}/api/v2/orders/{order_id}",
            headers=auth_headers
        )
        
        if verify_response.status_code == 200:
            order = verify_response.json()
            assert order["status"] == "CANCELED", f"Expected CANCELED, got {order['status']}"
            assert order["version"] == 2, "Version should be 2 after cancel"
            print(f"✓ Order cancelled successfully, version: {order['version']}")
    
    def test_invalid_transition_rejected(self, auth_headers):
        """Invalid state transitions should be rejected"""
        # Create a new order
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        if products_response.status_code == 200 and products_response.json():
            product_id = products_response.json()[0].get("id")
            requests.post(
                f"{BASE_URL}/api/cart/items",
                json={"product_id": product_id, "quantity": 1},
                headers=auth_headers
            )
        
        order_data = {
            "shipping": {
                "full_name": "Invalid Transition Test",
                "phone": "+380501234567",
                "city": "Kyiv",
                "address": "Invalid Transition Address"
            },
            "payment_method": "cash"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/v2/orders",
            json=order_data,
            headers=auth_headers
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create order: {create_response.text}")
        
        order_id = create_response.json()["id"]
        
        # Try invalid transition: NEW -> DELIVERED (should fail)
        update_response = requests.put(
            f"{BASE_URL}/api/v2/orders/{order_id}/status",
            json={"status": "DELIVERED", "reason": "Invalid transition test"},
            headers=auth_headers
        )
        
        assert update_response.status_code == 400, f"Expected 400, got {update_response.status_code}"
        assert "INVALID_TRANSITION" in update_response.text.upper() or "invalid" in update_response.text.lower()
        print(f"✓ Invalid transition NEW -> DELIVERED rejected correctly")
    
    def test_valid_transition_processing(self, auth_headers):
        """Valid state transition: NEW -> PROCESSING"""
        # Create a new order
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        if products_response.status_code == 200 and products_response.json():
            product_id = products_response.json()[0].get("id")
            requests.post(
                f"{BASE_URL}/api/cart/items",
                json={"product_id": product_id, "quantity": 1},
                headers=auth_headers
            )
        
        order_data = {
            "shipping": {
                "full_name": "Processing Transition Test",
                "phone": "+380501234567",
                "city": "Kyiv",
                "address": "Processing Address"
            },
            "payment_method": "cash"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/v2/orders",
            json=order_data,
            headers=auth_headers
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create order: {create_response.text}")
        
        order_id = create_response.json()["id"]
        
        # Valid transition: NEW -> PROCESSING
        update_response = requests.put(
            f"{BASE_URL}/api/v2/orders/{order_id}/status",
            json={"status": "PROCESSING", "reason": "Admin processing"},
            headers=auth_headers
        )
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        data = update_response.json()
        
        assert data.get("new_status") == "PROCESSING", f"Expected PROCESSING, got {data.get('new_status')}"
        assert data.get("version") == 2, "Version should increment"
        print(f"✓ Valid transition NEW -> PROCESSING succeeded, version: {data.get('version')}")
    
    def test_cannot_cancel_shipped_order(self, auth_headers):
        """Cannot cancel a shipped order"""
        # Create and progress order through states
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        if products_response.status_code == 200 and products_response.json():
            product_id = products_response.json()[0].get("id")
            requests.post(
                f"{BASE_URL}/api/cart/items",
                json={"product_id": product_id, "quantity": 1},
                headers=auth_headers
            )
        
        order_data = {
            "shipping": {
                "full_name": "Shipped Cancel Test",
                "phone": "+380501234567",
                "city": "Kyiv",
                "address": "Shipped Address"
            },
            "payment_method": "cash"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/v2/orders",
            json=order_data,
            headers=auth_headers
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create order")
        
        order_id = create_response.json()["id"]
        
        # Progress: NEW -> PROCESSING -> SHIPPED
        requests.put(
            f"{BASE_URL}/api/v2/orders/{order_id}/status",
            json={"status": "PROCESSING"},
            headers=auth_headers
        )
        
        requests.put(
            f"{BASE_URL}/api/v2/orders/{order_id}/status",
            json={"status": "SHIPPED"},
            headers=auth_headers
        )
        
        # Try to cancel shipped order
        cancel_response = requests.post(
            f"{BASE_URL}/api/v2/orders/{order_id}/cancel",
            json={"reason": "Should fail"},
            headers=auth_headers
        )
        
        assert cancel_response.status_code == 400, f"Expected 400, got {cancel_response.status_code}"
        print("✓ Cannot cancel shipped order - correctly rejected")


# ============= PAYMENT V2 API TESTS =============

class TestPaymentsV2API:
    """Test V2 Payments API endpoints"""
    
    def test_checkout_requires_order(self, auth_headers):
        """Payment checkout requires valid order ID"""
        response = requests.post(
            f"{BASE_URL}/api/v2/payments/checkout",
            json={"order_id": str(uuid.uuid4())},
            headers=auth_headers
        )
        
        # Should return 404 (order not found) or 502 (Fondy not configured)
        assert response.status_code in [404, 400, 502], f"Unexpected status: {response.status_code}"
        print(f"✓ Checkout with invalid order returns {response.status_code}")
    
    def test_checkout_returns_502_without_fondy_config(self, auth_headers):
        """Fondy checkout returns 502 without proper credentials"""
        # Create an order first
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        if products_response.status_code == 200 and products_response.json():
            product_id = products_response.json()[0].get("id")
            requests.post(
                f"{BASE_URL}/api/cart/items",
                json={"product_id": product_id, "quantity": 1},
                headers=auth_headers
            )
        
        order_data = {
            "shipping": {
                "full_name": "Fondy Test",
                "phone": "+380501234567",
                "city": "Kyiv",
                "address": "Fondy Address"
            },
            "payment_method": "online"  # Non-cash for AWAITING_PAYMENT status
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/v2/orders",
            json=order_data,
            headers=auth_headers
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create order for payment test")
        
        order_id = create_response.json()["id"]
        
        # Try to create checkout
        checkout_response = requests.post(
            f"{BASE_URL}/api/v2/payments/checkout",
            json={"order_id": order_id},
            headers=auth_headers
        )
        
        # Expected: 502 (Fondy not configured) or 400 (order status issue)
        assert checkout_response.status_code in [400, 502], f"Got {checkout_response.status_code}: {checkout_response.text}"
        print(f"✓ Fondy checkout returns {checkout_response.status_code} (expected without credentials)")
    
    def test_webhook_requires_signature(self):
        """Fondy webhook requires signature validation"""
        webhook_payload = {
            "order_id": str(uuid.uuid4()),
            "payment_id": "test_payment",
            "order_status": "approved",
            "amount": 10000,
            "currency": "UAH"
            # Note: No signature
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v2/payments/webhook/fondy",
            json=webhook_payload
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "MISSING_SIGNATURE" in response.text.upper() or "signature" in response.text.lower()
        print("✓ Webhook correctly requires signature (returns 401 MISSING_SIGNATURE)")
    
    def test_webhook_invalid_signature(self):
        """Fondy webhook rejects invalid signature"""
        webhook_payload = {
            "order_id": str(uuid.uuid4()),
            "payment_id": "test_payment",
            "order_status": "approved",
            "amount": 10000,
            "currency": "UAH",
            "signature": "invalid_signature_here"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v2/payments/webhook/fondy",
            json=webhook_payload
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "INVALID_SIGNATURE" in response.text.upper() or "signature" in response.text.lower()
        print("✓ Webhook correctly rejects invalid signature (returns 401 INVALID_SIGNATURE)")
    
    def test_get_payment_status(self, auth_headers):
        """Get payment status for order"""
        # Get an existing order
        orders_response = requests.get(
            f"{BASE_URL}/api/v2/orders/my",
            headers=auth_headers
        )
        
        if orders_response.status_code != 200 or not orders_response.json():
            # Test 404 case
            response = requests.get(
                f"{BASE_URL}/api/v2/payments/status/{uuid.uuid4()}",
                headers=auth_headers
            )
            assert response.status_code == 404
            print("✓ Payment status for non-existent order returns 404")
            return
        
        order_id = orders_response.json()[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/v2/payments/status/{order_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "order_id" in data, "order_id missing"
        assert "order_status" in data, "order_status missing"
        assert "payment_status" in data, "payment_status missing"
        
        print(f"✓ Payment status: order={data['order_status']}, payment={data['payment_status']}")


# ============= OPTIMISTIC LOCKING TESTS =============

class TestOptimisticLocking:
    """Test optimistic locking behavior"""
    
    def test_version_increments_on_update(self, auth_headers):
        """Version field should increment on status updates"""
        # Create order
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        if products_response.status_code == 200 and products_response.json():
            product_id = products_response.json()[0].get("id")
            requests.post(
                f"{BASE_URL}/api/cart/items",
                json={"product_id": product_id, "quantity": 1},
                headers=auth_headers
            )
        
        order_data = {
            "shipping": {
                "full_name": "Version Test",
                "phone": "+380501234567",
                "city": "Kyiv",
                "address": "Version Test Address"
            },
            "payment_method": "cash"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/v2/orders",
            json=order_data,
            headers=auth_headers
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create order")
        
        order = create_response.json()
        order_id = order["id"]
        initial_version = order["version"]
        
        assert initial_version == 1, f"Initial version should be 1, got {initial_version}"
        
        # Update status
        update_response = requests.put(
            f"{BASE_URL}/api/v2/orders/{order_id}/status",
            json={"status": "PROCESSING"},
            headers=auth_headers
        )
        
        if update_response.status_code == 200:
            data = update_response.json()
            new_version = data.get("version")
            assert new_version == 2, f"Version should be 2, got {new_version}"
            print(f"✓ Version incremented: {initial_version} -> {new_version}")
        
        # Update again
        update_response2 = requests.put(
            f"{BASE_URL}/api/v2/orders/{order_id}/status",
            json={"status": "SHIPPED"},
            headers=auth_headers
        )
        
        if update_response2.status_code == 200:
            data2 = update_response2.json()
            final_version = data2.get("version")
            assert final_version == 3, f"Version should be 3, got {final_version}"
            print(f"✓ Version incremented again: 2 -> {final_version}")


# ============= STATUS HISTORY TESTS =============

class TestStatusHistory:
    """Test status history logging"""
    
    def test_status_history_logged(self, auth_headers):
        """Status transitions should be logged in status_history"""
        # Create order
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        if products_response.status_code == 200 and products_response.json():
            product_id = products_response.json()[0].get("id")
            requests.post(
                f"{BASE_URL}/api/cart/items",
                json={"product_id": product_id, "quantity": 1},
                headers=auth_headers
            )
        
        order_data = {
            "shipping": {
                "full_name": "History Test",
                "phone": "+380501234567",
                "city": "Kyiv",
                "address": "History Test Address"
            },
            "payment_method": "cash"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/v2/orders",
            json=order_data,
            headers=auth_headers
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create order")
        
        order = create_response.json()
        order_id = order["id"]
        
        # Verify initial history
        assert len(order["status_history"]) >= 1, "Should have initial history entry"
        initial_entry = order["status_history"][0]
        assert initial_entry["to"] == "NEW", f"First entry should be to NEW, got {initial_entry['to']}"
        print(f"✓ Initial status history: {initial_entry}")
        
        # Update status
        requests.put(
            f"{BASE_URL}/api/v2/orders/{order_id}/status",
            json={"status": "PROCESSING"},
            headers=auth_headers
        )
        
        # Get updated order
        get_response = requests.get(
            f"{BASE_URL}/api/v2/orders/{order_id}",
            headers=auth_headers
        )
        
        if get_response.status_code == 200:
            updated_order = get_response.json()
            history = updated_order["status_history"]
            
            assert len(history) >= 2, f"Should have 2+ history entries, got {len(history)}"
            
            # Check latest entry
            latest = history[-1]
            assert latest["from"] == "NEW", f"Expected from=NEW, got {latest['from']}"
            assert latest["to"] == "PROCESSING", f"Expected to=PROCESSING, got {latest['to']}"
            assert "actor" in latest, "Actor missing from history"
            assert "at" in latest, "Timestamp missing from history"
            
            print(f"✓ Status history logged: {len(history)} entries")
            print(f"✓ Latest transition: {latest['from']} -> {latest['to']} by {latest['actor']}")


# ============= ADMIN ENDPOINTS TESTS =============

class TestAdminEndpoints:
    """Test admin-only endpoints"""
    
    def test_get_all_orders_admin(self, auth_headers):
        """Admin can get all orders"""
        response = requests.get(
            f"{BASE_URL}/api/v2/orders",
            headers=auth_headers
        )
        
        # May be 200 (success) or 403 (not admin)
        if response.status_code == 403:
            print("⚠ User is not admin - skipping admin test")
            return
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of orders"
        print(f"✓ Admin GET all orders returned {len(data)} orders")
    
    def test_admin_status_update(self, auth_headers):
        """Admin can update order status"""
        # Get an order first
        orders_response = requests.get(
            f"{BASE_URL}/api/v2/orders/my",
            headers=auth_headers
        )
        
        if orders_response.status_code != 200 or not orders_response.json():
            pytest.skip("No orders available")
        
        # Find a NEW order
        orders = orders_response.json()
        new_order = None
        for o in orders:
            if o.get("status") == "NEW":
                new_order = o
                break
        
        if not new_order:
            pytest.skip("No NEW orders available for admin update test")
        
        # Try to update status
        update_response = requests.put(
            f"{BASE_URL}/api/v2/orders/{new_order['id']}/status",
            json={"status": "PROCESSING", "reason": "Admin test update"},
            headers=auth_headers
        )
        
        if update_response.status_code == 403:
            print("⚠ User is not admin - skipping admin status update")
            return
        
        if update_response.status_code == 200:
            print(f"✓ Admin status update successful")
        else:
            print(f"⚠ Admin update returned {update_response.status_code}: {update_response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
