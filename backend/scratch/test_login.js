async function testLogin(username, password) {
    try {
        console.log(`Testing login for ${username}...`);
        const res = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) {
            console.error(`❌ Login failed for ${username}:`, data);
            console.log('--------------------------------------------');
            return;
        }
        console.log(`✅ Login successful for ${username}! Role: ${data.user.role}`);
        
        const token = data.token;
        const branchId = data.user.branches[0]?.id;
        
        // Try calling auth/me
        const meRes = await fetch('http://localhost:5000/api/auth/me', {
            headers: {
                Authorization: `Bearer ${token}`,
                'x-branch-id': branchId,
            }
        });
        const meData = await meRes.json();
        console.log(`✅ /auth/me status: ${meRes.status}. Role in DB: ${meData.role}`);

        // Try calling stats dashboard
        const statsRes = await fetch('http://localhost:5000/api/dashboard/stats', {
            headers: {
                Authorization: `Bearer ${token}`,
                'x-branch-id': branchId,
            }
        });
        console.log(`✅ /dashboard/stats status: ${statsRes.status}`);

        // Try calling role-specific dashboard
        const roleLower = data.user.role.toLowerCase();
        if (['receptionist', 'pharmacist', 'optician', 'doctor'].includes(roleLower)) {
            const dashboardRes = await fetch(`http://localhost:5000/api/dashboard/${roleLower}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'x-branch-id': branchId,
                }
            });
            console.log(`✅ /dashboard/${roleLower} status: ${dashboardRes.status}`);
        }
        console.log('--------------------------------------------');
    } catch (error) {
        console.error(`❌ Failed for ${username}:`, error.message);
        console.log('--------------------------------------------');
    }
}

async function runTests() {
    await testLogin('admin', 'admin123');
    await testLogin('reception1', 'admin123');
    await testLogin('pharmacist1', 'admin123');
}

runTests();
