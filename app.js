const path = require('path')
const express = require('express')
const session = require('express-session')
const bcrypt = require('bcryptjs')
const fileUpload = require('express-fileupload')
const mysql = require('mysql2')

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(fileUpload())
app.use(session({
    secret: process.env.SESSION_SECRET || 'change-this-secret',
    resave: false,
    saveUninitialized: false,
}))

// Database connection settings come from environment variables (with local defaults).
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ceid_project',
})
const myDatabase = pool.promise()

// EJS templates live in the project root.
app.set('view engine', 'ejs')
app.set('views', __dirname)

const SALT_ROUNDS = 10

// ---------- helpers ----------

function requireLogin(req, res, next) {
    if (!req.session.user) return res.status(401).send('Please sign in first')
    next()
}

function requireAdmin(req, res, next) {
    if (!req.session.user || !req.session.user.isAdmin) return res.status(403).send('Admins only')
    next()
}

function countTypes(rows) {
    const counts = {}
    rows.forEach(point => {
        JSON.parse(point.types).forEach(type => {
            counts[type] = (counts[type] || 0) + 1
        })
    })
    return counts
}

// ---------- pages ----------

app.get('/', (req, res) => res.render('index.ejs'))
app.get('/register', (req, res) => res.render('register.ejs'))
app.get('/editprofile', requireLogin, (req, res) => res.render('editprofile.ejs'))
app.get('/userpage', requireLogin, (req, res) => res.render('userPage.ejs'))
app.get('/adminpage', requireAdmin, (req, res) => res.render('adminPage.ejs'))

// ---------- authentication ----------

app.post('/signin', async (req, res) => {
    const { email, password } = req.body
    const [rows] = await myDatabase.query('SELECT * FROM users WHERE email = ?', [email])
    const user = rows[0]

    if (!user || !(await bcrypt.compare(password || '', user.password))) {
        return res.status(401).send('wrong data')
    }

    req.session.user = {
        id: user.userID,
        username: user.username,
        email: user.email,
        isAdmin: !!user.isAdmin,
    }
    res.redirect(user.isAdmin ? '/adminpage' : '/userpage')
})

app.post('/register', async (req, res) => {
    const { email, password, username } = req.body
    if (!email || !password || !username) return res.status(400).send('Συμπληρώστε όλα τα πεδία')

    try {
        const hash = await bcrypt.hash(password, SALT_ROUNDS)
        await myDatabase.query(
            'INSERT INTO users (username, password, email, isAdmin) VALUES (?, ?, ?, 0)',
            [username, hash, email]
        )
        res.status(200).send('Εγγραφήκατε Επιτυχως')
    } catch (error) {
        console.log(error)
        res.status(403).send('Εχετε ήδη εγγεγραφει')
    }
})

app.post('/editprofile', requireLogin, async (req, res) => {
    const updates = []
    const values = []

    if (req.body.email) { updates.push('email = ?'); values.push(req.body.email) }
    if (req.body.username) { updates.push('username = ?'); values.push(req.body.username) }
    if (req.body.password) { updates.push('password = ?'); values.push(await bcrypt.hash(req.body.password, SALT_ROUNDS)) }

    if (updates.length === 0) return res.status(400).send('Nothing to update')

    values.push(req.session.user.id)
    const [result] = await myDatabase.query(`UPDATE users SET ${updates.join(', ')} WHERE userID = ?`, values)

    if (result.affectedRows > 0) {
        if (req.body.email) req.session.user.email = req.body.email
        if (req.body.username) req.session.user.username = req.body.username
        res.status(200).send('Profile Updated Successfully')
    } else {
        res.status(500).send('something went wrong')
    }
})

// ---------- admin ----------

app.post('/upload_data', requireAdmin, async (req, res) => {
    if (!req.files || !req.files.file1) return res.status(400).send('No file uploaded')

    let pois
    try {
        pois = JSON.parse(req.files.file1.data)
    } catch (error) {
        return res.status(400).send('Invalid JSON file')
    }

    for (const poi of pois) {
        try {
            const [result] = await myDatabase.query(
                'INSERT INTO points_of_interest (givenId, name, address, coordinates, types) VALUES (?, ?, ?, Point(?, ?), ?)',
                [poi.id, poi.name, poi.address, poi.coordinates.lat, poi.coordinates.lng, JSON.stringify(poi.types)]
            )
            const pointId = result.insertId

            for (const day of poi.populartimes || []) {
                const hours = Array.from({ length: 24 }, (_, h) => day.data[h] ?? null)
                const hourColumns = hours.map((_, h) => `hour_${h}`).join(', ')
                const placeholders = hours.map(() => '?').join(', ')
                await myDatabase.query(
                    `INSERT INTO poi_popular_times (pointId, \`day\`, ${hourColumns}) VALUES (?, ?, ${placeholders})`,
                    [pointId, day.name, ...hours]
                )
            }
        } catch (error) {
            // Duplicate POIs (same givenId) are skipped.
            console.log(error.message)
        }
    }

    res.send('Τα δεδομένα έχουν μπεί μοναδικά στην βάση')
})

app.delete('/delete_all', requireAdmin, async (req, res) => {
    try {
        await myDatabase.query('DELETE FROM infected_users')
        await myDatabase.query('DELETE FROM poi_popular_times')
        await myDatabase.query('DELETE FROM uservisitedpoint')
        await myDatabase.query('DELETE FROM points_of_interest')
        res.send('ok')
    } catch (error) {
        console.log(error)
        res.status(500).send('not_ok')
    }
})

app.get('/admin_data', requireAdmin, async (req, res) => {
    const [[visits]] = await myDatabase.query('SELECT COUNT(*) AS totalVisits FROM uservisitedpoint')
    const [[infections]] = await myDatabase.query('SELECT COUNT(*) AS totalInfections FROM infected_users')

    const [popularPois] = await myDatabase.query(`
        SELECT points_of_interest.pointId, COUNT(points_of_interest.pointId) AS totalVisits, types
        FROM users
        INNER JOIN uservisitedpoint ON users.userID = uservisitedpoint.userID
        INNER JOIN points_of_interest ON uservisitedpoint.pointId = points_of_interest.pointId
        GROUP BY pointId
        ORDER BY totalVisits DESC`)

    const [popularCovidPois] = await myDatabase.query(`
        SELECT points_of_interest.pointId, COUNT(points_of_interest.pointId) AS totalVisits, types, isInfected
        FROM users
        INNER JOIN uservisitedpoint ON users.userID = uservisitedpoint.userID
        INNER JOIN points_of_interest ON uservisitedpoint.pointId = points_of_interest.pointId
        INNER JOIN infected_users ON infected_users.userID = users.userID
        WHERE isInfected = 1
          AND DATE(timestamp) > DATE_SUB(infected_date, INTERVAL 7 DAY)
          AND DATE(timestamp) < DATE_ADD(infected_date, INTERVAL 14 DAY)
        GROUP BY pointId
        ORDER BY totalVisits DESC`)

    res.send({
        totalVisits: visits.totalVisits,
        totalInfections: infections.totalInfections,
        popularity: countTypes(popularPois),
        popularityInfected: countTypes(popularCovidPois),
    })
})

// ---------- user ----------

app.get('/bring_data', requireLogin, async (req, res) => {
    const todayName = new Date().toLocaleString('en-US', { weekday: 'long' })
    const searchTerm = req.query.param || ''

    const [rows] = await myDatabase.query(
        `SELECT * FROM points_of_interest
         INNER JOIN poi_popular_times ON points_of_interest.pointId = poi_popular_times.pointId
         WHERE types LIKE ? AND day = ?`,
        [`%${searchTerm}%`, todayName]
    )

    const allPois = rows.map(point => {
        const { pointId, givenId, name, types, address, coordinates, pt_id, day, ...hours } = point
        return {
            pointId,
            givenId,
            name,
            types: JSON.parse(types),
            address,
            coordinates,
            pt_id,
            popularity: { day, value: Object.values(hours) },
        }
    })

    res.send(allPois)
})

app.post('/uservisited', requireLogin, async (req, res) => {
    const pointId = req.body.pointId
    const numberOfPeople = req.body.numberOfPeople || null

    const [result] = await myDatabase.query(
        'INSERT INTO userVisitedPoint (pointId, timestamp, userID, numberOfUsers) VALUES (?, NOW(), ?, ?)',
        [pointId, req.session.user.id, numberOfPeople]
    )

    if (result.affectedRows > 0) {
        res.status(200).send('Submited Successfully')
    } else {
        res.status(500).send('something went wrong')
    }
})

app.post('/submitCovid', requireLogin, async (req, res) => {
    const userId = req.session.user.id
    const submittedDate = req.body.date

    const [rows] = await myDatabase.query(
        'SELECT infected_date FROM infected_users WHERE userID = ? ORDER BY infected_date DESC',
        [userId]
    )
    const lastDate = rows[0]?.infected_date

    // A new positive test can be declared only if more than 14 days have passed since the last one.
    if (lastDate) {
        const daysBetween = Math.ceil(Math.abs(new Date(submittedDate) - new Date(lastDate)) / (1000 * 60 * 60 * 24))
        if (daysBetween <= 14) return res.status(201).send('Not enough Days passed')
    }

    const [result] = await myDatabase.query(
        'INSERT INTO infected_users (userID, isInfected, infected_date) VALUES (?, 1, ?)',
        [userId, submittedDate]
    )

    if (result.affectedRows > 0) {
        res.status(200).send('Submited Successfully')
    } else {
        res.status(500).send('something went wrong')
    }
})

app.get('/visite_place', requireLogin, async (req, res) => {
    const userId = req.session.user.id

    const [places] = await myDatabase.query(
        `SELECT DISTINCT name FROM points_of_interest
         INNER JOIN uservisitedpoint ON points_of_interest.pointId = uservisitedpoint.pointId
         WHERE userID = ?`,
        [userId]
    )
    const [covid] = await myDatabase.query(
        'SELECT isInfected, infected_date FROM infected_users WHERE userID = ?',
        [userId]
    )

    res.status(200).send({ data: places, covidArray: covid })
})

app.get('/haveIVisitedInfectedPlace', requireLogin, async (req, res) => {
    const userId = req.session.user.id
    const [visits] = await myDatabase.query(
        'SELECT userID, pointId, timestamp FROM uservisitedpoint WHERE userID = ?',
        [userId]
    )

    // For every place the user visited, look for infected users who were there within 2 hours
    // and inside the infection window (7 days before to 14 days after the positive test).
    const infectedPlaces = await Promise.all(visits.map(async visit => {
        const [rows] = await myDatabase.query(
            `SELECT uv.timestamp, points_of_interest.name FROM uservisitedpoint uv
             INNER JOIN infected_users iu ON uv.userID = iu.userID
             INNER JOIN points_of_interest ON points_of_interest.pointId = uv.pointId
             WHERE iu.userID <> ?
               AND uv.pointId = ?
               AND ABS(TIMESTAMPDIFF(HOUR, uv.timestamp, ?)) < 2
               AND DATE(uv.timestamp) > DATE_SUB(iu.infected_date, INTERVAL 7 DAY)
               AND DATE(uv.timestamp) < DATE_ADD(iu.infected_date, INTERVAL 14 DAY)`,
            [visit.userID, visit.pointId, visit.timestamp]
        )
        return rows[0]
    }))

    res.status(200).send(infectedPlaces.filter(Boolean))
})

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'))
})

app.listen(port, () => {
    console.log(`COVID Hotspot Tracker running at http://localhost:${port}`)
})
