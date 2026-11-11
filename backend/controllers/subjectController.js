const asyncHandler = require('../utils/asyncHandler');
const { Subject, Experiment } = require('../models');
const { localizeMap } = require('../utils/localize');

exports.list = asyncHandler(async (req, res) => {
  const lang = ['en', 'kn', 'hi'].includes(req.query.lang) ? req.query.lang : 'en';
  const subjects = await Subject.find().sort({ order: 1 });
  const counts = await Promise.all(subjects.map((s) => Experiment.countDocuments({ subject: s._id, isPublished: true })));

  res.json({
    success: true,
    subjects: subjects.map((s, i) => ({
      id: String(s._id),
      key: s.key,
      name: localizeMap(s.name, lang),
      description: localizeMap(s.description, lang),
      names: s.name,
      icon: s.icon,
      color: s.color,
      experimentCount: counts[i],
    })),
  });
});
