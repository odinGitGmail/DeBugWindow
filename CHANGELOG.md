# 更新日志

所有重要的项目变更都会记录在此文件中。

本文件基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 和 [语义化版本](https://semver.org/lang/zh-CN/) 规范。

## [未发布]

### ✨ 新功能

- 支持解析 JavaScript/TypeScript 变量（JSON、数组、对象）
- 支持解析 C# 变量（DataTable、List、Dictionary）
- 支持表格显示，包含分页、筛选、导出功能
- 支持智能变量建议
- 支持编译时自动清空调试窗口

### 🐛 修复

- 修复字符串解析问题（多重转义 JSON）
- 修复 DataTable 解析问题
- 修复 Dictionary 解析问题
- 修复解析失败时表格显示问题

### 📝 文档

- 添加扩展指南文档
- 添加项目结构文档

## [0.0.1] - 2025-11-23

### ✨ 新功能

- 初始版本发布
- 调试窗口基础功能
