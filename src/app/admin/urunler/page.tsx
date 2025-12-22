'use client';

import { useState, useEffect, useRef } from 'react';
import { Product } from '@/types/product';

// Slugify function
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export default function AdminUrunlerPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    price: '',
    stock: '',
    description: '',
    imageFile: null as File | null,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products', { cache: 'no-store' });
      const data = await response.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-generate slug from name if slug hasn't been manually edited
    if (name === 'name' && !slugManuallyEdited) {
      setFormData((prev) => ({ ...prev, slug: slugify(value) }));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    setFormData((prev) => ({ ...prev, slug: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type before setting
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
      ];

      const fileType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();

      // Check for HEIC/HEIF specifically
      if (fileType === 'image/heic' || fileType === 'image/heif' || fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
        alert('Bu dosya formatı desteklenmiyor. Lütfen JPG veya PNG yükleyin.');
        e.target.value = ''; // Clear the input
        return;
      }

      // Check if file type is allowed
      if (!allowedTypes.includes(fileType)) {
        alert('Bu dosya formatı desteklenmiyor. Lütfen JPG veya PNG yükleyin.');
        e.target.value = ''; // Clear the input
        return;
      }

      setFormData((prev) => ({ ...prev, imageFile: file }));
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Image upload error:', result.error);
        return null;
      }

      return result.imageUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);

    try {
      let imageUrl: string | null = null;

      // Upload new image if file is selected
      if (formData.imageFile) {
        // Double-check file type before upload
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        const fileType = formData.imageFile.type.toLowerCase();
        const fileName = formData.imageFile.name.toLowerCase();

        if (fileType === 'image/heic' || fileType === 'image/heif' || fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
          throw new Error('Bu dosya formatı desteklenmiyor. Lütfen JPG veya PNG yükleyin.');
        }

        if (!allowedTypes.includes(fileType)) {
          throw new Error('Bu dosya formatı desteklenmiyor. Lütfen JPG veya PNG yükleyin.');
        }

        imageUrl = await uploadImage(formData.imageFile);
        if (!imageUrl) {
          throw new Error('Görsel yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        }
      } else if (editingProduct) {
        // If editing and no new image, keep existing image_url
        imageUrl = editingProduct.image_url || null;
      }

      const productPayload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock, 10),
        description: formData.description.trim(),
        image_url: imageUrl,
      };

      let response;
      if (editingProduct) {
        // Update
        response = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productPayload),
        });
      } else {
        // Create
        response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productPayload),
        });
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Handle duplicate slug error specifically
        if (result.error && result.error.includes('duplicate key') && result.error.includes('slug')) {
          throw new Error('Bu slug zaten kullanılıyor. Lütfen farklı bir slug girin.');
        }
        throw new Error(result.error || 'İşlem başarısız');
      }

      setSuccessMessage(
        editingProduct ? 'Ürün başarıyla güncellendi!' : 'Ürün başarıyla eklendi!'
      );
      resetForm();
      fetchProducts();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Form submit error:', error);
      alert(error instanceof Error ? error.message : 'Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setSlugManuallyEdited(true);
    setFormData({
      name: product.name,
      slug: product.slug,
      price: product.price.toString(),
      stock: product.stock.toString(),
      description: product.description,
      imageFile: null,
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" ürününü silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Silme işlemi başarısız');
      }

      setProducts((prev) => prev.filter((p) => p.id !== id));
      setSuccessMessage('Ürün başarıyla silindi!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : 'Silme işlemi başarısız');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      price: '',
      stock: '',
      description: '',
      imageFile: null,
    });
    setEditingProduct(null);
    setSlugManuallyEdited(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Ürün Yönetimi</h1>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Product Form */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {editingProduct ? 'Ürünü Güncelle' : 'Yeni Ürün Ekle'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Ürün Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleSlugChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Fiyat (₺) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
                  Stok <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="stock"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  min="0"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label htmlFor="imageFile" className="block text-sm font-medium text-gray-700 mb-1">
                  Ürün Görseli
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="imageFile"
                  name="imageFile"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                {editingProduct && editingProduct.image_url && !formData.imageFile && (
                  <p className="mt-1 text-xs text-gray-500">
                    Mevcut görsel: {editingProduct.image_url}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? 'İşleniyor...'
                  : editingProduct
                  ? 'Güncelle'
                  : 'Ürün Ekle'}
              </button>
              {editingProduct && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  İptal
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Ürün Listesi</h2>

          {loading ? (
            <div className="text-center py-8 text-gray-600">Yükleniyor...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-600">Henüz ürün eklenmemiş.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Görsel</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Ad</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Fiyat</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Stok</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Slug</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Oluşturulma</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                            Görsel Yok
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">{product.name}</td>
                      <td className="py-3 px-4 text-gray-700">{formatPrice(product.price)} ₺</td>
                      <td className="py-3 px-4 text-gray-700">{product.stock}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{product.slug}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {formatDate(product.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

