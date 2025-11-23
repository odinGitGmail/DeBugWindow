import * as vscode from 'vscode';
import { ProjectType } from '../types';
import { ProjectTypeDetector } from '../utils/ProjectTypeDetector';
import { JavaScriptParser } from '../parsers/JavaScriptParser';
import { CSharpParser } from '../parsers/CSharpParser';
import { VariableParser } from '../parsers/VariableParser';
import { TableData } from '../types';

/**
 * 调试窗口 Webview 视图提供者
 */
export class DebugWindowViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'debugWindow';

    private _view?: vscode.WebviewView;
    private _messages: string[] = [];
    private _isDebugPaused: boolean = false;
    private _currentProjectType: ProjectType = ProjectType.Unknown;
    private _currentTableData: TableData | null = null;
    private _variableParser: VariableParser | null = null;

    /**
     * 构造函数
     * @param _extensionUri 扩展 URI
     */
    constructor(private readonly _extensionUri: vscode.Uri) {}

    /**
     * 解析 Webview 视图
     * @param webviewView Webview 视图
     * @param context Webview 视图上下文
     * @param _token 取消令牌
     */
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        // 配置 Webview 选项
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        // 设置初始 HTML 内容
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // 处理来自 Webview 的消息
        webviewView.webview.onDidReceiveMessage(async (data) => {
            try {
                switch (data.type) {
                    case 'command':
                        await this.handleCommand(data.command);
                        break;
                    case 'clear':
                        this.clearMessages();
                        break;
                    case 'requestSuggestions':
                        await this.handleRequestSuggestions(data.query);
                        break;
                }
            } catch (error: any) {
                console.error('处理消息时出错:', error);
                const timestamp = new Date().toLocaleTimeString('zh-CN');
                this.addMessage(`[${timestamp}] 错误: ${error?.message || String(error)}`);
            }
        });

        // 当视图可见时，更新内容
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.updateWebview();
            }
        });

        // 初始化调试状态
        this.updateDebugState();
    }

    /**
     * 更新调试状态
     */
    public async updateDebugState(): Promise<void> {
        try {
            const debugSession = vscode.debug.activeDebugSession;
            const wasPaused = this._isDebugPaused;
            
            this._isDebugPaused = debugSession !== undefined;

            if (wasPaused !== this._isDebugPaused) {
                if (this._isDebugPaused) {
                    try {
                        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                        this._currentProjectType = await ProjectTypeDetector.detectProjectType(workspaceFolder);
                        this.addMessage(`[调试暂停] 检测到项目类型: ${ProjectTypeDetector.getProjectTypeName(this._currentProjectType)}`);
                    } catch (error: any) {
                        console.warn('检测项目类型失败:', error?.message);
                        this._currentProjectType = ProjectType.Unknown;
                    }
                }
                this.updateWebview();
            }
        } catch (error: any) {
            console.warn('更新调试状态时出错:', error?.message);
        }
    }

    /**
     * 设置调试暂停状态
     * @param isPaused 是否暂停
     * @param projectType 项目类型（可选）
     */
    public setDebugPaused(isPaused: boolean, projectType?: ProjectType): void {
        const wasPaused = this._isDebugPaused;
        this._isDebugPaused = isPaused;
        
        if (projectType !== undefined) {
            this._currentProjectType = projectType;
        }

        if (wasPaused !== isPaused) {
            if (isPaused) {
                this.addMessage(`[调试暂停] 检测到项目类型: ${ProjectTypeDetector.getProjectTypeName(this._currentProjectType)}`);
            }
            this.updateWebview();
        }
    }

    /**
     * 获取当前是否在调试暂停状态
     * @returns 是否暂停
     */
    public isDebugPaused(): boolean {
        return this._isDebugPaused;
    }

    /**
     * 添加消息
     * @param message 消息内容
     */
    public addMessage(message: string): void {
        this._messages.push(message);
        // 限制最多显示 1000 条消息
        if (this._messages.length > 1000) {
            this._messages = this._messages.slice(-1000);
        }
        this.updateWebview();
    }

    /**
     * 清空消息
     */
    public clearMessages(): void {
        this._messages = [];
        this._currentTableData = null;
        this.clearTable(); // 清空表格
        this.updateWebview();
    }

    /**
     * 处理命令
     * @param command 命令字符串
     */
    private async handleCommand(command: string): Promise<void> {
        if (!command || !command.trim()) {
            return;
        }

        const timestamp = new Date().toLocaleTimeString('zh-CN');
        const output = `[${timestamp}] > ${command}`;
        this.addMessage(output);

        // 处理内置命令
        if (command.trim() === 'help') {
            const helpText = `可用命令:
  help - 显示帮助信息
  clear - 清空消息
  time - 显示当前时间
  project - 显示项目类型

变量解析:
  直接输入变量名即可解析变量并显示为表格
  例如: myVariable, myList, myDataTable

当前项目类型: ${ProjectTypeDetector.getProjectTypeName(this._currentProjectType)}`;
            this.addMessage(`[${timestamp}] ${helpText}`);
            return;
        }

        if (command.trim() === 'time') {
            this.addMessage(`[${timestamp}] 当前时间: ${new Date().toLocaleString('zh-CN')}`);
            return;
        }

        if (command.trim() === 'project') {
            this.addMessage(`[${timestamp}] 项目类型: ${ProjectTypeDetector.getProjectTypeName(this._currentProjectType)}`);
            return;
        }

        if (command.trim() === 'clear') {
            this.clearMessages();
            return;
        }

        // 尝试作为变量名解析
        await this.parseVariable(command);
    }

    /**
     * 解析变量
     * @param variableName 变量名
     */
    private async parseVariable(variableName: string): Promise<void> {
        const timestamp = new Date().toLocaleTimeString('zh-CN');
        
        // 检查是否在调试暂停状态
        const debugSession = vscode.debug.activeDebugSession;
        if (!debugSession) {
            this.addMessage(`[${timestamp}] 错误: 没有活动的调试会话`);
            return;
        }

        try {
            // 获取当前堆栈帧（对于 C# 等语言，需要指定 frameId）
            let frameId: number | undefined = undefined;
            
            try {
                // 尝试获取线程和堆栈帧
                const threadsResponse = await debugSession.customRequest('threads', {}) as any;
                if (threadsResponse && threadsResponse.threads && threadsResponse.threads.length > 0) {
                    const thread = threadsResponse.threads[0];
                    const stackTrace = await debugSession.customRequest('stackTrace', {
                        threadId: thread.id
                    }) as any;
                    
                    if (stackTrace && stackTrace.stackFrames && stackTrace.stackFrames.length > 0) {
                        // 使用第一个堆栈帧（当前暂停的帧）
                        frameId = stackTrace.stackFrames[0].id;
                    }
                }
            } catch (frameError) {
                // 如果无法获取堆栈帧，继续尝试不使用 frameId
                console.warn('获取堆栈帧失败:', frameError);
            }

            // 尝试多种方式获取变量值
            let response: any = null;
            let lastError: any = null;

            // 方法1: 使用 frameId 和 watch 上下文（适用于 C#）
            if (frameId !== undefined) {
                try {
                    response = await debugSession.customRequest('evaluate', {
                        expression: variableName,
                        context: 'watch',
                        frameId: frameId
                    }) as any;
                } catch (error: any) {
                    lastError = error;
                }
            }

            // 方法2: 使用 frameId 和 repl 上下文
            if (!response && frameId !== undefined) {
                try {
                    response = await debugSession.customRequest('evaluate', {
                        expression: variableName,
                        context: 'repl',
                        frameId: frameId
                    }) as any;
                } catch (error: any) {
                    lastError = error;
                }
            }

            // 方法3: 尝试使用 variables 请求（如果变量在作用域中）
            if (!response && frameId !== undefined) {
                try {
                    // 获取作用域中的变量
                    const scopesResponse = await debugSession.customRequest('scopes', {
                        frameId: frameId
                    }) as any;
                    
                    if (scopesResponse && scopesResponse.scopes) {
                        // 遍历所有作用域查找变量
                        for (const scope of scopesResponse.scopes) {
                            try {
                                const variablesResponse = await debugSession.customRequest('variables', {
                                    variablesReference: scope.variablesReference
                                }) as any;
                                
                                if (variablesResponse && variablesResponse.variables) {
                                    const variable = variablesResponse.variables.find((v: any) => 
                                        v.name === variableName
                                    );
                                    
                                    if (variable) {
                                        // 找到变量，使用其值
                                        response = {
                                            result: variable.value,
                                            type: variable.type
                                        };
                                        break;
                                    }
                                }
                            } catch (scopeError) {
                                // 继续查找下一个作用域
                            }
                        }
                    }
                } catch (error: any) {
                    lastError = error;
                }
            }

            // 方法4: 最后尝试不使用 frameId（适用于某些调试适配器）
            if (!response) {
                try {
                    response = await debugSession.customRequest('evaluate', {
                        expression: variableName,
                        context: 'repl'
                    }) as any;
                } catch (error: any) {
                    lastError = error;
                }
            }

            if (!response) {
                const errorMsg = lastError?.message || '无法获取变量值';
                this.addMessage(`[${timestamp}] 错误: ${errorMsg}`);
                if (errorMsg.includes('全局范围') || errorMsg.includes('global scope')) {
                    this.addMessage(`[${timestamp}] 提示: 请确保变量在当前作用域中，或尝试使用完整路径（如 this.users）`);
                }
                return;
            }

            // 调试日志
            console.log('获取到的响应:', JSON.stringify(response, null, 2));

            // 检查是否是 DataTable 类型（需要先检查，因为 DataTable 可能有 variablesReference）
            const isDataTableType = response.type && (
                response.type.includes('DataTable') || 
                response.type.includes('System.Data.DataTable')
            );
            
            // 调试日志：检查 DataTable 类型
            if (isDataTableType) {
                console.log('检测到 DataTable 类型:', response.type);
            }
            
            if (isDataTableType && response.variablesReference && response.variablesReference > 0) {
                try {
                    // 获取 DataTable 的子变量（Rows 和 Columns）
                    const variablesResponse = await debugSession.customRequest('variables', {
                        variablesReference: response.variablesReference
                    }) as any;

                    console.log('DataTable 子变量:', JSON.stringify(variablesResponse, null, 2));

                    if (variablesResponse && variablesResponse.variables) {
                        // 查找 Columns 属性
                        const columnsVar = variablesResponse.variables.find((v: any) => 
                            v.name === 'Columns' || v.name === 'columns'
                        );
                        
                        // 查找 Rows 属性
                        const rowsVar = variablesResponse.variables.find((v: any) => 
                            v.name === 'Rows' || v.name === 'rows'
                        );
                        
                        console.log('找到 Columns 变量:', columnsVar ? `${columnsVar.name} (ref: ${columnsVar.variablesReference})` : '未找到');
                        console.log('找到 Rows 变量:', rowsVar ? `${rowsVar.name} (ref: ${rowsVar.variablesReference})` : '未找到');

                        // 第一步：获取列名（作为表格头部）
                        let columnNames: string[] = [];
                        
                        // 方法1: 通过 variablesReference 获取
                        if (columnsVar && columnsVar.variablesReference > 0) {
                            console.log('方法1: 通过 variablesReference 获取列名，ref:', columnsVar.variablesReference);
                            const columnsResponse = await debugSession.customRequest('variables', {
                                variablesReference: columnsVar.variablesReference
                            }) as any;
                            
                            console.log('Columns 子变量:', JSON.stringify(columnsResponse, null, 2));
                            
                            if (columnsResponse && columnsResponse.variables) {
                                console.log('Columns 子变量数量:', columnsResponse.variables.length);
                                console.log('Columns 子变量名:', columnsResponse.variables.map((v: any) => v.name).join(', '));
                                
                                // 查找 "结果视图"
                                const columnResultsView = columnsResponse.variables.find((v: any) => 
                                    v.name === '结果视图' || v.name === 'Results View'
                                );
                                
                                let columnVarsToProcess: any[] = [];
                                
                                if (columnResultsView && columnResultsView.variablesReference > 0) {
                                    console.log('从结果视图获取列');
                                    const resultsViewResponse = await debugSession.customRequest('variables', {
                                        variablesReference: columnResultsView.variablesReference
                                    }) as any;
                                    
                                    if (resultsViewResponse && resultsViewResponse.variables) {
                                        columnVarsToProcess = resultsViewResponse.variables.filter((v: any) => 
                                            v.name && /^\[\d+\]$/.test(v.name) && v.variablesReference > 0
                                        );
                                    }
                                } else {
                                    // 直接查找索引元素
                                    columnVarsToProcess = columnsResponse.variables.filter((v: any) => 
                                        v.name && /^\[\d+\]$/.test(v.name) && v.variablesReference > 0
                                    );
                                    
                                    // 如果没有索引元素，尝试所有有 variablesReference 的变量
                                    if (columnVarsToProcess.length === 0) {
                                        columnVarsToProcess = columnsResponse.variables.filter((v: any) => 
                                            v.variablesReference > 0 && 
                                            v.name !== '静态成员' && 
                                            v.name !== '非公共成员' &&
                                            v.name !== 'Count' &&
                                            v.name !== 'count'
                                        );
                                    }
                                }
                                
                                // 按索引排序
                                columnVarsToProcess.sort((a, b) => {
                                    const aMatch = a.name.match(/\[(\d+)\]/);
                                    const bMatch = b.name.match(/\[(\d+)\]/);
                                    const aIndex = aMatch ? parseInt(aMatch[1]) : (parseInt(a.name) || 9999);
                                    const bIndex = bMatch ? parseInt(bMatch[1]) : (parseInt(b.name) || 9999);
                                    return aIndex - bIndex;
                                });
                                
                                console.log('找到的列变量数量:', columnVarsToProcess.length);
                                
                                // 获取每个列的 ColumnName
                                for (const colVar of columnVarsToProcess) {
                                    try {
                                        const colDetails = await debugSession.customRequest('variables', {
                                            variablesReference: colVar.variablesReference
                                        }) as any;
                                        
                                        if (colDetails && colDetails.variables) {
                                            const columnNameVar = colDetails.variables.find((v: any) => 
                                                v.name === 'ColumnName' || v.name === 'columnName'
                                            );
                                            if (columnNameVar) {
                                                let colName = columnNameVar.value;
                                                if (colName.startsWith('"') && colName.endsWith('"')) {
                                                    colName = colName.slice(1, -1);
                                                }
                                                columnNames.push(colName);
                                            }
                                        }
                                    } catch (e) {
                                        console.warn(`获取列 ${colVar.name} 失败:`, e);
                                    }
                                }
                            }
                        }
                        
                        // 方法2: 如果方法1失败，使用 evaluate 表达式获取列名
                        if (columnNames.length === 0 && columnsVar) {
                            console.log('方法2: 使用 evaluate 表达式获取列名');
                            try {
                                // 先获取列数
                                const countExpression = `${variableName}.Columns.Count`;
                                const evaluateOptions: any = {
                                    expression: countExpression,
                                    context: 'watch'
                                };
                                if (frameId !== undefined) {
                                    evaluateOptions.frameId = frameId;
                                }
                                
                                const countResponse = await debugSession.customRequest('evaluate', evaluateOptions) as any;
                                const columnCount = parseInt(countResponse?.result || countResponse?.value || '0');
                                
                                console.log('列数:', columnCount);
                                
                                // 通过索引获取每个列的 ColumnName
                                for (let i = 0; i < columnCount; i++) {
                                    try {
                                        const colNameExpression = `${variableName}.Columns[${i}].ColumnName`;
                                        const colNameOptions: any = {
                                            expression: colNameExpression,
                                            context: 'watch'
                                        };
                                        if (frameId !== undefined) {
                                            colNameOptions.frameId = frameId;
                                        }
                                        
                                        const colNameResponse = await debugSession.customRequest('evaluate', colNameOptions) as any;
                                        let colName = colNameResponse?.result || colNameResponse?.value || '';
                                        
                                        if (colName.startsWith('"') && colName.endsWith('"')) {
                                            colName = colName.slice(1, -1);
                                        }
                                        
                                        if (colName) {
                                            columnNames.push(colName);
                                            console.log(`通过 evaluate 获取到列名 [${i}]: ${colName}`);
                                        }
                                    } catch (e) {
                                        console.warn(`获取第 ${i} 列名失败:`, e);
                                        break;
                                    }
                                }
                            } catch (e) {
                                console.error('使用 evaluate 获取列名失败:', e);
                            }
                        }
                        
                        console.log('最终获取到的列名:', columnNames);

                        // 第二步：获取行数据（作为表格数据）
                        const dataTableRows: any[] = [];
                        if (rowsVar && rowsVar.variablesReference > 0) {
                            // 获取 Rows 的子变量（每行数据）
                            const rowsResponse = await debugSession.customRequest('variables', {
                                variablesReference: rowsVar.variablesReference
                            }) as any;

                            console.log('Rows 子变量:', JSON.stringify(rowsResponse, null, 2));

                            if (rowsResponse && rowsResponse.variables) {
                                console.log('Rows 子变量数量:', rowsResponse.variables.length);
                                console.log('Rows 子变量名:', rowsResponse.variables.map((v: any) => `${v.name} = ${v.value}`).join(', '));
                                
                                // 获取 Count（可能是 "Count [int]" 格式）
                                const countVar = rowsResponse.variables.find((v: any) => 
                                    v.name === 'Count' || 
                                    v.name === 'count' ||
                                    v.name?.includes('Count') ||
                                    (v.name?.includes('[int]') && v.name?.includes('Count'))
                                );
                                
                                console.log('Rows Count 变量:', countVar ? `${countVar.name} = ${countVar.value}` : '未找到');
                                
                                let rowCount = 0;
                                if (countVar && countVar.value) {
                                    rowCount = parseInt(countVar.value);
                                } else {
                                    // 如果找不到 Count，尝试使用 evaluate 表达式
                                    try {
                                        const countExpression = `${variableName}.Rows.Count`;
                                        const evaluateOptions: any = {
                                            expression: countExpression,
                                            context: 'watch'
                                        };
                                        if (frameId !== undefined) {
                                            evaluateOptions.frameId = frameId;
                                        }
                                        const countResponse = await debugSession.customRequest('evaluate', evaluateOptions) as any;
                                        rowCount = parseInt(countResponse?.result || countResponse?.value || '0');
                                        console.log('通过 evaluate 获取行数:', rowCount);
                                    } catch (e) {
                                        console.warn('通过 evaluate 获取行数失败:', e);
                                    }
                                }
                                
                                if (rowCount > 0) {
                                    console.log('DataTable 行数:', rowCount);
                                    
                                    // 使用 evaluate 表达式通过索引访问每一行
                                    for (let i = 0; i < Math.min(rowCount, 100); i++) { // 限制最多100行
                                        try {
                                            const rowExpression = `${variableName}.Rows[${i}]`;
                                            const evaluateOptions: any = {
                                                expression: rowExpression,
                                                context: 'watch'
                                            };
                                            if (frameId !== undefined) {
                                                evaluateOptions.frameId = frameId;
                                            }
                                            
                                            const rowResponse = await debugSession.customRequest('evaluate', evaluateOptions) as any;
                                            
                                            if (rowResponse && rowResponse.variablesReference > 0) {
                                                // 获取行的 ItemArray（包含该行的所有列值）
                                                const rowDetails = await debugSession.customRequest('variables', {
                                                    variablesReference: rowResponse.variablesReference
                                                }) as any;
                                                
                                                if (rowDetails && rowDetails.variables) {
                                                    const itemArrayVar = rowDetails.variables.find((v: any) => 
                                                        v.name === 'ItemArray' || v.name === 'itemArray'
                                                    );
                                                    
                                                    if (itemArrayVar && itemArrayVar.variablesReference > 0) {
                                                        console.log(`第 ${i} 行: 找到 ItemArray, ref: ${itemArrayVar.variablesReference}`);
                                                        // 获取 ItemArray 的值（按列顺序）
                                                        const itemArrayDetails = await debugSession.customRequest('variables', {
                                                            variablesReference: itemArrayVar.variablesReference
                                                        }) as any;
                                                        
                                                        console.log(`第 ${i} 行 ItemArray 详情:`, JSON.stringify(itemArrayDetails, null, 2));
                                                        
                                                        if (itemArrayDetails && itemArrayDetails.variables) {
                                                            const rowData: any[] = [];
                                                            // 按索引排序，确保列的顺序正确
                                                            const sortedItems = itemArrayDetails.variables
                                                                .filter((v: any) => /^\d+$/.test(v.name))
                                                                .sort((a: any, b: any) => parseInt(a.name) - parseInt(b.name));
                                                            
                                                            console.log(`第 ${i} 行 ItemArray 排序后的项:`, sortedItems.map((v: any) => `${v.name}=${v.value}`).join(', '));
                                                            
                                                            sortedItems.forEach((v: any) => {
                                                                rowData.push(v.value);
                                                            });
                                                            
                                                            console.log(`第 ${i} 行数据:`, rowData);
                                                            
                                                            if (rowData.length > 0) {
                                                                dataTableRows.push(rowData);
                                                                console.log(`第 ${i} 行已添加到 dataTableRows, 当前总数: ${dataTableRows.length}`);
                                                            }
                                                        } else {
                                                            console.warn(`第 ${i} 行: ItemArray 详情为空`);
                                                        }
                                                    } else {
                                                        console.warn(`第 ${i} 行: 未找到 ItemArray`);
                                                        // 如果没有 ItemArray，尝试通过列名访问每个单元格
                                                        const rowObj: any = {};
                                                        if (columnNames.length > 0) {
                                                            for (const colName of columnNames) {
                                                                try {
                                                                    const cellExpression = `${variableName}.Rows[${i}]["${colName}"]`;
                                                                    const cellEvaluateOptions: any = {
                                                                        expression: cellExpression,
                                                                        context: 'watch'
                                                                    };
                                                                    if (frameId !== undefined) {
                                                                        cellEvaluateOptions.frameId = frameId;
                                                                    }
                                                                    const cellResponse = await debugSession.customRequest('evaluate', cellEvaluateOptions) as any;
                                                                    rowObj[colName] = cellResponse?.result || cellResponse?.value || '';
                                                                } catch {
                                                                    rowObj[colName] = '';
                                                                }
                                                            }
                                                            // 转换为数组格式（按列名顺序）
                                                            const rowArray = columnNames.map(colName => rowObj[colName] || '');
                                                            if (rowArray.length > 0) {
                                                                dataTableRows.push(rowArray);
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        } catch (rowError) {
                                            console.warn(`获取第 ${i} 行失败:`, rowError);
                                            break;
                                        }
                                    }
                                }
                                
                                // 第三步：组合列名和行数据生成表格
                                console.log('准备组合表格数据:');
                                console.log('  - 列名数量:', columnNames.length, '列名:', columnNames);
                                console.log('  - 行数据数量:', dataTableRows.length);
                                console.log('  - 前3行数据:', dataTableRows.slice(0, 3));
                                
                                if (dataTableRows.length > 0) {
                                    // 如果没有列名，使用索引作为列名
                                    if (columnNames.length === 0) {
                                        const maxCols = Math.max(...dataTableRows.map((row: any) => Array.isArray(row) ? row.length : 0));
                                        columnNames = Array.from({ length: maxCols }, (_, i) => `Column${i + 1}`);
                                        console.log('未获取到列名，使用默认列名:', columnNames);
                                    }
                                    
                                    // 确保所有行的列数一致（按列名数量）
                                    const formattedRows = dataTableRows.map((row: any, rowIndex: number) => {
                                        if (Array.isArray(row)) {
                                            // 如果行数据是数组，转换为对象（列名 -> 值）
                                            const rowObj: any = {};
                                            columnNames.forEach((colName, index) => {
                                                rowObj[colName] = row[index] !== undefined ? row[index] : '';
                                            });
                                            return rowObj;
                                        } else if (typeof row === 'object' && row !== null) {
                                            // 如果行数据已经是对象，确保包含所有列
                                            const rowObj: any = {};
                                            columnNames.forEach((colName) => {
                                                rowObj[colName] = row[colName] !== undefined ? row[colName] : '';
                                            });
                                            return rowObj;
                                        }
                                        console.warn(`第 ${rowIndex} 行数据格式异常:`, row);
                                        return row;
                                    });

                                    console.log('DataTable 解析成功:', columnNames.length, '列,', formattedRows.length, '行');
                                    console.log('格式化后的前3行:', formattedRows.slice(0, 3));
                                    
                                    // 将解析后的数据转换为解析器能理解的格式
                                    // 注意：保持 type 为 'DataTable'，这样可以在后续检查中识别
                                    response = {
                                        result: formattedRows,
                                        type: 'DataTable'
                                    };
                                } else {
                                    console.warn('DataTable 行数据为空，dataTableRows.length =', dataTableRows.length);
                                    console.warn('可能的原因: 1) Count 为 0, 2) 无法获取 ItemArray, 3) evaluate 表达式失败');
                                }
                            }
                        }
                    }
                } catch (dataTableError: any) {
                    console.warn('解析 DataTable 失败:', dataTableError);
                    // 继续使用原始响应，让解析器处理
                }
            }
            
            // 检查是否是 Dictionary 类型（C# Dictionary<TKey, TValue>）
            const isDictionaryType = response.type?.includes('Dictionary') || false;
            let dictionaryParsed = false;
            
            if (isDictionaryType && response.variablesReference && response.variablesReference > 0) {
                try {
                    console.log('检测到 Dictionary 类型，开始解析...');
                    
                    // 获取子变量（应该包含 [0] [KeyValuePair], [1] [KeyValuePair] 等）
                    const variablesResponse = await debugSession.customRequest('variables', {
                        variablesReference: response.variablesReference
                    }) as any;

                    console.log('获取到的子变量:', JSON.stringify(variablesResponse, null, 2));

                    if (variablesResponse && variablesResponse.variables) {
                        // 查找所有 KeyValuePair 元素（格式：[n] [KeyValuePair]）
                        const keyValuePairs = variablesResponse.variables.filter((v: any) => 
                            v.name && /^\[\d+\]\s*\[KeyValuePair\]/.test(v.name) && v.variablesReference > 0
                        );

                        console.log(`找到 ${keyValuePairs.length} 个 KeyValuePair`);

                        if (keyValuePairs.length > 0) {
                            const dictionaryRows: any[][] = [];
                            
                            // 对每个 KeyValuePair，获取其 Key 和 Value
                            for (const kvp of keyValuePairs) {
                                try {
                                    let keyValue: any = null;
                                    let valueValue: any = null;
                                    
                                    // 优先从 value 字符串中解析（格式：{[name, 张三]}）
                                    if (kvp.value) {
                                        let valueStr = String(kvp.value);
                                        console.log(`KeyValuePair ${kvp.name} 的 value:`, valueStr);
                                        
                                        // 去掉外层引号（如果有）
                                        if ((valueStr.startsWith('"') && valueStr.endsWith('"')) ||
                                            (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
                                            valueStr = valueStr.slice(1, -1);
                                        }
                                        
                                        // 尝试匹配格式：{[key, value]} 或 {[key,value]}
                                        // 匹配模式：{[ 开头，然后是 key，逗号，空格（可选），value，]}
                                        const match = valueStr.match(/\{\[([^,\]]+),\s*([^\]]+)\]/);
                                        if (match && match.length >= 3) {
                                            keyValue = match[1].trim();
                                            valueValue = match[2].trim();
                                            console.log(`从字符串解析 KeyValuePair ${kvp.name}: Key="${keyValue}", Value="${valueValue}"`);
                                        } else {
                                            console.warn(`无法从字符串解析 KeyValuePair ${kvp.name}，valueStr="${valueStr}"`);
                                        }
                                    }
                                    
                                    // 如果字符串解析失败，尝试通过 variablesReference 获取
                                    if ((!keyValue || !valueValue) && kvp.variablesReference > 0) {
                                        try {
                                            // 获取 KeyValuePair 的属性（Key 和 Value）
                                            const kvpDetails = await debugSession.customRequest('variables', {
                                                variablesReference: kvp.variablesReference
                                            }) as any;
                                            
                                            console.log(`KeyValuePair ${kvp.name} 的子变量:`, JSON.stringify(kvpDetails, null, 2));
                                            
                                            if (kvpDetails && kvpDetails.variables) {
                                                // 查找 Key 和 Value 属性
                                                kvpDetails.variables.forEach((v: any) => {
                                                    if (v.name === 'Key' || v.name === 'key') {
                                                        keyValue = v.value || v.result || keyValue;
                                                    } else if (v.name === 'Value' || v.name === 'value') {
                                                        valueValue = v.value || v.result || valueValue;
                                                    }
                                                });
                                                
                                                // 如果 Key 或 Value 有 variablesReference，需要进一步获取
                                                const keyVar = kvpDetails.variables.find((v: any) => v.name === 'Key' || v.name === 'key');
                                                const valueVar = kvpDetails.variables.find((v: any) => v.name === 'Value' || v.name === 'value');
                                                
                                                if (keyVar && keyVar.variablesReference > 0) {
                                                    try {
                                                        const keyDetails = await debugSession.customRequest('variables', {
                                                            variablesReference: keyVar.variablesReference
                                                        }) as any;
                                                        if (keyDetails && keyDetails.variables && keyDetails.variables.length > 0) {
                                                            // 通常 Key 是简单类型，取第一个变量的值
                                                            keyValue = keyDetails.variables[0]?.value || keyValue;
                                                        }
                                                    } catch (keyError) {
                                                        console.warn('获取 Key 详情失败:', keyError);
                                                    }
                                                }
                                                
                                                if (valueVar && valueVar.variablesReference > 0) {
                                                    try {
                                                        const valueDetails = await debugSession.customRequest('variables', {
                                                            variablesReference: valueVar.variablesReference
                                                        }) as any;
                                                        if (valueDetails && valueDetails.variables && valueDetails.variables.length > 0) {
                                                            // 通常 Value 是简单类型，取第一个变量的值
                                                            valueValue = valueDetails.variables[0]?.value || valueValue;
                                                        }
                                                    } catch (valueError) {
                                                        console.warn('获取 Value 详情失败:', valueError);
                                                    }
                                                }
                                            }
                                        } catch (varError) {
                                            console.warn(`通过 variablesReference 获取 KeyValuePair ${kvp.name} 失败:`, varError);
                                        }
                                    }
                                    
                                    // 清理值（去掉引号等）
                                    let cleanKey = String(keyValue || '').trim();
                                    let cleanValue = String(valueValue || '').trim();
                                    
                                    // 去掉字符串值两端的引号
                                    if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
                                        cleanKey = cleanKey.slice(1, -1);
                                    }
                                    if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
                                        cleanValue = cleanValue.slice(1, -1);
                                    }
                                    
                                    // 如果 Key 和 Value 都有值，添加到结果中
                                    if (cleanKey && cleanValue) {
                                        dictionaryRows.push([cleanKey, cleanValue]);
                                        console.log(`KeyValuePair ${kvp.name} 解析成功: Key="${cleanKey}", Value="${cleanValue}"`);
                                    } else {
                                        console.warn(`KeyValuePair ${kvp.name} 解析失败: Key="${cleanKey}", Value="${cleanValue}"`);
                                    }
                                } catch (kvpError) {
                                    console.warn(`解析 KeyValuePair ${kvp.name} 失败:`, kvpError);
                                }
                            }
                            
                            if (dictionaryRows.length > 0) {
                                const tableData: TableData = {
                                    columns: ['键', '值'],
                                    rows: dictionaryRows,
                                    totalRows: dictionaryRows.length
                                };
                                
                                this._currentTableData = tableData;
                                this.sendTableData(tableData);
                                
                                // 格式化类型显示
                                let displayType = response.type || 'Dictionary';
                                if (displayType.includes('System.Collections.Generic.')) {
                                    displayType = displayType.replace('System.Collections.Generic.', '');
                                }
                                if (displayType.includes('System.')) {
                                    displayType = displayType.replace('System.', '');
                                }
                                
                                this.addMessage(`[${timestamp}] 变量 "${variableName}" (类型: ${displayType}) 解析成功 (${tableData.totalRows} 行)`);
                                dictionaryParsed = true;
                                return;
                            }
                        }
                    }
                } catch (dictionaryError: any) {
                    console.warn('解析 Dictionary 失败:', dictionaryError);
                    // 继续使用原始响应，让解析器处理
                }
            }
            
            // 检查是否有 variablesReference（C# List 等集合类型可能需要通过此获取子变量）
            // 注意：DataTable 和 Dictionary 已经在上面处理过了，这里跳过
            if (response.variablesReference && response.variablesReference > 0 && !isDataTableType && !dictionaryParsed) {
                try {
                    // 获取子变量（对于 List，这可能是元素）
                    const variablesResponse = await debugSession.customRequest('variables', {
                        variablesReference: response.variablesReference
                    }) as any;

                    console.log('获取到的子变量:', JSON.stringify(variablesResponse, null, 2));

                    if (variablesResponse && variablesResponse.variables) {
                        // 方法1: 直接查找索引元素（如 [0], [1] 等）- C# List 的常见格式
                        const indexElements = variablesResponse.variables.filter((v: any) => 
                            v.name && /^\[\d+\]$/.test(v.name) && v.variablesReference > 0
                        );

                        if (indexElements.length > 0) {
                            // 找到了索引元素，获取每个元素的属性
                            const items: any[] = [];
                            
                            for (const element of indexElements) {
                                try {
                                    // 获取元素的属性
                                    const elementDetails = await debugSession.customRequest('variables', {
                                        variablesReference: element.variablesReference
                                    }) as any;
                                    
                                    if (elementDetails && elementDetails.variables) {
                                        // 将变量数组转换为对象
                                        const itemObj: any = {};
                                        elementDetails.variables.forEach((v: any) => {
                                            // 跳过特殊属性
                                            if (v.name !== '原始视图' && !v.name.startsWith('[')) {
                                                itemObj[v.name] = v.value;
                                            }
                                        });
                                        items.push(itemObj);
                                    }
                                } catch (elementError) {
                                    console.warn(`获取元素 ${element.name} 的属性失败:`, elementError);
                                }
                            }
                            
                            if (items.length > 0) {
                                response = {
                                    result: items,
                                    type: 'List/Array'
                                };
                            }
                        } else {
                            // 方法2: 检查是否有 Count 属性，然后通过索引访问
                            const countVar = variablesResponse.variables.find((v: any) => 
                                v.name === 'Count' || v.name === 'Length' || v.name === 'count' || v.name === 'length'
                            );

                            if (countVar && parseInt(countVar.value) > 0) {
                                // 尝试通过索引访问元素
                                const items: any[] = [];
                                
                                for (let i = 0; i < parseInt(countVar.value); i++) {
                                    try {
                                        const itemResponse = await debugSession.customRequest('evaluate', {
                                            expression: `${variableName}[${i}]`,
                                            context: 'watch',
                                            frameId: frameId
                                        }) as any;
                                        
                                        if (itemResponse && itemResponse.variablesReference > 0) {
                                            // 获取对象的属性
                                            const itemDetails = await debugSession.customRequest('variables', {
                                                variablesReference: itemResponse.variablesReference
                                            }) as any;
                                            
                                            if (itemDetails && itemDetails.variables) {
                                                const itemObj: any = {};
                                                itemDetails.variables.forEach((v: any) => {
                                                    if (v.name !== '原始视图' && !v.name.startsWith('[')) {
                                                        itemObj[v.name] = v.value;
                                                    }
                                                });
                                                items.push(itemObj);
                                            }
                                        } else if (itemResponse && (itemResponse.result !== undefined || itemResponse.value !== undefined)) {
                                            items.push(itemResponse.result || itemResponse.value);
                                        }
                                    } catch (itemError) {
                                        console.warn(`通过索引访问元素 [${i}] 失败:`, itemError);
                                        break;
                                    }
                                }

                                if (items.length > 0) {
                                    response = {
                                        result: items,
                                        type: 'List/Array'
                                    };
                                }
                            }
                        }
                    }
                } catch (varError: any) {
                    console.warn('获取子变量失败:', varError);
                    // 继续使用原始响应
                }
            }

            // 获取解析器
            const parser = this.getParser();
            
            // 保存类型信息用于显示
            const variableType = response.type || 'unknown';
            
            // 如果 DataTable 已经解析成功，直接使用解析后的数据
            if (isDataTableType && response.result && Array.isArray(response.result) && response.result.length > 0) {
                console.log('DataTable 已在 parseVariable 中解析，直接使用解析后的数据');
                const formattedRows = response.result;
                const firstRow = formattedRows[0];
                const columns = Object.keys(firstRow);
                
                // 格式化数据：清理引号、格式化日期等
                const rows = formattedRows.map((row: any) => {
                    return columns.map(col => {
                        let value = row[col];
                        if (value === null || value === undefined) {
                            return '';
                        }
                        
                        // 转换为字符串
                        let strValue = String(value);
                        
                        // 去掉字符串值两端的引号
                        if (strValue.startsWith('"') && strValue.endsWith('"')) {
                            strValue = strValue.slice(1, -1);
                        }
                        
                        // 去掉日期值的大括号
                        if (strValue.startsWith('{') && strValue.endsWith('}')) {
                            strValue = strValue.slice(1, -1);
                        }
                        
                        return strValue;
                    });
                });
                
                const tableData: TableData = {
                    columns,
                    rows,
                    totalRows: formattedRows.length
                };
                
                this._currentTableData = tableData;
                this.sendTableData(tableData);
                
                // 格式化类型显示
                let displayType = variableType;
                if (displayType.includes('System.Data.')) {
                    displayType = displayType.replace('System.Data.', '');
                }
                if (displayType.includes('System.')) {
                    displayType = displayType.replace('System.', '');
                }
                
                this.addMessage(`[${timestamp}] 变量 "${variableName}" (类型: ${displayType}) 解析成功 (${tableData.totalRows} 行)`);
                return;
            }
            
            // 处理字符串类型的值（可能是多重转义的 JSON）
            let valueToParse = response.result || response.value;
            const originalValue = valueToParse;
            
            if (typeof valueToParse === 'string') {
                const previewLength = Math.min(valueToParse.length, 200);
                console.log('原始字符串值:', valueToParse.substring(0, previewLength) + (valueToParse.length > previewLength ? '...' : ''), `(总长度: ${valueToParse.length})`);
                
                let cleanedValue = valueToParse.trim();
                
                // 递归解析函数，处理多重转义
                const tryParseRecursively = (str: string, depth: number = 0, maxDepth: number = 5): any => {
                    if (depth >= maxDepth) {
                        console.log(`达到最大递归深度 ${maxDepth}，停止解析`);
                        return str;
                    }
                    
                    if (!str || str.length === 0) {
                        return str;
                    }
                    
                    // 如果以引号开始和结束，去掉外层引号
                    if ((str.startsWith('"') && str.endsWith('"')) ||
                        (str.startsWith("'") && str.endsWith("'"))) {
                        const unquoted = str.slice(1, -1);
                        console.log(`第 ${depth + 1} 层：去掉外层引号，长度: ${unquoted.length}`);
                        
                        // 先尝试处理转义字符，然后再解析
                        // 方法1：直接尝试解析（可能已经是正确的 JSON）
                        try {
                            const parsed = JSON.parse(unquoted);
                            console.log(`第 ${depth + 1} 层解析成功（直接解析），类型:`, typeof parsed, Array.isArray(parsed) ? '(数组)' : '');
                            
                            if (typeof parsed === 'string') {
                                // 如果解析后还是字符串，继续递归解析
                                return tryParseRecursively(parsed, depth + 1, maxDepth);
                            } else {
                                // 如果解析后是对象或数组，返回它
                                return parsed;
                            }
                        } catch (e1: any) {
                            console.log(`第 ${depth + 1} 层直接解析失败:`, e1.message);
                            
                            // 方法2：手动处理转义字符后再解析
                            let unescaped = unquoted; // 在 try 块外定义，以便在 catch 中使用
                            try {
                                // 手动处理转义字符：\" -> ", \\ -> \, \n -> 换行等
                                
                                // 检查是否包含转义字符
                                if (unescaped.includes('\\"') || unescaped.includes('\\\\')) {
                                    // 直接替换转义字符
                                    unescaped = unescaped.replace(/\\"/g, '"');
                                    unescaped = unescaped.replace(/\\n/g, '\n');
                                    unescaped = unescaped.replace(/\\r/g, '\r');
                                    unescaped = unescaped.replace(/\\t/g, '\t');
                                    
                                    console.log(`第 ${depth + 1} 层：处理转义字符后，长度: ${unescaped.length}`);
                                    
                                    // 检查字符串是否被截断
                                    const isTruncated = (unescaped.startsWith('[') && !unescaped.endsWith(']')) ||
                                        (unescaped.startsWith('{') && !unescaped.endsWith('}'));
                                    
                                    if (isTruncated) {
                                        console.log(`第 ${depth + 1} 层：检测到字符串可能被截断，尝试修复`);
                                        // 如果字符串被截断，尝试修复（添加缺失的结束符）
                                        if (unescaped.startsWith('[') && !unescaped.endsWith(']')) {
                                            // 尝试找到最后一个完整的对象
                                            const lastCompleteIndex = unescaped.lastIndexOf('}');
                                            if (lastCompleteIndex > 0) {
                                                unescaped = unescaped.substring(0, lastCompleteIndex + 1) + ']';
                                                console.log(`第 ${depth + 1} 层：修复截断的数组，新长度: ${unescaped.length}`);
                                            }
                                        } else if (unescaped.startsWith('{') && !unescaped.endsWith('}')) {
                                            // 尝试找到最后一个完整的属性
                                            const lastCompleteIndex = unescaped.lastIndexOf(',');
                                            if (lastCompleteIndex > 0) {
                                                unescaped = unescaped.substring(0, lastCompleteIndex) + '}';
                                                console.log(`第 ${depth + 1} 层：修复截断的对象，新长度: ${unescaped.length}`);
                                            }
                                        }
                                    }
                                    
                                    if (unescaped !== unquoted && (unescaped.startsWith('[') || unescaped.startsWith('{'))) {
                                        const parsed = JSON.parse(unescaped);
                                        console.log(`第 ${depth + 1} 层解析成功（去转义后），类型:`, typeof parsed, Array.isArray(parsed) ? '(数组)' : '');
                                        
                                        if (typeof parsed === 'string') {
                                            return tryParseRecursively(parsed, depth + 1, maxDepth);
                                        } else {
                                            return parsed;
                                        }
                                    }
                                }
                            } catch (e2: any) {
                                console.log(`第 ${depth + 1} 层去转义后解析失败:`, e2.message);
                                const match = e2.message.match(/position (\d+)/);
                                if (match) {
                                    const errorPos = parseInt(match[1]);
                                    console.log(`第 ${depth + 1} 层：错误位置 ${errorPos}，字符串长度 ${unescaped.length}`);
                                    console.log(`第 ${depth + 1} 层：错误位置附近的内容:`, unescaped.substring(Math.max(0, errorPos - 20), Math.min(unescaped.length, errorPos + 20)));
                                }
                            }
                            
                            // 方法3：尝试直接解析原始字符串（不去掉引号）
                            try {
                                const parsed = JSON.parse(str);
                                console.log(`第 ${depth + 1} 层直接解析原始字符串成功，类型:`, typeof parsed, Array.isArray(parsed) ? '(数组)' : '');
                                
                                if (typeof parsed === 'string') {
                                    return tryParseRecursively(parsed, depth + 1, maxDepth);
                                } else {
                                    return parsed;
                                }
                            } catch (e3: any) {
                                console.log(`第 ${depth + 1} 层直接解析原始字符串也失败:`, e3.message);
                                
                                // 所有尝试都失败，返回去掉引号后的字符串
                                return unquoted;
                            }
                        }
                    } else if (str.startsWith('[') || str.startsWith('{')) {
                        // 如果看起来像 JSON，直接解析
                        try {
                            const parsed = JSON.parse(str);
                            console.log(`第 ${depth + 1} 层直接解析 JSON 成功，类型:`, Array.isArray(parsed) ? 'Array' : 'Object');
                            return parsed;
                        } catch (e: any) {
                            console.log(`第 ${depth + 1} 层直接解析 JSON 失败:`, e.message);
                            // 尝试手动去掉转义字符
                            try {
                                let unescaped = str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                                if (unescaped !== str) {
                                    const parsed = JSON.parse(unescaped);
                                    return parsed;
                                }
                            } catch {}
                            return str;
                        }
                    } else {
                        // 不是 JSON 格式，返回原字符串
                        return str;
                    }
                };
                
                // 开始递归解析
                valueToParse = tryParseRecursively(cleanedValue);
                
                console.log('最终解析值类型:', typeof valueToParse, Array.isArray(valueToParse) ? '(数组)' : '', 
                    typeof valueToParse === 'string' ? `长度: ${valueToParse.length}` : '',
                    Array.isArray(valueToParse) ? `数组长度: ${valueToParse.length}` : '');
            }
            
            // 解析变量
            const parseResult = parser.parse(valueToParse, response.type);
            
            if (parseResult.success && parseResult.data) {
                // 保存表格数据
                this._currentTableData = parseResult.data;
                
                // 发送表格数据到 Webview
                this.sendTableData(parseResult.data);
                
                // 格式化类型显示（简化长类型名）
                let displayType = variableType;
                // 如果是 C# 的泛型类型，简化显示
                if (displayType.includes('System.Collections.Generic.')) {
                    displayType = displayType.replace('System.Collections.Generic.', '');
                }
                if (displayType.includes('System.')) {
                    displayType = displayType.replace('System.', '');
                }
                
                this.addMessage(`[${timestamp}] 变量 "${variableName}" (类型: ${displayType}) 解析成功 (${parseResult.data.totalRows} 行)`);
            } else {
                // 解析失败时，清空表格，只在消息窗口显示错误
                this.clearTable();
                this.addMessage(`[${timestamp}] 错误: ${parseResult.error || '解析失败'}`);
            }
        } catch (error: any) {
            // 解析失败时，清空表格，只在消息窗口显示错误
            this.clearTable();
            this.addMessage(`[${timestamp}] 错误: ${error?.message || String(error)}`);
        }
    }

    /**
     * 处理 DataTable 行数据
     * @param debugSession 调试会话
     * @param rowVar 行变量
     * @param dataTableRows 行数据数组
     */
    private async processDataTableRow(debugSession: vscode.DebugSession, rowVar: any, dataTableRows: any[]): Promise<void> {
        try {
            const rowDetails = await debugSession.customRequest('variables', {
                variablesReference: rowVar.variablesReference
            }) as any;
            
            if (rowDetails && rowDetails.variables) {
                // 查找 ItemArray 或直接获取列值
                const itemArrayVar = rowDetails.variables.find((v: any) => 
                    v.name === 'ItemArray' || v.name === 'itemArray'
                );
                
                if (itemArrayVar && itemArrayVar.variablesReference > 0) {
                    // 获取 ItemArray 的值
                    const itemArrayDetails = await debugSession.customRequest('variables', {
                        variablesReference: itemArrayVar.variablesReference
                    }) as any;
                    
                    if (itemArrayDetails && itemArrayDetails.variables) {
                        const rowData: any[] = [];
                        // 按索引排序
                        const sortedItems = itemArrayDetails.variables
                            .filter((v: any) => /^\d+$/.test(v.name))
                            .sort((a: any, b: any) => parseInt(a.name) - parseInt(b.name));
                        
                        sortedItems.forEach((v: any) => {
                            rowData.push(v.value);
                        });
                        
                        if (rowData.length > 0) {
                            dataTableRows.push(rowData);
                        }
                    }
                } else {
                    // 如果没有 ItemArray，尝试直接获取列值
                    const rowObj: any = {};
                    rowDetails.variables.forEach((v: any) => {
                        if (v.name && !v.name.startsWith('[') && v.name !== '原始视图' && 
                            v.name !== '静态成员' && v.name !== '非公共成员' && 
                            !v.name.includes('[') && !v.name.includes(']')) {
                            rowObj[v.name] = v.value;
                        }
                    });
                    
                    if (Object.keys(rowObj).length > 0) {
                        dataTableRows.push(rowObj);
                    }
                }
            }
        } catch (rowError) {
            console.warn(`处理行数据失败:`, rowError);
        }
    }

    /**
     * 处理变量建议请求
     * @param query 查询字符串
     */
    private async handleRequestSuggestions(query: string): Promise<void> {
        if (!this._view) {
            return;
        }

        const suggestions: string[] = [];
        
        // 添加内置命令
        const builtInCommands = ['help', 'time', 'project', 'clear'];
        builtInCommands.forEach(cmd => {
            if (cmd.toLowerCase().startsWith(query.toLowerCase())) {
                suggestions.push(cmd);
            }
        });

        // 如果调试暂停，获取作用域中的变量
        if (this._isDebugPaused) {
            const debugSession = vscode.debug.activeDebugSession;
            if (debugSession) {
                try {
                    // 获取当前堆栈帧
                    let frameId: number | undefined = undefined;
                    try {
                        const threadsResponse = await debugSession.customRequest('threads', {}) as any;
                        if (threadsResponse && threadsResponse.threads && threadsResponse.threads.length > 0) {
                            const thread = threadsResponse.threads[0];
                            const stackTrace = await debugSession.customRequest('stackTrace', {
                                threadId: thread.id
                            }) as any;
                            
                            if (stackTrace && stackTrace.stackFrames && stackTrace.stackFrames.length > 0) {
                                frameId = stackTrace.stackFrames[0].id;
                            }
                        }
                    } catch (error) {
                        // 忽略错误
                    }

                    if (frameId !== undefined) {
                        // 获取所有作用域的变量
                        const scopesResponse = await debugSession.customRequest('scopes', {
                            frameId: frameId
                        }) as any;

                        if (scopesResponse && scopesResponse.scopes) {
                            for (const scope of scopesResponse.scopes) {
                                try {
                                    const variablesResponse = await debugSession.customRequest('variables', {
                                        variablesReference: scope.variablesReference
                                    }) as any;

                                    if (variablesResponse && variablesResponse.variables) {
                                        variablesResponse.variables.forEach((v: any) => {
                                            if (v.name && !v.name.startsWith('[') && v.name !== '原始视图') {
                                                const varName = v.name;
                                                if (varName.toLowerCase().includes(query.toLowerCase()) || query === '') {
                                                    suggestions.push(varName);
                                                }
                                            }
                                        });
                                    }
                                } catch (error) {
                                    // 忽略单个作用域的错误
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.warn('获取变量建议失败:', error);
                }
            }
        }

        // 去重并排序
        const uniqueSuggestions = Array.from(new Set(suggestions)).sort();
        
        // 发送建议到 Webview
        this._view.webview.postMessage({
            type: 'suggestions',
            suggestions: uniqueSuggestions.slice(0, 20) // 限制最多20个建议
        });
    }

    /**
     * 获取变量解析器
     * @returns 变量解析器
     */
    private getParser(): VariableParser {
        if (this._variableParser) {
            return this._variableParser;
        }

        // 根据项目类型创建解析器
        switch (this._currentProjectType) {
            case ProjectType.CSharp:
                this._variableParser = new CSharpParser();
                break;
            case ProjectType.Vue:
            case ProjectType.JavaScript:
            case ProjectType.TypeScript:
            default:
                this._variableParser = new JavaScriptParser();
                break;
        }

        return this._variableParser;
    }

    /**
     * 发送表格数据到 Webview
     * @param tableData 表格数据
     */
    private sendTableData(tableData: TableData): void {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'table',
                data: tableData
            });
        }
    }

    /**
     * 清空表格（隐藏表格）
     */
    private clearTable(): void {
        this._currentTableData = null;
        if (this._view) {
            this._view.webview.postMessage({
                type: 'clearTable'
            });
        }
    }

    /**
     * 更新 Webview 内容
     */
    private updateWebview(): void {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'update',
                messages: this._messages,
                isDebugPaused: this._isDebugPaused,
                projectType: ProjectTypeDetector.getProjectTypeName(this._currentProjectType),
                tableData: this._currentTableData
            });
        }
    }

    /**
     * 获取 Webview 的 HTML 内容
     * @param webview Webview 实例
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>调试窗口</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .output-container {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            background-color: var(--vscode-editor-background);
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            line-height: 1.5;
            display: flex;
            flex-direction: column;
        }
        .output-line {
            margin: 2px 0;
            white-space: pre-wrap;
            word-wrap: break-word;
            display: block;
            width: 100%;
        }
        .output-line:empty {
            display: none;
        }
        .table-container {
            margin-top: 10px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            overflow: hidden;
            background-color: var(--vscode-editor-background);
            display: none;
        }
        .table-header {
            padding: 8px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .table-title {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .table-close-button {
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 2px;
            font-size: 16px;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        .table-close-button:hover {
            opacity: 1;
            background-color: var(--vscode-button-hoverBackground);
        }
        .table-close-button:active {
            opacity: 0.8;
        }
        .table-controls {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .table-filter {
            padding: 4px 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            font-size: 12px;
            width: 150px;
        }
        .table-wrapper {
            overflow-x: auto;
            max-height: 400px;
            overflow-y: auto;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        .data-table th {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 6px 8px;
            text-align: left;
            border-bottom: 2px solid var(--vscode-panel-border);
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .data-table td {
            padding: 4px 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .data-table tr:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .pagination {
            padding: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-top: 1px solid var(--vscode-panel-border);
        }
        .pagination-info {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .pagination-controls {
            display: flex;
            gap: 4px;
        }
        .pagination-button {
            padding: 4px 8px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 2px;
            cursor: pointer;
            font-size: 12px;
        }
        .pagination-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .pagination-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .export-buttons {
            display: flex;
            gap: 4px;
        }
        .export-button {
            padding: 4px 8px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 2px;
            cursor: pointer;
            font-size: 12px;
        }
        .export-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .input-container {
            border-top: 1px solid var(--vscode-panel-border);
            padding: 8px;
            background-color: var(--vscode-input-background);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .input-prompt {
            color: var(--vscode-foreground);
            margin-right: 8px;
            user-select: none;
        }
        .input-field {
            flex: 1;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 4px 8px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            outline: none;
        }
        .input-field:focus {
            border-color: var(--vscode-focusBorder);
        }
        .input-field::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }
        .input-container {
            position: relative;
        }
        .suggestions-list {
            position: absolute;
            bottom: 100%;
            left: 0;
            right: 0;
            max-height: 200px;
            overflow-y: auto;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            margin-bottom: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            display: none;
        }
        .suggestions-list.visible {
            display: block;
        }
        .suggestion-item {
            padding: 6px 12px;
            cursor: pointer;
            border-bottom: 1px solid var(--vscode-panel-border);
            font-size: var(--vscode-editor-font-size);
            font-family: var(--vscode-editor-font-family);
        }
        .suggestion-item:last-child {
            border-bottom: none;
        }
        .suggestion-item:hover,
        .suggestion-item.selected {
            background-color: var(--vscode-list-hoverBackground);
        }
        .suggestion-item.highlight {
            font-weight: bold;
        }
        .clear-button {
            background: var(--vscode-button-background);
            border: 1px solid var(--vscode-button-border);
            color: var(--vscode-button-foreground);
            padding: 4px 12px;
            cursor: pointer;
            font-size: 12px;
            border-radius: 2px;
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
        }
        .clear-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .clear-button:active {
            background-color: var(--vscode-button-activeBackground);
        }
        .status-info {
            padding: 4px 8px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
            margin-left: 8px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="output-container" id="outputContainer">
        <div class="output-line">调试窗口已就绪。输入变量名或 'help' 查看帮助信息。</div>
    </div>
    <div class="table-container" id="tableContainer">
        <div class="table-header">
            <div class="table-title">
                <span>变量数据表格</span>
                <button class="table-close-button" id="tableCloseButton" title="关闭表格">×</button>
            </div>
            <div class="table-controls">
                <input type="text" class="table-filter" id="tableFilter" placeholder="筛选..." />
                <div class="export-buttons">
                    <button class="export-button" id="exportCsv">导出 CSV</button>
                    <button class="export-button" id="exportExcel">导出 Excel</button>
                </div>
            </div>
        </div>
        <div class="table-wrapper" id="tableWrapper">
            <table class="data-table" id="dataTable"></table>
        </div>
        <div class="pagination" id="pagination">
            <div class="pagination-info" id="paginationInfo"></div>
            <div class="pagination-controls">
                <button class="pagination-button" id="prevPage">上一页</button>
                <button class="pagination-button" id="nextPage">下一页</button>
            </div>
        </div>
    </div>
    <div class="input-container">
        <div class="suggestions-list" id="suggestionsList"></div>
        <span class="input-prompt">></span>
        <input type="text" class="input-field" id="commandInput" placeholder="输入变量名或命令..." autocomplete="off" />
        <button class="clear-button" id="clearButton" title="清空内容">
            <span>🗑️</span>
            <span>清空</span>
        </button>
        <span class="status-info" id="statusInfo"></span>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        const outputContainer = document.getElementById('outputContainer');
        const commandInput = document.getElementById('commandInput');
        const suggestionsList = document.getElementById('suggestionsList');
        const tableContainer = document.getElementById('tableContainer');
        const dataTable = document.getElementById('dataTable');
        const tableFilter = document.getElementById('tableFilter');
        const paginationInfo = document.getElementById('paginationInfo');
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        const exportCsvBtn = document.getElementById('exportCsv');
        const exportExcelBtn = document.getElementById('exportExcel');
        const tableCloseBtn = document.getElementById('tableCloseButton');
        const statusInfo = document.getElementById('statusInfo');
        
        let currentSuggestions = [];
        let selectedIndex = -1;
        let suggestionTimeout = null;
        
        const messages = [];
        let tableData = null;
        let filteredData = null;
        let currentPage = 1;
        const pageSize = 20;

        // 监听来自扩展的消息
        window.addEventListener('message', event => {
            const message = event.data;
            
            if (message && message.type === 'update') {
                messages.length = 0;
                if (message.messages) {
                    messages.push(...message.messages);
                }
                updateOutput();
                
                // 更新输入框状态
                if (message.isDebugPaused !== undefined || message.projectType) {
                    updateInputState(message.isDebugPaused, message.projectType);
                }
                
                // 更新表格数据
                if (message.tableData) {
                    tableData = message.tableData;
                    filteredData = message.tableData;
                    currentPage = 1;
                    renderTable();
                }
            } else if (message && message.type === 'table') {
                tableData = message.data;
                filteredData = message.data;
                currentPage = 1;
                renderTable();
            } else if (message && message.type === 'clearTable') {
                tableData = null;
                filteredData = null;
                currentPage = 1;
                renderTable(); // 这会隐藏表格
            } else if (message && message.type === 'suggestions') {
                currentSuggestions = message.suggestions || [];
                selectedIndex = -1;
                renderSuggestions();
            }
        });

        // 更新输入框状态
        function updateInputState(isPaused, projectType) {
            commandInput.disabled = false;
            
            if (isPaused && projectType) {
                commandInput.placeholder = \`输入变量名 (项目类型: \${projectType})...\`;
                statusInfo.textContent = \`调试暂停 - \${projectType}\`;
                statusInfo.style.color = 'var(--vscode-errorForeground)';
                statusInfo.style.display = 'inline-block';
            } else {
                commandInput.placeholder = '输入变量名或命令...';
                statusInfo.style.display = 'none';
            }
        }

        // 更新输出显示
        function updateOutput() {
            outputContainer.innerHTML = '';
            messages.forEach(msg => {
                const line = document.createElement('div');
                line.className = 'output-line';
                line.textContent = msg;
                outputContainer.appendChild(line);
            });
            outputContainer.scrollTop = outputContainer.scrollHeight;
        }

        // 渲染表格
        function renderTable() {
            if (!tableData || !filteredData) {
                tableContainer.style.display = 'none';
                return;
            }

            tableContainer.style.display = 'block';
            
            // 应用筛选
            const filterText = tableFilter.value.toLowerCase();
            let displayRows = filteredData.rows;
            
            if (filterText) {
                displayRows = filteredData.rows.filter(row => {
                    return row.some(cell => String(cell).toLowerCase().includes(filterText));
                });
            }

            // 分页
            const totalPages = Math.ceil(displayRows.length / pageSize);
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, displayRows.length);
            const pageRows = displayRows.slice(startIndex, endIndex);

            // 渲染表格
            let html = '<thead><tr>';
            filteredData.columns.forEach(col => {
                html += \`<th>\${escapeHtml(col)}</th>\`;
            });
            html += '</tr></thead><tbody>';
            
            pageRows.forEach(row => {
                html += '<tr>';
                row.forEach(cell => {
                    html += \`<td>\${escapeHtml(String(cell))}</td>\`;
                });
                html += '</tr>';
            });
            html += '</tbody>';
            
            dataTable.innerHTML = html;

            // 更新分页信息
            paginationInfo.textContent = \`第 \${currentPage} / \${totalPages} 页，共 \${displayRows.length} 行（总计 \${filteredData.totalRows} 行）\`;
            
            // 更新分页按钮
            prevPageBtn.disabled = currentPage <= 1;
            nextPageBtn.disabled = currentPage >= totalPages;
        }

        // HTML 转义
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // 筛选
        tableFilter.addEventListener('input', () => {
            currentPage = 1;
            renderTable();
        });

        // 分页
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });

        nextPageBtn.addEventListener('click', () => {
            const filterText = tableFilter.value.toLowerCase();
            let displayRows = filteredData ? filteredData.rows : [];
            if (filterText) {
                displayRows = filteredData.rows.filter(row => {
                    return row.some(cell => String(cell).toLowerCase().includes(filterText));
                });
            }
            const totalPages = Math.ceil(displayRows.length / pageSize);
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });

        // 关闭表格
        tableCloseBtn.addEventListener('click', () => {
            tableContainer.style.display = 'none';
            outputContainer.style.display = 'flex';
        });

        // 导出 CSV
        exportCsvBtn.addEventListener('click', () => {
            if (!filteredData) return;
            
            let csv = filteredData.columns.join(',') + '\\n';
            filteredData.rows.forEach(row => {
                csv += row.map(cell => {
                    const str = String(cell);
                    if (str.includes(',') || str.includes('"') || str.includes('\\n')) {
                        return '"' + str.replace(/"/g, '""') + '"';
                    }
                    return str;
                }).join(',') + '\\n';
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', \`变量数据_\${new Date().getTime()}.csv\`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });

        // 导出 Excel
        exportExcelBtn.addEventListener('click', () => {
            if (!filteredData) return;
            
            const BOM = '\\uFEFF';
            let content = BOM + filteredData.columns.join('\\t') + '\\n';
            filteredData.rows.forEach(row => {
                content += row.map(cell => String(cell).replace(/\\t/g, ' ').replace(/\\n/g, ' ')).join('\\t') + '\\n';
            });

            const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', \`变量数据_\${new Date().getTime()}.xls\`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });

        // 渲染建议列表
        function renderSuggestions() {
            if (!currentSuggestions || currentSuggestions.length === 0) {
                suggestionsList.classList.remove('visible');
                return;
            }

            suggestionsList.innerHTML = '';
            currentSuggestions.forEach((suggestion, index) => {
                const item = document.createElement('div');
                item.className = 'suggestion-item' + (index === selectedIndex ? ' selected' : '');
                item.textContent = suggestion;
                item.addEventListener('click', () => {
                    commandInput.value = suggestion;
                    suggestionsList.classList.remove('visible');
                    commandInput.focus();
                });
                suggestionsList.appendChild(item);
            });
            suggestionsList.classList.add('visible');
        }

        // 处理输入框输入
        commandInput.addEventListener('input', (e) => {
            const query = commandInput.value;
            
            // 清除之前的超时
            if (suggestionTimeout) {
                clearTimeout(suggestionTimeout);
            }
            
            // 延迟请求建议（避免频繁请求）
            suggestionTimeout = setTimeout(() => {
                vscode.postMessage({
                    type: 'requestSuggestions',
                    query: query
                });
            }, 200);
        });

        // 处理输入框焦点
        commandInput.addEventListener('focus', () => {
            if (currentSuggestions && currentSuggestions.length > 0) {
                renderSuggestions();
            }
        });

        // 点击外部关闭建议列表
        document.addEventListener('click', (e) => {
            if (!commandInput.contains(e.target) && !suggestionsList.contains(e.target)) {
                suggestionsList.classList.remove('visible');
            }
        });

        // 处理输入
        commandInput.addEventListener('keydown', (e) => {
            if (suggestionsList.classList.contains('visible') && currentSuggestions.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    selectedIndex = Math.min(selectedIndex + 1, currentSuggestions.length - 1);
                    renderSuggestions();
                    return;
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    selectedIndex = Math.max(selectedIndex - 1, -1);
                    renderSuggestions();
                    return;
                } else if (e.key === 'Enter' && selectedIndex >= 0) {
                    e.preventDefault();
                    commandInput.value = currentSuggestions[selectedIndex];
                    suggestionsList.classList.remove('visible');
                    selectedIndex = -1;
                    return;
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    suggestionsList.classList.remove('visible');
                    selectedIndex = -1;
                    return;
                }
            }
            
            if (e.key === 'Enter') {
                e.preventDefault();
                const command = commandInput.value.trim();
                if (command) {
                    vscode.postMessage({
                        type: 'command',
                        command: command
                    });
                    commandInput.value = '';
                    suggestionsList.classList.remove('visible');
                    selectedIndex = -1;
                }
            }
        });

        // 清空按钮
        document.getElementById('clearButton').addEventListener('click', () => {
            vscode.postMessage({
                type: 'clear'
            });
        });
    </script>
</body>
</html>`;
    }
}

