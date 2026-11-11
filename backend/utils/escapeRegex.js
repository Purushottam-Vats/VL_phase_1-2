// Escapes user input so it can be used safely inside a RegExp (prevents regex injection / ReDoS tricks).
module.exports = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
