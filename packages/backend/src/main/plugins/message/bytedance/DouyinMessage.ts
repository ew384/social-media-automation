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
                                    
                                    if (messageText && messageText.trim() && messageText.length > 5) {
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
                                            
                                            // 🔥 通知主进程（如果需要实时处理）
                                            if (window.electronAPI && window.electronAPI.notifyNewMessage) {
                                                window.electronAPI.notifyNewMessage({
                                                    event: 'NewMsgNotify',  // ← 使用统一事件名
                                                    eventData: {            // ← 包装到eventData中
                                                        messages: messages,
                                                        timestamp: timestamp,
                                                        source: 'api_interception'
                                                    },
                                                    timestamp: timestamp,
                                                    platform: 'douyin',
                                                    accountId: '${accountId}',
                                                    source: 'api_interception'
                                                });
                                            }
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
            features: ['私信同步', '消息发送', '用户列表', '网络拦截'],
            syncInterval: 5, // 5分钟
            maxConcurrency: 2,
            supportedMessageTypes: ['text'],
            maxMessageLength: 500,
            limitations: {
                crossOriginIframe: true,
                limitedChatHistory: false, // 🔥 现在可以获取完整历史
                previewOnly: false, // 🔥 现在可以获取完整消息
                requiresNetworkInterception: true
            },
            improvements: {
                fullMessageHistory: true,
                realTimeSync: true,
                accurateTimestamps: true,
                senderIdentification: true
            }
        };
    }

    // ==================== 🔥 私有工具方法 ====================

    /**
     * 🔥 生成抖音消息发送脚本
     */
    private generateDouyinSendScript(userName: string, content: string, type: 'text' | 'image'): string {
        const escapedUserName = userName.replace(/'/g, "\\'").replace(/"/g, '\\"');
        const escapedContent = content.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/`/g, '\\`');
        
        return `
            (async function sendDouyinMessage(userName, content, type = 'text') {
                const delay = ms => new Promise(r => setTimeout(r, ms));
                
                try {
                    console.log('🚀 开始发送抖音消息:', userName, type);
                    
                    // 1. 查找目标用户
                    console.log('👤 查找用户:', userName);
                    const userElements = document.querySelectorAll('.semi-list-item');
                    console.log('📋 找到用户数量:', userElements.length);
                    
                    let targetUser = null;
                    for (let userElement of userElements) {
                        const nameElement = userElement.querySelector('.item-header-name-vL_79m');
                        if (nameElement) {
                            const name = nameElement.textContent.trim();
                            if (name === userName) {
                                targetUser = userElement;
                                break;
                            }
                        }
                    }

                    if (!targetUser) {
                        throw new Error(\`用户未找到: \${userName}\`);
                    }

                    // 2. 点击用户进入对话
                    console.log('✅ 找到目标用户，点击进入对话...');
                    const nameElement = targetUser.querySelector('.item-header-name-vL_79m');
                    if (nameElement) {
                        nameElement.click();
                    } else {
                        targetUser.click();
                    }
                    await delay(1500);

                    // 3. 查找输入框
                    console.log('📝 查找输入框...');
                    const inputSelectors = [
                        '.chat-input-dccKiL',
                        '[contenteditable="true"]',
                        'textarea',
                        'input[type="text"]',
                        '[class*="input"]',
                        '[placeholder*="输入"]'
                    ];
                    
                    let inputElement = null;
                    for (const selector of inputSelectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            const style = window.getComputedStyle(element);
                            const isVisible = style.display !== 'none' && 
                                            style.visibility !== 'hidden' && 
                                            style.opacity !== '0';
                                            
                            if (isVisible && !element.disabled && !element.readOnly) {
                                inputElement = element;
                                console.log(\`✅ 找到输入框: \${selector}\`);
                                break;
                            }
                        }
                    }
                    
                    if (!inputElement) {
                        throw new Error('输入框未找到');
                    }

                    // 4. 输入内容
                    console.log('📝 输入内容...');
                    inputElement.focus();
                    await delay(200);
                    
                    if (inputElement.contentEditable === 'true') {
                        inputElement.innerHTML = content;
                        inputElement.textContent = content;
                        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        inputElement.value = content;
                        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    
                    await delay(300);
                    console.log('✅ 内容输入完成:', content);

                    // 5. 查找并点击发送按钮
                    console.log('📤 查找发送按钮...');
                    const sendSelectors = [
                        '.chat-btn',
                        'button[class*="send"]',
                        'button[type="submit"]',
                        '[aria-label*="发送"]',
                        '[title*="发送"]'
                    ];

                    let sendButton = null;
                    for (const selector of sendSelectors) {
                        const buttons = document.querySelectorAll(selector);
                        for (const button of buttons) {
                            const buttonText = button.textContent.trim().toLowerCase();
                            const isVisible = window.getComputedStyle(button).display !== 'none';
                            const isEnabled = !button.disabled;
                            
                            if (isVisible && isEnabled && 
                                (buttonText.includes('发送') || buttonText.includes('send'))) {
                                sendButton = button;
                                break;
                            }
                        }
                        if (sendButton) break;
                    }

                    if (sendButton) {
                        console.log('📤 点击发送按钮...');
                        sendButton.click();
                        await delay(500);
                    } else {
                        console.log('🔄 尝试回车发送...');
                        inputElement.focus();
                        
                        const enterEvent = new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            bubbles: true,
                            cancelable: true
                        });
                        
                        inputElement.dispatchEvent(enterEvent);
                        await delay(500);
                    }

                    // 6. 验证发送结果
                    await delay(1000);
                    const isEmpty = inputElement.contentEditable === 'true' ? 
                        !inputElement.textContent.trim() : 
                        !inputElement.value.trim();
                    
                    console.log('✅ 抖音消息发送完成');
                    
                    return {
                        success: true,
                        message: \`\${type === 'image' ? '图片' : '消息'}发送成功\`,
                        user: userName,
                        type: type,
                        content: type === 'text' ? content : 'image',
                        timestamp: new Date().toISOString(),
                        method: sendButton ? 'button_click' : 'enter_key',
                        inputCleared: isEmpty
                    };
                    
                } catch (error) {
                    console.error('❌ 发送抖音消息失败:', error);
                    return {
                        success: false,
                        error: error.message,
                        user: userName,
                        type: type,
                        timestamp: new Date().toISOString()
                    };
                }
            })('${escapedUserName}', \`${escapedContent}\`, '${type}')
        `;
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