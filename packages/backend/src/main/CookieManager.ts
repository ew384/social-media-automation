import { Session } from 'electron';
import * as fs from 'fs';
import { CookieData, StorageOrigin } from '../types';

export class CookieManager {
    /**
     * 从文件加载Cookie到Session
     */
    async loadCookiesToSession(session: Session, cookieFilePath: string): Promise<void> {
        if (!fs.existsSync(cookieFilePath)) {
            throw new Error(`Cookie file not found: ${cookieFilePath}`);
        }

        try {
            const cookieData: CookieData = JSON.parse(fs.readFileSync(cookieFilePath, 'utf8'));

            if (!cookieData.cookies || !Array.isArray(cookieData.cookies)) {
                throw new Error('Invalid cookie file format');
            }

            console.log(`📁 Loading ${cookieData.cookies.length} cookies from file...`);

            // 清除现有Cookie（可选）
            // await session.clearStorageData();

            let successCount = 0;
            let errorCount = 0;

            for (const cookie of cookieData.cookies) {
                try {
                    // 确保必需的字段不为undefined
                    if (!cookie.domain) {
                        console.warn(`⚠️ Skipping cookie ${cookie.name}: missing domain`);
                        errorCount++;
                        continue;
                    }

                    await session.cookies.set({
                        url: this.buildCookieUrl(cookie.domain),
                        name: cookie.name,
                        value: cookie.value,
                        domain: cookie.domain,
                        path: cookie.path || '/',
                        secure: cookie.secure || false,
                        httpOnly: cookie.httpOnly || false,
                        expirationDate: cookie.expires,
                        sameSite: this.normalizeSameSite(cookie.sameSite)
                    });
                    successCount++;
                } catch (error) {
                    console.warn(`⚠️ Failed to set cookie ${cookie.name}:`, error);
                    errorCount++;
                }
            }

            console.log(`✅ Loaded ${successCount} cookies successfully, ${errorCount} failed`);
            // 恢复localStorage数据
            if (cookieData.origins && cookieData.origins.length > 0) {
                console.log(`📱 开始恢复 ${cookieData.origins.length} 个域名的localStorage...`);
                
                let localStorageSuccessCount = 0;
                let localStorageErrorCount = 0;
                
                for (const originData of cookieData.origins) {
                    if (originData.localStorage && originData.localStorage.length > 0) {
                        try {
                            const { WebContentsView } = require('electron');
                            const tempView = new WebContentsView({
                                webPreferences: { 
                                    session: session, 
                                    nodeIntegration: false,
                                    contextIsolation: true,
                                    sandbox: false
                                }
                            });
                            
                            await tempView.webContents.loadURL(originData.origin);
                            
                            await tempView.webContents.executeJavaScript(`
                                const data = ${JSON.stringify(originData.localStorage)};
                                data.forEach(item => {
                                    localStorage.setItem(item.name, item.value);
                                });
                                console.log('恢复了', data.length, '个localStorage条目');
                            `);
                            
                            console.log(`📱 ${originData.origin}: 恢复了 ${originData.localStorage.length} 个localStorage条目`);
                            localStorageSuccessCount += originData.localStorage.length;
                            
                            tempView.webContents.close();
                        } catch (error) {
                            console.warn(`⚠️ 恢复 ${originData.origin} localStorage失败:`, error);
                            localStorageErrorCount++;
                        }
                    }
                }
                
                console.log(`✅ localStorage恢复完成: ${localStorageSuccessCount} 成功, ${localStorageErrorCount} 失败`);
            }            
        } catch (error) {
            console.error('❌ Failed to load cookies:', error);
            throw error;
        }
    }

    /**
     * 从Session导出Cookie到文件
     */
    async saveCookiesFromSession(session: Session, cookieFilePath: string, domain?: string): Promise<void> {
        try {
            const filter = domain ? { domain } : {};
            const cookies = await session.cookies.get(filter);

            // 获取localStorage数据
            const origins: StorageOrigin[] = [];
            const allCookies = await session.cookies.get({});
            const domains = [...new Set(allCookies.map(cookie => {
                const cleanDomain = cookie.domain?.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
                return cleanDomain ? `https://${cleanDomain}` : null;
            }).filter((domain): domain is string => domain !== null))];

            console.log(`📱 检测到 ${domains.length} 个域名，开始获取localStorage...`);

            for (const origin of domains) {
                try {
                    const { WebContentsView } = require('electron');
                    const tempView = new WebContentsView({
                        webPreferences: { 
                            session: session, 
                            nodeIntegration: false,
                            contextIsolation: true,
                            sandbox: false
                        }
                    });
                    
                    await tempView.webContents.loadURL(origin);
                    
                    const localStorage = await tempView.webContents.executeJavaScript(`
                        JSON.stringify(Object.keys(localStorage).map(key => ({
                            name: key,
                            value: localStorage.getItem(key)
                        })))
                    `);
                    
                    const localStorageData = JSON.parse(localStorage);
                    
                    if (localStorageData.length > 0) {
                        origins.push({
                            origin: origin,
                            localStorage: localStorageData
                        });
                        console.log(`📱 ${origin}: 获取到 ${localStorageData.length} 个localStorage条目`);
                    }
                    
                    tempView.webContents.close();
                } catch (error) {
                    console.warn(`⚠️ 获取 ${origin} localStorage失败:`, error);
                }
            }

            const cookieData: CookieData = {
                cookies: cookies.map(cookie => ({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain || '',
                    path: cookie.path,
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly,
                    expires: cookie.expirationDate,
                    sameSite: this.convertSameSiteForPlaywright(cookie.sameSite) as any
                })).filter(cookie => cookie.domain),
                origins: origins
            };

            // 确保目录存在
            const dir = cookieFilePath.substring(0, cookieFilePath.lastIndexOf('/'));
            if (dir && !fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(cookieFilePath, JSON.stringify(cookieData, null, 2));
            console.log(`💾 Saved ${cookies.length} cookies to file: ${cookieFilePath}`);
        } catch (error) {
            console.error('❌ Failed to save cookies:', error);
            throw error;
        }
    }

    /**
     * 转换 sameSite 值为 Playwright 兼容格式
     */
    private convertSameSiteForPlaywright(sameSite?: string): 'Strict' | 'Lax' | 'None' {
        switch (sameSite) {
            case 'strict':
            case 'Strict':
                return 'Strict';
            case 'no_restriction':
            case 'None':
            case 'none':
                return 'None';
            case 'lax':
            case 'Lax':
            case 'unspecified':
            default:
                return 'Lax';  // 默认值
        }
    }
    /**
     * 清除Session中的所有Cookie
     */
    async clearSessionCookies(session: Session, domain?: string): Promise<void> {
        try {
            if (domain) {
                const cookies = await session.cookies.get({ domain });
                for (const cookie of cookies) {
                    await session.cookies.remove(`https://${cookie.domain}`, cookie.name);
                }
                console.log(`🧹 Cleared ${cookies.length} cookies for domain: ${domain}`);
            } else {
                await session.clearStorageData();
                console.log('🧹 Cleared all session cookies and data');
            }
        } catch (error) {
            console.error('❌ Failed to clear cookies:', error);
            throw error;
        }
    }

    /**
     * 构建Cookie URL
     */
    private buildCookieUrl(domain: string): string {
        // 确保域名格式正确
        const cleanDomain = domain.startsWith('.') ? domain.substring(1) : domain;
        return `https://${cleanDomain}`;
    }

    /**
     * 标准化SameSite值
     */
    private normalizeSameSite(sameSite?: string): 'unspecified' | 'no_restriction' | 'lax' | 'strict' {
        switch (sameSite) {
            case 'no_restriction':
            case 'None':
            case 'none':
                return 'no_restriction';
            case 'lax':
            case 'Lax':
                return 'lax';
            case 'strict':
            case 'Strict':
                return 'strict';
            default:
                return 'lax';  // 默认改为 lax 而不是 unspecified
        }
    }
}