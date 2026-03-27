// Manual mock for minio — used when the package isn't hoisted to root node_modules
const mockInstance = {
  listBuckets: jest.fn().mockResolvedValue([]),
  makeBucket: jest.fn().mockResolvedValue(undefined),
  bucketExists: jest.fn().mockResolvedValue(false),
  putObject: jest.fn().mockResolvedValue({ etag: '' }),
  getObject: jest.fn().mockResolvedValue(Buffer.from('')),
  removeObject: jest.fn().mockResolvedValue(undefined),
  presignedGetObject: jest.fn().mockResolvedValue(''),
  statObject: jest.fn().mockResolvedValue({ size: 0, etag: '' }),
};

export const Client = jest.fn(() => mockInstance);
