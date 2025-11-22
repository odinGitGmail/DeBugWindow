import { VariableParser } from './VariableParser';
import { ParseResult } from '../types';

/**
 * C# 变量解析器
 */
export class CSharpParser extends VariableParser {
    /**
     * 解析变量值
     * @param value 变量值
     * @param valueType 值类型
     * @returns 解析结果
     */
    parse(value: any, valueType?: string): ParseResult {
        try {
            // 处理字符串（可能是 JSON 或 JSON 数组）
            if (typeof value === 'string') {
                const jsonValue = this.tryParseJson(value);
                if (jsonValue !== null) {
                    // 如果解析成功，递归解析 JSON 对象
                    const parseResult = this.parse(jsonValue, 'object');
                    if (parseResult.success) {
                        return parseResult;
                    }
                }
                // 如果不是 JSON，返回普通字符串
                return {
                    success: true,
                    data: {
                        columns: ['值'],
                        rows: [[value]],
                        totalRows: 1
                    },
                    rawValue: value,
                    valueType: 'string'
                };
            }

            // 处理 DataTable（C# 特定）
            // 注意：如果 value 已经是对象数组（从 parseVariable 中解析后的），直接处理为数组
            if (valueType?.includes('DataTable') && !Array.isArray(value) && typeof value !== 'object') {
                // 只有在 value 不是数组且不是对象时才尝试 parseDataTable
                return this.parseDataTable(value);
            }
            
            // 如果 valueType 是 DataTable 但 value 已经是对象数组，说明已经在 parseVariable 中处理过了
            if (valueType?.includes('DataTable') && Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                // 直接转换为表格数据
                const firstRow = value[0];
                const columns = Object.keys(firstRow);
                const rows = value.map((row: any) => columns.map(col => this.formatValue(row[col])));
                return {
                    success: true,
                    data: {
                        columns,
                        rows,
                        totalRows: value.length
                    },
                    rawValue: value,
                    valueType: 'DataTable'
                };
            }

            // 处理 List<T> 或数组
            if (Array.isArray(value) || valueType?.includes('List') || valueType?.includes('Array')) {
                return {
                    success: true,
                    data: this.arrayToTable(value),
                    rawValue: value,
                    valueType: 'List/Array'
                };
            }

            // 处理 Dictionary<TKey, TValue>
            if (valueType?.includes('Dictionary') || this.isDictionary(value)) {
                return this.parseDictionary(value);
            }

            // 处理对象
            if (typeof value === 'object' && value !== null) {
                return {
                    success: true,
                    data: this.objectToTable(value),
                    rawValue: value,
                    valueType: 'object'
                };
            }

            // 处理基本类型
            return {
                success: true,
                data: {
                    columns: ['值'],
                    rows: [[this.formatValue(value)]],
                    totalRows: 1
                },
                rawValue: value,
                valueType: typeof value
            };
        } catch (error: any) {
            return {
                success: false,
                error: `解析失败: ${error?.message || String(error)}`
            };
        }
    }

    /**
     * 检查是否支持该类型
     * @param valueType 值类型
     * @returns 是否支持
     */
    supports(valueType: string): boolean {
        return valueType?.includes('DataTable') ||
               valueType?.includes('List') ||
               valueType?.includes('Dictionary') ||
               valueType?.includes('Array') ||
               true; // 也支持基本类型
    }

    /**
     * 检查是否是 DataTable
     * @param value 值
     * @returns 是否是 DataTable
     */
    private isDataTable(value: any): boolean {
        if (typeof value === 'object' && value !== null) {
            // DataTable 通常有 Rows 和 Columns 属性
            return (value.Rows !== undefined || value.rows !== undefined) &&
                   (value.Columns !== undefined || value.columns !== undefined);
        }
        return false;
    }

    /**
     * 解析 DataTable
     * @param value DataTable 值
     * @returns 解析结果
     */
    private parseDataTable(value: any): ParseResult {
        try {
            // 尝试获取 Rows 和 Columns
            const rows = value.Rows || value.rows || [];
            const columns = value.Columns || value.columns || [];

            if (Array.isArray(rows) && rows.length > 0) {
                // 从第一行获取列名
                const firstRow = rows[0];
                const columnNames = columns.length > 0 
                    ? columns.map((col: any) => col.ColumnName || col.columnName || col)
                    : Object.keys(firstRow);

                const tableRows = rows.map((row: any) => {
                    return columnNames.map((colName: string) => {
                        const cellValue = row[colName] || row[colName.toLowerCase()];
                        return this.formatValue(cellValue);
                    });
                });

                return {
                    success: true,
                    data: {
                        columns: columnNames,
                        rows: tableRows,
                        totalRows: rows.length
                    },
                    rawValue: value,
                    valueType: 'DataTable'
                };
            }

            return {
                success: false,
                error: 'DataTable 为空或格式不正确'
            };
        } catch (error: any) {
            return {
                success: false,
                error: `解析 DataTable 失败: ${error?.message || String(error)}`
            };
        }
    }

    /**
     * 检查是否是 Dictionary
     * @param value 值
     * @returns 是否是 Dictionary
     */
    private isDictionary(value: any): boolean {
        if (typeof value === 'object' && value !== null) {
            // Dictionary 通常是键值对对象
            return !Array.isArray(value);
        }
        return false;
    }

    /**
     * 解析 Dictionary
     * @param value Dictionary 值
     * @returns 解析结果
     */
    private parseDictionary(value: any): ParseResult {
        try {
            const keys = Object.keys(value);
            const rows = keys.map(key => [key, this.formatValue(value[key])]);

            return {
                success: true,
                data: {
                    columns: ['键', '值'],
                    rows,
                    totalRows: keys.length
                },
                rawValue: value,
                valueType: 'Dictionary'
            };
        } catch (error: any) {
            return {
                success: false,
                error: `解析 Dictionary 失败: ${error?.message || String(error)}`
            };
        }
    }
}

