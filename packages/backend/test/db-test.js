const Database = require('better-sqlite3');

try {
  console.log('📡 测试数据库连接...');
  const db = new Database(':memory:');
  
  // 创建测试表
  db.exec(`
    CREATE TABLE test (
      id INTEGER PRIMARY KEY,
      name TEXT
    )
  `);
  
  // 插入测试数据
  const stmt = db.prepare('INSERT INTO test (name) VALUES (?)');
  stmt.run('测试数据');
  
  // 查询测试数据
  const row = db.prepare('SELECT * FROM test WHERE id = ?').get(1);
  console.log('✅ 数据库测试成功:', row);
  
  db.close();
  console.log('🎉 数据库连接正常！');
} catch (error) {
  console.error('❌ 数据库测试失败:', error);
  process.exit(1);
}
