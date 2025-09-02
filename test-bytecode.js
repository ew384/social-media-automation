console.log('=== 环境信息 ===');
console.log('Node.js:', process.version);
console.log('V8:', process.versions.v8);
console.log('Platform:', process.platform);
console.log('Arch:', process.arch);

const bytenode = require('bytenode');
const fs = require('fs');

// 创建简单测试文件
const testCode = 'console.log("Test from bytecode"); module.exports = { success: true };';
fs.writeFileSync('simple-test.js', testCode);

try {
    console.log('\n=== 编译测试 ===');
    bytenode.compileFile({
        filename: 'simple-test.js',
        output: 'simple-test.jsc'
    });
    console.log('✅ 编译完成');

    console.log('\n=== 立即运行测试 ===');
    const result = bytenode.runBytecodeFile('simple-test.jsc');
    console.log('✅ 运行成功:', result);

} catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误类型:', error.name);
    console.error('错误堆栈:', error.stack);
} finally {
    // 清理文件
    if (fs.existsSync('simple-test.js')) fs.unlinkSync('simple-test.js');
    if (fs.existsSync('simple-test.jsc')) fs.unlinkSync('simple-test.jsc');
}
