"""
Test CatalogV3/V2 API endpoints
- /api/v2/catalog - Product catalog with filters, sorting, pagination
- /api/v2/catalog/filters - Available filter values  
- /api/v2/catalog/facets - Categories and brands facets
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCatalogEndpoints:
    """Test /api/v2/catalog endpoints"""

    def test_catalog_basic(self):
        """Test basic catalog endpoint returns products"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert isinstance(data["products"], list)
        assert isinstance(data["total"], int)
        
    def test_catalog_returns_product_structure(self):
        """Test product items have required fields"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog?limit=4")
        assert response.status_code == 200
        
        data = response.json()
        if data["products"]:
            product = data["products"][0]
            # Check required fields
            assert "id" in product
            assert "title" in product
            assert "price" in product
            assert "images" in product
            # Should not have MongoDB _id
            assert "_id" not in product

    def test_catalog_sorting_price_asc(self):
        """Test sorting by price ascending"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog?sort_by=price_asc&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        products = data["products"]
        if len(products) >= 2:
            # Verify ascending order
            prices = [p["price"] for p in products]
            assert prices == sorted(prices), f"Expected ascending prices, got: {prices}"

    def test_catalog_sorting_price_desc(self):
        """Test sorting by price descending"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog?sort_by=price_desc&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        products = data["products"]
        if len(products) >= 2:
            # Verify descending order
            prices = [p["price"] for p in products]
            assert prices == sorted(prices, reverse=True), f"Expected descending prices, got: {prices}"

    def test_catalog_sorting_popular(self):
        """Test sorting by popular (default)"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog?sort_by=popular")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data

    def test_catalog_sorting_new(self):
        """Test sorting by newest"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog?sort_by=new")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data

    def test_catalog_pagination(self):
        """Test pagination parameters work"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog?page=1&limit=2")
        assert response.status_code == 200
        
        data = response.json()
        assert data["page"] == 1
        assert len(data["products"]) <= 2

    def test_catalog_in_stock_filter(self):
        """Test in_stock filter returns only available products"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog?in_stock=true")
        assert response.status_code == 200
        
        data = response.json()
        # All returned products should have stock > 0
        for product in data["products"]:
            if "stock_level" in product:
                assert product["stock_level"] > 0, f"Product {product.get('title')} has no stock"

    def test_catalog_price_range_filter(self):
        """Test price range filter"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog?min_price=10000&max_price=60000")
        assert response.status_code == 200
        
        data = response.json()
        for product in data["products"]:
            price = product["price"]
            assert 10000 <= price <= 60000, f"Product price {price} outside range"


class TestCatalogFiltersEndpoint:
    """Test /api/v2/catalog/filters endpoint"""

    def test_catalog_filters_basic(self):
        """Test filters endpoint returns brands and price range"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog/filters")
        assert response.status_code == 200
        
        data = response.json()
        assert "brands" in data
        assert "price_range" in data
        assert isinstance(data["brands"], list)
        assert "min" in data["price_range"]
        assert "max" in data["price_range"]


class TestCatalogFacetsEndpoint:
    """Test /api/v2/catalog/facets endpoint"""

    def test_catalog_facets_basic(self):
        """Test facets endpoint returns categories and brands"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog/facets")
        assert response.status_code == 200
        
        data = response.json()
        assert "categories" in data
        assert "brands" in data
        assert "price_range" in data
        assert isinstance(data["categories"], list)
        
    def test_facets_categories_structure(self):
        """Test categories have required structure"""
        response = requests.get(f"{BASE_URL}/api/v2/catalog/facets")
        assert response.status_code == 200
        
        data = response.json()
        if data["categories"]:
            category = data["categories"][0]
            assert "id" in category
            assert "name" in category
            assert "slug" in category


class TestSearchEndpoints:
    """Test search-related endpoints"""

    def test_search_suggest(self):
        """Test search suggestions endpoint"""
        response = requests.get(f"{BASE_URL}/api/v2/search/suggest?q=iphone&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert isinstance(data["products"], list)

    def test_search_full(self):
        """Test full search endpoint"""
        response = requests.get(f"{BASE_URL}/api/v2/search?q=phone&page=1&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "total" in data
        assert "page" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
