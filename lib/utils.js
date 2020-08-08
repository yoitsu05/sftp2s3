const aws = require('aws-sdk');
const dayjs = require('dayjs');
const s3 = new aws.S3({
  apiVersion: '2006-03-01',
});
const { getEnv } = require('./config');

const isDir = dir => dir.longname.startsWith('d');

const isTargetDate = file => {
  const thresholdDate = dayjs(getEnv('SFTP_TRANSFER_START_DATE'));
  const fileName = decodeURIComponent(file);
  const regex = new RegExp(/(.+)_(\d+)\.(csv|CSV)/, 'g');
  if (!regex.test(fileName)) {
    // const message = `Error getting ${fileName}. Make sure TIMESAMP is present in the file name`;
    //throw new Error(message);
    return false;
  }
  const fileDate = dayjs(fileName.replace(regex, '$2'));
  console.log({
    fileName,
    thresholdDate,
    fileDate,
    hantei: thresholdDate.isBefore(fileDate),
  });
  return thresholdDate.isBefore(fileDate);
};

const pullFile = async fileContext => {
  const { sftp, dirpath, dir } = fileContext;

  const filepath = `${dirpath}/${dir.filename}`;
  const fileData = await sftp.readFile(filepath);

  const bucket = getEnv('SFTP_TARGET_S3_BUCKET');
  const targetKey = getEnv('SFTP_TARGET_S3_PATH') + '/' + dir.filename;
  console.log({
    Bucket: bucket,
    Key: targetKey,
    filepath,
  });
  await s3
    .putObject({
      Bucket: bucket,
      Key: targetKey,
      Body: fileData,
    })
    .promise();
};

const getS3Files = async bucket => {
  let isTruncated = true;
  let ContinuationToken;
  let files = [];
  while (isTruncated) {
    let params = { Bucket: bucket };
    if (ContinuationToken) params.ContinuationToken = ContinuationToken;
    try {
      const listObjects = await s3.listObjectsV2(params).promise();
      if (!listObjects.Contents.length) return [];
      const tempFiles = listObjects.Contents.map(listObject => {
        const keys = listObject.Key.split('/');
        return keys[keys.length - 1];
      });
      files = [...files, ...tempFiles];
      isTruncated = listObjects.IsTruncated;
      if (isTruncated) {
        ContinuationToken = listObjects.NextContinuationToken;
      }
    } catch (error) {
      throw error;
    }
  }
  return files;
};

const pullTreeRecursive = async dirContext => {
  const { sftp, dirpath, s3Files, topPath } = dirContext;
  console.log(`pullTreeRecursive(): readdir ${dirpath}`);
  const dirs = await sftp.readdir(dirpath);
  console.log(`pullTreeRecursive(dirpath=${dirpath}, topPath=${topPath})`);
  // await ensureDoneDirExists(sftp, dirList, dirpath);
  if (!dirs.length) return;
  for (let dir of dirs) {
    if (isDir(dir)) {
      await pullTreeRecursive({
        ...dirContext,
        dirpath: dirpath === topPath ? `${dirpath}${dir.filename}` : `${dirpath}/${dir.filename}`,
      });
      continue;
    }
    if (!isTargetDate(dir.filename)) continue;
    console.log({
      filename: dir.filename,
      flag: s3Files.includes(dir.filename),
    });
    if (!s3Files.includes(dir.filename) && dir.filename.includes(getEnv('SFTP_FILE_PREFIX'))) {
      await pullFile({
        ...dirContext,
        dir,
      });
    }
  }
};

const pullTree = async dirContext => {
  const { dirpath } = dirContext;
  await pullTreeRecursive({
    ...dirContext,
    topPath: dirpath,
  });
};

module.exports = {
  pullTree,
  getS3Files,
};
