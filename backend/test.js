const base = 'http://localhost:5000/api/auth';

// Test 1: Register
console.log('=== TEST 1: REGISTER ===');
const regRes = await fetch(`${base}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Dr. Ahmed', username: 'drahmed' + Date.now(), password: 'pass123', role: 'DOCTOR' })
});
console.log('Status:', regRes.status);
console.log(JSON.stringify(await regRes.json(), null, 2));

// Test 2: Login
console.log('\n=== TEST 2: LOGIN ===');
const loginRes = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
});
console.log('Status:', loginRes.status);
console.log(JSON.stringify(await loginRes.json(), null, 2));

// Test 3: Bad login
console.log('\n=== TEST 3: BAD LOGIN ===');
const badRes = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'wrongpass' })
});
console.log('Status:', badRes.status);
console.log(JSON.stringify(await badRes.json(), null, 2));
