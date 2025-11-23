import { supabase } from './supabase'
import { VersionId } from '../types'

/**
 * Log a change to the change_log table
 */
export async function logChange(
  version: VersionId,
  tableName: string,
  recordId: string,
  fieldName: string | null,
  oldValue: any,
  newValue: any,
  changedBy: string
): Promise<void> {
  try {
    const oldValueStr = oldValue === null || oldValue === undefined ? null : JSON.stringify(oldValue)
    const newValueStr = newValue === null || newValue === undefined ? null : JSON.stringify(newValue)

    await supabase.from('change_log').insert({
      version,
      table_name: tableName,
      record_id: recordId,
      field_name: fieldName,
      old_value: oldValueStr,
      new_value: newValueStr,
      changed_by: changedBy,
    })
  } catch (error) {
    console.error('Error logging change:', error)
    // Don't throw - logging failures shouldn't break the app
  }
}

/**
 * Log multiple field changes for a single record
 */
export async function logRecordChanges(
  version: VersionId,
  tableName: string,
  recordId: string,
  changes: { field: string; oldValue: any; newValue: any }[],
  changedBy: string
): Promise<void> {
  try {
    const logEntries = changes.map(({ field, oldValue, newValue }) => ({
      version,
      table_name: tableName,
      record_id: recordId,
      field_name: field,
      old_value: oldValue === null || oldValue === undefined ? null : JSON.stringify(oldValue),
      new_value: newValue === null || newValue === undefined ? null : JSON.stringify(newValue),
      changed_by: changedBy,
    }))

    await supabase.from('change_log').insert(logEntries)
  } catch (error) {
    console.error('Error logging record changes:', error)
  }
}

/**
 * Get the current user name from localStorage or return 'Unknown'
 */
export function getCurrentUserName(): string {
  return localStorage.getItem('current_user_name') || 'Unknown'
}

/**
 * Set the current user name
 */
export function setCurrentUserName(userName: string): void {
  localStorage.setItem('current_user_name', userName)
}

