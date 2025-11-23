# odin-DebugWindows

<div align="center">

![Version](https://img.shields.io/badge/version-0.0.11-blue.svg)
![VSCode](https://img.shields.io/badge/VSCode-1.74.0+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
[![Author](https://img.shields.io/badge/author-odinsam-orange.svg)](https://www.odinsam.com)

一个强大的 VSCode 调试窗口扩展，可以在调试暂停时解析变量并显示为表格格式，支持多种编程语言和数据类型。

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [使用指南](#-使用指南) • [支持的类型](#-支持的数据类型) • [开发指南](#-开发指南)

</div>

---

## 📖 简介

**odin-DebugWindows** 是一个专为 VSCode 开发的调试辅助扩展。当程序在调试模式下暂停时，你可以直接在调试窗口中输入变量名，扩展会自动解析变量值并以表格形式展示，支持分页、筛选、导出等功能。

### ✨ 核心特性

- 🎯 **智能变量解析** - 自动识别并解析多种数据类型
- 📊 **表格可视化** - 清晰直观的表格展示，支持分页和筛选
- 🔍 **智能建议** - 自动补全当前调试上下文中的变量名
- 📤 **数据导出** - 支持导出为 CSV 和 Excel 格式
- 🌍 **多语言支持** - 支持 C#、JavaScript、TypeScript、Vue 等项目
- 🔄 **自动清理** - 编译时自动清空调试窗口内容
- 🎨 **现代化 UI** - 简洁美观的用户界面

## 🚀 功能特性

### 1. 变量解析

- ✅ 在调试暂停时输入变量名即可解析
- ✅ 自动识别变量类型并选择合适的解析器
- ✅ 支持复杂数据结构（嵌套对象、数组等）
- ✅ 智能处理 JSON 字符串（包括多重转义）

### 2. 表格显示

- ✅ 自动渲染表格，支持大量数据
- ✅ **分页功能** - 每页显示 20 行数据
- ✅ **实时筛选** - 输入关键词快速过滤数据
- ✅ **数据导出** - 一键导出为 CSV 或 Excel 格式
- ✅ 响应式设计，适配不同窗口大小

### 3. 智能建议

- ✅ 自动获取当前调试上下文中的变量
- ✅ 输入时显示变量名建议
- ✅ 支持键盘导航选择

### 4. 项目类型检测

- ✅ 自动检测项目类型（C#、JavaScript、TypeScript、Vue、Python、Java、Go、Rust 等）
- ✅ 根据项目类型选择相应的解析器
- ✅ 显示当前项目类型信息

## 📦 安装

### 方式一：从 VSIX 安装

1. 下载最新版本的 `.vsix` 文件
2. 在 VSCode 中按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)
3. 输入 `Extensions: Install from VSIX...`
4. 选择下载的 `.vsix` 文件

### 方式二：从源码安装

```bash
# 克隆仓库
git clone https://gitee.com/odinsam/debug-window.git

# 进入项目目录
cd debug-window

# 安装依赖
npm install

# 编译项目
npm run compile

# 按 F5 键在扩展开发宿主窗口中运行
```

## 🎯 使用指南

### 基本使用

1. **启动调试**

   - 在 VSCode 中启动调试会话（按 `F5`）
   - 在断点处暂停程序

2. **打开调试窗口**

   - 在侧边栏找到"调试窗口"面板
   - 或使用命令面板：`Ctrl+Shift+P` → `显示调试窗口`

3. **解析变量**

   - 在输入框中输入变量名（如 `users`、`dataTable`）
   - 按回车键
   - 变量值会自动解析并显示为表格

4. **操作表格**
   - **筛选**：在筛选框中输入关键词
   - **分页**：使用"上一页"/"下一页"按钮
   - **导出**：点击"导出 CSV"或"导出 Excel"按钮

### 支持的命令

在输入框中可以输入以下命令：

- `help` - 显示帮助信息
- `clear` - 清空消息和表格
- `time` - 显示当前时间
- `project` - 显示当前项目类型

### 使用示例

#### JavaScript/TypeScript 示例

```javascript
// 对象数组
const users = [
  { id: 1, name: "张三", age: 25 },
  { id: 2, name: "李四", age: 30 },
];

// JSON 字符串
const jsonStr = '[{"id":1,"name":"张三"},{"id":2,"name":"李四"}]';
```

在调试窗口中输入 `users` 或 `jsonStr`，即可查看表格数据。

#### C# 示例

```csharp
// DataTable
DataTable dt = new DataTable();
dt.Columns.Add("ID", typeof(int));
dt.Columns.Add("Name", typeof(string));
dt.Rows.Add(1, "张三");
dt.Rows.Add(2, "李四");

// List<T>
List<User> users = new List<User> { ... };

// Dictionary<TKey, TValue>
Dictionary<string, string> dict = new Dictionary<string, string>();
dict.Add("name", "张三");
dict.Add("city", "北京");
```

在调试窗口中输入 `dt`、`users` 或 `dict`，即可查看表格数据。

![](./images/e.g.gif)

## 📋 支持的数据类型

### JavaScript/TypeScript

| 类型           | 说明                       | 示例                               |
| -------------- | -------------------------- | ---------------------------------- |
| JSON 对象/数组 | 自动解析 JSON 字符串       | `'[{"id":1}]'`                     |
| 数组 (Array)   | 对象数组、简单值数组       | `[1, 2, 3]`                        |
| 对象 (Object)  | 普通 JavaScript 对象       | `{id: 1, name: "test"}`            |
| 类数组对象     | NodeList、Arguments 等     | `document.querySelectorAll('div')` |
| 基本类型       | string, number, boolean 等 | `"hello"`, `123`, `true`           |

### C#

| 类型                     | 说明                 | 示例                         |
| ------------------------ | -------------------- | ---------------------------- |
| DataTable                | 数据表               | `System.Data.DataTable`      |
| List<T>                  | 泛型列表             | `List<User>`                 |
| Dictionary<TKey, TValue> | 字典                 | `Dictionary<string, string>` |
| 数组 (Array)             | 普通数组             | `int[]`, `string[]`          |
| 对象 (Object)            | C# 对象              | 自定义类实例                 |
| JSON 字符串              | 自动解析             | `"[{\"id\":1}]"`             |
| 基本类型                 | int, string, bool 等 | `123`, `"hello"`, `true`     |

> 💡 **提示**：更多类型支持正在开发中，详见 [扩展指南](./扩展指南.md)

## 🛠️ 开发指南

### 项目结构

```
odin-DeBugWindow/
├── src/                    # 源代码目录
│   ├── extension.ts        # 扩展入口文件
│   ├── parsers/            # 解析器目录
│   │   ├── VariableParser.ts      # 解析器基类
│   │   ├── JavaScriptParser.ts   # JavaScript/TypeScript 解析器
│   │   └── CSharpParser.ts       # C# 解析器
│   ├── providers/          # 提供者目录
│   │   └── DebugWindowViewProvider.ts  # 调试窗口视图提供者
│   ├── types/              # 类型定义
│   │   └── index.ts
│   └── utils/              # 工具类
│       ├── ProjectTypeDetector.ts  # 项目类型检测器
│       └── TableExporter.ts       # 表格导出工具
├── assets/                  # 资源文件
│   └── avatar.png          # 扩展图标
├── scripts/                # 脚本文件
│   └── package-with-version.js  # 打包脚本
├── package.json            # 项目配置
├── tsconfig.json          # TypeScript 配置
└── README.md              # 项目说明

```

详细的项目结构说明请查看 [项目结构.md](./doc/项目结构.md)

### 开发命令

```bash
# 安装依赖
npm install

# 编译项目
npm run compile

# 监听模式编译（自动重新编译）
npm run watch

# 代码检查
npm run lint

# 运行测试
npm test

# 生成 CHANGELOG
npm run changelog

# 打包扩展（交互式，支持版本递增）
npm run package

# 简单打包（不询问版本）
npm run package:simple
```

### 扩展解析器

如果你想为其他语言添加解析器支持，请参考 [扩展指南.md](./doc/扩展指南.md)。

基本步骤：

1. 创建新的解析器类（继承 `VariableParser`）
2. 在 `ProjectType` 枚举中添加新类型
3. 在 `ProjectTypeDetector` 中添加检测逻辑
4. 在 `DebugWindowViewProvider.getParser()` 中注册解析器

详细说明请查看 [扩展指南.md](./doc/扩展指南.md)。

## 📝 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解详细的更新历史。

## 🤝 贡献指南

我们欢迎所有形式的贡献！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: 添加新功能'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 提交规范

请遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 规范：

- `feat`: 新功能
- `fix`: 修复 Bug
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 其他变更

## 📄 许可证

本项目采用 MIT 许可证。详情请查看 [LICENSE](./LICENSE) 文件。

## 🙏 致谢

- [VSCode Extension API](https://code.visualstudio.com/api)
- [Conventional Changelog](https://github.com/conventional-changelog/conventional-changelog)

## 📮 反馈与支持

- **问题反馈**：请在 [Issues](https://gitee.com/odinsam/debug-window/issues) 中提交
- **功能建议**：欢迎在 [Issues](https://gitee.com/odinsam/debug-window/issues) 中讨论
- **仓库地址**：https://gitee.com/odinsam/debug-window

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐ Star 支持一下！**

Made with ❤️ by [odinsam](https://www.odinsam.com)

</div>
