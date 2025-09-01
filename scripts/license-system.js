// scripts/license-system.js - License管理系统
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');

class LicenseManager {
    constructor() {
        // 生成密钥对（实际使用时应该用更安全的方式管理私钥）
        this.keyPair = this.generateKeyPair();
        this.publicKey = this.keyPair.publicKey;
        this.privateKey = this.keyPair.privateKey;
    }

    generateKeyPair() {
        return crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
    }

    // 生成License文件
    generateLicense(email, expiryDate = null) {
        try {
            const licenseData = {
                email: email,
                type: expiryDate ? 'full' : 'trial',
                generatedAt: new Date().toISOString(),
                expiryDate: expiryDate ? expiryDate.toISOString() : null
            };

            // 创建数字签名
            const sign = crypto.createSign('RSA-SHA256');
            sign.update(email);
            const signature = sign.sign(this.privateKey, 'base64');

            const license = {
                email: email,
                signature: signature,
                ...licenseData
            };

            console.log('✅ License生成成功:');
            console.log(`   邮箱: ${email}`);
            console.log(`   类型: ${licenseData.type}`);
            console.log(`   过期时间: ${licenseData.expiryDate || '无'}`);

            return license;

        } catch (error) {
            console.error('❌ License生成失败:', error);
            throw error;
        }
    }

    // 验证License
    verifyLicense(licenseData) {
        try {
            const { email, signature } = licenseData;
            
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(email);
            
            const isValid = verify.verify(this.publicKey, signature, 'base64');
            
            if (!isValid) {
                throw new Error('License签名验证失败');
            }

            // 检查过期时间
            if (licenseData.expiryDate) {
                const expiryDate = new Date(licenseData.expiryDate);
                if (new Date() > expiryDate) {
                    throw new Error('License已过期');
                }
            }

            return { valid: true, license: licenseData };

        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // 保存License到文件
    async saveLicenseToFile(license, filePath) {
        await fs.writeJson(filePath, license, { spaces: 2 });
        console.log(`✅ License已保存到: ${filePath}`);
    }

    // 从文件加载License
    async loadLicenseFromFile(filePath) {
        if (!await fs.pathExists(filePath)) {
            throw new Error('License文件不存在');
        }

        const license = await fs.readJson(filePath);
        return license;
    }

    // 生成公钥给客户端
    getPublicKey() {
        return this.publicKey;
    }

    // 生成激活码（用于在线激活）
    generateActivationCode(email) {
        const data = {
            email: email,
            timestamp: Date.now(),
            nonce: crypto.randomBytes(16).toString('hex')
        };

        const sign = crypto.createSign('RSA-SHA256');
        sign.update(JSON.stringify(data));
        const signature = sign.sign(this.privateKey, 'base64');

        const activationCode = Buffer.from(JSON.stringify({
            data: data,
            signature: signature
        })).toString('base64');

        return activationCode;
    }

    // 验证激活码
    verifyActivationCode(activationCode) {
        try {
            const decoded = JSON.parse(Buffer.from(activationCode, 'base64').toString());
            const { data, signature } = decoded;

            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(JSON.stringify(data));
            
            const isValid = verify.verify(this.publicKey, signature, 'base64');
            
            if (!isValid) {
                throw new Error('激活码签名无效');
            }

            // 检查时效性（激活码30天内有效）
            const thirtyDays = 30 * 24 * 60 * 60 * 1000;
            if (Date.now() - data.timestamp > thirtyDays) {
                throw new Error('激活码已过期');
            }

            return { valid: true, email: data.email };

        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
}

// 客户端License验证器（嵌入到应用中）
class ClientLicenseValidator {
    constructor() {
        // 这个公钥会在保护脚本中替换为真实的公钥
        this.publicKey = `-----BEGIN PUBLIC KEY-----
{{PUBLIC_KEY_PLACEHOLDER}}
-----END PUBLIC KEY-----`;
        this.trialDays = 30;
        this.dailyLimit = 10;
        
        // 使用用户目录存储License信息
        const os = require('os');
        this.licenseFile = path.join(os.homedir(), '.sma-license.json');
        this.trialFile = path.join(os.homedir(), '.sma-trial.json');
        this.usageFile = path.join(os.homedir(), '.sma-usage.json');
    }

    async validateLicense() {
        try {
            console.log('🔐 开始License验证...');

            // 1. 检查是否有有效的正式License
            if (await this.hasValidFullLicense()) {
                console.log('✅ 正式License验证通过');
                return { valid: true, type: 'full' };
            }

            // 2. 检查试用状态
            const trialStatus = await this.checkTrialStatus();
            
            if (trialStatus.expired) {
                throw new Error(`试用期已结束，请购买正式版License`);
            }

            // 3. 检查每日使用限制
            const usageStatus = await this.checkDailyUsage();
            
            if (!usageStatus.canUse) {
                throw new Error(`试用版每日使用已达上限 (${this.dailyLimit}次)，请明日再试或购买正式版`);
            }

            console.log(`✅ 试用License验证通过 (剩余${trialStatus.remaining}天，今日还可使用${usageStatus.remaining}次)`);
            return { 
                valid: true, 
                type: 'trial', 
                remaining: trialStatus.remaining,
                dailyRemaining: usageStatus.remaining
            };

        } catch (error) {
            console.error('❌ License验证失败:', error.message);
            
            // 显示友好的错误提示
            this.showLicenseError(error.message);
            
            // 延迟3秒后退出
            setTimeout(() => {
                process.exit(1);
            }, 3000);
            
            throw error;
        }
    }

    async hasValidFullLicense() {
        try {
            if (!fs.existsSync(this.licenseFile)) {
                return false;
            }

            const licenseData = await fs.readJson(this.licenseFile);
            const { email, signature, expiryDate } = licenseData;

            // 验证签名
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(email);
            
            if (!verify.verify(this.publicKey, signature, 'base64')) {
                console.log('⚠️ License签名验证失败');
                return false;
            }

            // 检查过期时间
            if (expiryDate && new Date() > new Date(expiryDate)) {
                console.log('⚠️ License已过期');
                return false;
            }

            return true;

        } catch (error) {
            console.log('⚠️ License文件读取失败:', error.message);
            return false;
        }
    }

    async checkTrialStatus() {
        try {
            if (!fs.existsSync(this.trialFile)) {
                // 首次运行，创建试用记录
                const trialData = {
                    startDate: new Date().toISOString(),
                    machineId: this.getMachineId(),
                    version: '1.0.0'
                };
                
                await fs.writeJson(this.trialFile, trialData);
                console.log('🎉 开始30天免费试用');
                
                return { expired: false, remaining: this.trialDays };
            }

            const trialData = await fs.readJson(this.trialFile);

            // 验证机器ID防止复制试用
            if (trialData.machineId !== this.getMachineId()) {
                throw new Error('试用已绑定其他设备，无法在当前设备使用');
            }

            const startDate = new Date(trialData.startDate);
            const now = new Date();
            const daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

            return {
                expired: daysPassed >= this.trialDays,
                remaining: Math.max(0, this.trialDays - daysPassed),
                daysPassed: daysPassed
            };

        } catch (error) {
            console.error('试用状态检查失败:', error);
            throw error;
        }
    }

    async checkDailyUsage() {
        const today = new Date().toDateString();

        try {
            let usageData = { date: today, count: 0 };

            if (fs.existsSync(this.usageFile)) {
                const existing = await fs.readJson(this.usageFile);
                if (existing.date === today) {
                    usageData = existing;
                }
            }

            const canUse = usageData.count < this.dailyLimit;

            if (canUse) {
                // 记录本次使用
                usageData.count++;
                await fs.writeJson(this.usageFile, usageData);
            }

            return {
                canUse,
                used: usageData.count,
                limit: this.dailyLimit,
                remaining: Math.max(0, this.dailyLimit - usageData.count)
            };

        } catch (error) {
            console.error('使用次数检查失败:', error);
            throw error;
        }
    }

    getMachineId() {
        const os = require('os');
        const crypto = require('crypto');
        
        // 使用多个硬件特征生成唯一ID
        const networkInterfaces = os.networkInterfaces();
        const mac = Object.values(networkInterfaces)
            .flat()
            .find(iface => iface && !iface.internal && iface.mac !== '00:00:00:00:00:00')?.mac;

        const machineInfo = {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            mac: mac || 'unknown',
            homedir: os.homedir()
        };

        return crypto.createHash('sha256')
            .update(JSON.stringify(machineInfo))
            .digest('hex')
            .substring(0, 32);
    }

    showLicenseError(message) {
        console.log('\n' + '='.repeat(60));
        console.log('🚫 自媒体自动化运营系统 - License验证失败');
        console.log('='.repeat(60));
        console.log(`❌ ${message}`);
        console.log('');
        console.log('💡 解决方案:');
        console.log('   1. 购买正式版License: https://your-website.com/purchase');
        console.log('   2. 联系客服获取帮助: endian2077@qq.com');
        console.log('   3. 查看使用文档: https://your-website.com/docs');
        console.log('='.repeat(60));
        console.log('应用将在 3 秒后自动退出...\n');
    }

    // 安装License文件（供用户手动调用）
    async installLicense(licenseContent) {
        try {
            let licenseData;
            
            if (typeof licenseContent === 'string') {
                // 尝试解析JSON或Base64
                try {
                    licenseData = JSON.parse(licenseContent);
                } catch {
                    // 尝试Base64解码
                    const decoded = Buffer.from(licenseContent, 'base64').toString();
                    licenseData = JSON.parse(decoded);
                }
            } else {
                licenseData = licenseContent;
            }

            // 验证License格式
            if (!licenseData.email || !licenseData.signature) {
                throw new Error('License格式无效');
            }

            // 验证签名
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(licenseData.email);
            
            if (!verify.verify(this.publicKey, licenseData.signature, 'base64')) {
                throw new Error('License签名验证失败');
            }

            // 保存License
            await fs.writeJson(this.licenseFile, licenseData);
            
            console.log('✅ License安装成功!');
            console.log(`   邮箱: ${licenseData.email}`);
            console.log(`   类型: 正式版`);
            
            return true;

        } catch (error) {
            console.error('❌ License安装失败:', error.message);
            return false;
        }
    }
}

// 命令行工具
async function main() {
    const command = process.argv[2];
    const licenseManager = new LicenseManager();

    switch (command) {
        case 'generate':
            const email = process.argv[3];
            if (!email) {
                console.error('请提供邮箱地址: npm run license generate user@example.com');
                process.exit(1);
            }
            
            const license = licenseManager.generateLicense(email);
            const filename = `license-${email.replace('@', '_').replace('.', '_')}.json`;
            await licenseManager.saveLicenseToFile(license, filename);
            break;

        case 'verify':
            const filePath = process.argv[3];
            if (!filePath) {
                console.error('请提供License文件路径');
                process.exit(1);
            }
            
            const licenseData = await licenseManager.loadLicenseFromFile(filePath);
            const result = licenseManager.verifyLicense(licenseData);
            
            if (result.valid) {
                console.log('✅ License验证成功');
            } else {
                console.log('❌ License验证失败:', result.error);
            }
            break;

        case 'activation-code':
            const userEmail = process.argv[3];
            if (!userEmail) {
                console.error('请提供邮箱地址');
                process.exit(1);
            }
            
            const activationCode = licenseManager.generateActivationCode(userEmail);
            console.log('激活码:', activationCode);
            break;

        case 'public-key':
            console.log('公钥:');
            console.log(licenseManager.getPublicKey());
            break;

        default:
            console.log('使用方法:');
            console.log('  npm run license generate <email>     - 生成License');
            console.log('  npm run license verify <file>       - 验证License');
            console.log('  npm run license activation-code <email> - 生成激活码');
            console.log('  npm run license public-key          - 显示公钥');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { LicenseManager, ClientLicenseValidator };