import { ParseResult, TableData } from '../types';

/**
 * 变量解析器基类
 */
export abstract class VariableParser {
    /**
     * 解析变量值
     * @param value 变量值（从调试 API 获取）
     * @param valueType 值类型
     * @returns 解析结果
     */
    abstract parse(value: any, valueType?: string): ParseResult;

    /**
     * 检查是否支持该类型
     * @param valueType 值类型
     * @returns 是否支持
     */
    abstract supports(valueType: string): boolean;

    /**
     * 将对象转换为表格数据
     * @param obj 对象
     * @returns 表格数据
     */
    protected objectToTable(obj: any): TableData {
        if (!obj || typeof obj !== 'object') {
            return { columns: [], rows: [], totalRows: 0 };
        }

        // 如果是数组
        if (Array.isArray(obj)) {
            return this.arrayToTable(obj);
        }

        // 如果是对象
        const columns = Object.keys(obj);
        const rows: any[][] = [columns.map(key => obj[key])];
        
        return {
            columns,
            rows,
            totalRows: 1
        };
    }

    /**
     * 将数组转换为表格数据
     * @param arr 数组
     * @returns 表格数据
     */
    protected arrayToTable(arr: any[]): TableData {
        if (!Array.isArray(arr) || arr.length === 0) {
            return { columns: [], rows: [], totalRows: 0 };
        }

        // 获取所有可能的列（从第一个元素推断）
        const firstItem = arr[0];
        let columns: string[] = [];

        if (typeof firstItem === 'object' && firstItem !== null) {
            // 对象数组
            columns = Object.keys(firstItem);
            const rows = arr.map(item => {
                return columns.map(col => {
                    const value = item[col];
                    return this.formatValue(value);
                });
            });
            return {
                columns,
                rows,
                totalRows: arr.length
            };
        } else {
            // 简单值数组
            columns = ['索引', '值'];
            const rows = arr.map((item, index) => [index, this.formatValue(item)]);
            return {
                columns,
                rows,
                totalRows: arr.length
            };
        }
    }

    /**
     * 格式化值用于显示
     * @param value 值
     * @returns 格式化后的字符串
     */
    protected formatValue(value: any): string {
        if (value === null) {
            return 'null';
        }
        if (value === undefined) {
            return 'undefined';
        }
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value, null, 2);
            } catch {
                return String(value);
            }
        }
        return String(value);
    }

    /**
     * 尝试解析 JSON 字符串
     * @param str 字符串
     * @returns 解析后的对象或 null
     */
    protected tryParseJson(str: string): any {
        if (!str || typeof str !== 'string') {
            return null;
        }

        // 处理双重转义的 JSON 字符串（如调试器返回的转义字符串）
        let cleanedStr = str.trim();
        
        // 如果字符串以引号开始和结束，去掉外层引号
        if ((cleanedStr.startsWith('"') && cleanedStr.endsWith('"')) ||
            (cleanedStr.startsWith("'") && cleanedStr.endsWith("'"))) {
            cleanedStr = cleanedStr.slice(1, -1);
        }
        
        // 尝试解析 JSON
        try {
            const parsed = JSON.parse(cleanedStr);
            return parsed;
        } catch {
            // 如果第一次解析失败，尝试再次解析（处理双重转义）
            try {
                const doubleParsed = JSON.parse(JSON.parse(cleanedStr));
                return doubleParsed;
            } catch {
                // 如果还是失败，尝试直接解析原始字符串（可能是已经解析过的）
                try {
                    // 检查是否是 JSON 数组或对象的字符串表示
                    if (cleanedStr.startsWith('[') || cleanedStr.startsWith('{')) {
                        return JSON.parse(cleanedStr);
                    }
                } catch {
                    return null;
                }
                return null;
            }
        }
    }
}

