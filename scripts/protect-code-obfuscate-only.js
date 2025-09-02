// 简化版代码保护脚本 - 只使用混淆
const fs = require('fs-extra');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

class SimpleCodeProtector {
    constructor() {
        this.rootDir = path.join(__dirname, '..');
        this.backendDir = path.join(this.rootDir, 'packages/backend');
        this.distDir = path.join(this.backendDir, 'dist');
        this.protectedDir = path.join(this.rootDir, 'protected');
    }

    async protect() {
        console.log('🔒 开始简化代码保护...');
        
        try {
            // 清理并创建保护目录
            await fs.remove(this.protectedDir);
            await fs.ensureDir(this.protectedDir);
            
            // 1. 复制后端代码
            const backendProtectedDir = path.join(this.protectedDir, 'packages/backend/dist');
            await fs.copy(this.distDir, backendProtectedDir);
            
            // 2. 复制前端构建文件
            const frontendDistDir = path.join(this.rootDir, 'packages/frontend/dist');
            const frontendProtectedDir = path.join(this.protectedDir, 'packages/frontend/dist');
            
            if (await fs.pathExists(frontendDistDir)) {
                await fs.copy(frontendDistDir, frontendProtectedDir);
                console.log('✅ 前端文件已复制到保护目录');
            } else {
                console.warn('⚠️ 前端构建文件不存在，请先运行 npm run build:frontend');
            }
            
            // 3. 复制其他必要文件（如果有的话）
            const sharedDistDir = path.join(this.rootDir, 'packages/shared/dist');
            if (await fs.pathExists(sharedDistDir)) {
                const sharedProtectedDir = path.join(this.protectedDir, 'packages/shared/dist');
                await fs.copy(sharedDistDir, sharedProtectedDir);
            }
            
            // 4. 混淆关键文件（路径需要更新）
            const coreFiles = [
                'packages/backend/dist/main/main.js',
                'packages/backend/dist/main/PluginManager.js',
                'packages/backend/dist/main/TabManager.js',
                'packages/backend/dist/main/automation/AutomationEngine.js'
            ];
            
            const obfuscationOptions = {
                compact: true,
                controlFlowFlattening: false,
                deadCodeInjection: false,
                debugProtection: false,
                disableConsoleOutput: false, // 保持日志输出
                identifierNamesGenerator: 'hexadecimal',
                renameGlobals: false,
                selfDefending: false,
                stringArray: true,
                stringArrayThreshold: 0.5,
                transformObjectKeys: false, // 避免破坏对象属性
                unicodeEscapeSequence: false
            };
            
            for (const file of coreFiles) {
                const filePath = path.join(this.protectedDir, file);
                
                if (await fs.pathExists(filePath)) {
                    console.log(`🔀 混淆文件: ${file}`);
                    
                    let sourceCode = await fs.readFile(filePath, 'utf8');
                    
                    // 添加简单的License检查
                    if (file === 'main/main.js') {
                        sourceCode = this.addLicenseCheck(sourceCode);
                    }
                    
                    try {
                        const obfuscated = JavaScriptObfuscator.obfuscate(sourceCode, obfuscationOptions);
                        await fs.writeFile(filePath, obfuscated.getObfuscatedCode());
                        console.log(`✅ 混淆成功: ${file}`);
                    } catch (error) {
                        console.warn(`⚠️ 混淆失败，保持原文件: ${file}`);
                    }
                } else {
                    console.warn(`⚠️ 文件不存在: ${file}`);
                }
            }
            
            console.log('✅ 简化代码保护完成!');
            
        } catch (error) {
            console.error('❌ 保护失败:', error);
            throw error;
        }
    }
    
    addLicenseCheck(sourceCode) {
        const licenseCheck = `// License 检查
try {
    const os = require('os');
    const fs = require('fs');
    const path = require('path');
    const trialFile = path.join(os.homedir(), '.sma-trial');
    
    if (!fs.existsSync(trialFile)) {
        const trialData = {
            startDate: new Date().toISOString(),
            machineId: require('crypto').createHash('md5').update(os.hostname()).digest('hex').substring(0, 16)
        };
        fs.writeFileSync(trialFile, JSON.stringify(trialData));
        console.log('🎉 开始30天免费试用');
    } else {
        const trial = JSON.parse(fs.readFileSync(trialFile, 'utf8'));
        const daysPassed = Math.floor((new Date() - new Date(trial.startDate)) / (1000 * 60 * 60 * 24));
        if (daysPassed >= 30) {
            console.error('试用期已过，请购买正式版License');
            setTimeout(() => process.exit(1), 2000);
        } else {
            console.log(\`✅ 试用期剩余 \${30 - daysPassed} 天\`);
        }
    }
} catch (error) {
    console.log('License检查跳过');
}

`;
        return licenseCheck + sourceCode;
    }
}

async function main() {
    const protector = new SimpleCodeProtector();
    await protector.protect();
}

if (require.main === module) {
    main().catch(error => {
        console.error('保护脚本执行失败:', error);
        process.exit(1);
    });
}

module.exports = { SimpleCodeProtector };
