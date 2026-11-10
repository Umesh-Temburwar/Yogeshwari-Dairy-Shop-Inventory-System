import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient.js';
import { useToast } from '../context/ToastContext.js';
import { Category, Brand, Unit } from '../types/index.js';
import { Modal } from '../components/common/Modal.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.js';
import {
  Layers,
  Tag,
  Scale,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';

export const CategoriesBrandsUnits: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands' | 'units'>('categories');
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient<Category[]>('/categories'),
  });

  const { data: brands = [], isLoading: brandLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => apiClient<Brand[]>('/brands'),
  });

  const { data: units = [], isLoading: unitLoading } = useQuery({
    queryKey: ['units'],
    queryFn: () => apiClient<Unit[]>('/units'),
  });

  // Category Modal State
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Brand Modal State
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState('');

  // Unit Modal State
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitName, setUnitName] = useState('');
  const [unitCode, setUnitCode] = useState('');

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'brand' | 'unit';
    id: string;
    name: string;
  } | null>(null);

  // Mutations
  const catMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => {
      if (editingCat) {
        return apiClient(`/categories/${editingCat.id}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      return apiClient('/categories', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showSuccess(editingCat ? 'Category updated' : 'Category created');
      setCatModalOpen(false);
    },
    onError: (err: any) => showError(err.message || 'Operation failed'),
  });

  const brandMutation = useMutation({
    mutationFn: (data: { name: string }) => {
      if (editingBrand) {
        return apiClient(`/brands/${editingBrand.id}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      return apiClient('/brands', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      showSuccess(editingBrand ? 'Brand updated' : 'Brand created');
      setBrandModalOpen(false);
    },
    onError: (err: any) => showError(err.message || 'Operation failed'),
  });

  const unitMutation = useMutation({
    mutationFn: (data: { name: string; short_code: string }) => {
      if (editingUnit) {
        return apiClient(`/units/${editingUnit.id}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      return apiClient('/units', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      showSuccess(editingUnit ? 'Unit updated' : 'Unit created');
      setUnitModalOpen(false);
    },
    onError: (err: any) => showError(err.message || 'Operation failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) => {
      const endpoint = type === 'category' ? `/categories/${id}` : type === 'brand' ? `/brands/${id}` : `/units/${id}`;
      return apiClient(endpoint, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      showSuccess('Item deleted');
      setDeleteTarget(null);
    },
    onError: (err: any) => showError(err.message || 'Failed to delete item'),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Master Catalogs
        </h1>
        <p className="text-xs text-slate-500">
          Maintain product categories, dairy brands, and packaging units of measurement.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition ${
            activeTab === 'categories'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Categories ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('brands')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition ${
            activeTab === 'brands'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          Brands ({brands.length})
        </button>
        <button
          onClick={() => setActiveTab('units')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition ${
            activeTab === 'units'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          Units of Measure ({units.length})
        </button>
      </div>

      {/* Categories Tab Content */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingCat(null);
                setCatName('');
                setCatDesc('');
                setCatModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Category Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{c.description || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingCat(c);
                            setCatName(c.name);
                            setCatDesc(c.description || '');
                            setCatModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'category', id: c.id, name: c.name })}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Brands Tab Content */}
      {activeTab === 'brands' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingBrand(null);
                setBrandName('');
                setBrandModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Brand
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Brand Name</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {brands.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">{b.name}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingBrand(b);
                            setBrandName(b.name);
                            setBrandModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'brand', id: b.id, name: b.name })}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Units Tab Content */}
      {activeTab === 'units' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingUnit(null);
                setUnitName('');
                setUnitCode('');
                setUnitModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Unit
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Unit Name</th>
                  <th className="px-4 py-3">Short Symbol</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {units.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">{u.name}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-emerald-700 text-xs">
                      {u.short_code}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingUnit(u);
                            setUnitName(u.name);
                            setUnitCode(u.short_code);
                            setUnitModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'unit', id: u.id, name: u.name })}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Modal */}
      <Modal
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title={editingCat ? 'Edit Category' : 'Add Category'}
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            catMutation.mutate({ name: catName, description: catDesc });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Milk & Cream"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Description
            </label>
            <textarea
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="Fresh milk variants, cow, buffalo..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCatModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={catMutation.isPending}
              className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
            >
              {catMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Brand Modal */}
      <Modal
        isOpen={brandModalOpen}
        onClose={() => setBrandModalOpen(false)}
        title={editingBrand ? 'Edit Brand' : 'Add Brand'}
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            brandMutation.mutate({ name: brandName });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Brand Name *
            </label>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Amul"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setBrandModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={brandMutation.isPending}
              className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
            >
              {brandMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Unit Modal */}
      <Modal
        isOpen={unitModalOpen}
        onClose={() => setUnitModalOpen(false)}
        title={editingUnit ? 'Edit Unit' : 'Add Unit'}
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            unitMutation.mutate({ name: unitName, short_code: unitCode });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Unit Name *
            </label>
            <input
              type="text"
              required
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              placeholder="e.g. Kilogram"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Short Code / Symbol *
            </label>
            <input
              type="text"
              required
              value={unitCode}
              onChange={(e) => setUnitCode(e.target.value)}
              placeholder="e.g. Kg or Ltr"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setUnitModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={unitMutation.isPending}
              className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
            >
              {unitMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Confirm Deletion"
        message={`Are you sure you want to delete ${deleteTarget?.name}? Items linked to products may fail if in use.`}
        confirmLabel="Delete"
        isDangerous={true}
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate({ type: deleteTarget.type, id: deleteTarget.id });
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

