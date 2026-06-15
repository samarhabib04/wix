'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, Save, X, Filter, ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  getAllCodes,
  createCode,
  createCodesBulk,
  updateCode,
  deleteCode,
  type CodeFilters,
} from '@/lib/utils/admin-code-management';
import type { HealthCode, HealthCodeType } from '@/lib/utils/code-validation';
import { fetchHealthCodeUsages, type HealthCodeUsageInfo } from '@/lib/utils/health-code-lock';
import TruncatedCellText from '@/components/admin-dashboard/TruncatedCellText';

export default function AdminCodeManagementPage() {
  const { toast } = useToast();
  const [codes, setCodes] = useState<HealthCode[]>([]);
  const [usagesByCode, setUsagesByCode] = useState<Map<string, HealthCodeUsageInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<HealthCodeType | 'all'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<HealthCode | null>(null);
  const [deleteCodeItem, setDeleteCodeItem] = useState<HealthCode | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    code_type: 'H1' as HealthCodeType,
    description: '',
  });

  const [bulkForm, setBulkForm] = useState({
    code_type: 'H1' as HealthCodeType,
    description: '',
    lines: '',
  });
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkSource, setBulkSource] = useState<'lines' | 'csv'>('lines');
  const [bulkPreviewRows, setBulkPreviewRows] = useState<
    {
      rowNumber: number;
      code: string;
      type: HealthCodeType;
      description?: string;
      valid: boolean;
      error?: string;
    }[]
  >([]);

  const fetchCodes = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters: CodeFilters = {};
      
      if (filterType !== 'all') {
        filters.type = filterType;
      }

      const data = await getAllCodes(filters);
      const usages = await fetchHealthCodeUsages();
      const usageMap = new Map(usages.map((u) => [u.code, u]));
      setUsagesByCode(usageMap);
      
      // Apply client-side search filter
      let filteredData = data;
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filteredData = data.filter(
          (code) =>
            code.code.toLowerCase().includes(searchLower) ||
            (code.description &&
              code.description.toLowerCase().includes(searchLower))
        );
      }

      setCodes(filteredData);
    } catch (error: any) {
      console.error('Error fetching codes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fetch codes',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filterType, searchTerm, toast]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleOpenDialog = (code?: HealthCode) => {
    if (code) {
      setEditingCode(code);
      setFormData({
        code: code.code,
        code_type: code.code_type,
        description: code.description || '',
      });
    } else {
      setEditingCode(null);
      setFormData({
        code: '',
        code_type: 'H1',
        description: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCode(null);
    setFormData({
      code: '',
      code_type: 'H1',
      description: '',
    });
  };

  const handleCloseBulkDialog = () => {
    setIsBulkDialogOpen(false);
    setBulkForm({ code_type: 'H1', description: '', lines: '' });
    setBulkSource('lines');
    setBulkPreviewRows([]);
  };

  const parseCsvLine = (line: string): string[] => {
    const out: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    out.push(current);
    return out.map((v) => v.trim());
  };

  const parseBulkLines = useCallback(() => {
    const codeRegex = /^[A-Z0-9]{12}$/;
    const raw = bulkForm.lines
      .split(/\r?\n/)
      .map((l) => l.trim().toUpperCase())
      .filter(Boolean);
    const seen = new Set<string>();
    return raw.map((code, idx) => {
      if (seen.has(code)) {
        return {
          rowNumber: idx + 1,
          code,
          type: bulkForm.code_type,
          description: bulkForm.description.trim() || undefined,
          valid: false,
          error: 'Duplicate code in input',
        };
      }
      seen.add(code);
      if (!codeRegex.test(code)) {
        return {
          rowNumber: idx + 1,
          code,
          type: bulkForm.code_type,
          description: bulkForm.description.trim() || undefined,
          valid: false,
          error: 'Must be exactly 12 alphanumeric characters',
        };
      }
      return {
        rowNumber: idx + 1,
        code,
        type: bulkForm.code_type,
        description: bulkForm.description.trim() || undefined,
        valid: true,
      };
    });
  }, [bulkForm.lines, bulkForm.code_type, bulkForm.description]);

  const handleCsvUpload = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Empty CSV',
        description: 'The uploaded CSV file has no rows.',
      });
      return;
    }

    const firstRow = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const hasHeader = firstRow.some((h) =>
      ['code', 'type', 'code_type', 'description'].includes(h)
    );

    const codeIndex = hasHeader ? firstRow.findIndex((h) => h === 'code') : 0;
    const typeIndex = hasHeader
      ? firstRow.findIndex((h) => h === 'type' || h === 'code_type')
      : -1;
    const descIndex = hasHeader ? firstRow.findIndex((h) => h === 'description') : -1;

    const bodyRows = hasHeader ? lines.slice(1) : lines;
    const codeRegex = /^[A-Z0-9]{12}$/;
    const seen = new Set<string>();

    const parsed = bodyRows.map((line, idx) => {
      const cols = parseCsvLine(line);
      const rawCode = (cols[codeIndex] || '').trim().toUpperCase();
      const rawType = (typeIndex >= 0 ? cols[typeIndex] : bulkForm.code_type) || bulkForm.code_type;
      const rawDesc = (descIndex >= 0 ? cols[descIndex] : bulkForm.description) || '';
      const normalizedType = String(rawType).trim().toUpperCase() as HealthCodeType;
      const rowNumber = hasHeader ? idx + 2 : idx + 1;

      if (!rawCode) {
        return {
          rowNumber,
          code: '',
          type: bulkForm.code_type,
          description: rawDesc.trim() || undefined,
          valid: false,
          error: 'Missing code',
        };
      }
      if (!['H1', 'V1', 'V2'].includes(normalizedType)) {
        return {
          rowNumber,
          code: rawCode,
          type: bulkForm.code_type,
          description: rawDesc.trim() || undefined,
          valid: false,
          error: 'Type must be H1, V1, or V2',
        };
      }
      if (seen.has(rawCode)) {
        return {
          rowNumber,
          code: rawCode,
          type: normalizedType,
          description: rawDesc.trim() || undefined,
          valid: false,
          error: 'Duplicate code in file',
        };
      }
      seen.add(rawCode);
      if (!codeRegex.test(rawCode)) {
        return {
          rowNumber,
          code: rawCode,
          type: normalizedType,
          description: rawDesc.trim() || undefined,
          valid: false,
          error: 'Must be exactly 12 alphanumeric characters',
        };
      }
      return {
        rowNumber,
        code: rawCode,
        type: normalizedType,
        description: rawDesc.trim() || undefined,
        valid: true,
      };
    });

    setBulkSource('csv');
    setBulkPreviewRows(parsed);
    toast({
      title: 'CSV parsed',
      description: `Loaded ${parsed.length} row(s). ${parsed.filter((r) => r.valid).length} valid.`,
    });
  };

  const handleBulkSave = async () => {
    const preview = bulkSource === 'csv' ? bulkPreviewRows : parseBulkLines();
    if (preview.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nothing to add',
        description:
          bulkSource === 'csv'
            ? 'Upload a CSV with at least one row.'
            : 'Enter at least one code (one per line).',
      });
      return;
    }
    const validRows = preview.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No valid rows',
        description: 'Fix invalid rows in the preview, then try again.',
      });
      return;
    }
    const inputs = validRows.map((r) => ({
      code: r.code,
      type: r.type,
      description: r.description,
    }));

    try {
      setBulkSaving(true);
      const { succeeded, failed } = await createCodesBulk(inputs);

      if (succeeded.length > 0) {
        toast({
          title: 'Bulk add complete',
          description: `Created ${succeeded.length} code(s).${failed.length > 0 ? ` ${failed.length} failed.` : ''}`,
        });
      }
      if (failed.length > 0 && succeeded.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Bulk add failed',
          description: failed
            .slice(0, 5)
            .map((f) => `${f.code}: ${f.message}`)
            .join(' · '),
        });
      } else if (failed.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Some codes failed',
          description: failed
            .slice(0, 8)
            .map((f) => `${f.code}: ${f.message}`)
            .join(' · '),
        });
      }

      handleCloseBulkDialog();
      fetchCodes();
    } catch (error: unknown) {
      console.error('Bulk create error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Bulk add failed',
      });
    } finally {
      setBulkSaving(false);
    }
  };

  const handleSave = async () => {
    if (!formData.code.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Code is required',
      });
      return;
    }

    // Validate code format (12 characters, alphanumeric)
    const codeRegex = /^[A-Z0-9]{12}$/;
    const normalizedCode = formData.code.trim().toUpperCase();
    
    if (!codeRegex.test(normalizedCode)) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Code must be exactly 12 alphanumeric characters (e.g., RDS1V1123456)',
      });
      return;
    }

    try {
      setSaving(true);

      if (editingCode) {
        // Update existing code
        await updateCode(editingCode.id, {
          code: normalizedCode,
          type: formData.code_type,
          description: formData.description.trim() || undefined,
        });

        toast({
          title: 'Success',
          description: 'Code updated successfully',
        });
      } else {
        // Create new code
        await createCode({
          code: normalizedCode,
          type: formData.code_type,
          description: formData.description.trim() || undefined,
        });

        toast({
          title: 'Success',
          description: 'Code created successfully',
        });
      }

      handleCloseDialog();
      fetchCodes();
    } catch (error: any) {
      console.error('Error saving code:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error.message || 'Failed to save code. Code may already exist.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (code: HealthCode) => {
    setDeleteCodeItem(code);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCodeItem) return;

    try {
      await deleteCode(deleteCodeItem.id, true); // Hard delete - permanently remove from table
      toast({
        title: 'Success',
        description: 'Code permanently deleted',
      });
      setIsDeleteDialogOpen(false);
      setDeleteCodeItem(null);
      fetchCodes();
    } catch (error: any) {
      console.error('Error deleting code:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete code',
      });
    }
  };

  const getCodeTypeBadgeColor = (type: HealthCodeType) => {
    switch (type) {
      case 'H1':
        return 'bg-blue-100 text-blue-800';
      case 'V1':
        return 'bg-green-100 text-green-800';
      case 'V2':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-dark-green">
            Code Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage H1, V1, and V2 health codes for listings
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsBulkDialogOpen(true)}>
            <ListPlus className="mr-2 h-4 w-4" />
            Bulk add codes
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Code
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={filterType}
          onValueChange={(value) => setFilterType(value as HealthCodeType | 'all')}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="H1">H1</SelectItem>
            <SelectItem value="V1">V1</SelectItem>
            <SelectItem value="V2">V2</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading codes...</div>
        ) : codes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm || filterType !== 'all'
              ? 'No codes found matching your filters'
              : 'No codes found. Use Add Code or Bulk add codes.'}
          </div>
        ) : (
          <Table className="table-fixed min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((code) => {
                const usage = usagesByCode.get(code.code);
                return (
                <TableRow key={code.id}>
                  <TableCell className="font-mono font-medium">
                    <TruncatedCellText text={code.code} maxChars={14} className="max-w-[120px]" />
                  </TableCell>
                  <TableCell>
                    <Badge className={getCodeTypeBadgeColor(code.code_type)}>
                      {code.code_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {code.description ? (
                      <TruncatedCellText text={code.description} maxChars={40} className="max-w-[280px]" />
                    ) : (
                      <span className="text-gray-400">No description</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(code.is_active)}</TableCell>
                  <TableCell>
                    {usage ? (
                      <div className="text-xs space-y-0.5">
                        <Badge className="bg-amber-100 text-amber-900">In use</Badge>
                        <p className="text-muted-foreground truncate max-w-[200px]" title={usage.listing_title ?? undefined}>
                          {usage.listing_type === 'sale' ? 'Sale' : 'Stud'}: {usage.listing_title ?? usage.listing_id.slice(0, 8)}
                        </p>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        Available
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(code.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(code)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(code)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCode ? 'Edit Code' : 'Add New Code'}
            </DialogTitle>
            <DialogDescription>
              {editingCode
                ? 'Update the health code information'
                : 'Enter a new health code that can be used in listings'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                placeholder="e.g., RDS1V1123456"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                maxLength={12}
                className="font-mono"
              />
              <p className="text-xs text-gray-500">
                12 alphanumeric characters (automatically converted to uppercase)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="code_type">Code Type *</Label>
              <Select
                value={formData.code_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, code_type: value as HealthCodeType })
                }
              >
                <SelectTrigger id="code_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="H1">H1 - Health Certificate</SelectItem>
                  <SelectItem value="V1">V1 - Vaccination Stage 1</SelectItem>
                  <SelectItem value="V2">V2 - Vaccination Stage 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Optional notes about this code..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : editingCode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk add dialog */}
      <Dialog
        open={isBulkDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseBulkDialog();
          else setIsBulkDialogOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk add codes</DialogTitle>
            <DialogDescription>
              One health code per line (12 alphanumeric characters each). All lines use the same type and optional
              description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bulk_csv">Upload CSV (optional)</Label>
              <Input
                id="bulk_csv"
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    await handleCsvUpload(file);
                  } catch (err) {
                    console.error('CSV parse error:', err);
                    toast({
                      variant: 'destructive',
                      title: 'CSV parse failed',
                      description: 'Could not parse CSV. Please check the file format.',
                    });
                  } finally {
                    e.currentTarget.value = '';
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Supported columns: <code>code</code>, <code>type</code>, <code>description</code>.
                If no header is provided, first column is treated as code and the selected type is used.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk_code_type">Code type (all rows)</Label>
              <Select
                value={bulkForm.code_type}
                onValueChange={(value) =>
                  setBulkForm((b) => ({ ...b, code_type: value as HealthCodeType }))
                }
              >
                <SelectTrigger id="bulk_code_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="H1">H1 - Health Certificate</SelectItem>
                  <SelectItem value="V1">V1 - Vaccination Stage 1</SelectItem>
                  <SelectItem value="V2">V2 - Vaccination Stage 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk_description">Description (optional, applied to every new code)</Label>
              <Textarea
                id="bulk_description"
                placeholder="Optional notes shared by all codes in this batch…"
                value={bulkForm.description}
                onChange={(e) => setBulkForm((b) => ({ ...b, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk_lines">Codes (one per line)</Label>
              <Textarea
                id="bulk_lines"
                placeholder={'RDS1V1123456\nRDS1V1123457\nRDS1V1123458'}
                value={bulkForm.lines}
                onChange={(e) => {
                  setBulkSource('lines');
                  setBulkPreviewRows([]);
                  setBulkForm((b) => ({ ...b, lines: e.target.value }));
                }}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Blank lines ignored; duplicates in the list are added once. Existing codes in the database will fail for
                that row only.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Preview ({bulkSource === 'csv' ? 'from CSV' : 'from lines'})</Label>
              <div className="max-h-64 overflow-auto border rounded-md">
                <Table className="table-fixed min-w-[620px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="w-20">Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(bulkSource === 'csv' ? bulkPreviewRows : parseBulkLines())
                      .slice(0, 200)
                      .map((row) => (
                        <TableRow key={`${row.rowNumber}-${row.code}-${row.type}`}>
                          <TableCell>{row.rowNumber}</TableCell>
                          <TableCell className="font-mono">{row.code || '-'}</TableCell>
                          <TableCell>{row.type}</TableCell>
                          <TableCell>
                            {row.valid ? (
                              <Badge className="bg-green-100 text-green-800">Valid</Badge>
                            ) : (
                              <Badge variant="destructive">{row.error || 'Invalid'}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseBulkDialog} disabled={bulkSaving}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleBulkSave} disabled={bulkSaving}>
              <Save className="mr-2 h-4 w-4" />
              {bulkSaving ? 'Creating…' : 'Create all'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the code{' '}
              <strong className="font-mono">{deleteCodeItem?.code}</strong>? This
              action cannot be undone and the code will be completely removed from
              the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
