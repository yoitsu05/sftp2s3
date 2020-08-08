const { getEnv } = require('./config');

module.exports.getSSHConfig = () => {
  const options = {
    host: getEnv('SFTP_HOST'),
    port: getEnv('SFTP_PORT'),
    username: getEnv('SFTP_USER'),
    password: '',
    reconnect: false,
    readyTimeout: 100 * 1000,
  };
  console.log(
    `getSSHConfig(): host=${options.host}, port=${options.port}, password=${options.password}, username=${options.username}`,
  );
  return options;
};
