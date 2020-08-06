const getEnv = varName => {
  const ret = process.env[varName];
  if (!ret) throw new Error(`Environment variable ${varName} not set`);
  return ret;
};

module.exports = {
  getEnv
};