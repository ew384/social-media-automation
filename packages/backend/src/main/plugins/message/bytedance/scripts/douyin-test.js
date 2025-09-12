// 2. 运行修复版自动化脚本
(function createAutomatedExtractor() {
    console.log('🔧 创建修复版自动化提取器...');
    
    // 复制之前的大部分代码，只修改点击部分
    window.__DouyinData = {
        users: [],
        allMessages: [],
        interceptedData: new Map(),
        currentUserIndex: 0,
        totalUsers: 0,
        status: 'ready',
        startTime: null,
        errors: []
    };
    
    // 工具函数保持不变...
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
                                sender: 'user',
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
    
    // 设置拦截器
    function setupInterceptor() {
        console.log('🔍 设置修复版拦截器...');
        
        if (!window.__originalXHR) {
            window.__originalXHR = window.XMLHttpRequest;
        }
        
        function XHR() {
            const xhr = new window.__originalXHR();
            const originalOpen = xhr.open;
            const originalSend = xhr.send;
            
            let requestUrl = '';
            
            xhr.open = function(method, url, ...args) {
                requestUrl = url;
                return originalOpen.call(this, method, url, ...args);
            };
            
            xhr.send = function(...args) {
                if (requestUrl.includes('imapi.snssdk.com/v1/message/get_by_conversation')) {
                    console.log(`🎯 拦截API请求: ${requestUrl}`);
                    
                    const originalOnReadyStateChange = xhr.onreadystatechange;
                    xhr.onreadystatechange = function() {
                        if (xhr.readyState === 4 && xhr.status === 200) {
                            try {
                                let responseText = '';
                                
                                if (xhr.response instanceof ArrayBuffer) {
                                    const decoder = new TextDecoder('utf-8');
                                    responseText = decoder.decode(xhr.response);
                                } else if (typeof xhr.response === 'string') {
                                    responseText = xhr.response;
                                } else {
                                    responseText = JSON.stringify(xhr.response);
                                }
                                
                                console.log(`📥 收到响应，长度: ${responseText.length} bytes`);
                                
                                const automation = window.__DouyinData;
                                if (automation.status === 'processing' && automation.currentUserIndex < automation.users.length) {
                                    const currentUser = automation.users[automation.currentUserIndex];
                                    const messages = parseInterceptedMessages(responseText, currentUser.user_id);
                                    
                                    if (messages.length > 0) {
                                        automation.interceptedData.set(currentUser.user_id, messages);
                                        automation.allMessages.push(...messages);
                                        console.log(`✅ 为用户 ${currentUser.name} 保存了 ${messages.length} 条消息`);
                                    }
                                }
                                
                            } catch (error) {
                                console.error('❌ 处理响应失败:', error);
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
        
        Object.setPrototypeOf(XHR.prototype, window.__originalXHR.prototype);
        Object.setPrototypeOf(XHR, window.__originalXHR);
        window.XMLHttpRequest = XHR;
        
        console.log('✅ 修复版拦截器设置完成');
    }
    
    // 🔥 修复版自动处理函数 - 关键改动在这里
    async function processAllUsers() {
        const automation = window.__DouyinData;
        automation.status = 'processing';
        automation.startTime = Date.now();
        
        console.log(`🚀 开始修复版自动处理 ${automation.totalUsers} 个用户...`);
        
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        
        for (let i = 0; i < automation.users.length; i++) {
            automation.currentUserIndex = i;
            const user = automation.users[i];
            
            try {
                console.log(`\n👤 [${i + 1}/${automation.totalUsers}] 处理用户: ${user.name}`);
                
                // 🔥 关键修复：点击用户名元素而不是整个项
                const nameElement = user.element.querySelector('.item-header-name-vL_79m');
                if (nameElement) {
                    console.log(`  🖱️ 点击用户名元素...`);
                    nameElement.click();
                } else {
                    console.log(`  ⚠️ 未找到用户名元素，尝试点击整个项...`);
                    user.element.click();
                }
                
                // 等待API请求和响应
                console.log(`  ⏳ 等待API响应...`);
                await delay(4000); // 增加到4秒等待时间
                
                // 检查是否获取到消息
                const interceptedMessages = automation.interceptedData.get(user.user_id);
                if (interceptedMessages && interceptedMessages.length > 0) {
                    user.messages = interceptedMessages;
                    user.message_source = 'api_interception';
                    console.log(`  ✅ 成功获取 ${interceptedMessages.length} 条API消息`);
                } else {
                    // 使用预览消息作为兜底
                    if (user.last_message_preview) {
                        user.messages = [{
                            text: user.last_message_preview,
                            timestamp: user.session_time,
                            sender: 'user',
                            type: 'text',
                            source: 'preview_fallback'
                        }];
                    }
                    user.message_source = 'preview_fallback';
                    console.log(`  📋 使用预览消息作为兜底`);
                }
                
                user.message_count = user.messages.length;
                user.processed = true;
                
                console.log(`  ✅ 用户处理完成，消息数: ${user.message_count}`);
                
                const progress = ((i + 1) / automation.totalUsers * 100).toFixed(1);
                console.log(`📊 进度: ${progress}% (${i + 1}/${automation.totalUsers})`);
                
            } catch (error) {
                console.error(`❌ 处理用户 ${user.name} 失败:`, error);
                automation.errors.push({
                    type: 'user_processing',
                    userId: user.user_id,
                    userName: user.name,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                continue;
            }
        }
        
        automation.status = 'completed';
        const executionTime = ((Date.now() - automation.startTime) / 1000).toFixed(1);
        
        const totalMessages = automation.allMessages.length;
        const apiUsers = automation.users.filter(user => user.message_source === 'api_interception');
        const fallbackUsers = automation.users.filter(user => user.message_source === 'preview_fallback');
        
        console.log(`\n🎉 修复版自动化提取完成！`);
        console.log(`📊 统计报告:`);
        console.log(`  - 总用户数: ${automation.totalUsers}`);
        console.log(`  - 总消息数: ${totalMessages}`);
        console.log(`  - API拦截成功: ${apiUsers.length} 用户`);
        console.log(`  - 预览兜底: ${fallbackUsers.length} 用户`);
        console.log(`  - 执行时间: ${executionTime} 秒`);
        console.log(`  - 错误数量: ${automation.errors.length}`);
        
        return {
            success: true,
            users: automation.users,
            allMessages: automation.allMessages,
            summary: {
                totalUsers: automation.totalUsers,
                totalMessages: totalMessages,
                apiUsers: apiUsers.length,
                fallbackUsers: fallbackUsers.length,
                executionTimeSeconds: parseFloat(executionTime),
                errors: automation.errors.length
            },
            timestamp: new Date().toISOString()
        };
    }
    
    // 获取用户列表
    function getUserList() {
        const userListContainer = document.querySelector('.ReactVirtualized__Grid__innerScrollContainer');
        if (!userListContainer) {
            throw new Error('未找到用户列表容器');
        }
        
        const userItems = userListContainer.querySelectorAll('li.semi-list-item');
        const users = [];
        
        userItems.forEach((userItem, index) => {
            try {
                const nameElement = userItem.querySelector('.item-header-name-vL_79m');
                const userName = (nameElement ? nameElement.textContent.trim() : '') || `用户${index + 1}`;
                
                const avatarElement = userItem.querySelector('.semi-avatar img');
                const userAvatar = avatarElement ? avatarElement.src : '';
                
                const timeElement = userItem.querySelector('.item-header-time-DORpXQ');
                const timeText = timeElement ? timeElement.textContent.trim() : '';
                const sessionTime = parseDouyinTime(timeText);
                
                const previewElement = userItem.querySelector('.text-whxV9A');
                const lastMessageText = previewElement ? previewElement.textContent.trim() : '';
                
                const userData = {
                    index: index,
                    user_id: generateUserId(userName, userAvatar),
                    name: userName,
                    avatar: userAvatar,
                    session_time: sessionTime.toISOString(),
                    time_text: timeText,
                    last_message_preview: lastMessageText,
                    element: userItem,
                    nameElement: nameElement, // 保存用户名元素的引用
                    messages: [],
                    processed: false
                };
                
                users.push(userData);
                console.log(`📋 用户 ${index + 1}: ${userName} (${timeText})`);
                
            } catch (error) {
                console.warn(`⚠️ 解析用户 ${index + 1} 失败:`, error);
            }
        });
        
        return users;
    }
    
    // 主执行函数
    async function startExtraction() {
        try {
            console.log('🤖 启动修复版自动化提取...');
            
            setupInterceptor();
            
            console.log('📋 获取用户列表...');
            const users = getUserList();
            
            if (users.length === 0) {
                throw new Error('未找到任何用户');
            }
            
            const automation = window.__DouyinData;
            automation.users = users;
            automation.totalUsers = users.length;
            automation.currentUserIndex = 0;
            automation.allMessages = [];
            automation.interceptedData.clear();
            automation.errors = [];
            
            console.log(`📊 准备处理 ${users.length} 个用户`);
            
            const result = await processAllUsers();
            return result;
            
        } catch (error) {
            console.error('❌ 修复版提取失败:', error);
            window.__DouyinData.status = 'failed';
            
            return {
                success: false,
                error: error.message,
                users: window.__DouyinData.users || [],
                timestamp: new Date().toISOString()
            };
        }
    }
    
    window.startExtraction = startExtraction;
    window.showResults = () => {
        console.log('📊 修复版提取结果:');
        console.log(window.__DouyinData);
        return window.__DouyinData;
    };
    window.restoreAPIs = () => {
        if (window.__originalXHR) {
            window.XMLHttpRequest = window.__originalXHR;
            delete window.__originalXHR;
        }
        console.log('🔄 已恢复原始API');
    };
    
    console.log('✅ 修复版自动化提取器创建完成');
    console.log('📋 运行 startExtraction() 开始修复版提取');
    
    return { start: startExtraction, showResults: window.showResults, restore: window.restoreAPIs };
})();


// 抖音私信发送测试脚本
// 在抖音私信页面的开发者工具console中运行此脚本

(async function testDouyinSendMessage() {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    
    const userName = "跟小红去美国";
    const content = "测试这是一条抖音消息发送脚本发送的消息";
    const type = "text";
    
    try {
        console.log('🚀 开始发送抖音消息测试:', userName, type);
        
        // 1. 查找目标用户
        console.log('👤 查找用户:', userName);
        const userListContainer = document.querySelector('.ReactVirtualized__Grid__innerScrollContainer');
        if (!userListContainer) {
            throw new Error('未找到用户列表容器');
        }
        
        const userElements = userListContainer.querySelectorAll('li.semi-list-item');
        console.log('📋 找到用户数量:', userElements.length);
        
        let targetUser = null;
        const userList = [];
        
        for (let userElement of userElements) {
            const nameElement = userElement.querySelector('.item-header-name-vL_79m');
            if (nameElement) {
                const name = nameElement.textContent.trim();
                userList.push(name);
                console.log('  - 用户:', name);
                if (name === userName) {
                    nameElement.click();
                    console.log('  ✅ 找到目标用户!');
                    await delay(2500); // 等待对话界面加载
                    const documentElement = document.querySelector('[class*="chat"]')
                    if (!documentElement) {
                        throw new Error('未找到聊天界面容器');
                    }
                    console.log('🎉 抖音消息发送测试完成');
                    
                    return {
                        success: messagesSent,
                        message: `消息发送${messagesSent ? '成功' : '失败'}`,
                        user: userName,
                        type: type,
                        content: content,
                        timestamp: new Date().toISOString()
                    };
                    
                }
            }
        }
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
})();