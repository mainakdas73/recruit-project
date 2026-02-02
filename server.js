const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const app = express();

/* ================= ENV CONFIG ================= */
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URL; // ❗ DO NOT FALL BACK TO LOCALHOST
const DB_NAME = process.env.DB_NAME || 'hr_system';

/* ================= MIDDLEWARE ================= */
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ================= DB HANDLE ================= */
let db = null;
let mongoClient = null;

/* ================= HEALTH ENDPOINTS ================= */

// Liveness: app process is running
app.get('/healthz', (req, res) => {
  res.sendStatus(200);
});

// Readiness: only ready when Mongo is connected
app.get('/health', (req, res) => {
  if (db) return res.sendStatus(200);
  res.sendStatus(503);
});

/* ================= START SERVER ================= */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server started on port ${PORT}`);
});

/* ================= MONGO CONNECT WITH RETRY ================= */
async function connectMongo() {
  try {
    console.log('⏳ Connecting to MongoDB:', MONGO_URI);

    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();

    db = mongoClient.db(DB_NAME);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    db = null;

    // Retry after 5 seconds (IMPORTANT)
    setTimeout(connectMongo, 5000);
  }
}

connectMongo();

/* ===================================================
   ================== APP LOGIC ======================
   =================================================== */

// HR Knowledge Base
const hrKnowledgeBase = {
  'leave policy':
    'Employees are entitled to 12 days of casual leave, 10 days of sick leave, and 15 days of annual leave per year.',
  'attendance policy': 'Standard working hours are 9 AM to 6 PM.',
  holidays: 'Public holidays include New Year, Independence Day, Diwali, and Christmas.',
  'grievance procedure': 'Grievances are reviewed within 3 business days.',
  'salary policy': 'Salaries are processed on the last working day of each month.'
};

function getChatbotResponse(query) {
  const lowerQuery = query.toLowerCase();
  for (const [key, value] of Object.entries(hrKnowledgeBase)) {
    if (lowerQuery.includes(key)) return value;
  }
  return 'Sorry, I do not have information on that topic.';
}

/* ================= AUTH ================= */
app.post('/api/signup', async (req, res) => {
  if (!db) return res.status(503).json({ message: 'DB not ready' });

  const { fullName, empId, email, password } = req.body;
  if (!fullName || !empId || !email || !password) {
    return res.status(400).json({ message: 'All fields required' });
  }

  const existing = await db.collection('employees').findOne({
    $or: [{ empId }, { email }]
  });

  if (existing) {
    return res.status(409).json({ message: 'Employee already exists' });
  }

  await db.collection('employees').insertOne({
    fullName,
    empId,
    email,
    password
  });

  res.json({ message: 'Signup successful' });
});

app.post('/api/login', async (req, res) => {
  if (!db) return res.status(503).json({ message: 'DB not ready' });

  const { empId, password } = req.body;
  const user = await db.collection('employees').findOne({ empId, password });

  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  res.json({ message: 'Login successful' });
});

/* ================= CHATBOT ================= */
app.post('/api/chatbot', async (req, res) => {
  if (!db) return res.status(503).json({ message: 'DB not ready' });

  const { query, empId } = req.body;
  const response = getChatbotResponse(query);

  await db.collection('chat_logs').insertOne({
    empId: empId || 'anonymous',
    query,
    response,
    timestamp: new Date()
  });

  res.json({ response });
});

/* ================= LEAVE ================= */
app.post('/api/leave/apply', async (req, res) => {
  if (!db) return res.status(503).json({ message: 'DB not ready' });

  const { empId, startDate, endDate, leaveReason } = req.body;

  await db.collection('leave_requests').insertOne({
    empId,
    startDate,
    endDate,
    leaveReason,
    status: 'Pending',
    appliedAt: new Date()
  });

  res.json({ message: 'Leave request submitted' });
});

/* ================= ADMIN ================= */
app.post('/api/admin/login', (req, res) => {
  const { adminId, password } = req.body;
  if (adminId === 'admin' && password === 'admin123') {
    return res.json({ message: 'Admin login successful' });
  }
  res.status(401).json({ message: 'Invalid admin credentials' });
});

app.get('/api/admin/employees', async (req, res) => {
  if (!db) return res.status(503).json({ message: 'DB not ready' });

  const employees = await db.collection('employees').find({}).toArray();
  res.json(employees.map(({ password, ...e }) => e));
});
