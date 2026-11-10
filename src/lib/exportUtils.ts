/**
 * Utility to export datasets to CSV with UTF-8 BOM so Marathi and Hindi characters 
 * render cleanly in Microsoft Excel and Google Sheets.
 */

export const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  // \uFEFF is UTF-8 Byte Order Mark for Excel Unicode support
  let csvContent = '\uFEFF';
  
  // Add headers
  csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n';

  // Add rows
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

