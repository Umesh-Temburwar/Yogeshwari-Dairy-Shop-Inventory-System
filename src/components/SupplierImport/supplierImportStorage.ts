import { SupplierImportRecord } from './types';

const STORAGE_KEY = 'ydo_supplier_import_records_v1';

export const supplierImportStorage = {
  getAll(): SupplierImportRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data) as SupplierImportRecord[];
    } catch (err) {
      console.warn('Error reading supplier import records from localStorage:', err);
      return [];
    }
  },

  save(record: SupplierImportRecord): void {
    try {
      const list = this.getAll();
      const existingIdx = list.findIndex(r => r.id === record.id);
      if (existingIdx >= 0) {
        list[existingIdx] = record;
      } else {
        list.unshift(record);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.error('Failed to save supplier import record:', err);
    }
  },

  delete(id: string): void {
    try {
      const list = this.getAll().filter(r => r.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.error('Failed to delete supplier import record:', err);
    }
  },

  isInvoiceDuplicate(supplierName: string, invoiceNumber: string, currentRecordId?: string): boolean {
    if (!invoiceNumber || !supplierName) return false;
    const cleanSupplier = supplierName.trim().toLowerCase();
    const cleanInv = invoiceNumber.trim().toLowerCase();

    const list = this.getAll();
    return list.some(r => 
      r.id !== currentRecordId &&
      r.invoice.supplier_name.trim().toLowerCase() === cleanSupplier &&
      r.invoice.invoice_number.trim().toLowerCase() === cleanInv
    );
  },

  updateStatus(id: string, status: SupplierImportRecord['status']): void {
    const list = this.getAll();
    const record = list.find(r => r.id === id);
    if (record) {
      record.status = status;
      if (status === 'stock_entered') {
        record.stock_entry_date = new Date().toISOString();
      } else if (status === 'tally_exported') {
        record.tally_export_date = new Date().toISOString();
      }
      this.save(record);
    }
  }
};
