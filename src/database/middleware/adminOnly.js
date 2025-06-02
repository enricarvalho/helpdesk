function adminOnly(req, res, next) {
  if (req.user && req.user.isAdmin === true) {
    next();
  } else {
    res.status(403).json({ error: 'Acesso negado. Somente administradores.' });
  }
}

module.exports = adminOnly;
