import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import LoadingSpinner from "@/components/ui/loading-spinner";
import EmptyState from "@/components/ui/empty-state";
import TruncatedCellText from "@/components/admin-dashboard/TruncatedCellText";

export interface TableColumn {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface TableAction {
  label: string;
  onClick: (row: any) => void;
  variant?: "default" | "destructive" | "secondary";
  separator?: boolean;
  condition?: (row: any) => boolean;
}

interface AdminTableProps {
  data: any[];
  columns: TableColumn[];
  actions?: TableAction[];
  isLoading?: boolean;
  emptyMessage?: string;
  onSort?: (column: string, direction: "asc" | "desc") => void;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
}

const AdminTable: React.FC<AdminTableProps> = ({
  data,
  columns,
  actions,
  isLoading = false,
  emptyMessage = "No data found",
  onSort,
  sortColumn,
  sortDirection
}) => {
  const handleSort = (column: string) => {
    if (!onSort) return;
    const newDirection = sortColumn === column && sortDirection === "asc" ? "desc" : "asc";
    onSort(column, newDirection);
  };

  const renderCellContent = (column: TableColumn, row: any) => {
    const value = row[column.key];
    
    if (column.render) {
      return column.render(value, row);
    }

    if (typeof value === "string" || typeof value === "number") {
      return <TruncatedCellText text={value} maxChars={32} className="max-w-[220px]" />;
    }

    return value ?? "-";
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-full overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
            <Table className="table-fixed" style={{ minWidth: '1000px', width: '100%' }}>
              <TableHeader className="bg-brand-light-green/20">
                <TableRow>
                  {columns.map((column) => (
                    <TableHead 
                      key={column.key} 
                      className={`h-12 px-4 text-brand-dark-green font-semibold ${column.width || ""}`}
                    >
                      {column.label}
                    </TableHead>
                  ))}
                  {actions && <TableHead className="w-[80px] text-brand-dark-green font-semibold">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i} className="hover:bg-brand-light-green/5">
                    {columns.map((column) => (
                      <TableCell key={column.key} className="h-16 px-4">
                        <div className="animate-pulse bg-muted/60 rounded-md h-4 w-3/4"></div>
                      </TableCell>
                    ))}
                    {actions && (
                      <TableCell className="h-16 px-4">
                        <div className="animate-pulse bg-muted/60 rounded-full h-8 w-8"></div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="py-8">
            <LoadingSpinner size="md" label="Loading data..." />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-full overflow-hidden shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="min-w-full inline-block">
            <Table className="table-fixed" style={{ minWidth: '1000px', width: '100%' }}>
            <TableHeader className="bg-brand-light-green/20">
              <TableRow className="hover:bg-brand-light-green/30">
                {columns.map((column) => (
                  <TableHead 
                    key={column.key} 
                    className={`h-12 px-4 text-brand-dark-green font-semibold ${column.width || ""}`}
                  >
                    {column.sortable ? (
                      <Button
                        variant="ghost"
                        onClick={() => handleSort(column.key)}
                        className="h-auto p-0 font-semibold hover:bg-transparent hover:text-brand-dark-green text-brand-dark-green"
                      >
                        {column.label}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      column.label
                    )}
                  </TableHead>
                ))}
                {actions && <TableHead className="w-[80px] text-brand-dark-green font-semibold">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="p-0">
                    <EmptyState 
                      title="No Data Found"
                      description={emptyMessage}
                      icon="database"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => (
                  <TableRow 
                    key={row.id || index} 
                    className="hover:bg-brand-light-green/10 transition-colors"
                  >
                    {columns.map((column) => (
                      <TableCell key={column.key} className="px-4 py-3">
                        {renderCellContent(column, row)}
                      </TableCell>
                    ))}
                    {actions && (
                      <TableCell className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-brand-light-green/20">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {actions.map((action, actionIndex) => {
                              if (action.condition && !action.condition(row)) {
                                return null;
                              }
                              return (
                              <React.Fragment key={actionIndex}>
                                {action.separator && <DropdownMenuSeparator />}
                                <DropdownMenuItem
                                  onClick={() => action.onClick(row)}
                                  className={
                                    action.variant === "destructive" ? "text-destructive" :
                                    action.variant === "secondary" ? "text-muted-foreground" :
                                    "text-foreground"
                                  }
                                >
                                  {action.label}
                                </DropdownMenuItem>
                              </React.Fragment>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminTable;
