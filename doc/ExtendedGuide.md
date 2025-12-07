# 变量解析器扩展指南

## 📋 当前支持的类型

### JavaScript/TypeScript 解析器 (`JavaScriptParser`)

**支持的类型：**
- ✅ **JSON 对象/数组** - 自动解析 JSON 字符串
- ✅ **数组 (Array)** - 对象数组、简单值数组
- ✅ **对象 (Object)** - 普通 JavaScript 对象
- ✅ **类数组对象** - 如 NodeList、Arguments 等（有 length 属性）
- ✅ **基本类型** - string, number, boolean, null, undefined

**示例：**
```javascript
// 对象数组
[{id: 1, name: "张三"}, {id: 2, name: "李四"}]

// JSON 字符串
'[{"id":1,"name":"张三"},{"id":2,"name":"李四"}]'

// 简单数组
[1, 2, 3, 4, 5]
```

### C# 解析器 (`CSharpParser`)

**支持的类型：**
- ✅ **DataTable** - System.Data.DataTable（通过 Columns 和 Rows 解析）
- ✅ **List<T>** - System.Collections.Generic.List<T>（通过索引访问元素）
- ✅ **Dictionary<TKey, TValue>** - 键值对集合（通过 KeyValuePair 解析）
- ✅ **Exception** - System.Exception 及其派生类（显示异常详细信息）
- ✅ **数组 (Array)** - 普通数组
- ✅ **对象 (Object)** - C# 对象
- ✅ **JSON 字符串** - 自动解析 JSON 字符串
- ✅ **基本类型** - int, string, bool 等

**示例：**
```csharp
// DataTable
DataTable dt = new DataTable();
// ... 添加列和数据

// List<User>
List<User> users = new List<User>();

// Dictionary<string, string>
Dictionary<string, string> dict = new Dictionary<string, string>();
dict.Add("name", "张三");
dict.Add("city", "北京");
```

**Dictionary 解析说明：**
- Dictionary 通过 `variablesReference` 获取子变量（KeyValuePair 数组）
- 每个 KeyValuePair 通过其 `variablesReference` 获取 Key 和 Value 属性
- 如果无法通过 `variablesReference` 获取，会尝试从字符串格式 `{[key, value]}` 中解析
- 最终显示为两列表格：键、值

**Exception 解析说明：**
- Exception 通过 `variablesReference` 获取子变量（Message、StackTrace、Source 等）
- 显示异常类型、消息、来源、HResult、堆栈跟踪等信息
- 堆栈跟踪中的文件路径和行号会自动转换为可点击链接
- 点击链接可以直接跳转到对应的代码位置
- 支持内部异常（InnerException）的递归解析
- 支持异常数据字典（Exception.Data）的显示

## 🏗️ 架构设计

### 核心组件

```
src/
├── types/
│   └── index.ts              # 类型定义（ProjectType, TableData, ParseResult）
├── parsers/
│   ├── VariableParser.ts      # 抽象基类（提供通用方法）
│   ├── JavaScriptParser.ts   # JavaScript/TypeScript 解析器
│   └── CSharpParser.ts       # C# 解析器
├── utils/
│   ├── ProjectTypeDetector.ts # 项目类型检测
│   └── TableExporter.ts       # 表格导出工具
└── providers/
    └── DebugWindowViewProvider.ts # 主提供者（选择解析器）
```

### 解析器选择流程

```
1. 用户输入变量名
   ↓
2. DebugWindowViewProvider.parseVariable()
   ↓
3. 获取变量值（通过 debug API）
   ↓
4. 根据项目类型选择解析器
   ↓
5. parser.parse(value, valueType)
   ↓
6. 返回 TableData
   ↓
7. 显示表格
```

### 解析器基类 (`VariableParser`)

**核心方法：**
- `parse(value, valueType)` - 抽象方法，子类必须实现
- `supports(valueType)` - 抽象方法，检查是否支持该类型
- `objectToTable(obj)` - 将对象转换为表格（protected）
- `arrayToTable(arr)` - 将数组转换为表格（protected）
- `formatValue(value)` - 格式化值用于显示（protected）
- `tryParseJson(str)` - 尝试解析 JSON 字符串（protected）

## 🚀 如何扩展新的解析器

### 步骤 1: 创建新的解析器类

在 `src/parsers/` 目录下创建新文件，例如 `PythonParser.ts`：

```typescript
import { VariableParser } from './VariableParser';
import { ParseResult } from '../types';

/**
 * Python 变量解析器
 */
export class PythonParser extends VariableParser {
    /**
     * 解析变量值
     * @param value 变量值
     * @param valueType 值类型
     * @returns 解析结果
     */
    parse(value: any, valueType?: string): ParseResult {
        try {
            // 处理 Python 特定类型
            if (valueType?.includes('list') || valueType?.includes('List')) {
                return this.parseList(value);
            }
            
            if (valueType?.includes('dict') || valueType?.includes('Dict')) {
                return this.parseDict(value);
            }
            
            if (valueType?.includes('DataFrame') || valueType?.includes('pandas')) {
                return this.parseDataFrame(value);
            }
            
            // 处理通用类型（数组、对象等）
            if (Array.isArray(value)) {
                return {
                    success: true,
                    data: this.arrayToTable(value),
                    rawValue: value,
                    valueType: 'list'
                };
            }
            
            if (typeof value === 'object' && value !== null) {
                return {
                    success: true,
                    data: this.objectToTable(value),
                    rawValue: value,
                    valueType: 'object'
                };
            }
            
            // 基本类型
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
        return valueType?.includes('list') ||
               valueType?.includes('dict') ||
               valueType?.includes('DataFrame') ||
               valueType?.includes('pandas') ||
               true; // 也支持基本类型
    }

    /**
     * 解析 Python List
     */
    private parseList(value: any): ParseResult {
        // 实现 List 解析逻辑
        return this.arrayToTable(value);
    }

    /**
     * 解析 Python Dict
     */
    private parseDict(value: any): ParseResult {
        // 实现 Dict 解析逻辑
        const keys = Object.keys(value);
        const rows = keys.map(key => [key, this.formatValue(value[key])]);
        
        return {
            success: true,
            data: {
                columns: ['键', '值'],
                rows,
                totalRows: keys.length
            },
            rawValue: value,
            valueType: 'dict'
        };
    }

    /**
     * 解析 pandas DataFrame
     */
    private parseDataFrame(value: any): ParseResult {
        // 实现 DataFrame 解析逻辑
        // 需要根据调试器返回的格式来解析
        // 例如：value.columns, value.values, value.index 等
        
        try {
            const columns = value.columns || [];
            const rows = value.values || [];
            
            return {
                success: true,
                data: {
                    columns: columns.map((c: any) => String(c)),
                    rows: rows.map((row: any) => 
                        Array.isArray(row) ? row.map((cell: any) => this.formatValue(cell)) : [this.formatValue(row)]
                    ),
                    totalRows: rows.length
                },
                rawValue: value,
                valueType: 'DataFrame'
            };
        } catch (error: any) {
            return {
                success: false,
                error: `解析 DataFrame 失败: ${error?.message || String(error)}`
            };
        }
    }
}
```

### 步骤 2: 在 ProjectType 枚举中添加新类型

编辑 `src/types/index.ts`：

```typescript
export enum ProjectType {
    // ... 现有类型
    Python = 'python',
    // 添加新类型
    Kotlin = 'kotlin',
    Swift = 'swift',
    // ...
}
```

### 步骤 3: 在 ProjectTypeDetector 中添加检测逻辑

编辑 `src/utils/ProjectTypeDetector.ts`：

```typescript
// 在 detectProjectType 方法中添加：
// 检测 Kotlin 项目
if (await this.hasFile(workspacePath, 'build.gradle.kts') ||
    await this.hasFile(workspacePath, '*.kt')) {
    return ProjectType.Kotlin;
}

// 在 detectFromFile 方法中添加：
case '.kt':
    return ProjectType.Kotlin;
```

### 步骤 4: 在 DebugWindowViewProvider 中注册解析器

编辑 `src/providers/DebugWindowViewProvider.ts`：

1. **导入新解析器：**
```typescript
import { PythonParser } from '../parsers/PythonParser';
import { KotlinParser } from '../parsers/KotlinParser';
```

2. **在 getParser() 方法中添加：**
```typescript
private getParser(): VariableParser {
    if (this._variableParser) {
        return this._variableParser;
    }

    // 根据项目类型创建解析器
    switch (this._currentProjectType) {
        case ProjectType.CSharp:
            this._variableParser = new CSharpParser();
            break;
        case ProjectType.Python:
            this._variableParser = new PythonParser();
            break;
        case ProjectType.Kotlin:
            this._variableParser = new KotlinParser();
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
```

## 📝 扩展示例：添加 Java 解析器

### 示例：JavaParser.ts

```typescript
import { VariableParser } from './VariableParser';
import { ParseResult } from '../types';

/**
 * Java 变量解析器
 */
export class JavaParser extends VariableParser {
    parse(value: any, valueType?: string): ParseResult {
        try {
            // 处理 ArrayList
            if (valueType?.includes('ArrayList') || valueType?.includes('List')) {
                return this.parseList(value);
            }
            
            // 处理 HashMap
            if (valueType?.includes('HashMap') || valueType?.includes('Map')) {
                return this.parseMap(value);
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
                return {
                    success: true,
                    data: this.objectToTable(value),
                    rawValue: value,
                    valueType: 'object'
                };
            }
            
            // 基本类型
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

    supports(valueType: string): boolean {
        return valueType?.includes('ArrayList') ||
               valueType?.includes('List') ||
               valueType?.includes('HashMap') ||
               valueType?.includes('Map') ||
               true;
    }

    private parseList(value: any): ParseResult {
        // Java ArrayList 通常已经是数组格式
        return this.arrayToTable(value);
    }

    private parseMap(value: any): ParseResult {
        // Java HashMap 通常是键值对对象
        const keys = Object.keys(value);
        const rows = keys.map(key => [key, this.formatValue(value[key])]);
        
        return {
            success: true,
            data: {
                columns: ['键', '值'],
                rows,
                totalRows: keys.length
            },
            rawValue: value,
            valueType: 'Map'
        };
    }
}
```

## 🔍 调试技巧

### 1. 查看变量类型

在 `parseVariable` 方法中添加日志：

```typescript
console.log('变量类型:', response.type);
console.log('变量值:', JSON.stringify(response.result, null, 2));
```

### 2. 测试解析器

创建测试文件 `src/parsers/__tests__/YourParser.test.ts`：

```typescript
import { YourParser } from '../YourParser';

describe('YourParser', () => {
    const parser = new YourParser();
    
    it('应该解析 List', () => {
        const result = parser.parse([1, 2, 3], 'List');
        expect(result.success).toBe(true);
        expect(result.data?.totalRows).toBe(3);
    });
});
```

### 3. 处理复杂类型

对于复杂类型（如 DataTable、DataFrame），可能需要：
1. 通过 `variablesReference` 获取子属性
2. 使用 `evaluate` 表达式获取特定值
3. 递归解析嵌套结构

参考 `DebugWindowViewProvider.parseVariable()` 中 DataTable 的处理方式。

## 📚 最佳实践

1. **继承基类** - 始终继承 `VariableParser`，复用通用方法
2. **错误处理** - 使用 try-catch 包装解析逻辑
3. **类型检查** - 在 `supports()` 方法中明确支持的类型
4. **格式化值** - 使用 `formatValue()` 统一格式化显示
5. **返回结构** - 始终返回 `ParseResult` 结构
6. **日志记录** - 添加适当的日志便于调试

## 🎯 未来扩展建议

### 可以添加的解析器：

1. **Python 解析器**
   - list, dict, tuple
   - pandas DataFrame
   - numpy array

2. **Java 解析器**
   - ArrayList, LinkedList
   - HashMap, TreeMap
   - 数组

3. **Go 解析器**
   - slice
   - map
   - struct

4. **Rust 解析器**
   - Vec
   - HashMap
   - struct

5. **Kotlin 解析器**
   - List, MutableList
   - Map, MutableMap
   - 数组

## 📖 相关文件

- `src/parsers/VariableParser.ts` - 解析器基类
- `src/parsers/JavaScriptParser.ts` - JavaScript 解析器示例
- `src/parsers/CSharpParser.ts` - C# 解析器示例（包含复杂类型处理）
- `src/providers/DebugWindowViewProvider.ts` - 解析器选择逻辑
- `src/types/index.ts` - 类型定义


