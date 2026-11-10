import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '../lib/apiClient.js';
import { useToast } from '../context/ToastContext.js';
import { Supplier } from '../types/index.js';
import { Modal } from '../components/common/Modal.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.js';
import {
  Truck,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  Edit2,
  Trash2,
  UserCheck,
} from 'lucide-react';

const supplierFormSchema = z.object({
  name: z.string().min(2, 'Supplier name is required'),
  contact_person: z.string().optional().nullable(),
  phone: z
    .string()
    .min(7, 'Invalid phone number')
    .optional()
    .nullable()
    .or(z.literal('')),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  gst_number: z.string().optional().nullable(),
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

export const SupplierManagement: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => apiClient<Supplier[]>('/suppliers'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      gst_number: '',
    },
  });

  const openAddModal = () => {
    setEditingSupplier(null);
    reset({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      gst_number: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    reset({
      name: s.name,
      contact_person: s.contact_person || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      gst_number: s.gst_number || '',
    });
    setModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: SupplierFormData) =>
      apiClient('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      showSuccess('Supplier added successfully');
      setModalOpen(false);
    },
    onError: (err: any) => showError(err.message || 'Failed to add supplier'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SupplierFormData }) =>
      apiClient(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      showSuccess('Supplier details updated');
      setModalOpen(false);
    },
    onError: (err: any) => showError(err.message || 'Failed to update supplier'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/suppliers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      showSuccess('Supplier deleted');
      setDeleteTarget(null);
    },
    onError: (err: any) => showError(err.message || 'Failed to delete supplier'),
  });

  const onSubmit = (data: SupplierFormData) => {
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Supplier Directory
          </h1>
          <p className="text-xs text-slate-500">
            Manage dairy cooperative federations, local milk farmers, and packaged distributors.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      {/* Supplier Cards Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-sm font-semibold text-slate-500">
          Loading suppliers...
        </div>
      ) : suppliers.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <Truck className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-600">No suppliers registered</p>
          <p className="text-xs">Add dairy farmers and depots to record purchases.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{s.name}</h3>
                  {s.contact_person && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{s.contact_person}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(s)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-emerald-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(s)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                {s.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.phone}</span>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{s.email}</span>
                  </div>
                )}
                {s.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{s.address}</span>
                  </div>
                )}
                {s.gst_number && (
                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 pt-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>GST: {s.gst_number}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Register New Supplier'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Supplier / Dairy Name *
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="e.g. Gujarat Milk Marketing (Amul Depot)"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                {...register('contact_person')}
                placeholder="Rakesh Shah"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                {...register('phone')}
                placeholder="9820011223"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
              />
              {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Email Address
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="amuldepot@dairy.in"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
              />
              {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                GSTIN Number (15 digits)
              </label>
              <input
                type="text"
                {...register('gst_number')}
                placeholder="27AAACG0000A1Z5"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Address / Godown Location
            </label>
            <textarea
              {...register('address')}
              rows={2}
              placeholder="Plot 12, Industrial Area, Sector 4..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
              className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingSupplier ? 'Update' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Supplier"
        message={`Are you sure you want to delete '${deleteTarget?.name}'?`}
        confirmLabel="Delete"
        isDangerous={true}
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

