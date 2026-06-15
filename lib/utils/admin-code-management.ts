import { supabase } from '@/lib/supabase/client';
import type { HealthCode, HealthCodeType } from './code-validation';

export interface CodeFilters {
  type?: HealthCodeType;
  active?: boolean;
}

/**
 * Gets all health codes with optional filters (admin only)
 * @param filters - Optional filters for code type and active status
 * @returns Promise<HealthCode[]> - Array of health codes
 */
export async function getAllCodes(
  filters?: CodeFilters
): Promise<HealthCode[]> {
  try {
    let query = (supabase as any)
      .from('health_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.type) {
      query = query.eq('code_type', filters.type);
    }

    if (filters?.active !== undefined) {
      query = query.eq('is_active', filters.active);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching health codes:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching health codes:', error);
    throw error;
  }
}

export interface CreateCodeInput {
  code: string;
  type: HealthCodeType;
  description?: string;
}

/**
 * Creates a new health code (admin only)
 * @param input - Code data to create
 * @returns Promise<HealthCode> - The created health code
 */
export async function createCode(
  input: CreateCodeInput
): Promise<HealthCode> {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Normalize code to uppercase
    const normalizedCode = input.code.trim().toUpperCase();

    const { data, error } = await (supabase as any)
      .from('health_codes')
      .insert({
        code: normalizedCode,
        code_type: input.type,
        description: input.description?.trim() || null,
        created_by: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating health code:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Exception creating health code:', error);
    throw error;
  }
}

export type BulkCreateCodeResult = {
  succeeded: HealthCode[];
  failed: { code: string; message: string }[];
};

/**
 * Creates many health codes in sequence (admin only).
 * Uses one insert per code so duplicates or DB errors do not block the rest.
 */
export async function createCodesBulk(
  inputs: CreateCodeInput[]
): Promise<BulkCreateCodeResult> {
  const succeeded: HealthCode[] = [];
  const failed: { code: string; message: string }[] = [];

  for (const input of inputs) {
    try {
      const row = await createCode(input);
      succeeded.push(row);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to create code';
      failed.push({
        code: input.code.trim().toUpperCase() || input.code,
        message,
      });
    }
  }

  return { succeeded, failed };
}

export interface UpdateCodeInput {
  code?: string;
  type?: HealthCodeType;
  description?: string;
  is_active?: boolean;
}

/**
 * Updates an existing health code (admin only)
 * @param id - The ID of the code to update
 * @param updates - Fields to update
 * @returns Promise<HealthCode> - The updated health code
 */
export async function updateCode(
  id: string,
  updates: UpdateCodeInput
): Promise<HealthCode> {
  try {
    const updateData: any = {};

    if (updates.code !== undefined) {
      updateData.code = updates.code.trim().toUpperCase();
    }
    if (updates.type !== undefined) {
      updateData.code_type = updates.type;
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description.trim() || null;
    }
    if (updates.is_active !== undefined) {
      updateData.is_active = updates.is_active;
    }

    const { data, error } = await (supabase as any)
      .from('health_codes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating health code:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Exception updating health code:', error);
    throw error;
  }
}

/**
 * Deletes a health code (admin only)
 * Uses soft delete by default (sets is_active = false)
 * @param id - The ID of the code to delete
 * @param hardDelete - If true, permanently deletes the code. Default is false (soft delete)
 * @returns Promise<void>
 */
export async function deleteCode(
  id: string,
  hardDelete: boolean = false
): Promise<void> {
  try {
    if (hardDelete) {
      // Hard delete
      const { error } = await (supabase as any)
        .from('health_codes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting health code:', error);
        throw error;
      }
    } else {
      // Soft delete
      const { error } = await (supabase as any)
        .from('health_codes')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error soft deleting health code:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Exception deleting health code:', error);
    throw error;
  }
}
