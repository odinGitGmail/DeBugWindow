# odin-DebugWindows

#### 介绍
VSCode 扩展插件：odin-DebugWindows，一个开发时候用的调试窗口工具。可以在调试暂停时解析变量并显示为表格格式。

#### 主要功能

1. **变量解析**
   - 在调试暂停时输入变量名
   - 自动解析变量值并转换为表格
   - 支持多种数据类型（JSON、Array、Object、DataTable、List、Dictionary 等）

2. **表格显示**
   - 自动渲染表格
   - 支持分页（每页 50 行）
   - 支持实时筛选
   - 支持导出 CSV 和 Excel

3. **项目类型检测**
   - 自动检测项目类型（C#、Vue、JS、TS 等）
   - 根据项目类型选择相应的解析器

#### 软件架构
- **语言**: TypeScript
- **构建工具**: TypeScript Compiler
- **VSCode API**: v1.74.0+
- **架构**: 模块化、面向对象设计

#### 安装教程

1.  克隆或下载本项目
2.  在项目根目录执行 `npm install` 安装依赖
3.  使用 `npm run compile` 编译项目
4.  按 `F5` 键在扩展开发宿主窗口中运行插件

#### 使用说明

1. **启动调试**
   - 在 VSCode 中启动调试会话
   - 在断点处暂停

2. **解析变量**
   - 在调试窗口的输入框中输入变量名
   - 按回车键
   - 系统会自动解析变量并显示为表格

3. **表格操作**
   - 使用筛选框过滤数据
   - 使用分页按钮浏览数据
   - 点击导出按钮导出为 CSV 或 Excel

4. **支持的命令**
   - `help` - 显示帮助信息
   - `clear` - 清空消息
   - `time` - 显示当前时间
   - `project` - 显示项目类型

#### 支持的数据类型

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

#### 开发说明

##### 编译项目
```bash
npm run compile
```

##### 监听模式编译
```bash
npm run watch
```

##### 代码检查
```bash
npm run lint
```

#### 项目结构

详细的项目结构说明请查看项目结构.md文件

#### 参与贡献

1.  Fork 本仓库
2.  新建 Feat_xxx 分支
3.  提交代码
4.  新建 Pull Request

#### 许可证
查看 LICENSE 文件了解详情
