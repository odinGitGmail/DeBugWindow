import { VariableParser } from './VariableParser';
import { ParseResult } from '../types';

/**
 * JavaScript/TypeScript 变量解析器
 */
export class JavaScriptParser extends VariableParser {
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
                    // 如果解析成功，递归解析 JSON 对象或数组
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

            // 处理数组
            if (Array.isArray(value)) {
                return {
                    success: true,
                    data: this.arrayToTable(value),
                    rawValue: value,
                    valueType: 'array'
                };
            }

            // 处理对象
            if (typeof value === 'object' && value !== null) {
                // 检查是否是类数组对象（如 NodeList）
                if (value.length !== undefined && typeof value.length === 'number') {
                    const arr = Array.from(value);
                    return {
                        success: true,
                        data: this.arrayToTable(arr),
                        rawValue: value,
                        valueType: 'array-like'
                    };
                }

                // 普通对象
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
        // JavaScript 解析器支持所有类型（作为后备）
        return true;
    }
}

