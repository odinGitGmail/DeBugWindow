# odin-DebugWindows

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![VSCode](https://img.shields.io/badge/VSCode-1.74.0+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
[![Author](https://img.shields.io/badge/author-odinsam-orange.svg)](https://www.odinsam.com)

A powerful VSCode debug window extension that parses variables and displays them in table format when debugging is paused, supporting multiple programming languages and data types.

[Features](#-features) • [Quick Start](#-quick-start) • [Usage Guide](#-usage-guide) • [Supported Types](#-supported-data-types) • [Development Guide](#-development-guide)

</div>

---

## 📖 Introduction

**odin-DebugWindows** is a debugging assistant extension developed specifically for VSCode. When a program is paused in debug mode, you can directly enter variable names in the debug window, and the extension will automatically parse variable values and display them in table format, supporting pagination, filtering, export, and more.

### ✨ Core Features

- 🎯 **Smart Variable Parsing** - Automatically identifies and parses various data types
- 📊 **Table Visualization** - Clear and intuitive table display with pagination and filtering
- 🔍 **Smart Suggestions** - Auto-completes variable names from the current debugging context
- 📤 **Data Export** - Supports export to CSV and Excel formats
- 🌍 **Multi-language Support** - Supports C#, JavaScript, TypeScript, Vue, and other projects
- 🔄 **Auto Cleanup** - Automatically clears debug window content when compiling
- ⚠️ **Exception Parsing** - Supports C# Exception type parsing with detailed information
- 🔗 **Stack Trace Links** - File paths in stack traces are clickable, directly navigating to code locations
- 🎨 **Modern UI** - Clean and beautiful user interface

## 🚀 Features

### 1. Variable Parsing

- ✅ Parse variables by entering variable names when debugging is paused
- ✅ Automatically identifies variable types and selects appropriate parsers
- ✅ Supports complex data structures (nested objects, arrays, etc.)
- ✅ Intelligently handles JSON strings (including multiple escaping)
- ✅ **Exception Parsing** - Supports C# Exception types, displaying exception type, message, stack trace, etc.

### 2. Table Display

- ✅ Automatically renders tables, supporting large amounts of data
- ✅ **Pagination** - Displays 20 rows per page
- ✅ **Real-time Filtering** - Enter keywords to quickly filter data
- ✅ **Data Export** - One-click export to CSV or Excel format
- ✅ Responsive design, adapts to different window sizes

### 3. Smart Suggestions

- ✅ Automatically retrieves variables from the current debugging context
- ✅ Shows variable name suggestions while typing
- ✅ Supports keyboard navigation selection

### 4. Project Type Detection

- ✅ Automatically detects project types (C#, JavaScript, TypeScript, Vue, Python, Java, Go, Rust, etc.)
- ✅ Selects appropriate parsers based on project type
- ✅ Displays current project type information

### 5. Exception Handling

- ✅ **Exception Parsing** - Automatically parses C# Exception objects
- ✅ **Detailed Information Display** - Shows exception type, message, source, HResult, stack trace, etc.
- ✅ **Stack Trace Links** - File paths and line numbers in stack traces are clickable, directly jumping to code locations
- ✅ **Inner Exception Support** - Supports displaying inner exception information
- ✅ **Exception Data Dictionary** - Displays key-value pairs from Exception.Data

## 📦 Installation

### Method 1: Install from VSIX

1. Download the latest `.vsix` file
2. In VSCode, press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
3. Type `Extensions: Install from VSIX...`
4. Select the downloaded `.vsix` file

### Method 2: Install from Source

```bash
# Clone the repository
git clone https://gitee.com/odinsam/debug-window.git

# Enter the project directory
cd debug-window

# Install dependencies
npm install

# Compile the project
npm run compile

# Press F5 to run in Extension Development Host window
```

## 🎯 Usage Guide

### Basic Usage

1. **Start Debugging**
   - Start a debug session in VSCode (press `F5`)
   - Pause the program at a breakpoint

2. **Open Debug Window**
   - Find the "Debug Window" panel in the sidebar
   - Or use Command Palette: `Ctrl+Shift+P` → `Show Debug Window`

3. **Parse Variables**
   - Enter variable names in the input box (e.g., `users`, `dataTable`, `ex`)
   - Press Enter
   - Variable values will be automatically parsed and displayed as tables

4. **Operate Tables**
   - **Filter**: Enter keywords in the filter box
   - **Pagination**: Use "Previous"/"Next" buttons
   - **Export**: Click "Export CSV" or "Export Excel" buttons

### Supported Commands

You can enter the following commands in the input box:

- `help` - Show help information
- `clear` - Clear messages and tables
- `time` - Show current time
- `project` - Show current project type

### Usage Examples

#### JavaScript/TypeScript Example

```javascript
// Object array
const users = [
  { id: 1, name: "John", age: 25 },
  { id: 2, name: "Jane", age: 30 },
];

// JSON string
const jsonStr = '[{"id":1,"name":"John"},{"id":2,"name":"Jane"}]';
```

Enter `users` or `jsonStr` in the debug window to view table data.

#### C# Example

```csharp
// DataTable
DataTable dt = new DataTable();
dt.Columns.Add("ID", typeof(int));
dt.Columns.Add("Name", typeof(string));
dt.Rows.Add(1, "John");
dt.Rows.Add(2, "Jane");

// List<T>
List<User> users = new List<User> { ... };

// Dictionary<TKey, TValue>
Dictionary<string, string> dict = new Dictionary<string, string>();
dict.Add("name", "John");
dict.Add("city", "Beijing");

// Exception
try {
    int result = 10 / 0;
} catch (Exception ex) {
    // Enter 'ex' in the debug window
}
```

Enter `dt`, `users`, `dict`, or `ex` in the debug window to view table data or exception information.

## 📋 Supported Data Types

### JavaScript/TypeScript

| Type              | Description                    | Example                           |
| ----------------- | ------------------------------ | --------------------------------- |
| JSON Object/Array | Auto-parse JSON strings        | `'[{"id":1}]'`                    |
| Array             | Object arrays, simple arrays   | `[1, 2, 3]`                       |
| Object            | Plain JavaScript objects       | `{id: 1, name: "test"}`          |
| Array-like        | NodeList, Arguments, etc.      | `document.querySelectorAll('div')`|
| Primitive Types   | string, number, boolean, etc. | `"hello"`, `123`, `true`          |

### C#

| Type                     | Description              | Example                         |
| ------------------------ | ------------------------ | ------------------------------- |
| DataTable                | Data table               | `System.Data.DataTable`         |
| List<T>                  | Generic list             | `List<User>`                    |
| Dictionary<TKey, TValue> | Dictionary               | `Dictionary<string, string>`    |
| Array                    | Plain array              | `int[]`, `string[]`             |
| Object                   | C# objects               | Custom class instances          |
| JSON String              | Auto-parse               | `"[{\"id\":1}]"`                |
| Exception                | Exception object         | `System.Exception`              |
| Primitive Types          | int, string, bool, etc. | `123`, `"hello"`, `true`        |

> 💡 **Tip**: More type support is under development

### Exception Parsing Example

```csharp
try {
    int result = 10 / 0;
} catch (Exception ex) {
    // Enter 'ex' in the debug window
}
```

After parsing, it will display:
- ⚠️ Exception Info: System.DivideByZeroException
- Message: Attempted to divide by zero.
- Source: demo1
- HResult: -2147352558
- Stack Trace: (File paths are clickable, directly jumping to code locations)
- Inner Exception: (if any)
- Data: (Key-value pairs from Exception.Data)

## 🛠️ Development Guide

### Project Structure

See [Project Structure](./doc/ProjectStructure.md) for details.

### Development Commands

```bash
# Install dependencies
npm install

# Compile project
npm run compile

# Watch mode compilation (auto recompile)
npm run watch

# Code linting
npm run lint

# Run tests
npm test

# Generate CHANGELOG
npm run changelog

# Package extension (interactive, supports version increment)
npm run package

# Simple package (no version prompt)
npm run package:simple
```

### Extending Parsers

If you want to add parser support for other languages:

Basic steps:

1. Create a new parser class (inherit from `VariableParser`)
2. Add new type to `ProjectType` enum
3. Add detection logic in `ProjectTypeDetector`
4. Register parser in `DebugWindowViewProvider.getParser()`

For detailed instructions, see [Extended Guide](./doc/ExtendedGuide.md).

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed update history.

## 🤝 Contributing

We welcome all forms of contributions!

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: Add new feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Commit Convention

Please follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation update
- `style`: Code formatting
- `refactor`: Refactoring
- `perf`: Performance optimization
- `test`: Test related
- `chore`: Other changes

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [VSCode Extension API](https://code.visualstudio.com/api)
- [Conventional Changelog](https://github.com/conventional-changelog/conventional-changelog)

## 📮 Feedback & Support

- **Issue Reports**: Please submit in [Issues](https://gitee.com/odinsam/debug-window/issues)
- **Feature Suggestions**: Welcome to discuss in [Issues](https://gitee.com/odinsam/debug-window/issues)
- **Repository**: https://gitee.com/odinsam/debug-window

---

<div align="center">

**If this project helps you, please give it a ⭐ Star!**

Made with ❤️ by [odinsam](https://www.odinsam.com)

</div>
