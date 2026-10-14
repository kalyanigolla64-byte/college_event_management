const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Update DB_PASSWORD below if you are not using environment variables.
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "2525",
  database: process.env.DB_NAME || "college_event",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

function validateEvent(body) {
  const event_name = String(body.event_name || "").trim();
  const event_type = String(body.event_type || "").trim();
  const event_date = String(body.event_date || "").trim();
  const venue = String(body.venue || "").trim();
  const description = String(body.description || "").trim();

  if (!event_name || !event_type || !event_date || !venue) {
    return { error: "Event name, event type, date, and venue are required." };
  }
  // HTML date inputs send YYYY-MM-DD. Check the actual calendar date too.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
    return { error: "Please provide the date in YYYY-MM-DD format." };
  }
  const parsed = new Date(`${event_date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== event_date) {
    return { error: "Please enter a valid calendar date." };
  }
  return { value: { event_name, event_type, event_date, venue, description } };
}

app.get("/api/events", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q) {
      const like = `%${q}%`;
      const [rows] = await pool.execute(
        `SELECT event_id, event_name, event_type, event_date, venue, description
         FROM events
         WHERE CAST(event_id AS CHAR) LIKE ? OR event_name LIKE ? OR event_type LIKE ?
           OR venue LIKE ? OR description LIKE ?
         ORDER BY event_id ASC`,
        [like, like, like, like, like]
      );
      return res.json(rows);
    }
    const [rows] = await pool.query(
      "SELECT event_id, event_name, event_type, event_date, venue, description FROM events ORDER BY event_id ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch events. Check MySQL connection and table name." });
  }
});

app.get("/api/events/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT event_id, event_name, event_type, event_date, venue, description FROM events WHERE event_id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Event not found." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch this event." });
  }
});

app.post("/api/events", async (req, res) => {
  const checked = validateEvent(req.body);
  if (checked.error) return res.status(400).json({ error: checked.error });

  const event_id = Number(req.body.event_id);
  if (!Number.isInteger(event_id) || event_id <= 0) {
    return res.status(400).json({ error: "Please enter a valid positive Event ID." });
  }

  try {
    const e = checked.value;
    await pool.execute(
      "INSERT INTO events (event_id, event_name, event_type, event_date, venue, description) VALUES (?, ?, ?, ?, ?, ?)",
      [event_id, e.event_name, e.event_type, e.event_date, e.venue, e.description]
    );
    res.status(201).json({ message: "Event inserted successfully.", event_id });
  } catch (err) {
    console.error("INSERT ERROR:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "This Event ID already exists. Please choose an unused ID." });
    }
    res.status(500).json({ error: "Insert failed: " + err.message });
  }
});

app.put("/api/events/:id", async (req, res) => {
  const checked = validateEvent(req.body);
  if (checked.error) return res.status(400).json({ error: checked.error });
  try {
    const e = checked.value;
    const [result] = await pool.execute(
      "UPDATE events SET event_name=?, event_type=?, event_date=?, venue=?, description=? WHERE event_id=?",
      [e.event_name, e.event_type, e.event_date, e.venue, e.description, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Event not found." });
    res.json({ message: "Event updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed. Check your database and column names." });
  }
});

app.delete("/api/events/:id", async (req, res) => {
  try {
    const [result] = await pool.execute("DELETE FROM events WHERE event_id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Event not found." });
    res.json({ message: "Event deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed." });
  }
});

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => {
  console.log(`Kalyani College Event Management running at http://localhost:${PORT}`);
});
