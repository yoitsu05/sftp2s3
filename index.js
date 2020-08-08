const SSH2Promise = require('ssh2-promise');

const { pullTree, getS3Files } = require('./lib/utils');
const { getSSHConfig } = require('./lib/sshConfig');
const { getEnv } = require('./lib/config');

exports.handler = async (event, context) => {
  const sshconfig = getSSHConfig();

  const ssh = await new SSH2Promise(sshconfig);
  const sftp = ssh.sftp();
  try {
    const s3Files = await getS3Files(getEnv('SFTP_TARGET_S3_BUCKET'));
    await pullTree({
      sftp,
      dirpath: getEnv('SFTP_SOURCE_DIR'),
      s3Files,
      fileRetentionMilliseconds: 24 * 60 * 60 * 1000,
    });
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    return err;
  } finally {
    await ssh.close();
  }
  console.log('success');
  return;
};
