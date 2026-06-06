async function main() {
    try {
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) {
            console.error('Login failed:', loginData);
            return;
        }

        const token = loginData.token;
        const usersRes = await fetch('http://localhost:5000/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const usersData = await usersRes.json();
        console.log('=== API Users Response ===');
        console.log(JSON.stringify(usersData, null, 2));
    } catch (e) {
        console.error(e);
    }
}
main();
