import prisma from '../src/lib/prisma.js';
import bcrypt from 'bcrypt';

async function main() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const usernames = ['reception1', 'sahra', 'moha', 'yusuf'];
        for (const username of usernames) {
            const user = await prisma.user.findUnique({ where: { username } });
            if (user) {
                await prisma.user.update({
                    where: { username },
                    data: { password: hashedPassword }
                });
                console.log(`Updated password for ${username} to admin123`);
            } else {
                console.log(`User ${username} not found`);
            }
        }
    } catch (error) {
        console.error(error);
    }
}

main();
