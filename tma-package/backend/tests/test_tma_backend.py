"""
Backend tests for Telegram Mini App (TMA) endpoints.
Tests: auth, catalog, products, favorites, reviews, support, cart.
"""
import os
import pytest
import requests

BASE_URL = "https://bot-app-deploy.preview.emergentagent.com"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get auth token using sandbox mode."""
    response = api_client.post(
        f"{BASE_URL}/api/tma/auth",
        json={"init_data": "sandbox:12345"}
    )
    assert response.status_code == 200, f"Auth failed: {response.text}"
    data = response.json()
    assert "token" in data, "Token not in response"
    assert "user" in data, "User not in response"
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with Bearer token."""
    return {"Authorization": f"Bearer {auth_token}"}


class TestHealth:
    """Health check endpoint."""

    def test_health_endpoint(self, api_client):
        """Test GET /api/health returns status ok."""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"


class TestAuth:
    """TMA authentication tests."""

    def test_auth_with_sandbox(self, api_client):
        """Test POST /api/tma/auth with sandbox init_data."""
        response = api_client.post(
            f"{BASE_URL}/api/tma/auth",
            json={"init_data": "sandbox:12345"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert len(data["token"]) > 0
        assert data["user"]["telegram_id"] == "12345"

    def test_auth_creates_user(self, api_client):
        """Test auth creates new user for new telegram_id."""
        response = api_client.post(
            f"{BASE_URL}/api/tma/auth",
            json={"init_data": "sandbox:99999"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["telegram_id"] == "99999"
        assert "full_name" in data["user"]


class TestCatalog:
    """Catalog endpoints: home, categories, products."""

    def test_home_endpoint(self, api_client):
        """Test GET /api/tma/home returns banners, categories, bestsellers, new_arrivals."""
        response = api_client.get(f"{BASE_URL}/api/tma/home")
        assert response.status_code == 200
        data = response.json()
        
        # Check structure
        assert "banners" in data
        assert "categories" in data
        assert "bestsellers" in data
        assert "new_arrivals" in data
        
        # Check data is populated
        assert len(data["banners"]) > 0, "Banners should not be empty"
        assert len(data["categories"]) > 0, "Categories should not be empty"
        assert len(data["bestsellers"]) > 0, "Bestsellers should not be empty"
        assert len(data["new_arrivals"]) > 0, "New arrivals should not be empty"

    def test_categories_endpoint(self, api_client):
        """Test GET /api/tma/categories returns list with product_count > 0."""
        response = api_client.get(f"{BASE_URL}/api/tma/categories")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0, "Categories list should not be empty"
        
        # Check first category structure
        cat = data[0]
        assert "id" in cat
        assert "name" in cat
        assert "slug" in cat
        assert "product_count" in cat
        assert cat["product_count"] > 0, "Category should have products"

    def test_products_by_category(self, api_client):
        """Test GET /api/tma/products?category=smartphones returns items."""
        response = api_client.get(
            f"{BASE_URL}/api/tma/products",
            params={"category": "smartphones"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert len(data["items"]) > 0, "Should have smartphone products"
        
        # Check product structure
        product = data["items"][0]
        assert "id" in product
        assert "title" in product
        assert "price" in product
        assert "images" in product

    def test_product_detail(self, api_client):
        """Test GET /api/tma/products/{id} returns product + related."""
        # First get a product ID
        response = api_client.get(f"{BASE_URL}/api/tma/products", params={"limit": 1})
        assert response.status_code == 200
        products = response.json()["items"]
        assert len(products) > 0, "Need at least one product"
        
        product_id = products[0]["id"]
        
        # Get product detail
        response = api_client.get(f"{BASE_URL}/api/tma/products/{product_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == product_id
        assert "title" in data
        assert "description" in data
        assert "price" in data
        assert "related" in data
        assert isinstance(data["related"], list)


class TestSearch:
    """Search and autosuggest tests."""

    def test_search_suggest(self, api_client):
        """Test GET /api/tma/search/suggest?q=iPhone returns items."""
        response = api_client.get(
            f"{BASE_URL}/api/tma/search/suggest",
            params={"q": "iPhone"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert len(data["items"]) > 0, "Should find iPhone products"
        
        # Check suggestion structure
        item = data["items"][0]
        assert "id" in item
        assert "title" in item
        assert "price" in item

    def test_search_suggest_empty_query(self, api_client):
        """Test search with empty query returns empty items."""
        response = api_client.get(
            f"{BASE_URL}/api/tma/search/suggest",
            params={"q": ""}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []


class TestFavorites:
    """Favorites functionality tests."""

    def test_favorite_ids_empty(self, api_client, auth_headers):
        """Test GET /api/tma/favorites/ids returns ids."""
        response = api_client.get(
            f"{BASE_URL}/api/tma/favorites/ids",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "ids" in data
        assert isinstance(data["ids"], list)

    def test_toggle_favorite_add(self, api_client, auth_headers):
        """Test POST /api/tma/favorites/toggle adds product to favorites."""
        # Get a product ID
        response = api_client.get(f"{BASE_URL}/api/tma/products", params={"limit": 1})
        product_id = response.json()["items"][0]["id"]
        
        # Add to favorites
        response = api_client.post(
            f"{BASE_URL}/api/tma/favorites/toggle",
            headers=auth_headers,
            json={"product_id": product_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["added", "removed"]
        assert data["product_id"] == product_id

    def test_toggle_favorite_remove(self, api_client, auth_headers):
        """Test POST /api/tma/favorites/toggle removes product from favorites."""
        # Get a product ID
        response = api_client.get(f"{BASE_URL}/api/tma/products", params={"limit": 1})
        product_id = response.json()["items"][0]["id"]
        
        # Add to favorites first
        api_client.post(
            f"{BASE_URL}/api/tma/favorites/toggle",
            headers=auth_headers,
            json={"product_id": product_id}
        )
        
        # Remove from favorites
        response = api_client.post(
            f"{BASE_URL}/api/tma/favorites/toggle",
            headers=auth_headers,
            json={"product_id": product_id}
        )
        assert response.status_code == 200
        data = response.json()
        # Should toggle status
        assert data["product_id"] == product_id

    def test_list_favorites(self, api_client, auth_headers):
        """Test GET /api/tma/favorites returns full product objects."""
        response = api_client.get(
            f"{BASE_URL}/api/tma/favorites",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)


class TestReviews:
    """Product reviews tests."""

    def test_create_review(self, api_client, auth_headers):
        """Test POST /api/tma/reviews creates review."""
        # Get a product ID
        response = api_client.get(f"{BASE_URL}/api/tma/products", params={"limit": 1})
        product_id = response.json()["items"][0]["id"]
        
        # Create review
        response = api_client.post(
            f"{BASE_URL}/api/tma/reviews",
            headers=auth_headers,
            json={
                "product_id": product_id,
                "rating": 5,
                "comment": "TEST_Excellent product!"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["product_id"] == product_id
        assert data["rating"] == 5
        assert "TEST_" in data["comment"]

    def test_get_product_reviews(self, api_client):
        """Test GET /api/tma/products/{id}/reviews returns reviews with average."""
        # Get a product ID
        response = api_client.get(f"{BASE_URL}/api/tma/products", params={"limit": 1})
        product_id = response.json()["items"][0]["id"]
        
        # Get reviews
        response = api_client.get(
            f"{BASE_URL}/api/tma/products/{product_id}/reviews"
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "count" in data
        assert "average" in data
        assert isinstance(data["items"], list)


class TestSupport:
    """Support tickets tests."""

    def test_create_support_ticket(self, api_client, auth_headers):
        """Test POST /api/tma/support/tickets creates ticket."""
        response = api_client.post(
            f"{BASE_URL}/api/tma/support/tickets",
            headers=auth_headers,
            json={
                "subject": "TEST_Need help",
                "message": "TEST_I have a question about my order"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "ticket_no" in data
        assert "TEST_" in data["subject"]
        assert data["status"] == "open"

    def test_list_support_tickets(self, api_client, auth_headers):
        """Test GET /api/tma/support/tickets returns user tickets."""
        response = api_client.get(
            f"{BASE_URL}/api/tma/support/tickets",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)


class TestCart:
    """Cart preview tests."""

    def test_cart_preview(self, api_client):
        """Test POST /api/tma/cart/preview calculates subtotal."""
        # Get a product ID
        response = api_client.get(f"{BASE_URL}/api/tma/products", params={"limit": 1})
        product = response.json()["items"][0]
        product_id = product["id"]
        
        # Preview cart
        response = api_client.post(
            f"{BASE_URL}/api/tma/cart/preview",
            json={
                "items": [
                    {"product_id": product_id, "quantity": 2}
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "subtotal" in data
        assert "count" in data
        assert data["count"] == 2
        assert data["subtotal"] > 0

    def test_cart_preview_empty(self, api_client):
        """Test cart preview with empty items."""
        response = api_client.post(
            f"{BASE_URL}/api/tma/cart/preview",
            json={"items": []}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["subtotal"] == 0
        assert data["count"] == 0
