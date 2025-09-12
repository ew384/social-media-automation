// douyin-send.js - 抖音私信发送脚本
// 支持通过参数调用: (userName, content, type) => { ... }
// 2. 新增：AI分身验证查找函数（fallback机制）
async function findAIAssistantByVerification(targetUserName, userElements) {
    console.log('🔍 开始AI分身验证查找...');
    
    // 设置临时拦截器
    let interceptedData = null;
    const originalXHR = window.XMLHttpRequest;
    
    function TempXHR() {
        const xhr = new originalXHR();
        const originalOpen = xhr.open;
        const originalSend = xhr.send;
        
        let requestUrl = '';
        
        xhr.open = function(method, url, ...args) {
            requestUrl = url;
            return originalOpen.call(this, method, url, ...args);
        };
        
        xhr.send = function(...args) {
            if (requestUrl.includes('imapi.snssdk.com/v1/message/get_by_conversation')) {
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
                            
                            // 提取AI分身名称
                            const aiName = extractAINameFromResponse(responseText);
                            if (aiName) {
                                interceptedData = aiName;
                                console.log('🤖 验证拦截到AI分身名称:', aiName);
                            }
                            
                        } catch (error) {
                            console.error('❌ 处理验证响应失败:', error);
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
    
    // 应用拦截器
    Object.setPrototypeOf(TempXHR.prototype, originalXHR.prototype);
    Object.setPrototypeOf(TempXHR, originalXHR);
    window.XMLHttpRequest = TempXHR;
    
    try {
        // 遍历无名称用户进行验证
        for (let i = 0; i < userElements.length; i++) {
            const userElement = userElements[i];
            const nameElement = userElement.querySelector('.item-header-name-vL_79m');
            const name = nameElement ? nameElement.textContent.trim() : '';
            
            // 只检查空名称的用户
            if (name === '') {
                console.log(`  🔍 验证无名称用户 ${i + 1}...`);
                
                // 重置拦截数据
                interceptedData = null;
                
                // 点击用户
                if (nameElement) {
                    nameElement.click();
                } else {
                    userElement.click();
                }
                
                // 等待API响应
                await delay(3000);
                
                // 检查是否匹配目标用户名
                if (interceptedData === targetUserName) {
                    console.log(`✅ 验证成功，找到AI分身: ${targetUserName}`);
                    // 恢复XMLHttpRequest
                    window.XMLHttpRequest = originalXHR;
                    return true;
                }
            }
        }
        
        console.log('❌ 验证完所有无名称用户，未找到匹配的AI分身');
        return false;
        
    } finally {
        // 恢复XMLHttpRequest
        window.XMLHttpRequest = originalXHR;
    }
}

// 3. 新增：从API响应中提取AI分身名称
function extractAINameFromResponse(responseText) {
    try {
        const textMatches = responseText.match(/"text":"([^"\\\\]*(\\\\.[^"\\\\]*)*)"/g);
        if (!textMatches || textMatches.length === 0) return null;
        
        // 检查前3条消息
        const maxCheck = Math.min(3, textMatches.length);
        
        for (let i = 0; i < maxCheck; i++) {
            const textMatch = textMatches[i].match(/"text":"([^"\\\\]*(\\\\.[^"\\\\]*)*)"/);
            if (!textMatch) continue;
            
            const messageText = textMatch[1]
                .replace(/\\\\"/g, '"')
                .replace(/\\\\\\\\/g, '\\\\')
                .replace(/\\\\n/g, '\\n');
            
            // 跳过系统提示消息
            if (messageText.includes('AI 回复不保证真实准确') || 
                messageText.includes('使用须知') ||
                messageText.length < 10) {
                continue;
            }
            
            // 提取AI分身名称
            let aiNameMatch = messageText.match(/我是([^的]+)的\s*AI\s*分身/);
            if (!aiNameMatch) {
                aiNameMatch = messageText.match(/我是\s*([^\s]+)\s*的AI分身/);
            }
            if (!aiNameMatch) {
                aiNameMatch = messageText.match(/我是([^，,！!。.的]+).*AI\s*分身/);
            }
            
            if (aiNameMatch) {
                const aiName = aiNameMatch[1].trim();
                return `${aiName}的AI分身`;
            }
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ 提取AI分身名称失败:', error);
        return null;
    }
}
(async function(userName, content, type = 'text') {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    
    try {
        console.log('🚀 开始发送抖音消息:', userName, type);
        
        // 1. 查找目标用户
        const userListContainer = document.querySelector('.ReactVirtualized__Grid__innerScrollContainer');
        if (!userListContainer) {
            throw new Error('未找到用户列表容器');
        }
        
        const userElements = userListContainer.querySelectorAll('li.semi-list-item');
        console.log('📋 找到用户数量:', userElements.length);
        // 🔥 检查是否为AI分身用户（包含"AI分身"关键词）
        const isAIAssistant = userName.includes('AI分身');
        let userFound = false;

        if (isAIAssistant) {
            console.log('🤖 检测到AI分身用户，优先使用注入名称匹配');
            
            // 🔥 方案1: 优先使用注入的名称进行直接匹配
            for (let userElement of userElements) {
                const nameElement = userElement.querySelector('.item-header-name-vL_79m');
                if (nameElement) {
                    const name = nameElement.textContent.trim();
                    console.log('  - 检查用户:', name);
                    
                    if (name === userName) {
                        console.log('✅ 通过注入名称找到AI分身用户，点击打开对话');
                        nameElement.click();
                        await delay(2500);
                        userFound = true;
                        break;
                    }
                }
            }
            
            // 🔥 方案2: Fallback - 如果注入名称匹配失败，使用验证方式
            if (!userFound) {
                console.log('⚠️ 注入名称匹配失败，使用验证方式查找AI分身');
                userFound = await findAIAssistantByVerification(userName, userElements);
            }
            
        } else {
            // 🔥 普通用户：保持原有的名称匹配逻辑
            console.log('👤 普通用户，使用标准名称匹配');
            // 查找并点击目标用户
            for (let userElement of userElements) {
                const nameElement = userElement.querySelector('.item-header-name-vL_79m');
                if (nameElement) {
                    const name = nameElement.textContent.trim();
                    console.log('  - 检查用户:', name);
                    
                    if (name === userName) {
                        console.log('✅ 找到目标用户，点击打开对话');
                        nameElement.click();
                        await delay(2500); // 等待对话界面加载
                        userFound = true;
                        break;
                    }
                }
            }
        }

        if (!userFound) {
            throw new Error(`未找到用户: ${userName}`);
        }
        // 2. 确认对话界面已加载
        const chatContainer = document.querySelector('[class*="chat"]');
        if (!chatContainer) {
            throw new Error('未找到聊天界面容器');
        }
        console.log('✅ 对话界面已加载');
        
        // 3. 查找输入框 (基于调试结果，使用contenteditable)
        const inputElement = document.querySelector('[contenteditable="true"].chat-input-dccKiL');
        if (!inputElement) {
            throw new Error('未找到输入框');
        }
        console.log('✅ 找到输入框');
        
        // 4. 查找发送按钮 (基于调试结果，查找包含"发送"文本的按钮)
        const sendButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
            btn.textContent.includes('发送')
        );
        
        if (sendButtons.length === 0) {
            throw new Error('未找到发送按钮');
        }
        
        const sendButton = sendButtons[0];
        console.log('✅ 找到发送按钮');
        
        // 5. 输入消息内容
        console.log('📝 输入消息内容...');
        inputElement.focus();
        await delay(300);
        
        // 清空并输入内容
        inputElement.textContent = '';
        inputElement.textContent = content;
        
        // 触发输入事件
        const inputEvent = new InputEvent('input', { 
            bubbles: true, 
            data: content 
        });
        inputElement.dispatchEvent(inputEvent);
        
        console.log('✅ 消息内容已输入');
        await delay(500);
        
        // 6. 检查按钮状态并点击发送
        if (sendButton.disabled) {
            console.log('⚠️ 发送按钮被禁用，等待激活...');
            await delay(1000);
        }
        
        console.log('🚀 点击发送按钮...');
        sendButton.click();
        
        await delay(1000);
        console.log('✅ 消息发送完成!');
        
        // 🔥 重要：找到目标用户并完成发送后立即退出
        return {
            success: true,
            message: '消息发送成功',
            user: userName,
            type: type,
            content: content,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ 发送抖音消息失败:', error.message);
        return {
            success: false,
            error: error.message,
            user: userName,
            type: type,
            timestamp: new Date().toISOString()
        };
    }
})