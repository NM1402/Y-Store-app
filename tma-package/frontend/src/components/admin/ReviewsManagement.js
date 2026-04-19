import React, { useState, useEffect } from 'react';
import { Trash2, Star, User, Package, Calendar, Mail, AlertCircle, Home, Plus, Edit2, X, Save, Search } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';

/**
 * Reviews Management Component for Admin Panel
 * Allows admins to view, create, edit and delete product reviews
 */
const ReviewsManagement = () => {
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  
  const [formData, setFormData] = useState({
    product_id: '',
    product_name: '',
    user_name: '',
    rating: 5,
    comment: '',
    featured: true,
    likes: 0
  });

  useEffect(() => {
    fetchReviews();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (productSearch.length > 1) {
      const filtered = products.filter(p => 
        p.title.toLowerCase().includes(productSearch.toLowerCase())
      ).slice(0, 5);
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [productSearch, products]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/reviews`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReviews(response.data);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      toast.error('Не вдалося завантажити відгуки');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/v2/catalog/products?limit=100`
      );
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Ви впевнені, що хочете видалити цей відгук?')) {
      return;
    }

    try {
      setDeleteLoading(reviewId);
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/reviews/${reviewId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Відгук успішно видалено');
      setReviews(reviews.filter(r => r.id !== reviewId));
    } catch (error) {
      console.error('Failed to delete review:', error);
      toast.error('Не вдалося видалити відгук');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleToggleFeatured = async (reviewId, currentFeaturedStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/reviews/${reviewId}/feature`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setReviews(reviews.map(r => 
        r.id === reviewId ? { ...r, featured: response.data.featured } : r
      ));
      
      toast.success(
        response.data.featured 
          ? 'Відгук додано на головну' 
          : 'Відгук прибрано з головної'
      );
    } catch (error) {
      console.error('Failed to toggle featured:', error);
      toast.error('Не вдалося оновити статус відгуку');
    }
  };

  const handleCreateReview = async (e) => {
    e.preventDefault();
    
    if (!formData.product_id) {
      toast.error('Оберіть товар');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/reviews`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Відгук успішно створено');
      setShowCreateForm(false);
      resetForm();
      fetchReviews();
    } catch (error) {
      console.error('Failed to create review:', error);
      toast.error('Не вдалося створити відгук');
    }
  };

  const handleUpdateReview = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/reviews/${editingReview.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Відгук успішно оновлено');
      setEditingReview(null);
      resetForm();
      fetchReviews();
    } catch (error) {
      console.error('Failed to update review:', error);
      toast.error('Не вдалося оновити відгук');
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      product_name: '',
      user_name: '',
      rating: 5,
      comment: '',
      featured: true,
      likes: 0
    });
    setProductSearch('');
  };

  const startEdit = (review) => {
    setEditingReview(review);
    setFormData({
      product_id: review.product_id,
      product_name: review.product_name,
      user_name: review.user_name,
      rating: review.rating,
      comment: review.comment,
      featured: review.featured || false,
      likes: review.likes || 0
    });
    setProductSearch(review.product_name);
    setShowCreateForm(true);
  };

  const selectProduct = (product) => {
    setFormData({ ...formData, product_id: product.id, product_name: product.title });
    setProductSearch(product.title);
    setFilteredProducts([]);
  };

  const renderStars = (rating, editable = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            onClick={editable ? () => setFormData({ ...formData, rating: star }) : undefined}
            className={`w-5 h-5 ${editable ? 'cursor-pointer' : ''} ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Управління відгуками</h2>
          <p className="text-sm text-gray-600 mt-1">
            Всього відгуків: {reviews.length} | На головній: {reviews.filter(r => r.featured).length}
          </p>
        </div>
        <Button 
          onClick={() => { setShowCreateForm(true); setEditingReview(null); resetForm(); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4" />
          Додати відгук
        </Button>
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingReview ? 'Редагувати відгук' : 'Створити відгук'}
              </h3>
              <button 
                onClick={() => { setShowCreateForm(false); setEditingReview(null); resetForm(); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={editingReview ? handleUpdateReview : handleCreateReview} className="p-6 space-y-4">
              {/* Product Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Товар *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Пошук товару..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {filteredProducts.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredProducts.map(product => (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() => selectProduct(product)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <p className="text-sm font-medium text-gray-900">{product.title}</p>
                        <p className="text-xs text-gray-500">{product.price} грн</p>
                      </button>
                    ))}
                  </div>
                )}
                {formData.product_id && (
                  <p className="mt-1 text-xs text-green-600">✓ Обрано: {formData.product_name}</p>
                )}
              </div>

              {/* User Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ім'я покупця *
                </label>
                <input
                  type="text"
                  value={formData.user_name}
                  onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                  placeholder="Наприклад: Олексій М."
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Рейтинг *
                </label>
                {renderStars(formData.rating, true)}
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Текст відгуку *
                </label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="Напишіть текст відгуку..."
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Likes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Кількість лайків
                </label>
                <input
                  type="number"
                  value={formData.likes}
                  onChange={(e) => setFormData({ ...formData, likes: parseInt(e.target.value) || 0 })}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Featured Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="featured" className="text-sm text-gray-700">
                  Показувати на головній сторінці
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => { setShowCreateForm(false); setEditingReview(null); resetForm(); }}
                  variant="outline"
                  className="flex-1"
                >
                  Скасувати
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  {editingReview ? 'Зберегти' : 'Створити'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Відгуків поки немає
            </h3>
            <p className="text-gray-600 mb-4">
              Створіть перший відгук для відображення на головній сторінці
            </p>
            <Button 
              onClick={() => { setShowCreateForm(true); resetForm(); }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Створити відгук
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Товар
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Покупець
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Рейтинг
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Відгук
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дії
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                    {/* Product */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="max-w-xs">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {review.product_name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {review.user_name}
                        </span>
                      </div>
                    </td>

                    {/* Rating */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-sm text-gray-500">({review.likes || 0})</span>
                      </div>
                    </td>

                    {/* Comment */}
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 max-w-xs truncate">
                        {review.comment}
                      </p>
                    </td>

                    {/* Featured Status */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleFeatured(review.id, review.featured)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          review.featured
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Home className="w-3 h-3" />
                        {review.featured ? 'На головній' : 'Приховано'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(review)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(review.id)}
                          disabled={deleteLoading === review.id}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          {deleteLoading === review.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsManagement;
