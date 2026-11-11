import api from './api';

export const labService = {
  subjects: (lang = 'en') => api.get('/subjects', { params: { lang } }).then((r) => r.data.subjects),
  experiments: (params) => api.get('/experiments', { params }).then((r) => r.data),
  experiment: (idOrSlug, lang = 'en') => api.get(`/experiments/${idOrSlug}`, { params: { lang } }).then((r) => r.data.experiment),
  assignments: (params) => api.get('/assignments', { params }).then((r) => r.data),
  students: (params) => api.get('/users/students', { params }).then((r) => r.data),
};
