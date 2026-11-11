const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { User } = require('../models');

// Teacher-only: list students (used to pick assignment recipients / build class groups).
exports.listStudents = asyncHandler(async (req, res) => {
  const { grade, section, q, page, limit } = req.query;
  const filter = { role: 'student', isActive: true };
  if (grade) filter.grade = grade;
  if (section) filter.section = section;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [total, students] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).sort({ grade: 1, section: 1, name: 1 }).skip((page - 1) * limit).limit(limit),
  ]);
  res.json({ success: true, students, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});
