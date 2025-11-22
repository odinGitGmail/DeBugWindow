# odin-DebugWindows 项目结构

## 目录结构

```
odinsam-DeBugWindow/
├── .gitignore              # Git 忽略文件配置
├── .vscodeignore          # VSCode 扩展打包时忽略文件配置
├── .vscode/               # VSCode 工作区配置目录
│   ├── launch.json        # 调试配置文件
│   └── tasks.json         # 任务配置文件
├── LICENSE                # 许可证文件
├── README.md              # 项目说明文档（中文）
├── README.en.md           # 项目说明文档（英文）
├── package.json           # 项目配置文件（包含插件元数据和依赖）
├── tsconfig.json          # TypeScript 编译配置
├── 项目结构.md            # 本文件，项目结构说明文档
└── src/                   # 源代码目录
    ├── extension.ts        # 插件主入口文件
    ├── types/             # 类型定义目录
    │   └── index.ts        # 类型定义（ProjectType, TableData, ParseResult 等）
    ├── utils/              # 工具类目录
    │   ├── ProjectTypeDetector.ts  # 项目类型检测器
    │   └── TableExporter.ts        # 表格导出工具（导出逻辑）
    ├── parsers/            # 变量解析器目录
    │   ├── VariableParser.ts        # 变量解析器基类
    │   ├── JavaScriptParser.ts      # JavaScript/TypeScript 解析器
    │   └── CSharpParser.ts         # C# 解析器
    └── providers/          # 视图提供者目录
        └── DebugWindowViewProvider.ts  # 调试窗口视图提供者
```

## 文件说明

### 核心文件

#### src/extension.ts
- 插件的主入口文件
- 包含 `activate` 和 `deactivate` 函数
- 注册插件命令和功能
- 监听调试会话事件

#### src/providers/DebugWindowViewProvider.ts
- 调试窗口 Webview 视图提供者
- 管理 Webview 的生命周期
- 处理来自 Webview 的消息
- 处理变量解析和表格显示

### 类型定义

#### src/types/index.ts
- `ProjectType` - 项目类型枚举
- `TableData` - 表格数据结构
- `ParseResult` - 变量解析结果
- `MessageType` - Webview 消息类型
- `WebviewMessage` - Webview 消息接口

### 工具类

#### src/utils/ProjectTypeDetector.ts
- 检测项目类型（C#、Vue、JS、TS 等）
- 支持从文件扩展名、配置文件等检测

#### src/utils/TableExporter.ts
- 提供 CSV 和 Excel 导出功能
- 格式化数据用于导出

### 解析器

#### src/parsers/VariableParser.ts
- 变量解析器基类
- 提供通用的解析方法
- 定义解析器接口

#### src/parsers/JavaScriptParser.ts
- JavaScript/TypeScript 变量解析器
- 支持 JSON、Array、Object 等类型

#### src/parsers/CSharpParser.ts
- C# 变量解析器
- 支持 DataTable、List、Dictionary 等类型

## 功能特性

### 1. 变量解析
- 支持在调试暂停时解析变量
- 根据项目类型自动选择解析器
- 将变量转换为表格格式

### 2. 表格显示
- 自动渲染表格
- 支持分页（每页 50 行）
- 支持实时筛选
- 支持导出 CSV 和 Excel

### 3. 项目类型检测
- 自动检测项目类型
- 支持多种编程语言
- 根据项目类型选择解析器

## 编译输出

编译后的文件会输出到 `out/` 目录：
- `out/extension.js` - 编译后的主入口文件
- `out/**/*.js` - 其他编译后的文件
- `out/**/*.js.map` - Source Map 文件

## 开发流程

1. **安装依赖**: `npm install`
2. **编译项目**: `npm run compile`
3. **监听模式**: `npm run watch`（自动编译）
4. **调试运行**: 按 `F5` 在扩展开发宿主窗口中运行
5. **打包扩展**: 使用 `vsce package` 命令打包为 .vsix 文件

## 使用说明

### 基本使用
1. 启动调试会话
2. 在断点处暂停
3. 在调试窗口输入变量名
4. 系统会自动解析并显示为表格

### 支持的命令
- `help` - 显示帮助信息
- `clear` - 清空消息
- `time` - 显示当前时间
- `project` - 显示项目类型

### 支持的变量类型

**JavaScript/TypeScript:**
- JSON 对象
- 数组
- 对象
- 基本类型

**C#:**
- DataTable
- List<T>
- Dictionary<TKey, TValue>
- 对象
- 基本类型

## 架构设计

### 设计原则
- **模块化**: 按功能拆分到不同目录
- **面向对象**: 使用类和接口组织代码
- **可扩展**: 易于添加新的解析器类型
- **类型安全**: 使用 TypeScript 类型系统

### 扩展点
- 添加新的解析器：继承 `VariableParser` 类
- 添加新的项目类型：在 `ProjectTypeDetector` 中添加检测逻辑
- 添加新的导出格式：在 `TableExporter` 中添加方法
