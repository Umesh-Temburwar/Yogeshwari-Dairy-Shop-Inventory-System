import React, { TableHTMLAttributes } from 'react';

export interface DataTableProps extends TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  className = '',
  containerClassName = '',
  children,
  ...props
}) => {
  return (
    <div className={`rounded-2xl bg-surface shadow-card border border-line/40 overflow-hidden ${containerClassName}`}>
      <div className="overflow-x-auto">
        <table className={`w-full text-left text-sm ${className}`} {...props}>
          {children}
        </table>
      </div>
    </div>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <thead className={`bg-surface-2/60 text-xs font-medium text-ink-3 border-b border-line/50 select-none ${className}`} {...props}>
    {children}
  </thead>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <tr className={`border-b border-line/30 transition-colors hover:bg-surface-2/40 ${className}`} {...props}>
    {children}
  </tr>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <th className={`h-10 px-4 text-left text-xs font-medium text-ink-3 ${className}`} {...props}>
    {children}
  </th>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <tbody className={`divide-y divide-line/20 text-ink ${className}`} {...props}>
    {children}
  </tbody>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <td className={`h-12 px-4 text-sm tabular-nums text-ink ${className}`} {...props}>
    {children}
  </td>
);

export default DataTable;
