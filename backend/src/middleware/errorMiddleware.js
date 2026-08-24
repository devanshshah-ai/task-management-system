const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.statusCode || 500;

  const response = {
    success: false,
    message:
      statusCode === 500
        ? "Internal server error"
        : err.message,
  };

  if (err.details) {
    Object.assign(response, err.details);
  }

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;