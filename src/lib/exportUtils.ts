/**
 * YOGESHWARI DAIRY SHOP - COMPREHENSIVE PDF & CSV EXPORT UTILITY
 * Supports 100% Devanagari (Marathi/Hindi) font fidelity, High-Resolution A4 Layout,
 * Professional Dairy ERP Header, KPI Summary Cards, and Print-to-PDF generation.
 */

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
}

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
          button {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="report-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="/YDO_logo.jpg" alt="Logo" style="width: 48px; height: 48px; border-radius: 10px; object-fit: contain; border: 1px solid #cbd5e1; background: #ffffff; padding: 2px;" />
          <div>
            <div class="brand-title">योगेश्वरी डेअरी &उत्पादन</div>
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
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  // Print using hidden iframe for clean instant PDF download
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';

  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
  if (frameDoc) {
    frameDoc.open();
    frameDoc.write(htmlContent);
    frameDoc.close();

    // Remove frame after printing
    setTimeout(() => {
      try {
        document.body.removeChild(printFrame);
      } catch (e) { }
    }, 2000);
  }
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
