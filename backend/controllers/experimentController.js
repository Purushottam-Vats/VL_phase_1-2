const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const escapeRegex = require('../utils/escapeRegex');
const { Experiment, Subject } = require('../models');
const { localizeContent, localizeMap, translatedLanguages } = require('../utils/localize');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

function summary(exp, lang) {
  const c = localizeContent(exp.content, lang);
  const subject = exp.subject && exp.subject.key ? exp.subject : null;
  return {
    id: String(exp._id),
    slug: exp.slug,
    subject: subject && {
      id: String(subject._id),
      key: subject.key,
      name: localizeMap(subject.name, lang),
      color: subject.color,
      icon: subject.icon,
    },
    topic: exp.topic,
    difficulty: exp.difficulty,
    estimatedMinutes: exp.estimatedMinutes,
    simulationKey: exp.simulationKey,
    tags: exp.tags,
    title: c.title,
    objective: c.objective,
    languages: translatedLanguages(exp.content),
  };
}

exports.list = asyncHandler(async (req, res) => {
  const { subject, difficulty, q, lang, page, limit } = req.query;
  const filter = { isPublished: true };

  if (subject) {
    const found = OBJECT_ID.test(subject)
      ? await Subject.findById(subject)
      : await Subject.findOne({ key: subject.toLowerCase() });
    if (!found) return res.json({ success: true, experiments: [], pagination: { page, limit, total: 0, pages: 0 } });
    filter.subject = found._id;
  }
  if (difficulty) filter.difficulty = difficulty;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ 'content.en.title': rx }, { [`content.${lang}.title`]: rx }, { topic: rx }, { tags: rx }];
  }

  const [total, items] = await Promise.all([
    Experiment.countDocuments(filter),
    Experiment.find(filter)
      .sort({ subject: 1, order: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('subject', 'key name color icon'),
  ]);

  res.json({
    success: true,
    experiments: items.map((e) => summary(e, lang)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.getOne = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const query = OBJECT_ID.test(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() };
  const exp = await Experiment.findOne({ ...query, isPublished: true }).populate('subject', 'key name color icon');
  if (!exp) throw ApiError.notFound('Experiment not found');

  const lang = req.query.lang;
  res.json({
    success: true,
    experiment: { ...summary(exp, lang), content: localizeContent(exp.content, lang), quiz: exp.quiz, language: lang },
  });
});
