// src/main/plugins/message/bytedance/scripts/douyin-sync.js
(async function extractDouyinPrivateMessages(accountId) {
    console.log('🚀 开始提取抖音私信数据，账号:', accountId || 'unknown');

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
                    const userName = nameElement ? nameElement.textContent.trim() : '';
                    
                    const avatarElement = userItem.querySelector('.semi-avatar img');
                    const userAvatar = avatarElement ? avatarElement.src : '';
                    
                    const timeElement = userItem.querySelector('.item-header-time-DORpXQ');
                    const timeText = timeElement ? timeElement.textContent.trim() : '';
                    const sessionTime = parseDouyinTime(timeText);
                    
                    const previewElement = userItem.querySelector('.text-whxV9A');
                    const lastMessageText = previewElement ? previewElement.textContent.trim() : '';
                    
                    if (userName) {
                        console.log(`  用户 ${index + 1}: ${userName}, 时间: ${timeText}, 预览: ${lastMessageText.substring(0, 30)}...`);
                    } else {
                        console.log(`  用户 ${index + 1}: [无名称用户], 时间: ${timeText}, 预览: ${lastMessageText.substring(0, 30)}...`);
                    }
                    // 🔥 修复：为无名称用户生成唯一的临时ID
                    let tempUserId;
                    if (userName) {
                        // 有名称用户：使用名称+头像生成ID
                        tempUserId = generateUserId(userName, userAvatar);
                    } else {
                        // 🔥 无名称用户：使用索引+预览内容+头像+时间戳生成唯一ID
                        const uniqueString = `unnamed_${index}_${lastMessageText.substring(0, 20)}_${timeText}_${Date.now()}`;
                        tempUserId = generateUserId(uniqueString, userAvatar);
                    }
                    
                    const userData = {
                        index: index,
                        user_id: tempUserId,  // 🔥 使用修复后的唯一ID
                        name: userName,       // 🔥 保持空字符串，不预分配临时名称
                        avatar: userAvatar,
                        session_time: sessionTime.toISOString(),
                        time_text: timeText,
                        last_message_preview: lastMessageText,
                        element: userItem,
                        nameElement: nameElement,
                        // 🔥 标记是否为无名称用户
                        isNameless: userName === ''
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
    // 1. 在 processAllUsers 函数中添加AI分身识别逻辑
    async function processAllUsers(users, accountId) {
        console.log(`🔄 开始处理 ${users.length} 个用户...`);
        const processedUsers = [];

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            console.log(`\n👤 [${i + 1}/${users.length}] 处理用户: ${user.name || '无名称用户'}`);

            try {
                // 🔥 点击用户名元素
                const clickSuccess = clickUserNameElement(user);
                if (!clickSuccess) {
                    console.warn(`⚠️ 点击用户失败: ${user.name || '无名称用户'}`);
                    processedUsers.push(createFallbackUserData(user));
                    continue;
                }

                // 🔥 等待API响应被拦截
                console.log(`  ⏳ 等待API响应...`);
                await delay(4000);

                // 🔥 获取拦截到的数据
                const interceptedMessages = getLatestInterceptedMessages();
                
                if (interceptedMessages && interceptedMessages.length > 0) {
                    console.log(`  ✅ 成功获取 ${interceptedMessages.length} 条API消息`);
                    
                    // 🔥 新增：如果是无名称用户，尝试提取AI分身名称并注入DOM
                    if (!user.name && interceptedMessages.length > 0) {
                        const aiName = extractAINameFromMessages(interceptedMessages);
                        if (aiName) {
                            console.log(`  🤖 识别到AI分身: ${aiName}`);
                            
                            // 执行DOM注入
                            const injectionSuccess = injectAINameToDOM(user, aiName);
                            if (injectionSuccess) {
                                console.log(`  💉 DOM注入成功: ${aiName}`);
                                user.name = aiName; // 更新用户数据
                                user.isAIAssistant = true;
                            }
                        }
                    }
                    
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
                console.error(`❌ 处理用户 ${user.name || '无名称用户'} 失败:`, error);
                processedUsers.push(createFallbackUserData(user));
                continue;
            }
        }

        console.log(`\n🎉 用户处理完成: ${processedUsers.length}/${users.length}`);
        return processedUsers;
    }

    // 2. 新增：从消息中提取AI分身名称
    function extractAINameFromMessages(messages) {
        try {
            // 检查前3条消息
            const maxCheck = Math.min(3, messages.length);
            
            for (let i = 0; i < maxCheck; i++) {
                const message = messages[i];
                if (!message.text) continue;
                
                const messageText = message.text;
                console.log(`    🔍 检查第${i+1}条消息: ${messageText.substring(0, 50)}...`);
                
                // 跳过系统提示消息
                if (messageText.includes('AI 回复不保证真实准确') || 
                    messageText.includes('使用须知') ||
                    messageText.length < 10) {
                    console.log(`    ⏭️ 跳过系统提示消息`);
                    continue;
                }
                
                // 多种AI分身名称匹配模式
                let aiNameMatch = messageText.match(/我是([^的]+)的\s*AI\s*分身/);
                if (!aiNameMatch) {
                    aiNameMatch = messageText.match(/我是\s*([^\s]+)\s*的AI分身/);
                }
                if (!aiNameMatch) {
                    aiNameMatch = messageText.match(/我是([^，,！!。.的]+).*AI\s*分身/);
                }
                
                if (aiNameMatch) {
                    const aiName = aiNameMatch[1].trim();
                    const fullAiName = `${aiName}的AI分身`;
                    console.log(`    🤖 提取到AI分身名称: ${fullAiName}`);
                    return fullAiName;
                }
            }
            
            console.log(`    ⚠️ 前${maxCheck}条消息中未找到AI分身介绍`);
            return null;
            
        } catch (error) {
            console.error('❌ 提取AI分身名称失败:', error);
            return null;
        }
    }

    // 3. 新增：将AI分身名称注入到DOM
    function injectAINameToDOM(user, aiName) {
        try {
            // 重新获取用户元素（可能因为点击后DOM发生了变化）
            const userListContainer = document.querySelector('.ReactVirtualized__Grid__innerScrollContainer');
            if (!userListContainer) {
                console.error('❌ 注入失败: 未找到用户列表容器');
                return false;
            }
            
            const userItems = userListContainer.querySelectorAll('li.semi-list-item');
            if (user.index >= userItems.length) {
                console.error('❌ 注入失败: 用户索引超出范围');
                return false;
            }
            
            const targetUserElement = userItems[user.index];
            const nameElement = targetUserElement.querySelector('.item-header-name-vL_79m');
            
            if (!nameElement) {
                console.error('❌ 注入失败: 未找到名称元素');
                return false;
            }
            
            // 注入AI分身名称并设置可见样式
            nameElement.textContent = aiName;
            
            // 🔥 关键：确保文本可见的样式设置
            nameElement.style.display = 'inline-block';
            nameElement.style.visibility = 'visible';
            nameElement.style.opacity = '1';
            nameElement.style.color = '#1890ff'; // 蓝色标识AI分身
            nameElement.style.fontWeight = 'bold';
            nameElement.style.whiteSpace = 'nowrap';
            nameElement.style.overflow = 'visible';
            nameElement.style.textOverflow = 'unset';
            nameElement.style.maxWidth = 'none';
            nameElement.style.width = 'auto';
            nameElement.style.minWidth = '60px';
            
            console.log(`💉 DOM注入成功: "${aiName}"`);
            return true;
            
        } catch (error) {
            console.error('❌ DOM注入异常:', error);
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