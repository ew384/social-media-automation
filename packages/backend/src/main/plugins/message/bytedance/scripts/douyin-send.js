// douyin-send.js - 抖音私信发送脚本
// 支持通过参数调用: (userName, content, type) => { ... }

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
                }
            }
        }
        
        // 如果执行到这里，说明没找到目标用户
        throw new Error(`未找到用户: ${userName}`);
        
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