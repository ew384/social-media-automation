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
     * 🔥 核心同步方法 - 使用网络拦截器
     */
    async syncMessages(params: MessageSyncParams): Promise<MessageSyncResult> {
        try {
            console.log(`🔄 开始抖音消息同步: ${params.accountId}`);

            // 🔥 步骤1: 设置网络拦截器
            await this.setupDouyinNetworkInterceptor(params.tabId, params.accountId);

            // 🔥 步骤2: 导航到私信页面（如果需要）
            if (!params.eventData) {
                const navSuccess = await this.ensureOnPrivateMessagePage(params.tabId);
                if (!navSuccess) {
                    console.warn('⚠️ 私信页面导航失败，尝试继续...');
                }
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // 🔥 步骤3: 获取用户列表
            const users = await this.getDouyinUserList(params.tabId);
            if (users.length === 0) {
                return {
                    success: true,
                    threads: [],
                    newMessages: 0,
                    updatedThreads: 0,
                    message: '该账号暂无私信用户',
                    syncTime: new Date().toISOString()
                };
            }

            // 🔥 步骤4: 逐个处理用户，收集拦截数据
            const processedUsers = await this.processUsersWithInterception(params.tabId, params.accountId, users);

            // 🔥 步骤5: 转换为标准格式并返回
            const threads = this.convertToStandardFormat(processedUsers, params.platform, params.accountId);
            
            console.log(`✅ 抖音消息同步成功: 获取到 ${threads.length} 个对话线程`);
            return {
                success: true,
                threads: threads,
                newMessages: this.countTotalMessages(threads),
                updatedThreads: threads.length,
                syncTime: new Date().toISOString()
            };

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
                                                    event: 'DouyinApiIntercepted',
                                                    messages: messages,
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
     * 🔥 核心方法2: 获取抖音用户列表
     */
    private async getDouyinUserList(tabId: string): Promise<any[]> {
        console.log('📋 获取抖音用户列表...');

        const getUserListScript = `
            (function getDouyinUserList() {
                console.log('📋 开始提取抖音用户列表...');
                
                // 工具函数
                function generateUserId(name, avatar) {
                    const str = name + (avatar || '');
                    let hash = 0;
                    for (let i = 0; i < str.length; i++) {
                        const char = str.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash = hash & hash;
                    }
                    return Math.abs(hash).toString();
                }
                
                function parseDouyinTime(timeText) {
                    const now = new Date();
                    const currentYear = now.getFullYear();
                    
                    if (timeText.includes('刚刚')) return now;
                    if (timeText.includes('分钟前')) {
                        const minutes = parseInt(timeText.match(/(\\d+)分钟前/)?.[1] || '0');
                        return new Date(now.getTime() - minutes * 60 * 1000);
                    }
                    if (timeText.includes('小时前')) {
                        const hours = parseInt(timeText.match(/(\\d+)小时前/)?.[1] || '0');
                        return new Date(now.getTime() - hours * 60 * 60 * 1000);
                    }
                    
                    const monthDayMatch = timeText.match(/(\\d{1,2})-(\\d{1,2})/);
                    if (monthDayMatch) {
                        const [_, month, day] = monthDayMatch;
                        return new Date(currentYear, parseInt(month) - 1, parseInt(day));
                    }
                    
                    return now;
                }
                
                try {
                    // 查找用户列表容器
                    const userListContainer = document.querySelector('.ReactVirtualized__Grid__innerScrollContainer');
                    if (!userListContainer) {
                        console.log('❌ 未找到用户列表容器');
                        return [];
                    }
                    
                    // 获取所有用户项
                    const userItems = userListContainer.querySelectorAll('li.semi-list-item');
                    console.log(\`找到 \${userItems.length} 个用户项\`);
                    
                    if (userItems.length === 0) {
                        return [];
                    }
                    
                    const users = [];
                    
                    // 处理每个用户
                    for (let index = 0; index < userItems.length; index++) {
                        const userItem = userItems[index];
                        try {
                            // 提取用户基本信息
                            const nameElement = userItem.querySelector('.item-header-name-vL_79m');
                            const userName = (nameElement ? nameElement.textContent.trim() : '') || \`用户\${index + 1}\`;
                            
                            const avatarElement = userItem.querySelector('.semi-avatar img');
                            const userAvatar = avatarElement ? avatarElement.src : '';
                            
                            const timeElement = userItem.querySelector('.item-header-time-DORpXQ');
                            const timeText = timeElement ? timeElement.textContent.trim() : '';
                            const sessionTime = parseDouyinTime(timeText);
                            
                            const previewElement = userItem.querySelector('.text-whxV9A');
                            const lastMessageText = previewElement ? previewElement.textContent.trim() : '';
                            
                            console.log(\`  用户 \${index + 1}: \${userName}, 时间: \${timeText}, 预览: \${lastMessageText.substring(0, 30)}...\`);
                            
                            const userData = {
                                index: index,
                                user_id: generateUserId(userName, userAvatar),
                                name: userName,
                                avatar: userAvatar,
                                session_time: sessionTime.toISOString(),
                                time_text: timeText,
                                last_message_preview: lastMessageText,
                                element: userItem, // 保存DOM元素引用
                                nameElement: nameElement // 保存用户名元素引用
                            };
                            
                            users.push(userData);
                            
                        } catch (error) {
                            console.warn(\`⚠️ 解析用户 \${index + 1} 失败:\`, error);
                            continue;
                        }
                    }
                    
                    console.log(\`📊 成功提取 \${users.length} 个用户\`);
                    return users;
                    
                } catch (error) {
                    console.error('❌ 获取用户列表失败:', error);
                    return [];
                }
            })()
        `;

        try {
            const users = await this.tabManager.executeScript(tabId, getUserListScript);
            console.log(`📋 获取到 ${users?.length || 0} 个抖音用户`);
            return users || [];
        } catch (error) {
            console.error('❌ 获取抖音用户列表失败:', error);
            return [];
        }
    }

    /**
     * 🔥 核心方法3: 逐个处理用户，触发API并收集数据
     */
    private async processUsersWithInterception(tabId: string, accountId: string, users: any[]): Promise<any[]> {
        console.log(`🔄 开始处理 ${users.length} 个用户...`);
        const processedUsers = [];

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            console.log(`\n👤 [${i + 1}/${users.length}] 处理用户: ${user.name}`);

            try {
                // 🔥 点击用户名元素（关键修复）
                const clickSuccess = await this.clickUserNameElement(tabId, user);
                if (!clickSuccess) {
                    console.warn(`⚠️ 点击用户失败: ${user.name}`);
                    // 使用预览消息作为兜底
                    processedUsers.push(this.createFallbackUserData(user));
                    continue;
                }

                // 🔥 等待API响应被拦截
                console.log(`  ⏳ 等待API响应...`);
                await new Promise(resolve => setTimeout(resolve, 4000)); // 等待4秒

                // 🔥 获取拦截到的数据
                const interceptedMessages = await this.getLatestInterceptedMessages(tabId);
                
                if (interceptedMessages && interceptedMessages.length > 0) {
                    console.log(`  ✅ 成功获取 ${interceptedMessages.length} 条API消息`);
                    processedUsers.push({
                        ...user,
                        messages: interceptedMessages,
                        message_source: 'api_interception',
                        message_count: interceptedMessages.length
                    });
                } else {
                    console.log(`  📋 使用预览消息作为兜底`);
                    processedUsers.push(this.createFallbackUserData(user));
                }

                const progress = ((i + 1) / users.length * 100).toFixed(1);
                console.log(`📊 进度: ${progress}% (${i + 1}/${users.length})`);

            } catch (error) {
                console.error(`❌ 处理用户 ${user.name} 失败:`, error);
                processedUsers.push(this.createFallbackUserData(user));
                continue;
            }
        }

        console.log(`\n🎉 用户处理完成: ${processedUsers.length}/${users.length}`);
        return processedUsers;
    }

    /**
     * 🔥 点击用户名元素（修复版）
     */
    private async clickUserNameElement(tabId: string, user: any): Promise<boolean> {
        const clickScript = `
            (function clickUserName() {
                try {
                    // 🔥 方法1: 直接使用保存的用户名元素
                    if (window.__currentUserElements && window.__currentUserElements[${user.index}]) {
                        const nameElement = window.__currentUserElements[${user.index}].nameElement;
                        if (nameElement) {
                            nameElement.click();
                            console.log('✅ 使用缓存的用户名元素点击成功');
                            return true;
                        }
                    }
                    
                    // 🔥 方法2: 重新查找用户名元素
                    const userListContainer = document.querySelector('.ReactVirtualized__Grid__innerScrollContainer');
                    if (userListContainer) {
                        const userItems = userListContainer.querySelectorAll('li.semi-list-item');
                        if (userItems[${user.index}]) {
                            const nameElement = userItems[${user.index}].querySelector('.item-header-name-vL_79m');
                            if (nameElement) {
                                nameElement.click();
                                console.log('✅ 重新查找用户名元素点击成功');
                                return true;
                            }
                        }
                    }
                    
                    // 🔥 方法3: 通过用户名文本查找
                    const allNameElements = document.querySelectorAll('.item-header-name-vL_79m');
                    for (const element of allNameElements) {
                        if (element.textContent.trim() === '${user.name}') {
                            element.click();
                            console.log('✅ 通过用户名文本查找点击成功');
                            return true;
                        }
                    }
                    
                    console.error('❌ 所有点击方法都失败了');
                    return false;
                    
                } catch (error) {
                    console.error('❌ 点击用户名失败:', error);
                    return false;
                }
            })()
        `;

        try {
            const result = await this.tabManager.executeScript(tabId, clickScript);
            return Boolean(result);
        } catch (error) {
            console.error(`❌ 点击用户名脚本执行失败:`, error);
            return false;
        }
    }

    /**
     * 🔥 获取最新拦截到的消息
     */
    private async getLatestInterceptedMessages(tabId: string): Promise<any[]> {
        const getDataScript = `
            (function getLatestInterceptedData() {
                try {
                    if (!window.__douyinInterceptorData || !window.__douyinInterceptorData.interceptedData) {
                        console.log('⚠️ 拦截器数据不存在');
                        return [];
                    }
                    
                    const dataMap = window.__douyinInterceptorData.interceptedData;
                    if (dataMap.size === 0) {
                        console.log('⚠️ 没有拦截到任何数据');
                        return [];
                    }
                    
                    // 获取最新的数据（最大时间戳）
                    let latestTimestamp = 0;
                    let latestData = null;
                    
                    for (const [timestamp, data] of dataMap) {
                        if (timestamp > latestTimestamp) {
                            latestTimestamp = timestamp;
                            latestData = data;
                        }
                    }
                    
                    if (latestData && latestData.messages) {
                        console.log(\`📨 获取到最新拦截数据: \${latestData.messages.length} 条消息\`);
                        
                        // 🔥 清理已使用的数据，避免重复
                        dataMap.delete(latestTimestamp);
                        
                        return latestData.messages;
                    }
                    
                    return [];
                    
                } catch (error) {
                    console.error('❌ 获取拦截数据失败:', error);
                    return [];
                }
            })()
        `;

        try {
            const messages = await this.tabManager.executeScript(tabId, getDataScript);
            return messages || [];
        } catch (error) {
            console.error('❌ 获取拦截数据脚本执行失败:', error);
            return [];
        }
    }

    /**
     * 🔥 创建兜底用户数据
     */
    private createFallbackUserData(user: any): any {
        const fallbackMessages = user.last_message_preview ? [{
            text: user.last_message_preview,
            timestamp: user.session_time,
            sender: 'user',
            type: 'text',
            source: 'preview_fallback'
        }] : [];

        return {
            ...user,
            messages: fallbackMessages,
            message_source: 'preview_fallback',
            message_count: fallbackMessages.length
        };
    }

    /**
     * 🔥 确保在私信页面
     */
    private async ensureOnPrivateMessagePage(tabId: string): Promise<boolean> {
        console.log('🔍 检查是否在私信页面...');

        const checkAndNavigateScript = `
            (function ensurePrivateMessagePage() {
                const currentUrl = window.location.href;
                console.log('当前URL:', currentUrl);
                
                // 检查是否已经在私信页面
                if (currentUrl.includes('/chat') || currentUrl.includes('following/chat')) {
                    console.log('✅ 已在私信页面');
                    return true;
                }
                
                // 🔥 尝试点击导航到私信页面
                console.log('🔄 尝试导航到私信页面...');
                
                // 查找互动管理菜单
                const interactionMenu = document.querySelector('#douyin-creator-master-menu-nav-interaction');
                if (interactionMenu) {
                    const isExpanded = interactionMenu.getAttribute('aria-expanded') === 'true';
                    
                    if (!isExpanded) {
                        const titleElement = interactionMenu.querySelector('.douyin-creator-master-navigation-sub-title');
                        if (titleElement) {
                            titleElement.click();
                            console.log('✅ 点击展开互动管理');
                            
                            // 等待展开
                            setTimeout(() => {
                                const privateMessageItem = document.querySelector('#douyin-creator-master-menu-nav-message_manage');
                                if (privateMessageItem) {
                                    privateMessageItem.click();
                                    console.log('✅ 点击私信管理');
                                    return true;
                                }
                            }, 500);
                        }
                    } else {
                        // 已展开，直接点击私信管理
                        const privateMessageItem = document.querySelector('#douyin-creator-master-menu-nav-message_manage');
                        if (privateMessageItem) {
                            privateMessageItem.click();
                            console.log('✅ 直接点击私信管理');
                            return true;
                        }
                    }
                }
                
                console.log('⚠️ 导航失败');
                return false;
            })()
        `;

        try {
            const result = await this.tabManager.executeScript(tabId, checkAndNavigateScript);
            return Boolean(result);
        } catch (error) {
            console.error('❌ 检查私信页面失败:', error);
            return false;
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
     * 🔥 获取用户列表（公共接口）
     */
    async getUserList(tabId: string): Promise<UserInfo[]> {
        try {
            console.log('📋 获取抖音用户列表...');
            const users = await this.getDouyinUserList(tabId);
            
            return users.map((user: any) => ({
                user_id: user.user_id,
                name: user.name,
                avatar: user.avatar,
                unread_count: 0 // 抖音暂时无法获取未读数
            }));

        } catch (error) {
            console.error('❌ 获取抖音用户列表异常:', error);
            return [];
        }
    }

    /**
     * 🔥 验证标签页上下文
     */
    async validateTabContext(tabId: string): Promise<boolean> {
        try {
            const validateScript = `
                (function() {
                    // 检查是否在抖音创作者中心页面
                    const url = window.location.href;
                    const isDouyinCreator = url.includes('creator.douyin.com');
                    
                    // 检查是否有私信相关元素
                    const hasPrivateMsg = document.querySelector('.ReactVirtualized__Grid__innerScrollContainer') || 
                                         document.querySelector('.semi-list-item') ||
                                         document.querySelector('[class*="chat"]');
                    
                    return {
                        isValidUrl: isDouyinCreator,
                        hasRequiredElements: !!hasPrivateMsg,
                        currentUrl: url
                    };
                })()
            `;

            const result = await this.tabManager.executeScript(tabId, validateScript);

            if (result && result.isValidUrl && result.hasRequiredElements) {
                return true;
            } else {
                console.warn('⚠️ 标签页上下文验证失败:', result);
                return false;
            }

        } catch (error) {
            console.error('❌ 验证标签页上下文失败:', error);
            return false;
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

    /**
     * 🔥 清理拦截器（在需要时调用）
     */
    async cleanupInterceptor(tabId: string): Promise<void> {
        const cleanupScript = `
            (function cleanupDouyinInterceptor() {
                try {
                    // 恢复原始XMLHttpRequest
                    if (window.__originalXHRDouyin) {
                        window.XMLHttpRequest = window.__originalXHRDouyin;
                        delete window.__originalXHRDouyin;
                    }
                    
                    // 清理数据
                    if (window.__douyinInterceptorData) {
                        delete window.__douyinInterceptorData;
                    }
                    
                    // 重置标志
                    window.__douyinInterceptorSetup = false;
                    
                    console.log('🧹 抖音拦截器已清理');
                    return true;
                } catch (error) {
                    console.error('❌ 清理拦截器失败:', error);
                    return false;
                }
            })()
        `;

        try {
            await this.tabManager.executeScript(tabId, cleanupScript);
            this.isInterceptorSetup.delete(tabId);
            this.interceptorData.delete(tabId);
            console.log('✅ 拦截器清理完成');
        } catch (error) {
            console.error('❌ 拦截器清理失败:', error);
        }
    }

    /**
     * 🔥 获取拦截器状态（调试用）
     */
    async getInterceptorStatus(tabId: string): Promise<any> {
        const statusScript = `
            (function getInterceptorStatus() {
                return {
                    isSetup: !!window.__douyinInterceptorSetup,
                    hasData: !!(window.__douyinInterceptorData && window.__douyinInterceptorData.interceptedData),
                    dataCount: window.__douyinInterceptorData ? window.__douyinInterceptorData.interceptedData.size : 0,
                    currentUrl: window.location.href,
                    timestamp: new Date().toISOString()
                };
            })()
        `;

        try {
            const status = await this.tabManager.executeScript(tabId, statusScript);
            console.log('📊 拦截器状态:', status);
            return status;
        } catch (error) {
            console.error('❌ 获取拦截器状态失败:', error);
            return {
                isSetup: false,
                hasData: false,
                dataCount: 0,
                error: error instanceof Error ? error.message : 'unknown error'
            };
        }
    }
}