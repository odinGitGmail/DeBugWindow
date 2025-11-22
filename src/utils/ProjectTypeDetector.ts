import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectType } from '../types';

export { ProjectType };

/**
 * 项目类型检测器
 */
export class ProjectTypeDetector {
    /**
     * 检测当前项目的类型
     * @param workspaceFolder 工作区文件夹
     * @returns 项目类型
     */
    public static async detectProjectType(workspaceFolder?: vscode.WorkspaceFolder): Promise<ProjectType> {
        if (!workspaceFolder) {
            // 如果没有工作区，尝试从当前打开的文件判断
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                return this.detectFromFile(activeEditor.document.fileName);
            }
            return ProjectType.Unknown;
        }

        const workspacePath = workspaceFolder.uri.fsPath;

        // 检测 C# 项目
        if (await this.hasFile(workspacePath, '*.csproj') || 
            await this.hasFile(workspacePath, '*.sln') ||
            await this.hasFile(workspacePath, '*.cs')) {
            return ProjectType.CSharp;
        }

        // 检测 Vue 项目
        if (await this.hasFile(workspacePath, 'package.json')) {
            const packageJsonPath = path.join(workspacePath, 'package.json');
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
                if (dependencies.vue || dependencies['@vue/cli-service'] || dependencies['vite']) {
                    return ProjectType.Vue;
                }
            } catch (error) {
                // 忽略错误
            }
        }

        // 检测 TypeScript 项目
        if (await this.hasFile(workspacePath, 'tsconfig.json') ||
            await this.hasFile(workspacePath, '*.ts')) {
            return ProjectType.TypeScript;
        }

        // 检测 JavaScript 项目
        if (await this.hasFile(workspacePath, 'package.json') ||
            await this.hasFile(workspacePath, '*.js')) {
            return ProjectType.JavaScript;
        }

        // 检测 Python 项目
        if (await this.hasFile(workspacePath, 'requirements.txt') ||
            await this.hasFile(workspacePath, '*.py') ||
            await this.hasFile(workspacePath, 'setup.py') ||
            await this.hasFile(workspacePath, 'pyproject.toml')) {
            return ProjectType.Python;
        }

        // 检测 Java 项目
        if (await this.hasFile(workspacePath, 'pom.xml') ||
            await this.hasFile(workspacePath, 'build.gradle') ||
            await this.hasFile(workspacePath, '*.java')) {
            return ProjectType.Java;
        }

        // 检测 Go 项目
        if (await this.hasFile(workspacePath, 'go.mod') ||
            await this.hasFile(workspacePath, '*.go')) {
            return ProjectType.Go;
        }

        // 检测 Rust 项目
        if (await this.hasFile(workspacePath, 'Cargo.toml') ||
            await this.hasFile(workspacePath, '*.rs')) {
            return ProjectType.Rust;
        }

        return ProjectType.Unknown;
    }

    /**
     * 从文件路径检测项目类型
     * @param filePath 文件路径
     * @returns 项目类型
     */
    private static detectFromFile(filePath: string): ProjectType {
        const ext = path.extname(filePath).toLowerCase();
        
        switch (ext) {
            case '.cs':
                return ProjectType.CSharp;
            case '.vue':
                return ProjectType.Vue;
            case '.ts':
            case '.tsx':
                return ProjectType.TypeScript;
            case '.js':
            case '.jsx':
                return ProjectType.JavaScript;
            case '.py':
                return ProjectType.Python;
            case '.java':
                return ProjectType.Java;
            case '.go':
                return ProjectType.Go;
            case '.rs':
                return ProjectType.Rust;
            default:
                return ProjectType.Unknown;
        }
    }

    /**
     * 检查工作区中是否存在指定模式的文件
     * @param workspacePath 工作区路径
     * @param pattern 文件模式（支持通配符）
     * @returns 是否存在
     */
    private static async hasFile(workspacePath: string, pattern: string): Promise<boolean> {
        try {
            const files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(workspacePath, pattern),
                null,
                1
            );
            return files.length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取项目类型的显示名称
     * @param projectType 项目类型
     * @returns 显示名称
     */
    public static getProjectTypeName(projectType: ProjectType): string {
        const names: Record<ProjectType, string> = {
            [ProjectType.Unknown]: '未知',
            [ProjectType.CSharp]: 'C#',
            [ProjectType.Vue]: 'Vue',
            [ProjectType.JavaScript]: 'JavaScript',
            [ProjectType.TypeScript]: 'TypeScript',
            [ProjectType.Python]: 'Python',
            [ProjectType.Java]: 'Java',
            [ProjectType.Go]: 'Go',
            [ProjectType.Rust]: 'Rust'
        };
        return names[projectType] || '未知';
    }
}

