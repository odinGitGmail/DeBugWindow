/**
 * 项目类型枚举
 */
export enum ProjectType {
    Unknown = 'unknown',
    CSharp = 'csharp',
    Vue = 'vue',
    JavaScript = 'javascript',
    TypeScript = 'typescript',
    Python = 'python',
    Java = 'java',
    Go = 'go',
    Rust = 'rust'
}

/**
 * 表格数据结构
 */
export interface TableData {
    columns: string[];
    rows: any[][];
    totalRows: number;
}

/**
 * 变量解析结果
 */
export interface ParseResult {
    success: boolean;
    data?: TableData;
    error?: string;
    rawValue?: any;
    valueType?: string;
}

/**
 * Webview 消息类型
 */
export enum MessageType {
    Update = 'update',
    Table = 'table',
    Command = 'command',
    Clear = 'clear'
}

/**
 * Webview 消息
 */
export interface WebviewMessage {
    type: MessageType;
    messages?: string[];
    isDebugPaused?: boolean;
    projectType?: string;
    tableData?: TableData;
    command?: string;
}



