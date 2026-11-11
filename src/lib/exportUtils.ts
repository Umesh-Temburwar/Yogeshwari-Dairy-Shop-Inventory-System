/**
 * YOGESHWARI DAIRY SHOP - COMPREHENSIVE PDF & CSV EXPORT UTILITY
 * Supports 100% Devanagari (Marathi/Hindi) font fidelity, High-Resolution A4 Layout,
 * Professional Dairy ERP Header, KPI Summary Cards, and Print-to-PDF generation.
 */

import { YDO_LOGO_BASE64 } from '../assets/logoBase64';

export interface KPIItem {
  label: string;
  value: string | number;
  color?: string; // e.g. 'emerald', 'blue', 'purple', 'rose', 'amber'
}

export interface PDFTableData {
  headers: string[];
  rows: (string | number)[][];
  alignments?: ('left' | 'center' | 'right')[];
  summaryRow?: (string | number)[];
}

export interface PDFReportOptions {
  title: string;
  subtitle?: string;
  periodText?: string;
  kpis?: KPIItem[];
  tables?: {
    heading?: string;
    data: PDFTableData;
  }[];
  table?: PDFTableData; // single table shorthand
  notes?: string;
  author?: string;
  orientation?: 'portrait' | 'landscape';
  mode?: 'print' | 'download';
}

/**
 * Convenience alias for Printing Report / Slip
 */
export const printReport = (options: PDFReportOptions) => {
  return exportReportToPDF({ ...options, mode: 'print' });
};

/**
 * Convenience alias for Downloading PDF / Report File
 */
export const downloadReportPDF = (options: PDFReportOptions) => {
  return exportReportToPDF({ ...options, mode: 'download' });
};

/**
 * Universal PDF Generator for all Dairy Inventory modules
 */
export const exportReportToPDF = (options: PDFReportOptions) => {
  const {
    title,
    subtitle = 'Dairy ERP & Inventory Khata System',
    periodText,
    kpis = [],
    tables = options.table ? [{ data: options.table }] : [],
    notes,
    author = 'Yogeshwari Dairy Manager',
    orientation = 'portrait'
  } = options;

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('mr-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const timeFormatted = now.toLocaleTimeString('mr-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // KPI HTML Cards
  const kpiHtml = kpis.length > 0 ? `
    <div class="kpi-grid">
      ${kpis.map(kpi => `
        <div class="kpi-card ${kpi.color || 'emerald'}">
          <div class="kpi-label">${kpi.label}</div>
          <div class="kpi-value">${kpi.value}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  // Tables HTML
  const tablesHtml = tables.map((tbl, tblIdx) => {
    const { headers, rows, alignments = [], summaryRow } = tbl.data;
    return `
      ${tbl.heading ? `<h3 class="table-heading">${tbl.heading}</h3>` : ''}
      <table class="report-table">
        <thead>
          <tr>
            ${headers.map((h, i) => {
      const align = alignments[i] || 'left';
      return `<th class="text-${align}">${h}</th>`;
    }).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, rIdx) => `
            <tr class="${rIdx % 2 === 1 ? 'even-row' : ''}">
              ${row.map((cell, cIdx) => {
      const align = alignments[cIdx] || 'left';
      return `<td class="text-${align}">${cell !== null && cell !== undefined ? cell : '—'}</td>`;
    }).join('')}
            </tr>
          `).join('')}
        </tbody>
        ${summaryRow ? `
          <tfoot>
            <tr class="summary-row">
              ${summaryRow.map((cell, cIdx) => {
      const align = alignments[cIdx] || 'left';
      return `<td class="text-${align}"><strong>${cell !== null && cell !== undefined ? cell : ''}</strong></td>`;
    }).join('')}
            </tr>
          </tfoot>
        ` : ''}
      </table>
    `;
  }).join('<div style="height: 16px;"></div>');

  // Complete HTML Print Document with Devanagari Fonts
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="mr">
    <head>
      <meta charset="UTF-8">
      <title>${title} - योगेश्वरी डेअरी</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 ${orientation};
          margin: 12mm 15mm 15mm 15mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Noto Sans Devanagari', 'Inter', -apple-system, sans-serif;
          color: #0f172a;
          background: #ffffff;
          font-size: 11px;
          line-height: 1.45;
          padding: 10px;
        }

        /* Header */
        .report-header {
          border-bottom: 2px solid #059669;
          padding-bottom: 12px;
          margin-bottom: 14px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .brand-title {
          font-size: 20px;
          font-weight: 800;
          color: #047857;
          letter-spacing: -0.3px;
        }
        .brand-subtitle {
          font-size: 11px;
          color: #475569;
          font-weight: 600;
          margin-top: 2px;
        }
        .report-title-badge {
          display: inline-block;
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 800;
          margin-top: 6px;
        }
        .meta-box {
          text-align: right;
          font-size: 10px;
          color: #475569;
        }
        .meta-box strong {
          color: #0f172a;
        }

        /* KPI Cards */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(${Math.min(kpis.length, 4)}, 1fr);
          gap: 8px;
          margin-bottom: 14px;
        }
        .kpi-card {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .kpi-card.emerald {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }
        .kpi-card.blue {
          background: #eff6ff;
          border-color: #bfdbfe;
        }
        .kpi-card.purple {
          background: #faf5ff;
          border-color: #e9d5ff;
        }
        .kpi-card.rose {
          background: #fff1f2;
          border-color: #fecdd3;
        }
        .kpi-card.amber {
          background: #fffbeb;
          border-color: #fde68a;
        }
        .kpi-label {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.3px;
        }
        .kpi-value {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 2px;
        }

        /* Tables */
        .table-heading {
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 6px;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          margin-bottom: 8px;
        }
        .report-table th {
          background: #f1f5f9;
          color: #1e293b;
          font-weight: 700;
          padding: 6px 8px;
          border: 1px solid #cbd5e1;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.2px;
        }
        .report-table td {
          padding: 5px 8px;
          border: 1px solid #e2e8f0;
          color: #334155;
        }
        .report-table tr.even-row {
          background: #f8fafc;
        }
        .report-table tr.summary-row {
          background: #e2e8f0;
          font-weight: 800;
          border-top: 2px solid #94a3b8;
          color: #0f172a;
        }
        .text-left { text-align: left; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }

        /* Notes & Footer */
        .report-notes {
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 10px;
          color: #475569;
          margin-top: 12px;
        }
        .report-footer {
          margin-top: 24px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-size: 9px;
          color: #64748b;
        }
        .signature-box {
          text-align: center;
          min-width: 150px;
          border-top: 1px solid #94a3b8;
          padding-top: 4px;
          font-weight: 600;
        }

        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <!-- Top Action Bar (Hidden during Print / PDF generation) -->
      <div class="no-print" style="position: sticky; top: 0; z-index: 9999; background: #064e3b; color: #ffffff; padding: 10px 18px; margin: -10px -10px 14px -10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: sans-serif; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">📄</span>
          <div>
            <div style="font-weight: 800; font-size: 13px; color: #ecfdf5;">योगेश्वरी डेअरी अहवाल (Official Dairy Report)</div>
            <div style="font-size: 10px; color: #a7f3d0;">प्रिंट करा किंवा PDF स्वरूपात सेव्ह करा</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button onclick="window.print()" style="background: #10b981; color: #ffffff; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            <span>🖨️ प्रिंट (Print PDF)</span>
          </button>
          <button onclick="downloadReportHTML()" style="background: #2563eb; color: #ffffff; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            <span>📥 डाउनलोड PDF / अहवाल (Download)</span>
          </button>
          <button onclick="window.close()" style="background: #334155; color: #ffffff; border: none; padding: 8px 12px; border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer;">
            ✕ बंद करा
          </button>
        </div>
      </div>

      <!-- Header -->
      <div class="report-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${YDO_LOGO_BASE64}" alt="Logo" style="width: 52px; height: 52px; border-radius: 12px; object-fit: contain; border: 1.5px solid #059669; background: #ffffff; padding: 2px;" />
          <div>
            <div class="brand-title">योगेश्वरी डेअरी & उत्पादने</div>
            <div class="brand-subtitle">Yogeshwari Dairy Farm & Products &bull; Enterprise ERP & Khata System</div>
            <div class="report-title-badge">${title}</div>
            ${periodText ? `<div style="font-size: 10px; color: #047857; font-weight: 700; margin-top: 4px;">कालावधी: ${periodText}</div>` : ''}
          </div>
        </div>
        <div class="meta-box">
          <div>तारीख: <strong>${dateFormatted}</strong></div>
          <div>वेळ: <strong>${timeFormatted}</strong></div>
          <div>अहवाल तयार केला: <strong>${author}</strong></div>
          <div style="margin-top: 4px; font-size: 9px; color: #059669; font-weight: 700;">✓ Official Dairy Audit Report</div>
        </div>
      </div>

      <!-- KPIs -->
      ${kpiHtml}

      <!-- Tables Content -->
      ${tablesHtml}

      <!-- Optional Notes -->
      ${notes ? `<div class="report-notes"><strong>टीप (Notes):</strong> ${notes}</div>` : ''}

      <!-- Footer & Signatures -->
      <div class="report-footer">
        <div>
          <div>Yogeshwari Dairy ERP System &bull; Computer Generated Document</div>
          <div>शुद्धता हीच आमची ओळख &bull; Fresh Buffalo Milk, Paneer, Curd & Pure Desi Ghee</div>
        </div>
        <div class="signature-box">
          व्यवस्थापक / अधिकृत स्वाक्षरी<br>
          <span style="font-size: 8px; color: #94a3b8;">(Authorized Signatory)</span>
        </div>
      </div>

      <script>
        function triggerPrint() {
          try {
            window.focus();
            window.print();
          } catch(e) {
            console.error('Print trigger error', e);
          }
        }
        function downloadReportHTML() {
          try {
            const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = '${title.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_')}_${new Date().toISOString().split('T')[0]}.html';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => a.remove(), 100);
          } catch(e) {
            window.print();
          }
        }
        ${options.mode === 'download' ? '' : 'setTimeout(triggerPrint, 350);'}
      </script>
    </body>
    </html>
  `;

  // Create Blob URL for rock-solid cross-browser rendering
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const cleanFilename = `${title.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;

  // If mode === 'download', trigger direct file download
  if (options.mode === 'download') {
    try {
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = cleanFilename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      setTimeout(() => downloadLink.remove(), 200);
    } catch (err) {
      console.warn('Direct file download warning:', err);
    }
  }

  // 1. Try opening dedicated Print & PDF preview tab
  let printWindow: Window | null = null;
  try {
    printWindow = window.open(blobUrl, '_blank');
  } catch (err) {
    printWindow = null;
  }

  if (printWindow && !printWindow.closed) {
    printWindow.focus();
    return;
  }

  // 2. If popup was blocked or mobile, render full in-app preview & print modal
  const existingModal = document.getElementById('yd-report-modal');
  if (existingModal) existingModal.remove();

  const modalContainer = document.createElement('div');
  modalContainer.id = 'yd-report-modal';
  modalContainer.style.position = 'fixed';
  modalContainer.style.inset = '0';
  modalContainer.style.zIndex = '99999';
  modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
  modalContainer.style.backdropFilter = 'blur(4px)';
  modalContainer.style.display = 'flex';
  modalContainer.style.flexDirection = 'column';
  modalContainer.style.alignItems = 'center';
  modalContainer.style.justifyContent = 'center';
  modalContainer.style.padding = '12px';

  const modalBox = document.createElement('div');
  modalBox.style.backgroundColor = '#ffffff';
  modalBox.style.borderRadius = '20px';
  modalBox.style.width = '100%';
  modalBox.style.maxWidth = '880px';
  modalBox.style.height = '88vh';
  modalBox.style.display = 'flex';
  modalBox.style.flexDirection = 'column';
  modalBox.style.overflow = 'hidden';
  modalBox.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.35)';

  const topBar = document.createElement('div');
  topBar.style.backgroundColor = '#064e3b';
  topBar.style.color = '#ffffff';
  topBar.style.padding = '10px 16px';
  topBar.style.display = 'flex';
  topBar.style.justifyContent = 'space-between';
  topBar.style.alignItems = 'center';
  topBar.style.flexWrap = 'wrap';
  topBar.style.gap = '8px';
  topBar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 16px;">📄</span>
      <span style="font-weight: 800; font-size: 13px;">${title} — अधिकृत PDF अहवाल</span>
    </div>
    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
      <button id="yd-modal-print-btn" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 11px; cursor: pointer;">
        🖨️ प्रिंट (Print PDF)
      </button>
      <button id="yd-modal-download-btn" style="background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 11px; cursor: pointer;">
        📥 डाउनलोड (Download)
      </button>
      <button id="yd-modal-close-btn" style="background: #334155; color: white; border: none; padding: 6px 10px; border-radius: 8px; font-weight: bold; font-size: 11px; cursor: pointer;">
        ✕ बंद करा
      </button>
    </div>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.flex = '1';
  iframe.style.width = '100%';
  iframe.style.border = 'none';
  iframe.src = blobUrl;

  modalBox.appendChild(topBar);
  modalBox.appendChild(iframe);
  modalContainer.appendChild(modalBox);
  document.body.appendChild(modalContainer);

  const printBtn = modalContainer.querySelector('#yd-modal-print-btn');
  const downloadBtn = modalContainer.querySelector('#yd-modal-download-btn');
  const closeBtn = modalContainer.querySelector('#yd-modal-close-btn');

  printBtn?.addEventListener('click', () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      window.print();
    }
  });

  downloadBtn?.addEventListener('click', () => {
    try {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = cleanFilename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 200);
    } catch (e) {
      iframe.contentWindow?.print();
    }
  });

  closeBtn?.addEventListener('click', () => {
    modalContainer.remove();
  });
};

/**
 * Universal CSV Export with UTF-8 BOM
 */
export const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  let csvContent = '\uFEFF'; // UTF-8 BOM
  csvContent += headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\r\n';

  rows.forEach(row => {
    csvContent += row.map(val => {
      const strVal = val === null || val === undefined ? '' : String(val);
      return `"${strVal.replace(/"/g, '""')}"`;
    }).join(',') + '\r\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
