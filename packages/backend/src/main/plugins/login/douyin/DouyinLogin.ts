// src/main/plugins/login/douyin/DouyinLogin.ts
import {
    PluginLogin,
    LoginParams,
    LoginResult,
    PluginType
} from '../../../../types/pluginInterface';

export class DouyinLogin implements PluginLogin {
    public readonly platform = 'douyin';
    public readonly name = '抖音登录';
    public readonly type = PluginType.LOGIN;

    private tabManager!: any;  // TabManager 实例
    private pendingLogins: Map<string, {
        tabId: string;
        resolve: (result: LoginResult) => void;
        reject: (error: Error) => void;
        timeout: NodeJS.Timeout;
    }> = new Map();

    async init(tabManager: any): Promise<void> {
        this.tabManager = tabManager;
        //console.log('✅ 抖音登录插件初始化完成');
    }

    async destroy(): Promise<void> {
        // 清理所有等待中的登录
        for (const [userId, pending] of this.pendingLogins) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('插件正在销毁'));
        }
        this.pendingLogins.clear();
        //console.log('🧹 抖音登录插件已销毁');
    }

    /**
     * 🔥 开始登录流程 - 获取二维码
     */
    async startLogin(params: LoginParams): Promise<LoginResult> {
        try {
            console.log(`🔐 开始抖音登录流程: ${params.userId}`);

            console.log(`📱 抖音登录标签页已创建: ${params.tabId}`);

            const qrCodeUrl = await this.getQRCode(params.tabId);

            if (!qrCodeUrl) {
                //await this.tabManager.closeTab(params.tabId,true);
                return {
                    success: false,
                    error: '未找到登录二维码'
                };
            }

            console.log(`🔍 抖音登录二维码已找到`);

            return {
                success: true,
                qrCodeUrl: qrCodeUrl,
                tabId: params.tabId
            };

        } catch (error) {
            console.error('❌ 抖音登录启动失败:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '登录启动失败'
            };
        }
    }
    /**
     * 🔥 等待登录完成（二维码消失 + 身份验证完成）
     */
    async waitForLoginComplete(tabId: string, timeout: number = 200000): Promise<boolean> {
        console.log(`⏳ 开始等待抖音登录完成...`);
        
        const startTime = Date.now();
        let qrCodeDisappeared = false;
        
        while (Date.now() - startTime < timeout) {
            try {
                // 步骤1: 检查二维码是否消失
                if (!qrCodeDisappeared) {
                    const hasQrCode = await this.checkQrCodeExists(tabId);
                    if (!hasQrCode) {
                        console.log(`✅ 二维码已消失，等待身份验证...`);
                        qrCodeDisappeared = true;
                    }
                }
                
                // 步骤2: 二维码消失后，检查身份验证是否完成
                if (qrCodeDisappeared) {
                    const authCompleted = await this.checkAuthenticationCompleted(tabId);
                    if (authCompleted) {
                        console.log(`✅ 抖音登录完全成功（身份验证已完成）！`);
                        return true;
                    }
                }
                
                // 每3秒检查一次
                await new Promise(resolve => setTimeout(resolve, 3000));
                
            } catch (error) {
                console.warn(`⚠️ 检测登录状态失败:`, error);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        console.log(`❌ 抖音登录等待超时`);
        return false;
    }
    /**
     * 🔥 检查身份验证是否已完成（验证对话框消失）
     */
    private async checkAuthenticationCompleted(tabId: string): Promise<boolean> {
        const checkScript = `
            (function() {
                // 检查身份验证对话框是否存在
                // 方法1: 通过class属性包含关键词
                let authDialog = document.querySelector('div[class*="身份验证"]');
                
                // 方法2: 遍历所有div，检查文本内容
                if (!authDialog) {
                    const allDivs = document.querySelectorAll('div');
                    for (let div of allDivs) {
                        const text = div.textContent || div.innerText || '';
                        if (text.includes('身份验证') || 
                            text.includes('接收短信验证码') || 
                            text.includes('验证登录密码') || 
                            text.includes('发送短信验证')) {
                            authDialog = div;
                            break;
                        }
                    }
                }
                
                // 方法3: 检查特定的对话框容器（根据文档结构）
                if (!authDialog) {
                    authDialog = document.querySelector('article') || 
                                document.querySelector('.modal') || 
                                document.querySelector('[role="dialog"]');
                }
                
                console.log('身份验证对话框存在:', !!authDialog);
                console.log('找到的元素:', authDialog);
                
                // 对话框不存在说明验证已完成
                return !authDialog;
            })()
        `;

        try {
            const authCompleted = await this.tabManager.executeScript(tabId, checkScript);
            return authCompleted === true;
        } catch (error) {
            return false; // 发生错误时假设验证未完成
        }
    }
    /**
     * 🔥 检查二维码是否仍然存在
     */
    private async checkQrCodeExists(tabId: string): Promise<boolean> {
        const checkScript = `
            (function() {
                const qrCodeImg1 = document.querySelector('#douyin_login_comp_scan_code img[src^="data:image/png;base64"]');
                if (qrCodeImg1 && qrCodeImg1.src) return true;
                
                const qrCodeImg2 = document.querySelector('#animate_qrcode_container img[src^="data:image/png;base64"]');
                if (qrCodeImg2 && qrCodeImg2.src) return true;
                
                return false;
            })()
        `;

        try {
            const hasQrCode = await this.tabManager.executeScript(tabId, checkScript);
            return hasQrCode === true;
        } catch (error) {
            return true; // 发生错误时假设二维码仍存在
        }
    }
    /**
     * 🔥 取消登录
     */
    async cancelLogin(tabId: string): Promise<void> {
        try {
            // 找到对应的等待中登录
            let userIdToCancel = null;
            for (const [userId, pending] of this.pendingLogins) {
                if (pending.tabId === tabId) {
                    userIdToCancel = userId;
                    break;
                }
            }

            if (userIdToCancel) {
                const pending = this.pendingLogins.get(userIdToCancel);
                if (pending) {
                    clearTimeout(pending.timeout);
                    this.pendingLogins.delete(userIdToCancel);

                    pending.resolve({
                        success: false,
                        error: '用户取消登录'
                    });
                }
            }

            // 关闭标签页
            await this.tabManager.closeTab(tabId);
            console.log(`🚫 抖音登录已取消: ${tabId}`);

        } catch (error) {
            console.error('❌ 取消登录失败:', error);
        }
    }
    /**
     * 🔥 获取二维码
     * https://www.douyin.com/jingxuan?=1

    private async getQRCode(tabId: string): Promise<string | null> {
        console.log('🔍 查找抖音登录二维码...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const qrCodeScript = `
            (function() {
                // 方法1: 查找扫码登录容器中的二维码图片
                const qrCodeImg1 = document.querySelector('#douyin_login_comp_scan_code img[src^="data:image/png;base64"]');
                if (qrCodeImg1 && qrCodeImg1.src) {
                    console.log('✅ 找到抖音二维码 (扫码登录容器):', qrCodeImg1.src.substring(0, 50) + '...');
                    return qrCodeImg1.src;
                }
                
                // 方法2: 查找动画二维码容器中的图片
                const qrCodeImg2 = document.querySelector('#animate_qrcode_container img[src^="data:image/png;base64"]');
                if (qrCodeImg2 && qrCodeImg2.src) {
                    console.log('✅ 找到抖音二维码 (动画容器):', qrCodeImg2.src.substring(0, 50) + '...');
                    return qrCodeImg2.src;
                }
                
                console.log('❌ 未找到抖音二维码');
                return null;
            })()
        `;

        // 🔥 等待二维码出现，最多尝试 20 次
        let attempts = 0;
        while (attempts < 20) {
            try {
                const qrCodeUrl = await this.tabManager.executeScript(tabId, qrCodeScript);
                if (qrCodeUrl) {
                    return qrCodeUrl;
                }
            } catch (error) {
                console.warn(`二维码查找失败 (尝试 ${attempts + 1}):`, error);
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        return null;
    }
    
    /**
     * 🔥 获取二维码
     * 'https://creator.douyin.com/'
    */
    private async getQRCode(tabId: string): Promise<string | null> {
        console.log('🔍 查找抖音登录二维码...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        const qrCodeScript = `
            (function() {
                const element = document.querySelector('img[aria-label="二维码"]');
                if (element && element.src) {
                    console.log('✅ 找到抖音二维码 (aria-label):', element.src);
                    return element.src;
                }
                console.log('❌ 未找到抖音二维码 (aria-label)');
                return null;
            })()
        `;

        // 🔥 等待二维码出现，最多尝试 20 次
        let attempts = 0;
        while (attempts < 20) {
            try {
                const qrCodeUrl = await this.tabManager.executeScript(tabId, qrCodeScript);
                if (qrCodeUrl) {
                    return qrCodeUrl;
                }
            } catch (error) {
                console.warn(`二维码查找失败 (尝试 ${attempts + 1}):`, error);
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        return null;
    } 
    
}