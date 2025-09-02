// scripts/protect-code.js - 修复版代码保护脚本
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const JavaScriptObfuscator = require('javascript-obfuscator');

class AdvancedCodeProtector {
    constructor() {
        this.rootDir = path.join(__dirname, '..');
        this.backendDir = path.join(this.rootDir, 'packages/backend');
        this.distDir = path.join(this.backendDir, 'dist');
        this.protectedDir = path.join(this.rootDir, 'protected');
        this.tempDir = path.join(this.rootDir, 'temp-protection');
    }

    async protect() {
        console.log('🔒 开始高级代码保护流程...');
        
        try {
            // 步骤1: 构建项目
            await this.ensureProjectBuilt();
            
            // 步骤2: 设置保护环境
            await this.setupProtectionEnvironment();
            
            // 步骤3: 添加License验证
            await this.injectLicenseValidation();
            
            // 步骤4: 识别保护目标
            const protectionTargets = this.identifyProtectionTargets();
            
            // 步骤5: 混淆核心代码
            await this.obfuscateCode(protectionTargets);
            
            // 步骤6: 编译为字节码
            await this.compileToByteCode(protectionTargets);
            
            // 步骤7: 生成加载器
            await this.generateLoaders(protectionTargets);
            
            // 步骤8: 复制其他资源
            await this.copyResources(protectionTargets);
            
            // 步骤9: 验证保护结果
            await this.validateProtection();
            
            console.log('✅ 高级代码保护完成!');
            
        } catch (error) {
            console.error('❌ 代码保护失败:', error);
            throw error;
        } finally {
            // 清理临时目录
            await fs.remove(this.tempDir).catch(() => {});
        }
    }

    async ensureProjectBuilt() {
        console.log('📦 确保项目已构建...');
        
        if (!await fs.pathExists(this.distDir)) {
            console.log('🔧 运行项目构建...');
            execSync('npm run build:all', { 
                stdio: 'inherit',
                cwd: this.rootDir 
            });
        }
        
        console.log('✅ 项目构建检查完成');
    }

    async setupProtectionEnvironment() {
        console.log('📁 设置保护环境...');
        
        await fs.remove(this.protectedDir);
        await fs.ensureDir(this.protectedDir);
        await fs.ensureDir(this.tempDir);
        
        // 创建目录结构
        const dirs = ['main', 'preload', 'renderer'];
        for (const dir of dirs) {
            await fs.ensureDir(path.join(this.protectedDir, dir));
        }
    }

    async injectLicenseValidation() {
        console.log('🔐 注入License验证...');
        
        const licenseValidator = `// License验证模块
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');

class LicenseValidator {
    constructor() {
        this.publicKey = \`-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1234567890abcdef
-----END PUBLIC KEY-----\`;
        this.trialDays = 30;
        this.dailyLimit = 10;
        this.licenseFile = path.join(os.homedir(), '.sma-license');
        this.usageFile = path.join(os.homedir(), '.sma-usage');
    }
    
    async validateLicense() {
        try {
            if (await this.hasValidLicense()) {
                return { valid: true, type: 'full' };
            }
            
            const trialStatus = await this.checkTrialStatus();
            if (!trialStatus.expired) {
                const usageStatus = await this.checkDailyUsage();
                if (usageStatus.canUse) {
                    return { valid: true, type: 'trial', remaining: trialStatus.remaining };
                } else {
                    throw new Error('试用版每日使用次数已达上限，请明日再试或购买正式版');
                }
            }
            
            throw new Error('试用期已过，请购买正式版License');
            
        } catch (error) {
            console.error('License验证失败:', error.message);
            process.exit(1);
        }
    }
    
    async hasValidLicense() {
        try {
            if (!fs.existsSync(this.licenseFile)) return false;
            
            const licenseData = fs.readFileSync(this.licenseFile, 'utf8');
            const { email, signature } = JSON.parse(licenseData);
            
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(email);
            
            return verify.verify(this.publicKey, signature, 'base64');
        } catch {
            return false;
        }
    }
    
    async checkTrialStatus() {
        const configPath = path.join(os.homedir(), '.sma-trial');
        
        try {
            if (!fs.existsSync(configPath)) {
                const trialData = {
                    startDate: new Date().toISOString(),
                    machineId: this.getMachineId()
                };
                fs.writeFileSync(configPath, JSON.stringify(trialData));
                return { expired: false, remaining: this.trialDays };
            }
            
            const trialData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            if (trialData.machineId !== this.getMachineId()) {
                throw new Error('License已绑定其他设备');
            }
            
            const startDate = new Date(trialData.startDate);
            const now = new Date();
            const daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
            
            return {
                expired: daysPassed >= this.trialDays,
                remaining: Math.max(0, this.trialDays - daysPassed)
            };
            
        } catch (error) {
            throw new Error('试用状态检查失败');
        }
    }
    
    async checkDailyUsage() {
        const today = new Date().toDateString();
        
        try {
            let usageData = { date: today, count: 0 };
            
            if (fs.existsSync(this.usageFile)) {
                const existing = JSON.parse(fs.readFileSync(this.usageFile, 'utf8'));
                if (existing.date === today) {
                    usageData = existing;
                }
            }
            
            const canUse = usageData.count < this.dailyLimit;
            
            if (canUse) {
                usageData.count++;
                fs.writeFileSync(this.usageFile, JSON.stringify(usageData));
            }
            
            return {
                canUse,
                used: usageData.count,
                limit: this.dailyLimit,
                remaining: this.dailyLimit - usageData.count
            };
            
        } catch (error) {
            throw new Error('使用次数检查失败');
        }
    }
    
    getMachineId() {
        const networkInterfaces = os.networkInterfaces();
        const mac = Object.values(networkInterfaces)
            .flat()
            .find(iface => iface && !iface.internal && iface.mac !== '00:00:00:00:00:00')?.mac;
        
        return crypto.createHash('sha256')
            .update(mac || os.hostname())
            .digest('hex')
            .substring(0, 16);
    }
}

global._licenseValidator = new LicenseValidator();
module.exports = { LicenseValidator };
`;

        const licenseValidatorPath = path.join(this.tempDir, 'license-validator.js');
        await fs.writeFile(licenseValidatorPath, licenseValidator);
    }

    identifyProtectionTargets() {
        console.log('🎯 识别保护目标...');
        
        const coreTargets = [
            'main/main.js',
            'main/PluginManager.js',
            'main/TabManager.js',
            'main/automation/AutomationEngine.js',
            //'main/apis/SocialAutomationAPI.js',
            //'main/APIServer.js',
            //'main/plugins/uploader/xiaohongshu/main.js',
            //'main/plugins/login/base/AccountStorage.js',
            //'main/config/Config.js',
            //'main/config/DatabaseManager.js'
        ];

        const secondaryTargets = [
            //'main/SessionManager.js',
            //'main/CookieManager.js',
            //'main/HeadlessManager.js'
        ];

        console.log(`🎯 核心目标: ${coreTargets.length} 个文件`);
        console.log(`🎯 次要目标: ${secondaryTargets.length} 个文件`);
        
        return { core: coreTargets, secondary: secondaryTargets };
    }

    async obfuscateCode(targets) {
        console.log('🔀 开始代码混淆...');
        
        // 使用更温和的混淆配置，避免语法错误
        const safeObfuscationOptions = {
            compact: true,
            controlFlowFlattening: false, // 禁用可能造成问题的选项
            controlFlowFlatteningThreshold: 0,
            deadCodeInjection: false,
            debugProtection: false,
            disableConsoleOutput: true,
            identifierNamesGenerator: 'hexadecimal',
            log: false,
            numbersToExpressions: true,
            renameGlobals: false,
            selfDefending: false, // 禁用自我防护，避免语法问题
            simplify: true,
            splitStrings: true,
            splitStringsChunkLength: 10,
            stringArray: true,
            stringArrayCallsTransform: true,
            stringArrayEncoding: ['none'], // 使用更简单的编码
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 2,
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 2,
            stringArrayWrappersType: 'variable',
            stringArrayThreshold: 0.75,
            transformObjectKeys: true,
            unicodeEscapeSequence: false
        };

        await this.processTargets(targets.core, safeObfuscationOptions, '核心');
        await this.processTargets(targets.secondary, safeObfuscationOptions, '次要');
    }

    async processTargets(fileList, obfuscationOptions, type) {
        for (const file of fileList) {
            const sourceFile = path.join(this.distDir, file);
            const obfuscatedFile = path.join(this.tempDir, file.replace('.js', '_obf.js'));
            
            if (await fs.pathExists(sourceFile)) {
                console.log(`  🔀 混淆${type}文件: ${file}`);
                
                await fs.ensureDir(path.dirname(obfuscatedFile));
                
                let sourceCode = await fs.readFile(sourceFile, 'utf8');
                
                // 清理源代码，移除可能造成问题的字符
                sourceCode = this.cleanSourceCode(sourceCode);
                
                // 注入License验证到核心文件
                if (type === '核心') {
                    sourceCode = this.injectLicenseCheck(sourceCode, file);
                }
                
                try {
                    // const obfuscated = JavaScriptObfuscator.obfuscate(sourceCode, obfuscationOptions);
                    // await fs.writeFile(obfuscatedFile, obfuscated.getObfuscatedCode());
                    console.log(`  ⚠️  跳过混淆避免破坏代码: ${file}`);
                    await fs.writeFile(obfuscatedFile, sourceCode);
                } catch (obfuscateError) {
                    console.warn(`⚠️ 混淆失败，使用原文件: ${file}`);
                    console.warn(`错误: ${obfuscateError.message}`);
                    // 如果混淆失败，至少应用License注入
                    await fs.writeFile(obfuscatedFile, sourceCode);
                }
            } else {
                console.warn(`  ⚠️  文件不存在: ${sourceFile}`);
            }
        }
    }

    cleanSourceCode(sourceCode) {
        return sourceCode.replace(/[^\x00-\x7F]/g, ch => {
            return '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0');
        });
    }


    injectLicenseCheck(sourceCode, fileName) {
        const needsLicenseCheck = fileName.includes('main.js') || 
                                fileName.includes('AutomationEngine.js') ||
                                fileName.includes('APIServer.js');
        
        if (!needsLicenseCheck) return sourceCode;
        
        const licenseCheckCode = `// License验证注入 - 增强调试版本
        const { LicenseValidator } = require('../license-validator');
        (async () => {
            try {
                console.log('🔐 开始License验证...');
                await global._licenseValidator.validateLicense();
                console.log('✅ License验证通过');
            } catch (error) {
                console.error('❌ License验证失败:', error.message);
                console.error('详细错误:', error.stack);
                setTimeout(() => process.exit(1), 1000); // 延迟退出确保输出
            }
        })();

        `;
        
        return licenseCheckCode + sourceCode;
    }

    // 修改 scripts/protect-code.js 中的 compileToByteCode 方法
    async compileToByteCode(targets) {
        console.log('⚡ 在 Electron 环境下编译字节码...');
        
        const allTargets = [...targets.core, ...targets.secondary];
        
        // 创建专用的 Electron 编译脚本
        const compilerScript = path.join(this.tempDir, 'electron-compiler.js');
        
        const compilerCode = `const bytenode = require('bytenode');
    const path = require('path');
    const fs = require('fs');

    console.log('=== Electron 编译环境信息 ===');
    console.log('Node.js版本:', process.version);
    console.log('V8版本:', process.versions.v8);
    console.log('Electron版本:', process.versions.electron);

    const files = ${JSON.stringify(allTargets)};
    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
        const obfuscatedFile = path.join(__dirname, file.replace('.js', '_obf.js'));
        const jscFile = path.join(__dirname, file.replace('.js', '.jsc'));
        
        if (fs.existsSync(obfuscatedFile)) {
            try {
                console.log(\`📦 编译: \${file}\`);
                
                const jscDir = path.dirname(jscFile);
                if (!fs.existsSync(jscDir)) {
                    fs.mkdirSync(jscDir, { recursive: true });
                }
                
                // 在当前 Electron 环境中编译
                bytenode.compileFile({
                    filename: obfuscatedFile,
                    output: jscFile
                });
                
                // 立即在同一环境中验证
                console.log(\`🔍 验证: \${file}\`);
                const testResult = bytenode.runBytecodeFile(jscFile);
                
                console.log(\`✅ 编译验证成功: \${file}\`);
                successCount++;
                
                // 清理混淆文件
                fs.unlinkSync(obfuscatedFile);
                
            } catch (error) {
                console.error(\`❌ 编译失败: \${file} - \${error.message}\`);
                failCount++;
                
                // 如果字节码编译失败，保留混淆版本作为备选
                const fallbackFile = path.join(__dirname, '../protected', file);
                const fallbackDir = path.dirname(fallbackFile);
                if (!fs.existsSync(fallbackDir)) {
                    fs.mkdirSync(fallbackDir, { recursive: true });
                }
                fs.copyFileSync(obfuscatedFile, fallbackFile);
                console.log(\`📋 已创建备选版本: \${file}\`);
            }
        } else {
            console.warn(\`⚠️ 源文件不存在: \${obfuscatedFile}\`);
        }
    }

    // 复制License验证器
    const licenseValidatorSource = path.join(__dirname, 'license-validator.js');
    const licenseValidatorDest = path.join(__dirname, '../protected/license-validator.js');
    if (fs.existsSync(licenseValidatorSource)) {
        fs.copyFileSync(licenseValidatorSource, licenseValidatorDest);
        console.log('✅ License验证器已复制');
    }

    console.log(\`\n📊 编译结果: 成功 \${successCount} 个, 失败 \${failCount} 个\`);

    if (failCount === 0) {
        console.log('🎉 所有文件编译成功！');
    } else {
        console.log('⚠️ 部分文件使用备选保护方案');
    }

    process.exit(0);
    `;

        await fs.writeFile(compilerScript, compilerCode);
        
        try {
            console.log('🚀 启动 Electron 字节码编译器...');
            
            // 使用项目中的 Electron 执行编译
            execSync(`"${path.join(this.rootDir, 'node_modules/.bin/electron')}" "${compilerScript}"`, {
                stdio: 'inherit',
                cwd: this.rootDir,
                timeout: 180000,
                env: {
                    ...process.env,
                    NODE_ENV: 'production'
                }
            });
            
            console.log('✅ Electron 字节码编译完成');
            
        } catch (error) {
            console.error('❌ Electron 字节码编译失败:', error.message);
            throw error;
        }
    }

    async generateLoaders(targets) {
        console.log('📜 生成加载器...');
        
        const allTargets = [...targets.core, ...targets.secondary];
        
        for (const file of allTargets) {
            const loaderPath = path.join(this.protectedDir, file);
            const jscFile = file.replace('.js', '.jsc');
            const jscPath = path.join(this.tempDir, jscFile);
            
            if (await fs.pathExists(jscPath)) {
                await fs.ensureDir(path.dirname(loaderPath));
                
                // 🔥 关键修复：将字节码文件复制到 protected 目录下
                const protectedJscPath = path.join(this.protectedDir, jscFile);
                await fs.ensureDir(path.dirname(protectedJscPath));
                await fs.copy(jscPath, protectedJscPath);
                
                // 🔥 修复加载器路径，使用相对路径
                const relativePath = path.relative(path.dirname(loaderPath), protectedJscPath);
                
                const loaderCode = `// Protected by SMA Protection System - Debug Version
                const bytenode = require('bytenode');
                const path = require('path');

                console.log('🚀 加载保护模块: ${file}');
                console.log('字节码路径:', path.join(__dirname, '${relativePath.replace(/\\/g, '/')}'));

                try {
                    const result = bytenode.runBytecodeFile(path.join(__dirname, '${relativePath.replace(/\\/g, '/')}'));
                    console.log('✅ 模块加载成功: ${file}');
                    module.exports = result;
                } catch (error) {
                    console.error('❌ 字节码加载失败:', '${file}');
                    console.error('错误信息:', error.message);
                    console.error('错误堆栈:', error.stack);
                    process.exit(1);
                }`;
                
                await fs.writeFile(loaderPath, loaderCode);
                console.log(`  📜 生成加载器: ${file}`);
            }
        }
    }

    async copyResources(targets) {
        console.log('📋 复制其他资源...');
        
        const allTargets = new Set([...targets.core, ...targets.secondary]);
        const allFiles = await this.getAllFiles(this.distDir);
        
        for (const file of allFiles) {
            const relativePath = path.relative(this.distDir, file);
            
            if (!allTargets.has(relativePath) && !relativePath.includes('.map')) {
                const destPath = path.join(this.protectedDir, relativePath);
                
                await fs.ensureDir(path.dirname(destPath));
                await fs.copy(file, destPath);
            }
        }
        
        const tempJscFiles = await this.getAllFiles(this.tempDir, '.jsc');
        for (const jscFile of tempJscFiles) {
            const relativePath = path.relative(this.tempDir, jscFile);
            const destPath = path.join(this.protectedDir, relativePath);
            
            await fs.ensureDir(path.dirname(destPath));
            await fs.copy(jscFile, destPath);
        }
    }

    async validateProtection() {
        console.log('🔍 验证保护结果...');
        
        const requiredFiles = [
            'protected/main/main.js',
            'protected/license-validator.js'
        ];
        
        const issues = [];
        
        for (const file of requiredFiles) {
            const fullPath = path.join(this.rootDir, file);
            if (!await fs.pathExists(fullPath)) {
                issues.push(`缺失文件: ${file}`);
            }
        }
        
        if (issues.length > 0) {
            console.error('❌ 保护验证失败:');
            issues.forEach(issue => console.error(`   ${issue}`));
            throw new Error('保护结果不完整');
        }
        
        console.log('✅ 保护验证通过');
    }

    async getAllFiles(dir, extension = null) {
        const files = [];
        
        if (!await fs.pathExists(dir)) {
            return files;
        }
        
        const items = await fs.readdir(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = await fs.stat(fullPath);
            
            if (stat.isDirectory()) {
                files.push(...await this.getAllFiles(fullPath, extension));
            } else if (!extension || fullPath.endsWith(extension)) {
                files.push(fullPath);
            }
        }
        
        return files;
    }
}

async function main() {
    const protector = new AdvancedCodeProtector();
    await protector.protect();
}

if (require.main === module) {
    main().catch(error => {
        console.error('保护脚本执行失败:', error);
        process.exit(1);
    });
}

module.exports = { AdvancedCodeProtector };