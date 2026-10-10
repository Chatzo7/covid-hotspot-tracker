// Creates an admin account with a bcrypt-hashed password.
// Usage: node create-admin.js <username> <email> <password>
const bcrypt = require('bcryptjs')
const mysql = require('mysql2/promise')

async function main() {
    const [username, email, password] = process.argv.slice(2)
    if (!username || !email || !password) {
        console.log('Usage: node create-admin.js <username> <email> <password>')
        process.exit(1)
    }

    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ceid_project',
    })

    const hash = await bcrypt.hash(password, 10)
    await db.query('INSERT INTO users (username, password, email, isAdmin) VALUES (?, ?, ?, 1)', [username, hash, email])
    console.log(`Admin "${username}" created.`)
    await db.end()
}

main().catch(error => {
    console.error(error.message)
    process.exit(1)
})
