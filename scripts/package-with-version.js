#!/usr/bin/env node

/**
 * 打包脚本 - 支持版本递增
 * 在执行打包前询问用户是否需要递增版本号
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// 获取 package.json 路径
const packageJsonPath = path.join(__dirname, '..', 'package.json');
// 获取 README.md 路径
const readmePath = path.join(__dirname, '..', 'README.md');

/**
 * 读取 package.json
 */
function readPackageJson() {
    const content = fs.readFileSync(packageJsonPath, 'utf8');
    return JSON.parse(content);
}

/**
 * 写入 package.json
 */
function writePackageJson(packageJson) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
}

/**
 * 读取 README.md
 */
function readReadme() {
    return fs.readFileSync(readmePath, 'utf8');
}

/**
 * 更新 README.md 中的版本徽章
 * @param {string} oldVersion 旧版本号
 * @param {string} newVersion 新版本号
 */
function updateReadmeVersion(oldVersion, newVersion) {
    try {
        let readmeContent = readReadme();
        
        // 更新版本徽章（匹配 ![Version](https://img.shields.io/badge/version-X.X.X-blue.svg) 格式）
        const versionBadgePattern = /!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-([\d.]+)-blue\.svg\)/;
        if (versionBadgePattern.test(readmeContent)) {
            readmeContent = readmeContent.replace(
                versionBadgePattern,
                `![Version](https://img.shields.io/badge/version-${newVersion}-blue.svg)`
            );
            fs.writeFileSync(readmePath, readmeContent, 'utf8');
            console.log(`✓ README.md 版本徽章已更新: ${oldVersion} -> ${newVersion}`);
            return true;
        } else {
            console.warn('⚠ 未找到版本徽章，跳过更新');
            return false;
        }
    } catch (error) {
        console.warn('⚠ 更新 README.md 失败:', error.message);
        return false;
    }
}

/**
 * 递增版本号
 * @param {string} currentVersion 当前版本号 (例如: "0.0.3")
 * @param {string} type 递增类型: "patch", "minor", "major"
 * @returns {string} 新版本号
 */
function incrementVersion(currentVersion, type) {
    const parts = currentVersion.split('.').map(Number);
    
    switch (type) {
        case 'major':
            parts[0]++;
            parts[1] = 0;
            parts[2] = 0;
            break;
        case 'minor':
            parts[1]++;
            parts[2] = 0;
            break;
        case 'patch':
        default:
            parts[2]++;
            break;
    }
    
    return parts.join('.');
}

/**
 * 询问用户输入
 */
function askQuestion(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

/**
 * 主函数
 */
async function main() {
    try {
        // 读取当前 package.json
        const packageJson = readPackageJson();
        const currentVersion = packageJson.version;
        
        console.log(`\n当前版本: ${currentVersion}\n`);
        
        // 询问是否要递增版本
        const shouldIncrement = await askQuestion('是否要递增版本号？(y/n，默认 y): ');
        
        // 如果为空或未输入，默认使用 y
        const incrementChoice = shouldIncrement.trim().toLowerCase();
        if (incrementChoice === '' || incrementChoice === 'y' || incrementChoice === 'yes') {
            // 询问版本更新方式
            console.log('\n请选择版本更新方式:');
            console.log('1. patch (补丁版本，例如: 0.0.3 -> 0.0.4)');
            console.log('2. minor (次版本，例如: 0.0.3 -> 0.1.0)');
            console.log('3. major (主版本，例如: 0.0.3 -> 1.0.0)');
            console.log('4. 自定义版本号 (手动输入)');
            
            const typeChoice = await askQuestion('\n请输入选项 (1/2/3/4，默认 1): ');
            
            let newVersion;
            
            // 如果为空或未输入，默认使用 patch (选项1)
            const choice = typeChoice.trim() || '1';
            
            if (choice === '4') {
                // 自定义版本号
                while (true) {
                    const customVersion = await askQuestion(`\n请输入新版本号 (当前: ${currentVersion}): `);
                    
                    if (!customVersion) {
                        console.log('版本号不能为空，请重新输入。');
                        continue;
                    }
                    
                    // 验证版本号格式 (x.y.z)
                    const versionPattern = /^\d+\.\d+\.\d+$/;
                    if (!versionPattern.test(customVersion)) {
                        console.log('版本号格式不正确，请使用 x.y.z 格式 (例如: 1.2.3)');
                        continue;
                    }
                    
                    newVersion = customVersion;
                    break;
                }
            } else {
                // 递增版本
                let incrementType = 'patch';
                if (choice === '2') {
                    incrementType = 'minor';
                } else if (choice === '3') {
                    incrementType = 'major';
                }
                
                // 计算新版本
                newVersion = incrementVersion(currentVersion, incrementType);
            }
            
            // 确认
            const confirm = await askQuestion(`\n确认将版本从 ${currentVersion} 更新为 ${newVersion}？(y/n，默认 y): `);
            
            if (confirm.toLowerCase() !== 'n' && confirm.toLowerCase() !== 'no') {
                // 更新版本
                const oldVersion = packageJson.version;
                packageJson.version = newVersion;
                writePackageJson(packageJson);
                console.log(`\n✓ package.json 版本已更新: ${oldVersion} -> ${newVersion}`);
                
                // 更新 README.md 中的版本徽章
                updateReadmeVersion(oldVersion, newVersion);
                console.log('');
            } else {
                console.log('\n已取消版本更新\n');
            }
        } else {
            console.log('\n保持当前版本不变\n');
        }
        
        // 执行编译
        console.log('开始编译...');
        execSync('npm run compile', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        
        // 执行打包
        console.log('\n开始打包...');
        // 使用 Gitee 仓库的 raw 地址作为图片基础 URL
        execSync('vsce package --baseContentUrl https://gitee.com --baseImagesUrl https://gitee.com/odinsam/debug-window/raw/feature/1.0.0.beta', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        
        console.log('\n✓ 打包完成！');
        
    } catch (error) {
        console.error('\n✗ 错误:', error.message);
        process.exit(1);
    }
}

// 运行主函数
main();

