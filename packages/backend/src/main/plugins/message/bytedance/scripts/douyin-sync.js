// src/main/plugins/message/bytedance/scripts/douyin-sync.js
(async function extractDouyinPrivateMessages(accountId) {
    console.log('🚀 开始提取抖音私信数据，账号:', accountId || 'unknown');
    
    // ==================== 网络拦截器设置 ====================
    
    /**
     * 🔥 设置抖音网络拦截器
     */
    function setupDouyinNetworkInterceptor(accountId) {
        console.log('🔍 设置抖音网络拦截器...');
        
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
            accountId: accountId || 'unknown'
        };
        
        // 🔥 工具函数：解析拦截的消息
        function parseInterceptedMessages(responseText, userId) {
            try {
                const messages = [];
                const textMatches = responseText.match(/"text":"([^"\\]*(\\.[^"\\]*)*)"/g);
                
                if (textMatches) {
                    console.log(`📨 为用户 ${userId} 解析到 ${textMatches.length} 条消息`);
                    
                    textMatches.forEach((match, index) => {
                        const textMatch = match.match(/"text":"([^"\\]*(\\.[^"\\]*)*)"/);
                        if (textMatch) {
                            const messageText = textMatch[1]
                                .replace(/\\"/g, '"')
                                .replace(/\\\\/g, '\\')
                                .replace(/\\n/g, '\n');
                            
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
                    console.log(`🎯 拦截抖音API请求: ${requestUrl}`);
                    
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
                                
                                console.log(`📥 收到抖音API响应，长度: ${responseText.length} bytes`);
                                
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
                                    
                                    console.log(`✅ 存储了 ${messages.length} 条拦截消息，时间戳: ${timestamp}`);
                                    
                                    // 🔥 通知主进程（统一事件格式）
                                    if (window.electronAPI && window.electronAPI.notifyNewMessage) {
                                        window.electronAPI.notifyNewMessage({
                                            event: 'NewMsgNotify',
                                            eventData: {
                                                messages: messages,
                                                timestamp: timestamp,
                                                source: 'api_interception'
                                            },
                                            timestamp: timestamp,
                                            platform: 'douyin',
                                            accountId: accountId || 'unknown',
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
    }

    // ==================== 工具函数 ====================
    
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
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
            const minutes = parseInt(timeText.match(/(\d+)分钟前/)?.[1] || '0');
            return new Date(now.getTime() - minutes * 60 * 1000);
        }
        if (timeText.includes('小时前')) {
            const hours = parseInt(timeText.match(/(\d+)小时前/)?.[1] || '0');
            return new Date(now.getTime() - hours * 60 * 60 * 1000);
        }
        
        const monthDayMatch = timeText.match(/(\d{1,2})-(\d{1,2})/);
        if (monthDayMatch) {
            const [_, month, day] = monthDayMatch;
            return new Date(currentYear, parseInt(month) - 1, parseInt(day));
        }
        
        return now;
    }

    // ==================== 用户列表提取 ====================
    
    /**
     * 🔥 提取抖音用户列表信息
     */
    function extractUserListInfo() {
        console.log('📋 提取抖音用户列表...');
        
        try {
            // 查找用户列表容器
            const userListContainer = document.querySelector('.ReactVirtualized__Grid__innerScrollContainer');
            if (!userListContainer) {
                console.log('❌ 未找到用户列表容器');
                return [];
            }
            
            // 获取所有用户项
            const userItems = userListContainer.querySelectorAll('li.semi-list-item');
            console.log(`找到 ${userItems.length} 个用户项`);
            
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
                    const userName = (nameElement ? nameElement.textContent.trim() : '') || `用户${index + 1}`;
                    
                    const avatarElement = userItem.querySelector('.semi-avatar img');
                    const userAvatar = avatarElement ? avatarElement.src : '';
                    
                    const timeElement = userItem.querySelector('.item-header-time-DORpXQ');
                    const timeText = timeElement ? timeElement.textContent.trim() : '';
                    const sessionTime = parseDouyinTime(timeText);
                    
                    const previewElement = userItem.querySelector('.text-whxV9A');
                    const lastMessageText = previewElement ? previewElement.textContent.trim() : '';
                    
                    console.log(`  用户 ${index + 1}: ${userName}, 时间: ${timeText}, 预览: ${lastMessageText.substring(0, 30)}...`);
                    
                    const userData = {
                        index: index,
                        user_id: generateUserId(userName, userAvatar),
                        name: userName,
                        avatar: userAvatar,
                        session_time: sessionTime.toISOString(),
                        time_text: timeText,
                        last_message_preview: lastMessageText,
                        element: userItem,
                        nameElement: nameElement
                    };
                    
                    users.push(userData);
                    
                } catch (error) {
                    console.warn(`⚠️ 解析用户 ${index + 1} 失败:`, error);
                    continue;
                }
            }
            
            console.log(`📊 成功提取 ${users.length} 个用户`);
            return users;
            
        } catch (error) {
            console.error('❌ 获取用户列表失败:', error);
            return [];
        }
    }

    // ==================== 用户消息处理 ====================
    
    /**
     * 🔥 点击用户名元素
     */
    function clickUserNameElement(user) {
        try {
            // 🔥 方法1: 直接使用保存的用户名元素
            if (user.nameElement) {
                user.nameElement.click();
                console.log('✅ 使用缓存的用户名元素点击成功');
                return true;
            }
            
            // 🔥 方法2: 重新查找用户名元素
            const userListContainer = document.querySelector('.ReactVirtualized__Grid__innerScrollContainer');
            if (userListContainer) {
                const userItems = userListContainer.querySelectorAll('li.semi-list-item');
                if (userItems[user.index]) {
                    const nameElement = userItems[user.index].querySelector('.item-header-name-vL_79m');
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
                if (element.textContent.trim() === user.name) {
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
    }
    
    /**
     * 🔥 获取最新拦截到的消息
     */
    function getLatestInterceptedMessages() {
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
                console.log(`📨 获取到最新拦截数据: ${latestData.messages.length} 条消息`);
                
                // 🔥 清理已使用的数据，避免重复
                dataMap.delete(latestTimestamp);
                
                return latestData.messages;
            }
            
            return [];
            
        } catch (error) {
            console.error('❌ 获取拦截数据失败:', error);
            return [];
        }
    }
    
    /**
     * 🔥 创建兜底用户数据
     */
    function createFallbackUserData(user) {
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
     * 🔥 处理所有用户，获取完整消息数据
     */
    async function processAllUsers(users, accountId) {
        console.log(`🔄 开始处理 ${users.length} 个用户...`);
        const processedUsers = [];

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            console.log(`\n👤 [${i + 1}/${users.length}] 处理用户: ${user.name}`);

            try {
                // 🔥 点击用户名元素（关键修复）
                const clickSuccess = clickUserNameElement(user);
                if (!clickSuccess) {
                    console.warn(`⚠️ 点击用户失败: ${user.name}`);
                    // 使用预览消息作为兜底
                    processedUsers.push(createFallbackUserData(user));
                    continue;
                }

                // 🔥 等待API响应被拦截
                console.log(`  ⏳ 等待API响应...`);
                await delay(4000); // 等待4秒

                // 🔥 获取拦截到的数据
                const interceptedMessages = getLatestInterceptedMessages();
                
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
                    processedUsers.push(createFallbackUserData(user));
                }

                const progress = ((i + 1) / users.length * 100).toFixed(1);
                console.log(`📊 进度: ${progress}% (${i + 1}/${users.length})`);

            } catch (error) {
                console.error(`❌ 处理用户 ${user.name} 失败:`, error);
                processedUsers.push(createFallbackUserData(user));
                continue;
            }
        }

        console.log(`\n🎉 用户处理完成: ${processedUsers.length}/${users.length}`);
        return processedUsers;
    }

    // ==================== 页面导航 ====================
    
    /**
     * 🔥 确保在私信页面
     */
    function ensureOnPrivateMessagePage() {
        console.log('🔍 检查是否在私信页面...');

        try {
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
            
        } catch (error) {
            console.error('❌ 检查私信页面失败:', error);
            return false;
        }
    }

    // ==================== 主执行逻辑 ====================
    
    try {
        const result = {
            success: true,
            timestamp: new Date().toISOString(),
            users: []
        };
        
        console.log('📋 3. 提取用户列表...');
        const userList = extractUserListInfo();
        
        if (userList.length === 0) {
            console.log('✅ 该账号暂无私信用户');
            return {
                success: true,
                timestamp: new Date().toISOString(),
                users: [],
                message: '该账号暂无私信用户'
            };
        }
        
        console.log(`📊 找到 ${userList.length} 个用户`);
        
        console.log('🔄 4. 开始处理用户消息...');
        const processedUsers = await processAllUsers(userList, accountId);
        
        // 🔥 统计结果
        const totalMessages = processedUsers.reduce((sum, user) => sum + (user.message_count || 0), 0);
        const apiUsers = processedUsers.filter(user => user.message_source === 'api_interception');
        const fallbackUsers = processedUsers.filter(user => user.message_source === 'preview_fallback');
        
        console.log(`\n🎉 抖音消息同步完成！`);
        console.log(`📊 统计报告:`);
        console.log(`  - 总用户数: ${processedUsers.length}`);
        console.log(`  - 总消息数: ${totalMessages}`);
        console.log(`  - API拦截成功: ${apiUsers.length} 用户`);
        console.log(`  - 预览兜底: ${fallbackUsers.length} 用户`);
        
        result.users = processedUsers;
        result.totalMessages = totalMessages;
        result.apiUsers = apiUsers.length;
        result.fallbackUsers = fallbackUsers.length;
        
        // 保存到全局变量方便调试
        window.douyinMessagesData = result;
        console.log('💾 数据已保存到 window.douyinMessagesData');
        
        return result;
        
    } catch (error) {
        console.error('❌ 抖音消息同步失败:', error);
        return {
            success: false,
            timestamp: new Date().toISOString(),
            users: [],
            message: '同步异常: ' + error.message,
            error: error.message
        };
    }
    
})(typeof arguments !== 'undefined' && arguments[0] ? arguments[0] : 'ACCOUNT_ID_PLACEHOLDER');