"""
Backend tests for B8-B12 features:
- B8: ProductCard polish
- B9: Homepage Retail 4.0 (API endpoints for products)
- B10: Catalog 3.0 (URL state, filters)
- B11: Search suggest API with categories and popular queries
- B12: ProductPageV4 related endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://bot-app-deploy.preview.emergentagent.com').rstrip('/')


class TestCatalogV2API:
    """Tests for /api/v2/catalog endpoint (B10)"""
    
    def test_catalog_returns_products(self):
        """Basic catalog endpoint returns products"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert isinstance(data["products"], list)
        print(f"SUCCESS: Catalog returned {len(data['products'])} products, total: {data['total']}")
    
    def test_catalog_pagination(self):
        """Test pagination parameters"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog?page=1&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["products"]) <= 5
        assert data["page"] == 1
        print(f"SUCCESS: Pagination working - page {data['page']} of {data['pages']}")
    
    def test_catalog_sort_price_asc(self):
        """Test sorting by price ascending"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog?sort_by=price_asc&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        products = data["products"]
        if len(products) >= 2:
            # Check prices are in ascending order
            for i in range(len(products) - 1):
                assert products[i]["price"] <= products[i+1]["price"], "Prices not sorted ascending"
        print(f"SUCCESS: Price ascending sort working")
    
    def test_catalog_sort_price_desc(self):
        """Test sorting by price descending"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog?sort_by=price_desc&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        products = data["products"]
        if len(products) >= 2:
            for i in range(len(products) - 1):
                assert products[i]["price"] >= products[i+1]["price"], "Prices not sorted descending"
        print(f"SUCCESS: Price descending sort working")
    
    def test_catalog_price_filter(self):
        """Test price range filter (B10)"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog?min_price=10000&max_price=50000&limit=20")
        assert response.status_code == 200
        
        data = response.json()
        for product in data["products"]:
            assert 10000 <= product["price"] <= 50000, f"Product {product.get('title')} price {product['price']} out of range"
        print(f"SUCCESS: Price filter working - {len(data['products'])} products in range 10000-50000")
    
    def test_catalog_in_stock_filter(self):
        """Test in_stock filter"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog?in_stock=true&limit=20")
        assert response.status_code == 200
        
        data = response.json()
        for product in data["products"]:
            assert product.get("stock_level", 0) > 0, f"Product {product.get('title')} not in stock"
        print(f"SUCCESS: In-stock filter working - {len(data['products'])} products in stock")


class TestCatalogFilters:
    """Tests for /api/v2/catalog/filters endpoint (B10)"""
    
    def test_catalog_filters_returns_data(self):
        """Filters endpoint returns brands and price range"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog/filters")
        assert response.status_code == 200
        
        data = response.json()
        assert "brands" in data
        assert "price_range" in data
        assert isinstance(data["brands"], list)
        assert "min" in data["price_range"]
        assert "max" in data["price_range"]
        print(f"SUCCESS: Filters endpoint returned {len(data['brands'])} brands, price range: {data['price_range']}")


class TestSearchSuggestAPI:
    """Tests for /api/v2/search/suggest endpoint (B11)"""
    
    def test_search_suggest_returns_structure(self):
        """Search suggest returns products, categories, popular"""
        response = requests.get(f"{BASE_URL}/api/v2/search/suggest?q=mac&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "categories" in data
        assert "popular" in data
        print(f"SUCCESS: Search suggest structure correct")
    
    def test_search_suggest_products(self):
        """Search suggest returns matching products"""
        response = requests.get(f"{BASE_URL}/api/v2/search/suggest?q=mac&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["products"]) > 0, "No MacBook products found"
        
        # Verify product structure
        product = data["products"][0]
        assert "id" in product
        assert "title" in product
        assert "price" in product
        print(f"SUCCESS: Found {len(data['products'])} products matching 'mac'")
    
    def test_search_suggest_categories(self):
        """Search suggest returns matching categories"""
        response = requests.get(f"{BASE_URL}/api/v2/search/suggest?q=lap&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        # Categories may or may not be present
        assert isinstance(data["categories"], list)
        print(f"SUCCESS: Categories search returned {len(data['categories'])} results")
    
    def test_search_suggest_popular_queries(self):
        """Search suggest returns popular queries"""
        response = requests.get(f"{BASE_URL}/api/v2/search/suggest?q=&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["popular"]) > 0, "No popular queries returned"
        print(f"SUCCESS: Popular queries: {data['popular']}")
    
    def test_search_suggest_empty_query_returns_popular(self):
        """Empty query returns popular queries only"""
        response = requests.get(f"{BASE_URL}/api/v2/search/suggest?q=&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        # Empty query should return empty products but have popular
        assert len(data["products"]) == 0, "Products should be empty for empty query"
        assert len(data["popular"]) >= 3, "Should return popular queries"
        print(f"SUCCESS: Empty query returns popular: {data['popular'][:3]}")
    
    def test_search_suggest_ukrainian_query(self):
        """Test Ukrainian language query"""
        response = requests.get(f"{BASE_URL}/api/v2/search/suggest?q=ноут&lang=uk&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data["products"], list)
        assert isinstance(data["popular"], list)
        print(f"SUCCESS: Ukrainian query working")


class TestCatalogSearch:
    """Tests for /api/v2/products/search endpoint (B10/B13)"""
    
    def test_catalog_search_returns_items(self):
        """Catalog search endpoint returns items"""
        response = requests.get(f"{BASE_URL}/api/v2/products/search?q=samsung&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data or "products" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        items = data.get("items", data.get("products", []))
        print(f"SUCCESS: Catalog search returned {len(items)} items")
    
    def test_catalog_search_with_filters(self):
        """Test catalog search with price filters"""
        response = requests.get(f"{BASE_URL}/api/v2/products/search?q=&min=5000&max=30000&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        items = data.get("items", data.get("products", []))
        for item in items:
            assert 5000 <= item["price"] <= 30000
        print(f"SUCCESS: Search with price filter working")
    
    def test_catalog_search_returns_meta(self):
        """Search returns meta info (brands, price range)"""
        response = requests.get(f"{BASE_URL}/api/v2/products/search?q=&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert "meta" in data
        assert "brands" in data["meta"]
        assert "price" in data["meta"]
        print(f"SUCCESS: Meta info returned: {len(data['meta']['brands'])} brands")


class TestRelatedProducts:
    """Tests for /api/v2/products/{id}/related endpoint (B12)"""
    
    def test_related_products_endpoint(self):
        """Related products endpoint returns products"""
        product_id = "0a702360-ee0f-4fed-a56b-26a8178275b8"  # MacBook Air
        response = requests.get(f"{BASE_URL}/api/v2/products/{product_id}/related?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        products = data["products"]
        assert isinstance(products, list)
        # Should not include the same product
        for p in products:
            assert p["id"] != product_id, "Related should not include original product"
        print(f"SUCCESS: Related products returned {len(products)} items")
    
    def test_related_products_nonexistent(self):
        """Non-existent product returns empty list"""
        response = requests.get(f"{BASE_URL}/api/v2/products/nonexistent-id/related?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert data["products"] == []
        print(f"SUCCESS: Non-existent product returns empty related")


class TestProductBundles:
    """Tests for /api/v2/products/{id}/bundles endpoint (B12 - buy together)"""
    
    def test_bundles_endpoint(self):
        """Bundles endpoint returns cross-sell products"""
        product_id = "0a702360-ee0f-4fed-a56b-26a8178275b8"  # MacBook Air
        response = requests.get(f"{BASE_URL}/api/v2/products/{product_id}/bundles?limit=4")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        print(f"SUCCESS: Bundles returned {len(data['products'])} items")


class TestCategoriesTree:
    """Tests for /api/v2/categories/tree endpoint (B9 - MegaMenu)"""
    
    def test_categories_tree(self):
        """Categories tree endpoint returns tree structure"""
        response = requests.get(f"{BASE_URL}/api/v2/categories/tree")
        assert response.status_code == 200
        
        data = response.json()
        assert "tree" in data
        assert isinstance(data["tree"], list)
        print(f"SUCCESS: Categories tree returned {len(data['tree'])} root categories")


class TestFullSearchAPI:
    """Tests for /api/v2/search endpoint"""
    
    def test_full_search(self):
        """Full search endpoint with pagination"""
        response = requests.get(f"{BASE_URL}/api/v2/search?q=samsung&page=1&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "total" in data
        assert "query" in data
        assert data["query"] == "samsung"
        print(f"SUCCESS: Full search returned {len(data['products'])} products for 'samsung'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
