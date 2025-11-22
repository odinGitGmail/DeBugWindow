import { TableData } from '../types';

/**
 * 表格导出工具类
 */
export class TableExporter {
    /**
     * 导出为 CSV 格式
     * @param tableData 表格数据
     * @param filename 文件名（不含扩展名）
     * @returns CSV 内容
     */
    public static exportToCsv(tableData: TableData, filename: string = '变量数据'): string {
        let csv = tableData.columns.join(',') + '\n';
        
        tableData.rows.forEach(row => {
            csv += row.map(cell => {
                const str = String(cell);
                // 处理包含逗号、引号或换行符的值
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
            }).join(',') + '\n';
        });

        return csv;
    }

    /**
     * 导出为 Excel 格式（使用制表符分隔，Excel 可以打开）
     * @param tableData 表格数据
     * @param filename 文件名（不含扩展名）
     * @returns Excel 内容（制表符分隔）
     */
    public static exportToExcel(tableData: TableData, filename: string = '变量数据'): string {
        // Excel 格式需要 BOM 来支持中文
        const BOM = '\uFEFF';
        let content = BOM + tableData.columns.join('\t') + '\n';
        
        tableData.rows.forEach(row => {
            content += row.map(cell => {
                // 将制表符替换为空格，避免格式混乱
                return String(cell).replace(/\t/g, ' ').replace(/\n/g, ' ');
            }).join('\t') + '\n';
        });

        return content;
    }

    // 注意：downloadFile 方法应该在 Webview 的 JavaScript 中实现，而不是在扩展端
    // 因为扩展端没有 DOM API
}

