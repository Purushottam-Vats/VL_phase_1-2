// Demo accounts. Passwords are for local development only - never use these in production.
const TEACHER_PASSWORD = 'Teacher@123';
const STUDENT_PASSWORD = 'Student@123';
const SCHOOL = 'Government High School, Doddaballapur';

const teachers = [
  { name: 'Lakshmi Devi', email: 'teacher1@example.com', password: TEACHER_PASSWORD, role: 'teacher', school: SCHOOL, preferredLanguage: 'kn' },
  { name: 'Ramesh Gowda', email: 'teacher2@example.com', password: TEACHER_PASSWORD, role: 'teacher', school: SCHOOL, preferredLanguage: 'en' },
];

const students = [
  { name: 'Ananya R', email: 'student1@example.com', grade: '9', section: 'A', preferredLanguage: 'kn' },
  { name: 'Kiran Kumar', email: 'student2@example.com', grade: '9', section: 'A', preferredLanguage: 'en' },
  { name: 'Divya S', email: 'student3@example.com', grade: '9', section: 'B', preferredLanguage: 'kn' },
  { name: 'Manjunath B', email: 'student4@example.com', grade: '10', section: 'A', preferredLanguage: 'kn' },
  { name: 'Pooja Sharma', email: 'student5@example.com', grade: '10', section: 'A', preferredLanguage: 'hi' },
  { name: 'Suresh N', email: 'student6@example.com', grade: '8', section: 'A', preferredLanguage: 'en' },
  { name: 'Savitha M', email: 'student7@example.com', grade: '8', section: 'A', preferredLanguage: 'kn' },
  { name: 'Arjun Patil', email: 'student8@example.com', grade: '10', section: 'B', preferredLanguage: 'hi' },
].map((s) => ({ ...s, password: STUDENT_PASSWORD, role: 'student', school: SCHOOL }));

module.exports = { teachers, students, TEACHER_PASSWORD, STUDENT_PASSWORD };
