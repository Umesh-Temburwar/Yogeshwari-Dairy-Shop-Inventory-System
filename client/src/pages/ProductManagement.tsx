import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '../lib/apiClient.js';
import { formatINR } from '../lib/formatters.js';
import { useToast } from '../context/ToastContext.js';
import { useAuth } from '../context/AuthContext.js';
import { Product, Category, Brand, Unit } from '../types/index.js';
import { Modal } from '../components/common/Modal.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.js';
import { Badge } from '../components/common/Badge.js';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Package,
} from 'lucide-react';

const productFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category_id: z.string().min(1, 'Category is required'),
  brand_id: z.string().optional().nullable(),
  unit_id: z.string().min(1, 'Unit is required'),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional().nullable(),
  purchase_price: z.coerce.number().min(0, 'Purchase price cannot be negative'),
  selling_price: z.coerce.number().positive('Selling price must be greater than zero'),
  gst_percent: z.coerce.number().min(0).max(28).default(0),
  min_stock: z.coerce.number().min(0).default(0),
  max_stock: z.coerce.number().min(0).default(100),
  image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type ProductFormData = z.infer<typeof productFormSchema>;

export const ProductManagement: React.FC = () => {
  const { hasRole } = useAuth();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteProductTarget, setDeleteProductTarget] = useState<Product | null>(null);

  // Queries for masters
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient<Category[]>('/categories'),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => apiClient<Brand[]>('/brands'),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => apiClient<Unit[]>('/units'),
  });

  // Query products with filters
  const { data: productResponse, isLoading } = useQuery({
    queryKey: ['products', searchTerm, selectedCategory, selectedBrand, lowStockOnly],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (selectedBrand) params.append('brand_id', selectedBrand);
      if (lowStockOnly) params.append('low_stock', 'true');
      return apiClient<{ items: Product[]; total: number }>(`/products?${params.toString()}`);
    },
  });

  const products = productResponse?.items || [];

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      category_id: '',
      brand_id: null,
      unit_id: '',
      sku: '',
      barcode: '',
      purchase_price: 0,
      selling_price: 0,
      gst_percent: 0,
      min_stock: 10,
      max_stock: 100,
      image_url: '',
    },
  });

  const previewImageUrl = watch('image_url');

  const openAddModal = () => {
    setEditingProduct(null);
    reset({
      name: '',
      category_id: categories[0]?.id || '',
      brand_id: brands[0]?.id || null,
      unit_id: units[0]?.id || '',
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      barcode: '',
      purchase_price: 0,
      selling_price: 0,
      gst_percent: 0,
      min_stock: 10,
      max_stock: 100,
      image_url: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    reset({
      name: p.name,
      category_id: p.category_id,
      brand_id: p.brand_id,
      unit_id: p.unit_id,
      sku: p.sku,
      barcode: p.barcode || '',
      purchase_price: p.purchase_price,
      selling_price: p.selling_price,
      gst_percent: p.gst_percent,
      min_stock: p.min_stock,
      max_stock: p.max_stock,
      image_url: p.image_url || '',
    });
    setModalOpen(true);
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ProductFormData) =>
      apiClient('/products', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-overview'] });
      showSuccess('Product created successfully');
      setModalOpen(false);
    },
    onError: (err: any) => showError(err.message || 'Failed to create product'),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductFormData }) =>
      apiClient(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-overview'] });
      showSuccess('Product updated successfully');
      setModalOpen(false);
    },
    onError: (err: any) => showError(err.message || 'Failed to update product'),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-overview'] });
      showSuccess('Product removed from catalog');
      setDeleteProductTarget(null);
    },
    onError: (err: any) => showError(err.message || 'Failed to delete product'),
  });

  const onSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const canManage = hasRole(['admin', 'owner', 'manager']);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Product Catalog & Inventory
          </h1>
          <p className="text-xs text-slate-500">
            Maintain dairy items, purchase and selling rates, SKU, and safety stock levels.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product, SKU, barcode..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Brand Filter */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Low Stock Toggle */}
          <button
            type="button"
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition ${
              lowStockOnly
                ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {lowStockOnly ? 'Showing Low Stock Only' : 'Filter Low Stock'}
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-sm font-semibold text-slate-500 flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            Loading catalog...
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Package className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No products found</p>
            <p className="text-xs">Try adjusting your search criteria or add a new dairy item.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category & Brand</th>
                  <th className="px-4 py-3">Purchase Rate</th>
                  <th className="px-4 py-3">Selling Rate</th>
                  <th className="px-4 py-3">Current Stock</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {products.map((p) => {
                  const currentStock = p.current_stock ?? 0;
                  const isLow = currentStock <= p.min_stock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      {/* Product Name & SKU */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              SKU: {p.sku} {p.barcode && `| Barcode: ${p.barcode}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Brand */}
                      <td className="px-4 py-3">
                        <div className="text-xs font-semibold text-slate-800">
                          {p.category?.name || 'Dairy'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {p.brand?.name || 'Local'}
                        </div>
                      </td>

                      {/* Purchase Rate */}
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {formatINR(p.purchase_price)}
                      </td>

                      {/* Selling Rate */}
                      <td className="px-4 py-3 font-bold text-emerald-700">
                        {formatINR(p.selling_price)}
                        {p.gst_percent > 0 && (
                          <span className="text-[10px] text-slate-400 block font-normal">
                            +{p.gst_percent}% GST
                          </span>
                        )}
                      </td>

                      {/* Current Stock */}
                      <td className="px-4 py-3">
                        <div className={`font-bold ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                          {currentStock} {p.unit?.short_code || 'units'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Safety Min: {p.min_stock}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3">
                        <Badge type="stock" value={p.stock_status || (isLow ? 'LOW' : 'NORMAL')} />
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-700 transition"
                              title="Edit Product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteProductTarget(p)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Dairy Product'}
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                {...register('name')}
                placeholder="e.g. Amul Taaza Milk (500ml)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
              {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Category *
              </label>
              <select
                {...register('category_id')}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p className="text-xs text-rose-500 mt-1">{errors.category_id.message}</p>
              )}
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Brand
              </label>
              <select
                {...register('brand_id')}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              >
                <option value="">None / In-House</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Unit of Measure *
              </label>
              <select
                {...register('unit_id')}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              >
                <option value="">Select Unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.short_code})
                  </option>
                ))}
              </select>
              {errors.unit_id && (
                <p className="text-xs text-rose-500 mt-1">{errors.unit_id.message}</p>
              )}
            </div>

            {/* SKU */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                SKU Code *
              </label>
              <input
                type="text"
                {...register('sku')}
                placeholder="SKU-AML-500"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
              {errors.sku && <p className="text-xs text-rose-500 mt-1">{errors.sku.message}</p>}
            </div>

            {/* Barcode */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Barcode (EAN-13)
              </label>
              <input
                type="text"
                {...register('barcode')}
                placeholder="8901262010051"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
            </div>

            {/* Purchase Price */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Purchase Cost (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                {...register('purchase_price')}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
              {errors.purchase_price && (
                <p className="text-xs text-rose-500 mt-1">{errors.purchase_price.message}</p>
              )}
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                {...register('selling_price')}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold text-emerald-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
              {errors.selling_price && (
                <p className="text-xs text-rose-500 mt-1">{errors.selling_price.message}</p>
              )}
            </div>

            {/* GST % */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                GST Rate (%)
              </label>
              <select
                {...register('gst_percent')}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              >
                <option value="0">0% (Fresh Milk, Paneer, Dahi)</option>
                <option value="5">5% (Packaged dairy)</option>
                <option value="12">12% (Butter, Ghee, Cheese)</option>
                <option value="18">18% (Ice Cream, Flavored Drinks)</option>
              </select>
            </div>

            {/* Min Stock Level */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Safety Stock Threshold
              </label>
              <input
                type="number"
                {...register('min_stock')}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
            </div>

            {/* Image URL */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Product Image URL
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="url"
                  {...register('image_url')}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
                {previewImageUrl && (
                  <img
                    src={previewImageUrl}
                    alt="Preview"
                    className="h-10 w-10 object-cover rounded-lg border border-slate-200"
                    onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
              className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {isSubmitting || createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingProduct
                ? 'Save Changes'
                : 'Add Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteProductTarget)}
        title="Deactivate Product"
        message={`Are you sure you want to deactivate '${deleteProductTarget?.name}'? It will be archived from active store sales.`}
        confirmLabel="Deactivate"
        isDangerous={true}
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteProductTarget) {
            deleteMutation.mutate(deleteProductTarget.id);
          }
        }}
        onCancel={() => setDeleteProductTarget(null)}
      />
    </div>
  );
};

