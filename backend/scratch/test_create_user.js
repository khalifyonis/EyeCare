// End-to-end test: login as admin, create a user, check email and datatable

async function main() {
    // Step 1: Login as admin  
    console.log('=== Step 1: Login as admin ===');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) {
        console.error('❌ Login failed:', loginData);
        return;
    }
    console.log('✅ Login OK. Role:', loginData.user.role);
    const token = loginData.token;
    const branchId = loginData.user.branches[0]?.id;
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-branch-id': branchId,
    };

    // Step 2: Create a test user with a UNIQUE email using gmail + alias trick
    // Gmail ignores everything after + so qaliifyonis+test123@gmail.com -> qaliifyonis@gmail.com
    const uniqueSuffix = Date.now();
    const testEmail = `qaliifyonis+test${uniqueSuffix}@gmail.com`;
    const testUsername = 'testuser_' + uniqueSuffix;
    console.log('\n=== Step 2: Create user ===');
    console.log(`Username: ${testUsername}, Email: ${testEmail}`);
    
    const createRes = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            fullName: 'Test User Email',
            username: testUsername,
            email: testEmail,
            roleName: 'RECEPTIONIST',
            branchIds: [branchId],
        })
    });
    const createData = await createRes.json();
    console.log('Status:', createRes.status);
    console.log('Response:', JSON.stringify(createData, null, 2));

    if (!createRes.ok) {
        console.error('❌ Create user FAILED!');
        console.error('Error message:', createData.message);
        return;
    }

    console.log('✅ User created! emailSent:', createData.emailSent);

    // Step 3: Fetch all users and check if the new user appears
    console.log('\n=== Step 3: Verify user in datatable ===');
    const listRes = await fetch('http://localhost:5000/api/users', { headers });
    const users = await listRes.json();
    const found = users.find(u => u.username === testUsername);
    if (found) {
        console.log('✅ User FOUND in list! ID:', found.id, 'Role:', found.roleName);
    } else {
        console.error('❌ User NOT found in list! Total users:', users.length);
    }

    // Step 4: Clean up
    if (found) {
        console.log('\n=== Step 4: Cleanup ===');
        const deleteRes = await fetch(`http://localhost:5000/api/users/${found.id}`, {
            method: 'DELETE',
            headers,
        });
        console.log('Delete status:', deleteRes.status);
    }
}

main().catch(console.error);
