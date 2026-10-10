# COVID Hotspot Tracker

A web application that helps users avoid crowded places and find out whether they may have been in contact with a COVID-19 case.

Built during the pandemic as a university project for the course *Web Programming* at the Computer Engineering & Informatics Department (CEID), University of Patras.

## Features

**Users**
- Register, sign in and edit their profile
- Search points of interest (cafés, supermarkets, etc.) on an interactive map, colour-coded by how crowded they are expected to be right now
- Record a visit to a point of interest, with an optional estimate of how many people were there
- Declare a positive COVID-19 test
- Get notified if they visited a place within 2 hours of a confirmed case (from 7 days before to 14 days after the positive test)

**Administrators**
- Upload points of interest with their weekly "popular times" from a JSON file
- View statistics: total visits, total cases, and the most visited place types overall and among cases (charts)
- Clear all data

## Tech stack

- **Back end:** Node.js, Express, express-session
- **Database:** MySQL (mysql2, parameterised queries)
- **Front end:** EJS templates, Bootstrap 5, Leaflet (maps), Chart.js
- **Security:** passwords hashed with bcrypt, session-based authentication, admin-only routes

## Getting started

Requirements: Node.js and a running MySQL server.

```bash
# 1. Install dependencies
npm install

# 2. Create the database and tables
mysql -u root -p < database.sql

# 3. Create an admin account
node create-admin.js admin admin@example.com <password>

# 4. Start the app
npm start
```

Then open http://localhost:3000.

Database connection settings can be changed with the environment variables `DB_HOST`, `DB_USER`, `DB_PASSWORD` and `DB_NAME`. Set `SESSION_SECRET` to your own value in any shared environment.

Sample data for the admin upload is included in `generic.json`, `specific.json` and `starting_pois.json`.

## Project structure

| File | Purpose |
|------|---------|
| `app.js` | Express server, routes and database queries |
| `database.sql` | Database schema |
| `create-admin.js` | Creates an admin account with a hashed password |
| `index.ejs`, `register.ejs` | Sign-in and registration pages |
| `userPage.ejs` | Map, search, visits and COVID declaration |
| `adminPage.ejs` | Data upload and statistics |
| `editprofile.ejs` | Profile editing |

## Note

This is an academic project. It was later refactored to use parameterised SQL queries, hashed passwords and per-user sessions.
