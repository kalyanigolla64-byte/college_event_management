KALYANI COLLEGE EVENT MANAGEMENT
=================================

Features:
- Create/insert an event with a manually entered Event ID
- Read/list all events
- Update an event
- Delete an event
- Search by ID, name, type, venue, or description
- Responsive design, event-themed local background image, and JavaScript validation

DATABASE EXPECTED
Database: college_event
Table: events
Columns (matching the screenshot):
event_id, event_name, event_type, event_date, venue, description

The Insert page asks you to enter a unique Event ID manually (for example, 106). Do not reuse an existing ID. If your table already exists with these column names, keep it. If needed, run:
SOURCE schema.sql;

SETUP ON WINDOWS
1. Install Node.js and MySQL.
2. Extract this ZIP.
3. Open the extracted project folder in VS Code.
4. Open server.js and set DB_PASSWORD to your MySQL password.
   DB_USER defaults to root; DB_NAME defaults to college_event.
5. Open a terminal in this folder and run:
      npm install
6. Start the website:
      npm start
7. Open this address in your browser:
      http://localhost:3000

IMPORTANT
- Do not open the HTML files directly or with Live Server. Start server.js and visit localhost:3000.
- MySQL must be running.
- If your MySQL user has no password, set DB_PASSWORD to an empty string.
- If you get "Access denied", correct the MySQL username/password in server.js.
- If you get "Table doesn't exist", check that the table is named exactly events and the database is college_event.
- The server uses mysql2, not the package named mysql8.


NEW: events.html displays the complete list of records from college_event.events after insert/update/delete operations. Use All Events in the navigation and click Refresh list to reload current database records. Background illustrations are local SVG files under public/images and are different for Home, Insert, Update, Delete, Search, and All Events.
