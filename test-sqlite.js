console.log('Testing better-sqlite3...');
try {
  const db = require('better-sqlite3');
  console.log('better-sqlite3 loaded successfully');
} catch(e) {
  console.error('Error:', e.message);
}
