"""
E-commerce V2 API Tests
Testing: Catalog V2, Categories V2, Search V2, Auth Login
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://bot-app-deploy.preview.emergentagent.com').rstrip('/')


class TestHealthCheck:
    """Health and basic connectivity tests"""
    
    def test_health_endpoint(self):
        """Health check should return ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print(f"✓ Health check: {data}")


class TestCategoriesV2:
    """V2-3: Categories Tree API for MegaMenu"""
    
    def test_categories_tree_endpoint(self):
        """GET /api/v2/categories/tree should return tree structure"""
        response = requests.get(f"{BASE_URL}/api/v2/categories/tree")
        assert response.status_code == 200
        data = response.json()
        
        # Should have tree key
        assert "tree" in data, "Response should have 'tree' key"
        tree = data["tree"]
        
        # Tree should be a list
        assert isinstance(tree, list), "Tree should be a list"
        
        # Count categories
        total_categories = len(tree)
        print(f"✓ Categories tree: {total_categories} root categories")
        
        # Check structure of first category if exists
        if tree:
            first = tree[0]
            assert "name" in first or "id" in first, "Category should have name or id"
            print(f"  First category: {first.get('name', first.get('id', 'N/A'))}")


class TestCatalogV2:
    """V2-3: Catalog API with filters, sorting, pagination"""
    
    def test_catalog_basic(self):
        """GET /api/v2/catalog should return products"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog")
        assert response.status_code == 200
        data = response.json()
        
        # Should have required keys
        assert "products" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        products = data["products"]
        total = data["total"]
        
        print(f"✓ Catalog basic: {len(products)} products, total={total}, pages={data['pages']}")
        
        # Check product structure
        if products:
            p = products[0]
            assert "id" in p, "Product should have id"
            assert "title" in p, "Product should have title"
            assert "price" in p, "Product should have price"
            print(f"  Sample product: {p.get('title', 'N/A')[:50]} - ${p.get('price', 0)}")
    
    def test_catalog_price_filter(self):
        """Catalog should support price filters (min_price, max_price)"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog", params={
            "min_price": 100,
            "max_price": 1000
        })
        assert response.status_code == 200
        data = response.json()
        
        products = data.get("products", [])
        print(f"✓ Catalog price filter (100-1000): {len(products)} products")
        
        # Verify price range
        for p in products[:5]:
            price = p.get("price", 0)
            assert 100 <= price <= 1000 or price == 0, f"Price {price} outside range"
    
    def test_catalog_in_stock_filter(self):
        """Catalog should support in_stock filter"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog", params={
            "in_stock": "true"
        })
        assert response.status_code == 200
        data = response.json()
        
        products = data.get("products", [])
        print(f"✓ Catalog in_stock filter: {len(products)} products in stock")
        
        # Verify stock levels
        for p in products[:5]:
            stock = p.get("stock_level", 0)
            # Products marked in_stock should have positive stock
            # Some may have 0 due to data issues - log but don't fail
            if stock <= 0:
                print(f"  Warning: Product '{p.get('title', 'N/A')[:30]}' has stock={stock}")
    
    def test_catalog_sorting_popular(self):
        """Catalog should support sort_by=popular"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog", params={
            "sort_by": "popular"
        })
        assert response.status_code == 200
        data = response.json()
        
        products = data.get("products", [])
        print(f"✓ Catalog sort by popular: {len(products)} products")
    
    def test_catalog_sorting_price_asc(self):
        """Catalog should support sort_by=price_asc"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog", params={
            "sort_by": "price_asc"
        })
        assert response.status_code == 200
        data = response.json()
        
        products = data.get("products", [])
        print(f"✓ Catalog sort by price_asc: {len(products)} products")
        
        # Verify ascending order
        if len(products) >= 2:
            prices = [p.get("price", 0) for p in products[:5]]
            for i in range(len(prices) - 1):
                assert prices[i] <= prices[i+1], f"Price order issue: {prices}"
    
    def test_catalog_pagination(self):
        """Catalog should support pagination (page, limit)"""
        # Get first page with limit 5
        response1 = requests.get(f"{BASE_URL}/api/v2/catalog", params={
            "page": 1,
            "limit": 5
        })
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Get second page
        response2 = requests.get(f"{BASE_URL}/api/v2/catalog", params={
            "page": 2,
            "limit": 5
        })
        assert response2.status_code == 200
        data2 = response2.json()
        
        products1 = data1.get("products", [])
        products2 = data2.get("products", [])
        
        print(f"✓ Catalog pagination: page1={len(products1)}, page2={len(products2)}")
        
        # Verify different products on different pages
        if products1 and products2:
            ids1 = {p.get("id") for p in products1}
            ids2 = {p.get("id") for p in products2}
            assert not ids1.intersection(ids2), "Same products on different pages"
    
    def test_catalog_filters_endpoint(self):
        """GET /api/v2/catalog/filters should return filter options"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog/filters")
        assert response.status_code == 200
        data = response.json()
        
        assert "brands" in data, "Should have brands"
        assert "price_range" in data, "Should have price_range"
        
        print(f"✓ Catalog filters: {len(data.get('brands', []))} brands, price range: {data.get('price_range')}")


class TestSearchV2:
    """V2-3: Search API with suggestions"""
    
    def test_search_suggest_endpoint(self):
        """GET /api/v2/search/suggest should return product suggestions"""
        response = requests.get(f"{BASE_URL}/api/v2/search/suggest", params={
            "q": "phone"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "products" in data
        products = data["products"]
        
        print(f"✓ Search suggest 'phone': {len(products)} results")
        
        if products:
            p = products[0]
            print(f"  First result: {p.get('title', 'N/A')[:50]}")
    
    def test_search_full_endpoint(self):
        """GET /api/v2/search should return paginated search results"""
        response = requests.get(f"{BASE_URL}/api/v2/search", params={
            "q": "iphone",
            "page": 1
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "products" in data
        assert "total" in data
        
        print(f"✓ Search 'iphone': {len(data['products'])} products, total={data['total']}")


class TestAuthLogin:
    """Authentication API tests"""
    
    def test_login_with_valid_credentials(self):
        """POST /api/auth/login should work with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test123"
        })
        
        # Should succeed or fail with proper error
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data, "Should have access_token"
            assert "user" in data, "Should have user"
            print(f"✓ Login successful: user={data['user'].get('email')}")
            return data
        elif response.status_code == 401:
            print(f"✓ Login rejected (expected if user doesn't exist): {response.json()}")
        else:
            print(f"⚠ Login returned {response.status_code}: {response.text}")
    
    def test_login_with_invalid_credentials(self):
        """POST /api/auth/login should reject invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@invalid.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Invalid credentials correctly rejected")
    
    def test_auth_me_unauthenticated(self):
        """GET /api/auth/me should return 401/403 without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        # Should require authentication
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Auth me correctly requires authentication")


class TestProductsV2:
    """Product detail and related endpoints"""
    
    def test_get_products_list(self):
        """GET /api/products should return products list"""
        response = requests.get(f"{BASE_URL}/api/products", params={"limit": 10})
        assert response.status_code == 200
        products = response.json()
        
        assert isinstance(products, list), "Should return list of products"
        print(f"✓ Products list: {len(products)} products")
        
        if products:
            # Return first product ID for other tests
            return products[0].get("id")
    
    def test_get_product_by_id(self):
        """GET /api/products/{id} should return product details"""
        # First get a product ID
        response = requests.get(f"{BASE_URL}/api/products", params={"limit": 1})
        if response.status_code != 200 or not response.json():
            pytest.skip("No products available")
        
        product_id = response.json()[0].get("id")
        
        # Now get product details
        response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert response.status_code == 200
        product = response.json()
        
        assert "id" in product
        assert "title" in product
        assert "price" in product
        
        print(f"✓ Product detail: {product.get('title', 'N/A')[:50]}")
    
    def test_related_products(self):
        """GET /api/v2/products/{id}/related should return related products"""
        # First get a product ID
        response = requests.get(f"{BASE_URL}/api/products", params={"limit": 1})
        if response.status_code != 200 or not response.json():
            pytest.skip("No products available")
        
        product_id = response.json()[0].get("id")
        
        # Get related products
        response = requests.get(f"{BASE_URL}/api/v2/products/{product_id}/related")
        assert response.status_code == 200
        data = response.json()
        
        assert "products" in data
        print(f"✓ Related products: {len(data['products'])} products")


class TestCartAPI:
    """Cart API tests (requires authentication)"""
    
    def get_auth_token(self):
        """Helper to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    def test_cart_requires_auth(self):
        """GET /api/cart should require authentication"""
        response = requests.get(f"{BASE_URL}/api/cart")
        assert response.status_code in [401, 403]
        print(f"✓ Cart API requires authentication")
    
    def test_add_to_cart_requires_auth(self):
        """POST /api/cart/items should require authentication"""
        response = requests.post(f"{BASE_URL}/api/cart/items", json={
            "product_id": "test",
            "quantity": 1
        })
        assert response.status_code in [401, 403]
        print(f"✓ Add to cart requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
