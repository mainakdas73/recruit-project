// MongoDB initialization script for HR System
print("Starting HR System database initialization...");

// Switch to hr_system database
db = db.getSiblingDB('hr_system');

// Create a dedicated user for the HR application
db.createUser({
  user: "hrapp",
  pwd: "hrapp123",
  roles: [
    { role: "readWrite", db: "hr_system" }
  ]
});

print("Created HR application user...");

// Create collections with validation if needed
db.createCollection('employees');
db.createCollection('leave_requests');
db.createCollection('attendance');
db.createCollection('grievances');
db.createCollection('hiring_feedback');
db.createCollection('job_postings');
db.createCollection('chat_logs');
db.createCollection('hr_admins');

// Create indexes for better performance
print("Creating indexes...");

// Employees collection indexes
db.employees.createIndex({ "empId": 1 }, { unique: true });
db.employees.createIndex({ "email": 1 }, { unique: true });

// Leave requests indexes
db.leave_requests.createIndex({ "empId": 1 });
db.leave_requests.createIndex({ "status": 1 });
db.leave_requests.createIndex({ "appliedAt": -1 });

// Attendance indexes
db.attendance.createIndex({ "empId": 1 });
db.attendance.createIndex({ "date": -1 });
db.attendance.createIndex({ "empId": 1, "date": 1 }, { unique: true });

// Grievances indexes
db.grievances.createIndex({ "empId": 1 });
db.grievances.createIndex({ "submittedAt": -1 });

// Chat logs indexes
db.chat_logs.createIndex({ "empId": 1 });
db.chat_logs.createIndex({ "timestamp": -1 });

// HR Admins indexes
db.hr_admins.createIndex({ "adminId": 1 }, { unique: true });

// Insert default HR admin
print("Creating default HR admin...");
db.hr_admins.insertOne({
    adminId: "admin",
    password: "admin123", // In production, this should be hashed!
    role: "super_admin",
    createdAt: new Date(),
    isActive: true
});

// Insert sample employees (optional - for testing)
print("Creating sample employees...");
db.employees.insertMany([
    {
        fullName: "John Doe",
        empId: "EMP001",
        email: "john.doe@company.com",
        password: "password123", // In production, hash this!
        department: "Engineering",
        position: "Software Developer",
        joinDate: new Date("2024-01-15"),
        isActive: true
    },
    {
        fullName: "Jane Smith", 
        empId: "EMP002",
        email: "jane.smith@company.com",
        password: "password123", // In production, hash this!
        department: "HR",
        position: "HR Manager",
        joinDate: new Date("2023-03-10"),
        isActive: true
    }
]);

print("HR System database initialization completed successfully!");
