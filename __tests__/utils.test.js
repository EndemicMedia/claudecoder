const { getRepositoryContent } = require('../utils');
const fs = require('fs').promises;
const path = require('path');
const ignore = require('ignore');

// Mock the fs module
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
  }
}));

jest.mock('path', () => ({
  join: jest.fn((dir, file) => `${dir}/${file}`),
  relative: jest.fn((base, full) => full.replace(`${base}/`, ''))
}));

// Mock the ignore module directly
jest.mock('ignore', () => {
  const mockIgnoreInstance = {
    add: jest.fn().mockReturnThis(),
    ignores: jest.fn(path => {
      const ignoredPaths = ['.git', 'node_modules', '.github', 'package-lock.json', 
                           'bedrock-client.js', 'github-client.js', 'pr-processor.js', 'utils.js'];
      return ignoredPaths.some(ignorePath => path.includes(ignorePath));
    })
  };
  
  return jest.fn().mockReturnValue(mockIgnoreInstance);
});

// Mock for process.cwd()
jest.spyOn(process, 'cwd').mockReturnValue('/repo');

describe('Utils', () => {
  describe('getRepositoryContent', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should get repository content and filter ignored files', async () => {
      // Mock file system structure
      fs.readdir.mockImplementation((dir, options) => {
        if (dir === '/repo') {
          return [
            { name: 'index.js', isDirectory: () => false },
            { name: 'README.md', isDirectory: () => false },
            { name: '.git', isDirectory: () => true },
            { name: 'src', isDirectory: () => true }
          ];
        } else if (dir === '/repo/src') {
          return [
            { name: 'app.js', isDirectory: () => false },
            { name: 'node_modules', isDirectory: () => true }
          ];
        }
        return [];
      });

      fs.readFile.mockImplementation((path, encoding) => {
        const fileContents = {
          '/repo/index.js': 'console.log("index");',
          '/repo/README.md': '# Project',
          '/repo/src/app.js': 'console.log("app");'
        };
        return Promise.resolve(fileContents[path] || '');
      });

      const result = await getRepositoryContent();

      expect(result).toEqual({
        'index.js': 'console.log("index");',
        'README.md': '# Project',
        'src/app.js': 'console.log("app");'
      });

      expect(fs.readdir).toHaveBeenCalledWith('/repo', { withFileTypes: true });
      expect(fs.readdir).toHaveBeenCalledWith('/repo/src', { withFileTypes: true });
      
      // Verify that ignored files/dirs were not read
      expect(fs.readFile).not.toHaveBeenCalledWith('/repo/.git', expect.any(String));
      expect(fs.readdir).not.toHaveBeenCalledWith('/repo/node_modules', expect.any(Object));
    });

    it('should handle errors when reading files', async () => {
      fs.readdir.mockResolvedValueOnce([
        { name: 'index.js', isDirectory: () => false },
        { name: 'error.js', isDirectory: () => false }
      ]);

      fs.readFile.mockImplementation((path) => {
        if (path === '/repo/index.js') {
          return Promise.resolve('console.log("index");');
        } else if (path === '/repo/error.js') {
          return Promise.reject(new Error('File read error'));
        }
      });

      const result = await getRepositoryContent();

      expect(result).toEqual({
        'index.js': 'console.log("index");'
      });
    });

    it('should handle directory read errors', async () => {
      fs.readdir.mockRejectedValueOnce(new Error('Directory read error'));

      const result = await getRepositoryContent();

      expect(result).toEqual({});
    });
  });
});
