// Test MinIO client configuration and singleton behavior.
// Since 'minio' is not installed at root level, we test the logic around
// configuration validation and singleton pattern.

describe('MinIO client configuration', () => {
  let getMinioClient: typeof import('../client').getMinioClient;
  let resetMinioClient: typeof import('../client').resetMinioClient;

  beforeEach(() => {
    jest.resetModules();

    // Mock minio module
    jest.doMock('minio', () => {
      const mockInstance = {
        listBuckets: jest.fn().mockResolvedValue([{ name: 'test-bucket' }]),
        makeBucket: jest.fn().mockResolvedValue(undefined),
        bucketExists: jest.fn().mockResolvedValue(true),
        putObject: jest.fn().mockResolvedValue({ etag: 'test-etag' }),
        getObject: jest.fn().mockResolvedValue(Buffer.from('content')),
        removeObject: jest.fn().mockResolvedValue(undefined),
        presignedGetObject: jest.fn().mockResolvedValue('https://minio.test/bucket/key'),
        statObject: jest.fn().mockResolvedValue({ size: 1024, etag: 'etag' }),
      };
      return { Client: jest.fn(() => mockInstance) };
    });

    const client = require('../client');
    getMinioClient = client.getMinioClient;
    resetMinioClient = client.resetMinioClient;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates client with provided config', () => {
    const client = getMinioClient({
      endPoint: 'minio.example.com',
      port: 9000,
      useSSL: false,
      accessKey: 'test-access',
      secretKey: 'test-secret',
    });
    expect(client).toBeDefined();
  });

  it('returns singleton instance', () => {
    const config = {
      endPoint: 'minio.example.com',
      accessKey: 'key1',
      secretKey: 'secret1',
    };
    const c1 = getMinioClient(config);
    const c2 = getMinioClient(config);
    expect(c1).toBe(c2);
  });

  it('throws when access key is empty', () => {
    expect(() =>
      getMinioClient({
        endPoint: 'localhost',
        accessKey: '',
        secretKey: '',
      })
    ).toThrow('MinIO access key and secret key are required');
  });

  it('throws when secret key is empty', () => {
    expect(() =>
      getMinioClient({
        endPoint: 'localhost',
        accessKey: 'has-key',
        secretKey: '',
      })
    ).toThrow('MinIO access key and secret key are required');
  });

  it('resetMinioClient clears singleton', () => {
    const Minio = require('minio');

    getMinioClient({ endPoint: 'a.com', accessKey: 'k1', secretKey: 's1' });
    resetMinioClient();
    getMinioClient({ endPoint: 'b.com', accessKey: 'k2', secretKey: 's2' });

    expect(Minio.Client).toHaveBeenCalledTimes(2);
  });
});

describe('MinIO client operations', () => {
  let getMinioClient: typeof import('../client').getMinioClient;
  let resetMinioClient: typeof import('../client').resetMinioClient;
  let mockPut: jest.Mock;
  let mockPresign: jest.Mock;
  let mockRemove: jest.Mock;
  let mockList: jest.Mock;
  let mockStat: jest.Mock;
  let mockMakeBucket: jest.Mock;
  let mockBucketExists: jest.Mock;

  beforeEach(() => {
    jest.resetModules();

    mockPut = jest.fn().mockResolvedValue({ etag: 'test-etag' });
    mockPresign = jest.fn().mockResolvedValue('https://minio.test/bucket/key?token=abc');
    mockRemove = jest.fn().mockResolvedValue(undefined);
    mockList = jest.fn().mockResolvedValue([{ name: 'test-bucket' }]);
    mockStat = jest.fn().mockResolvedValue({ size: 1024, etag: 'test-etag', lastModified: new Date() });
    mockMakeBucket = jest.fn().mockResolvedValue(undefined);
    mockBucketExists = jest.fn().mockResolvedValue(true);

    jest.doMock('minio', () => ({
      Client: jest.fn(() => ({
        putObject: mockPut,
        presignedGetObject: mockPresign,
        removeObject: mockRemove,
        listBuckets: mockList,
        statObject: mockStat,
        makeBucket: mockMakeBucket,
        bucketExists: mockBucketExists,
      })),
    }));

    const client = require('../client');
    getMinioClient = client.getMinioClient;
    resetMinioClient = client.resetMinioClient;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('putObject stores with correct arguments', async () => {
    const client = getMinioClient({ endPoint: 'x', accessKey: 'k', secretKey: 's' });
    const data = Buffer.from('cv content');
    await client.putObject('cv-bucket', 'org1/cv.pdf', data);
    expect(mockPut).toHaveBeenCalledWith('cv-bucket', 'org1/cv.pdf', data);
  });

  it('presignedGetObject returns URL', async () => {
    const client = getMinioClient({ endPoint: 'x', accessKey: 'k', secretKey: 's' });
    const url = await client.presignedGetObject('cv-bucket', 'org1/cv.pdf', 3600);
    expect(typeof url).toBe('string');
    expect(url).toContain('minio.test');
    expect(mockPresign).toHaveBeenCalledWith('cv-bucket', 'org1/cv.pdf', 3600);
  });

  it('removeObject deletes object', async () => {
    const client = getMinioClient({ endPoint: 'x', accessKey: 'k', secretKey: 's' });
    await client.removeObject('bucket', 'key.pdf');
    expect(mockRemove).toHaveBeenCalledWith('bucket', 'key.pdf');
  });

  it('listBuckets returns buckets', async () => {
    const client = getMinioClient({ endPoint: 'x', accessKey: 'k', secretKey: 's' });
    const buckets = await client.listBuckets();
    expect(buckets).toEqual([{ name: 'test-bucket' }]);
  });

  it('bucketExists checks bucket', async () => {
    const client = getMinioClient({ endPoint: 'x', accessKey: 'k', secretKey: 's' });
    const exists = await client.bucketExists('test-bucket');
    expect(exists).toBe(true);
  });

  it('makeBucket creates bucket', async () => {
    const client = getMinioClient({ endPoint: 'x', accessKey: 'k', secretKey: 's' });
    await client.makeBucket('new-bucket');
    expect(mockMakeBucket).toHaveBeenCalledWith('new-bucket');
  });

  it('statObject returns file metadata', async () => {
    const client = getMinioClient({ endPoint: 'x', accessKey: 'k', secretKey: 's' });
    const stat = await client.statObject('bucket', 'file.pdf');
    expect(stat.size).toBe(1024);
    expect(stat.etag).toBe('test-etag');
  });
});
