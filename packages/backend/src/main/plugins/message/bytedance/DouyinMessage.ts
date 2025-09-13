// src/main/plugins/message/bytedance/DouyinMessage.ts
import {
    PluginMessage,
    PluginType,
    MessageSyncParams,
    MessageSyncResult,
    MessageSendParams,
    MessageSendResult,
    UserInfo,
    Message,
    UserMessageThread
} from '../../../../types/pluginInterface';
import * as fs from 'fs';
import * as path from 'path';

export class DouyinMessage implements PluginMessage {
    public readonly platform = 'douyin';
    public readonly name = '抖音私信插件';
    public readonly type = PluginType.MESSAGE;

    private tabManager!: any;  // TabManager 实例
    private interceptorData: Map<string, any> = new Map(); // 拦截器数据存储
    private isInterceptorSetup: Map<string, boolean> = new Map(); // 每个tab的拦截器状态

    async init(tabManager: any): Promise<void> {
        this.tabManager = tabManager;
        console.log('✅ 抖音私信插件初始化完成');
    }

    async destroy(): Promise<void> {
        this.interceptorData.clear();
        this.isInterceptorSetup.clear();
        console.log('🧹 抖音私信插件已销毁');
    }
    /**
     * 🔥 抖音页面就绪检测
     */
    async pageReady(tabId: string, maxWaitTime: number = 30000): Promise<boolean> {
        const startTime = Date.now();
        const checkInterval = 1000;
        
        console.log(`⏳ 检测抖音页面就绪状态...`);
        
        const checkScript = `
            (function() {
                // 检测抖音消息列表容器和用户项
                const listContainer = document.querySelector('.ReactVirtualized__Grid__innerScrollContainer');
                const userItems = document.querySelectorAll('li.semi-list-item');
                
                return {
                    ready: listContainer !== null && userItems.length >= 0, // 容器存在即可，用户数可以为0
                    listContainer: !!listContainer,
                    userItemsCount: userItems.length
                };
            })()
        `;
        
        // 轮询检测
        while (Date.now() - startTime < maxWaitTime) {
            try {
                const result = await this.tabManager.executeScript(tabId, checkScript);
                
                if (result && result.ready) {
                    const elapsedTime = Date.now() - startTime;
                    console.log(`✅ 抖音页面就绪: 容器存在, 用户数 ${result.userItemsCount} (耗时 ${elapsedTime}ms)`);
                    return true;
                }
                
                // 每5秒输出一次状态
                if ((Date.now() - startTime) % 5000 < checkInterval) {
                    const waitTime = Math.round((Date.now() - startTime) / 1000);
                    console.log(`⏳ 抖音页面还在加载... 已等待 ${waitTime}s`);
                }
                
            } catch (error) {
                console.warn(`⚠️ 抖音页面检测异常:`, error instanceof Error ? error.message : 'unknown');
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        const totalWaitTime = Math.round((Date.now() - startTime) / 1000);
        console.warn(`⏰ 抖音页面就绪检测超时 (等待了 ${totalWaitTime}s)`);
        return false;
    }
    private generateDouyinSyncScript(accountId: string): string {
        const scriptPath = path.join(__dirname, './scripts/douyin-sync.js');
        let script = fs.readFileSync(scriptPath, 'utf-8');
        
        // 🔥 传入 accountId 参数
        script = script.replace(/\/\/ ACCOUNT_ID_PLACEHOLDER/g, `'${accountId}'`);
        return script;
    }
    /**
     * 🔥 核心同步方法 - 使用网络拦截器
     */
    async syncMessages(params: MessageSyncParams): Promise<MessageSyncResult> {
        try {
            await new Promise(resolve => setTimeout(resolve, 3000));
            console.log(`🔄 开始抖音消息同步: ${params.accountId}`);
            await this.setupDouyinNetworkInterceptor(params.tabId, params.accountId);

            // 🔥 2. 读取并执行同步脚本
            const syncScript = this.generateDouyinSyncScript(params.accountId);
            const scriptResult = await this.tabManager.executeScript(params.tabId, syncScript);

            // 🔥 3. 解析结果（复用现有的 parseMessageData 逻辑）
            if (scriptResult && scriptResult.success && scriptResult.users) {
                const threads = this.convertToStandardFormat(scriptResult.users, params.platform, params.accountId);
                return {
                    success: true,
                    threads: threads,
                    newMessages: this.countTotalMessages(threads),
                    updatedThreads: threads.length,
                    syncTime: new Date().toISOString()
                };
            } else {
                // 处理无用户情况
                return {
                    success: true,
                    threads: [],
                    newMessages: 0,
                    updatedThreads: 0,
                    message: scriptResult.message || '该账号暂无私信用户',
                    syncTime: new Date().toISOString()
                };
            }

        } catch (error) {
            console.error('❌ 抖音消息同步失败:', error);
            return {
                success: false,
                threads: [],
                newMessages: 0,
                updatedThreads: 0,
                errors: [error instanceof Error ? error.message : 'unknown error'],
                syncTime: new Date().toISOString()
            };
        }
    }

    /**
     * 🔥 核心方法1: 设置抖音网络拦截器
     */
    private async setupDouyinNetworkInterceptor(tabId: string, accountId: string): Promise<void> {
        // 检查是否已经设置过拦截器
        if (this.isInterceptorSetup.get(tabId)) {
            console.log('🔄 抖音拦截器已存在，跳过设置');
            return;
        }

        console.log('🔍 设置抖音网络拦截器...');

        const interceptorScript = `
            (function createDouyinNetworkInterceptor() {
                console.log('🔧 创建抖音网络拦截器...');
                
                // 防止重复注入
                if (window.__douyinInterceptorSetup) {
                    console.log('🔄 拦截器已存在');
                    return true;
                }
                window.__douyinInterceptorSetup = true;
                
                // 初始化数据存储
                window.__douyinInterceptorData = {
                    interceptedData: new Map(),
                    currentUserIndex: 0,
                    processing: false,
                    accountId: '${accountId}'
                };
                
                // 🔥 工具函数
                function parseInterceptedMessages(responseText, userId) {
                    try {
                        const messages = [];
                        const textMatches = responseText.match(/"text":"([^"\\\\]*(\\\\.[^"\\\\]*)*)"/g);
                        
                        if (textMatches) {
                            console.log(\`📨 为用户 \${userId} 解析到 \${textMatches.length} 条消息\`);
                            
                            textMatches.forEach((match, index) => {
                                const textMatch = match.match(/"text":"([^"\\\\]*(\\\\.[^"\\\\]*)*)"/);
                                if (textMatch) {
                                    const messageText = textMatch[1]
                                        .replace(/\\\\"/g, '"')
                                        .replace(/\\\\\\\\/g, '\\\\')
                                        .replace(/\\\\n/g, '\\n');
                                    
                                    if (messageText && messageText.trim()) {
                                        messages.push({
                                            text: messageText.trim(),
                                            timestamp: new Date().toISOString(),
                                            sender: 'user', // 简化处理，实际需要根据API响应判断
                                            type: 'text',
                                            source: 'api_interception',
                                            index: index,
                                            userId: userId
                                        });
                                    }
                                }
                            });
                        }
                        
                        return messages;
                    } catch (error) {
                        console.error('❌ 解析消息失败:', error);
                        return [];
                    }
                }
                
                // 🔥 设置XMLHttpRequest拦截器
                if (!window.__originalXHRDouyin) {
                    window.__originalXHRDouyin = window.XMLHttpRequest;
                }
                
                function DouyinXHR() {
                    const xhr = new window.__originalXHRDouyin();
                    const originalOpen = xhr.open;
                    const originalSend = xhr.send;
                    
                    let requestUrl = '';
                    
                    xhr.open = function(method, url, ...args) {
                        requestUrl = url;
                        return originalOpen.call(this, method, url, ...args);
                    };
                    
                    xhr.send = function(...args) {
                        // 🔥 拦截抖音私信API
                        if (requestUrl.includes('imapi.snssdk.com/v1/message/get_by_conversation')) {
                            console.log(\`🎯 拦截抖音API请求: \${requestUrl}\`);
                            
                            const originalOnReadyStateChange = xhr.onreadystatechange;
                            xhr.onreadystatechange = function() {
                                if (xhr.readyState === 4 && xhr.status === 200) {
                                    try {
                                        let responseText = '';
                                        
                                        // 处理不同的响应格式
                                        if (xhr.response instanceof ArrayBuffer) {
                                            const decoder = new TextDecoder('utf-8');
                                            responseText = decoder.decode(xhr.response);
                                        } else if (typeof xhr.response === 'string') {
                                            responseText = xhr.response;
                                        } else {
                                            responseText = JSON.stringify(xhr.response);
                                        }
                                        
                                        console.log(\`📥 收到抖音API响应，长度: \${responseText.length} bytes\`);
                                        
                                        // 🔥 解析消息数据
                                        const messages = parseInterceptedMessages(responseText, 'current_user');
                                        
                                        if (messages.length > 0) {
                                            // 存储拦截到的数据
                                            const timestamp = Date.now();
                                            window.__douyinInterceptorData.interceptedData.set(timestamp, {
                                                messages: messages,
                                                responseText: responseText.substring(0, 1000), // 只保存前1000字符用于调试
                                                timestamp: timestamp,
                                                url: requestUrl
                                            });
                                            
                                            console.log(\`✅ 存储了 \${messages.length} 条拦截消息，时间戳: \${timestamp}\`);
                                        }
                                        
                                    } catch (error) {
                                        console.error('❌ 处理抖音API响应失败:', error);
                                    }
                                }
                                
                                if (originalOnReadyStateChange) {
                                    originalOnReadyStateChange.call(this);
                                }
                            };
                        }
                        
                        return originalSend.call(this, ...args);
                    };
                    
                    return xhr;
                }
                
                // 🔥 应用拦截器
                Object.setPrototypeOf(DouyinXHR.prototype, window.__originalXHRDouyin.prototype);
                Object.setPrototypeOf(DouyinXHR, window.__originalXHRDouyin);
                window.XMLHttpRequest = DouyinXHR;
                
                console.log('✅ 抖音网络拦截器设置完成');
                return true;
            })()
        `;

        try {
            const result = await this.tabManager.executeScript(tabId, interceptorScript);
            if (result) {
                this.isInterceptorSetup.set(tabId, true);
                console.log('✅ 抖音网络拦截器注入成功');
            } else {
                throw new Error('拦截器脚本执行返回false');
            }
        } catch (error) {
            console.error('❌ 抖音网络拦截器注入失败:', error);
            throw error;
        }
    }


    /**
     * 🔥 发送消息功能（保持原有逻辑）
     */
    async sendMessage(params: MessageSendParams): Promise<MessageSendResult> {
        try {
            console.log(`📤 发送抖音消息: ${params.userName} (${params.type})`);

            const sendScript = this.generateDouyinSendScript(
                params.userName, 
                params.content, 
                params.type
            );

            const scriptResult = await this.tabManager.executeScript(params.tabId, sendScript);
            const sendResult = this.parseSendResult(scriptResult);

            if (sendResult.success) {
                console.log(`✅ 抖音消息发送成功: ${params.userName}`);
                return {
                    success: true,
                    message: `${params.type === 'image' ? '图片' : '消息'}发送成功`,
                    user: params.userName,
                    type: params.type,
                    content: params.type === 'text' ? params.content : 'image',
                    timestamp: new Date().toISOString()
                };
            } else {
                console.error(`❌ 抖音消息发送失败: ${sendResult.error}`);
                return {
                    success: false,
                    error: sendResult.error || '发送失败',
                    user: params.userName,
                    type: params.type
                };
            }

        } catch (error) {
            console.error('❌ 抖音消息发送异常:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'unknown error',
                user: params.userName,
                type: params.type
            };
        }
    }


    /**
     * 🔥 获取平台特定配置
     */
    getPlatformConfig(): Record<string, any> {
        return {
            platform: 'douyin',
            name: '抖音',
            features: ['私信同步', '消息发送', '用户列表', '网络拦截', 'AI分身识别'], // 🔥 新增功能
            syncInterval: 5, // 5分钟
            maxConcurrency: 2,
            supportedMessageTypes: ['text'],
            maxMessageLength: 500,
            limitations: {
                crossOriginIframe: true,
                limitedChatHistory: false,
                previewOnly: false,
                requiresNetworkInterception: true
            },
            improvements: {
                fullMessageHistory: true,
                realTimeSync: true,
                accurateTimestamps: true,
                senderIdentification: true,
                aiAssistantSupport: true, // 🔥 新增：AI分身支持
                domInjection: true        // 🔥 新增：DOM注入支持
            }
        };
    }

    // ==================== 🔥 私有工具方法 ====================

    /**
     * 🔥 生成抖音消息发送脚本
     */
    private generateDouyinSendScript(userName: string, content: string, type: 'text' | 'image'): string {
        // 读取发送脚本文件
        const scriptPath = path.join(__dirname, './scripts/douyin-send.js');
        const scriptTemplate = fs.readFileSync(scriptPath, 'utf-8');
        
        // 转义参数中的特殊字符
        const escapedUserName = userName.replace(/'/g, "\\'").replace(/"/g, '\\"');
        const escapedContent = content.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/`/g, '\\`');
        
        // 调用脚本并传入参数
        return `${scriptTemplate}('${escapedUserName}', \`${escapedContent}\`, '${type}')`;
    }
    /**
     * 🔥 解析发送结果
     */
    private parseSendResult(scriptResult: any): { success: boolean; error?: string } {
        try {
            if (scriptResult && typeof scriptResult === 'object') {
                return {
                    success: scriptResult.success || false,
                    error: scriptResult.error
                };
            }

            if (typeof scriptResult === 'string') {
                const parsed = JSON.parse(scriptResult);
                return {
                    success: parsed.success || false,
                    error: parsed.error
                };
            }

            return { success: false, error: '发送结果解析失败' };

        } catch (error) {
            return { 
                success: false, 
                error: '发送结果解析异常: ' + (error instanceof Error ? error.message : 'unknown error') 
            };
        }
    }

    /**
     * 🔥 转换为标准格式
     */
    private convertToStandardFormat(users: any[], platform: string, accountId: string): UserMessageThread[] {
        const threads: UserMessageThread[] = [];

        for (const user of users) {
            try {
                const messages: Message[] = [];

                // 转换消息格式
                if (user.messages && Array.isArray(user.messages)) {
                    for (const msg of user.messages) {
                        const message: Message = {
                            timestamp: msg.timestamp || new Date().toISOString(),
                            sender: msg.sender as 'me' | 'user',
                            text: msg.text,
                            images: msg.images,
                            type: msg.type || (msg.images ? 'image' : 'text')
                        };
                        messages.push(message);
                    }
                }
                // 🔥 处理用户名称 - 优先使用AI分身识别后的真实名称
                let displayName = user.name;
                let userId = user.user_id;

                // 如果是AI分身且有真实名称，使用真实名称
                if (user.isAIAssistant && user.name && user.name.includes('AI分身')) {
                    displayName = user.name;
                    // 🔥 为AI分身生成更稳定的用户ID（基于AI分身名称）
                    userId = this.generateStableUserId(user.name, user.avatar);
                    console.log(`🤖 AI分身用户: ${displayName} (ID: ${userId})`);
                } 
                // 如果仍然是临时名称，保持原有逻辑
                else if (!user.name || user.name.startsWith('用户')) {
                    displayName = user.name || `用户${user.index + 1}`;
                    userId = user.user_id;
                    console.log(`👤 临时命名用户: ${displayName} (ID: ${userId})`);
                }
                // 创建线程对象
                const thread: UserMessageThread = {
                    platform: platform,
                    account_id: accountId,
                    user_id: user.user_id,
                    user_name: user.name,
                    avatar: user.avatar,
                    unread_count: 0,
                    messages: messages,
                    last_message_time: user.session_time,
                    // 🔥 使用现有字段存储附加信息
                    last_message_text: user.last_message_preview,
                    last_message_type: messages.length > 0 ? messages[messages.length - 1].type : 'text'
                };

                threads.push(thread);

            } catch (error) {
                console.warn(`⚠️ 转换用户数据失败: ${user.name}:`, error);
                continue;
            }
        }

        return threads;
    }
    /**
     * 🔥 新增：为AI分身生成稳定的用户ID
     * 基于AI分身名称生成，确保同一个AI分身的ID始终一致
     */
    private generateStableUserId(aiName: string, avatar?: string): string {
        // 提取AI分身的核心名称（去掉"的AI分身"后缀）
        const coreName = aiName.replace(/的\s*AI\s*分身$/, '');
        
        // 使用AI分身名称 + 头像生成稳定的哈希ID
        const str = coreName + (avatar || '');
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        // 添加AI分身前缀，便于识别
        return `ai_${Math.abs(hash).toString()}`;
    }

    /**
     * 🔥 统计总消息数
     */
    private countTotalMessages(threads: UserMessageThread[]): number {
        let totalMessages = 0;
        for (const thread of threads) {
            if (thread.messages) {
                totalMessages += thread.messages.length;
            }
        }
        return totalMessages;
    }

}