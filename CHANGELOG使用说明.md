# CHANGELOG 自动生成使用说明

## 📋 概述

本项目使用 `conventional-changelog` 工具自动从 Git 提交记录生成 CHANGELOG.md 文件。

## 🚀 使用方法

### 1. 生成 CHANGELOG（仅新增的提交）

```bash
npm run changelog
```

此命令会：
- 读取自上次生成 CHANGELOG 后的所有提交
- 将新内容追加到 CHANGELOG.md 文件顶部

### 2. 重新生成完整 CHANGELOG

```bash
npm run changelog:all
```

此命令会：
- 读取所有 Git 提交记录
- 重新生成完整的 CHANGELOG.md 文件

## 📝 Git 提交信息规范

为了正确生成 CHANGELOG，请遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 规范：

### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- **feat**: 新功能
- **fix**: 修复 Bug
- **perf**: 性能优化
- **refactor**: 重构
- **docs**: 文档更新
- **style**: 代码格式（不影响功能）
- **test**: 测试相关
- **build**: 构建系统或外部依赖
- **ci**: CI 配置
- **chore**: 其他变更
- **revert**: 回退提交

### 示例

```bash
# 新功能
git commit -m "feat: 添加 Dictionary 解析支持"

# 修复 Bug
git commit -m "fix: 修复 DataTable 解析问题"

# 文档更新
git commit -m "docs: 更新扩展指南"

# 带 scope 的提交
git commit -m "feat(parser): 添加 Python 解析器支持"

# 带详细描述的提交
git commit -m "feat: 添加表格导出功能

支持导出 CSV 和 Excel 格式
包含分页和筛选功能"
```

## 🔧 配置说明

### package.json 脚本

- `npm run changelog`: 生成增量 CHANGELOG
- `npm run changelog:all`: 重新生成完整 CHANGELOG

### .changelogrc.json

此文件配置了 CHANGELOG 的生成规则，包括：
- 类型映射（type -> section）
- 中文化标签

## 📖 工作流程建议

1. **开发新功能或修复 Bug**
   ```bash
   git commit -m "feat: 添加新功能"
   ```

2. **准备发布新版本**
   ```bash
   # 生成 CHANGELOG
   npm run changelog
   
   # 检查生成的 CHANGELOG.md
   # 如有需要，手动调整内容
   
   # 提交 CHANGELOG
   git add CHANGELOG.md
   git commit -m "docs: 更新 CHANGELOG"
   ```

3. **发布版本**
   ```bash
   # 更新 package.json 版本号
   # 创建 Git Tag
   git tag -a v0.0.2 -m "版本 0.0.2"
   git push origin v0.0.2
   ```

## ⚠️ 注意事项

1. **提交信息格式很重要**：只有符合规范的提交才会被正确解析
2. **手动编辑**：生成后可以手动编辑 CHANGELOG.md，但建议保持格式一致
3. **版本号**：CHANGELOG 中的版本号需要与 package.json 中的版本号保持一致
4. **Git Tags**：建议为每个版本创建 Git Tag，便于版本管理

## 🔗 相关资源

- [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)
- [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)
- [语义化版本](https://semver.org/lang/zh-CN/)

