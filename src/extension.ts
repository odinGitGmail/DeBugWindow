import * as vscode from 'vscode';
import { DebugWindowViewProvider } from './providers/DebugWindowViewProvider';
import { ProjectTypeDetector, ProjectType } from './utils/ProjectTypeDetector';

/**
 * 调试窗口视图提供者实例
 */
let debugWindowViewProvider: DebugWindowViewProvider;

/**
 * 插件激活时调用
 * @param context VSCode 扩展上下文
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('odin-DebugWindows 插件已激活');

    // 创建调试窗口视图提供者
    debugWindowViewProvider = new DebugWindowViewProvider(context.extensionUri);

    // 注册 Webview 视图提供者
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            DebugWindowViewProvider.viewType,
            debugWindowViewProvider
        )
    );

    // 监听调试会话变化
    const onDidStartDebugSession = vscode.debug.onDidStartDebugSession(() => {
        try {
            debugWindowViewProvider.addMessage('[调试] 调试会话已启动');
            debugWindowViewProvider.updateDebugState().catch((error) => {
                console.warn('更新调试状态失败:', error?.message);
            });
        } catch (error: any) {
            console.warn('处理调试会话启动时出错:', error?.message);
        }
    });

    const onDidTerminateDebugSession = vscode.debug.onDidTerminateDebugSession(() => {
        try {
            debugWindowViewProvider.addMessage('[调试] 调试会话已结束');
            debugWindowViewProvider.setDebugPaused(false);
        } catch (error: any) {
            console.warn('处理调试会话终止时出错:', error?.message);
        }
    });

    // 监听调试状态变化
    const onDidChangeActiveDebugSession = vscode.debug.onDidChangeActiveDebugSession(async (e) => {
        try {
            if (e) {
                await debugWindowViewProvider.updateDebugState().catch((error) => {
                    console.warn('更新调试状态失败:', error?.message);
                });
            } else {
                debugWindowViewProvider.setDebugPaused(false);
            }
        } catch (error: any) {
            console.warn('处理调试会话变化时出错:', error?.message);
        }
    });

    // 监听调试自定义事件
    const onDidReceiveDebugSessionCustomEvent = vscode.debug.onDidReceiveDebugSessionCustomEvent(async (e) => {
        try {
            if (e.session === vscode.debug.activeDebugSession) {
                if (e.event === 'stopped' || e.event === 'breakpoint' || e.event === 'thread' || e.event === 'pause') {
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                    const projectType = await ProjectTypeDetector.detectProjectType(workspaceFolder).catch(() => {
                        return ProjectType.Unknown;
                    });
                    debugWindowViewProvider.setDebugPaused(true, projectType);
                } else if (e.event === 'continued' || e.event === 'step' || e.event === 'resume') {
                    debugWindowViewProvider.setDebugPaused(false);
                }
            }
        } catch (error: any) {
            console.warn('处理调试自定义事件时出错:', error?.message);
        }
    });

    // 检查调试暂停状态的辅助函数
    async function checkDebugPausedState(session: vscode.DebugSession): Promise<void> {
        // 方法1: 尝试使用 evaluate 请求（最可靠的方法）
        try {
            const evaluateResponse = await Promise.race([
                session.customRequest('evaluate', {
                    expression: '1',
                    context: 'repl'
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 500))
            ]) as any;
            
            if (evaluateResponse !== undefined) {
                if (!debugWindowViewProvider.isDebugPaused()) {
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                    const projectType = await ProjectTypeDetector.detectProjectType(workspaceFolder);
                    debugWindowViewProvider.setDebugPaused(true, projectType);
                }
                return;
            }
        } catch (evaluateError: any) {
            // evaluate 失败，继续尝试其他方法
        }

        // 方法2: 尝试使用 threads 请求
        try {
            const threadsResponse = await Promise.race([
                session.customRequest('threads', {}),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 500))
            ]) as any;
            
            if (threadsResponse && threadsResponse.threads && threadsResponse.threads.length > 0) {
                const thread = threadsResponse.threads[0];
                try {
                    const stackTrace = await Promise.race([
                        session.customRequest('stackTrace', {
                            threadId: thread.id
                        }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 500))
                    ]) as any;
                    
                    if (stackTrace && stackTrace.stackFrames && stackTrace.stackFrames.length > 0) {
                        if (!debugWindowViewProvider.isDebugPaused()) {
                            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                            const projectType = await ProjectTypeDetector.detectProjectType(workspaceFolder);
                            debugWindowViewProvider.setDebugPaused(true, projectType);
                        }
                        return;
                    }
                } catch (stackError: any) {
                    // 无法获取堆栈跟踪
                }
            }
        } catch (threadsError: any) {
            // threads 请求失败，某些调试适配器不支持此请求
        }

        // 如果所有方法都失败，可能不在暂停状态
        if (debugWindowViewProvider.isDebugPaused()) {
            debugWindowViewProvider.setDebugPaused(false);
        }
    }

    // 监听调试会话启动，延迟检查状态
    const onDidStartDebugSessionWithCheck = vscode.debug.onDidStartDebugSession(async (session) => {
        setTimeout(async () => {
            try {
                await checkDebugPausedState(session).catch((error) => {
                    console.warn('启动时检查调试状态失败:', error?.message);
                });
            } catch (error: any) {
                console.warn('启动时检查调试状态出错:', error?.message);
            }
        }, 1000);
    });

    // 定期检查调试状态
    const statusCheckInterval = setInterval(async () => {
        try {
            const debugSession = vscode.debug.activeDebugSession;
            if (debugSession) {
                await checkDebugPausedState(debugSession).catch((error) => {
                    console.warn('检查调试状态失败:', error?.message);
                });
            } else {
                if (debugWindowViewProvider.isDebugPaused()) {
                    debugWindowViewProvider.setDebugPaused(false);
                }
            }
        } catch (error: any) {
            console.warn('定期检查调试状态时出错:', error?.message);
        }
    }, 500);

    // 监听编译任务开始，自动清空调试窗口
    const onDidStartTask = vscode.tasks.onDidStartTask((e) => {
        try {
            const taskName = e.execution.task.name?.toLowerCase() || '';
            const taskType = e.execution.task.definition?.type?.toLowerCase() || '';
            const taskSource = e.execution.task.source || '';
            
            // 检查是否是编译任务（通过任务名称、类型或源判断）
            const isBuildTask = 
                taskName.includes('build') ||
                taskName.includes('compile') ||
                taskName.includes('编译') ||
                taskName.includes('构建') ||
                taskType.includes('build') ||
                taskType.includes('compile') ||
                taskSource.includes('build') ||
                taskSource.includes('compile');
            
            if (isBuildTask) {
                debugWindowViewProvider.addMessage('[编译] 检测到编译任务，清空调试窗口');
                debugWindowViewProvider.clearMessages();
            }
        } catch (error: any) {
            console.warn('处理编译任务事件时出错:', error?.message);
        }
    });

    // 注册命令
    const clearCommand = vscode.commands.registerCommand('odin-debugwindows.clear', () => {
        debugWindowViewProvider.clearMessages();
    });

    const showDebugWindowCommand = vscode.commands.registerCommand('odin-debugwindows.showDebugWindow', async () => {
        await vscode.commands.executeCommand('workbench.view.extension.debugWindow');
    });

    context.subscriptions.push(
        onDidStartDebugSession,
        onDidTerminateDebugSession,
        onDidChangeActiveDebugSession,
        onDidReceiveDebugSessionCustomEvent,
        onDidStartDebugSessionWithCheck,
        onDidStartTask,
        clearCommand,
        showDebugWindowCommand,
        { dispose: () => clearInterval(statusCheckInterval) }
    );
}

/**
 * 插件停用时调用
 */
export function deactivate() {
    console.log('odin-DebugWindows 插件已停用');
}
