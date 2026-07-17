const jwt = require('jsonwebtoken');

async function testApi() {
  const payload = { 
    sub: '6a44c4bab6896738e7b06071', // hoangvokhanh
    email: 'hoangvokhanh.it@gmail.com',
    username: 'hoangvokhanh'
  };
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
  const secret = process.env.JWT_SECRET;
  
  const token = jwt.sign(payload, secret, { expiresIn: '1d' });
  
  try {
    const res = await fetch('http://localhost:5000/api/projects?limit=100', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('Projects count:', data.data ? data.data.length : data);
    if(data.data) console.log('Projects:', data.data.map(p => p.name));
  } catch (err) {
    console.error('Error:', err);
  }
}

testApi();
