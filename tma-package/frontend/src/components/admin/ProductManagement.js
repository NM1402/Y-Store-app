import React, { useState, useEffect } from 'react';
import { productsAPI, categoriesAPI } from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Save, X, ExternalLink } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import ImageUploader from './ImageUploader';
import StructuredSpecificationsEditor from './StructuredSpecificationsEditor';

const ProductManagement = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    description_html: '',
    price: '',
    compare_price: '',
    category_id: '',
    category_name: '',
    stock_level: '',
    images: [''],
    videos: [''],
    specifications: []
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsEditing(true);
    setFormData({
      title: product.title || '',
      description: product.description || '',
      description_html: product.description_html || '',
      price: product.price || '',
      compare_price: product.compare_price || '',
      category_id: product.category_id || '',
      category_name: product.category_name || '',
      stock_level: product.stock_level || '',
      images: product.images && product.images.length > 0 ? product.images : [''],
      videos: product.videos && product.videos.length > 0 ? product.videos : [''],
      specifications: product.specifications || []
    });
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsEditing(true);
    setFormData({
      title: '',
      description: '',
      description_html: '',
      price: '',
      compare_price: '',
      category_id: '',
      category_name: '',
      stock_level: '',
      images: [''],
      videos: ['']
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingProduct(null);
    setFormData({
      title: '',
      description: '',
      description_html: '',
      price: '',
      compare_price: '',
      category_id: '',
      category_name: '',
      stock_level: '',
      images: [''],
      videos: ['']
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validate required fields
      if (!formData.title || !formData.category_id || !formData.price || !formData.stock_level) {
        toast.error('Please fill all required fields');
        return;
      }

      // Generate slug from title
      const generateSlug = (text) => {
        return text
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      };

      // Prepare product data
      const productData = {
        title: formData.title.trim(),
        slug: generateSlug(formData.title),
        description: formData.description || formData.title.trim(),
        description_html: formData.description_html || '',
        price: parseFloat(formData.price),
        compare_price: formData.compare_price ? parseFloat(formData.compare_price) : undefined,
        category_id: formData.category_id,
        category_name: formData.category_name,
        stock_level: parseInt(formData.stock_level),
        images: formData.images.filter(img => img && img.trim() !== ''),
        videos: formData.videos ? formData.videos.filter(vid => vid && vid.trim() !== '') : [],
        specifications: formData.specifications || []
      };

      // Ensure at least one image
      if (productData.images.length === 0) {
        toast.error('Please add at least one product image');
        return;
      }

      console.log('Saving product:', productData);

      if (editingProduct) {
        await productsAPI.update(editingProduct.id, productData);
        toast.success('Product updated successfully!');
      } else {
        await productsAPI.create(productData);
        toast.success('Product created successfully!');
      }
      
      fetchProducts();
      handleCancel();
    } catch (error) {
      console.error('Failed to save product:', error);
      toast.error(`Error: ${error.message || 'Failed to save product'}`);
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productsAPI.delete(productId);
        toast.success('Product deleted successfully!');
        fetchProducts();
      } catch (error) {
        console.error('Failed to delete product:', error);
        toast.error('Error deleting product');
      }
    }
  };

  const handleImagesChange = (newImages) => {
    setFormData({ ...formData, images: newImages });
  };

  if (isEditing) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl p-8 border border-gray-200">
          <h2 className="text-2xl font-bold mb-6">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">Product Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="MacBook Pro 16 inch"
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                value={formData.category_id}
                onChange={(e) => {
                  const selectedCategory = categories.find(c => c.id === e.target.value);
                  setFormData({
                    ...formData,
                    category_id: e.target.value,
                    category_name: selectedCategory?.name || ''
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Category</option>
                {categories.filter(c => !c.parent_id).map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  placeholder="999.99"
                />
              </div>
              <div>
                <Label htmlFor="compare_price">Compare Price ($)</Label>
                <Input
                  id="compare_price"
                  type="number"
                  step="0.01"
                  value={formData.compare_price}
                  onChange={(e) => setFormData({ ...formData, compare_price: e.target.value })}
                  placeholder="1299.99"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="stock">Stock Quantity *</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock_level}
                onChange={(e) => setFormData({ ...formData, stock_level: e.target.value })}
                required
                placeholder="50"
              />
            </div>

            <div>
              <Label>Product Images</Label>
              <p className="text-sm text-gray-500 mb-2">Upload images or provide URLs</p>
              <ImageUploader
                images={formData.images}
                onChange={handleImagesChange}
              />
            </div>

            <div>
              <Label>Product Description (Rich Text)</Label>
              <p className="text-sm text-gray-500 mb-2">
                Use the editor to add text, images, headings, lists, and links
              </p>
              <RichTextEditor
                value={formData.description_html}
                onChange={(value) => setFormData({ ...formData, description_html: value })}
                placeholder="Enter detailed product description. You can add images, headings, lists, and links..."
              />
            </div>

            {/* Structured Specifications - Rozetka Style */}
            <div>
              <Label>Характеристики товара (структурированные)</Label>
              <p className="text-sm text-gray-500 mb-2">
                Добавьте характеристики в формате групп с полями ключ-значение (как на Rozetka)
              </p>
              <StructuredSpecificationsEditor
                specifications={formData.specifications}
                onChange={(specs) => setFormData({ ...formData, specifications: specs })}
              />
            </div>

            <div className="flex gap-4 pt-4 border-t">
              <Button type="submit" className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t('productManagement')}</h2>
        <Button onClick={handleAddNew} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('addProduct')}
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('product')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('category')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('price')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('stock')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {product.images && product.images[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{product.title}</p>
                        <p className="text-sm text-gray-500">ID: {product.id.substring(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.category_name}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">${product.price}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.stock_level > 10 ? 'bg-green-100 text-green-800' :
                      product.stock_level > 0 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {product.stock_level} units
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/product/${product.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                        title="Переглянути на сайті"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        className="h-8 px-2 text-xs"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                        className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductManagement;
