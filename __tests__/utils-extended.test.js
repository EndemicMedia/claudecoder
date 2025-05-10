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
    ignores: jest.fn()
  };
  
  return jest.fn().mockReturnValue(mockIgnoreInstance);
});

// Mock for process.cwd()
jest.spyOn(process, 'cwd').mockReturnValue('/repo');

describe('Utils Extended Tests', () => {
  describe('getRepositoryContent with custom ignore rules', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should respect custom ignore rules from .gitignore', async () => {
      // Setup .gitignore rules
      const mockIgnoreInstance = ignore();
      mockIgnoreInstance.ignores.mockImplementation(path => {
        const ignoredPaths = ['.git', 'node_modules', '.github', 'custom-ignored-dir', '*.log'];
        return ignoredPaths.some(ignorePath => {
          if (ignorePath.startsWith('*')) {
            const ext = ignorePath.substring(1);
            return path.endsWith(ext);
          }
          return path.includes(ignorePath);
        });
      });

      // Mock file system structure
      fs.readdir.mockImplementation((dir, options) => {
        if (dir === '/repo') {
          return [
            { name: 'index.js', isDirectory: () => false },
            { name: 'error.log', isDirectory: () => false },
            { name: 'custom-ignored-dir', isDirectory: () => true },
            { name: 'src', isDirectory: () => true }
          ];
        } else if (dir === '/repo/src') {
          return [
            { name: 'app.js', isDirectory: () => false }
          ];
        }
        return [];
      });

      fs.readFile.mockImplementation((path, encoding) => {
        const fileContents = {
          '/repo/index.js': 'console.log("index");',
          '/repo/error.log': 'Error log content',
          '/repo/src/app.js': 'console.log("app");'
        };
        return Promise.resolve(fileContents[path] || '');
      });

      const result = await getRepositoryContent();

      // Verify file contents instead of property existence
      expect(Object.keys(result)).toContain('index.js');
      expect(Object.keys(result)).toContain('src/app.js');
      expect(Object.keys(result)).not.toContain('error.log');
      
      // Verify ignored directories were not traversed
      expect(fs.readdir).not.toHaveBeenCalledWith('/repo/custom-ignored-dir', expect.anything());
    });

    it('should handle binary files gracefully', async () => {
      // Mock file system structure
      fs.readdir.mockResolvedValueOnce([
        { name: 'text-file.txt', isDirectory: () => false },
        { name: 'binary-file.bin', isDirectory: () => false }
      ]);

      // Mock readFile to throw a UTF-8 encoding error for binary file
      fs.readFile.mockImplementation((path, encoding) => {
        if (path === '/repo/binary-file.bin') {
          return Promise.reject(new Error('Invalid UTF-8 encoding'));
        }
        return Promise.resolve('Text content');
      });

      const result = await getRepositoryContent();

      // Verify only text file was included
      expect(Object.keys(result)).toContain('text-file.txt');
      expect(Object.keys(result)).not.toContain('binary-file.bin');
    });

    it('should handle very large repositories efficiently', async () => {
      // Create a deep directory structure
      const createMockDirStructure = (depth, prefix = '') => {
        if (depth <= 0) return [];
        
        const dirName = `${prefix}dir-${depth}`;
        const entries = [
          { name: `file-${depth}.js`, isDirectory: () => false },
          { name: `dir-${depth}`, isDirectory: () => true }
        ];
        
        // Mock readdir for this level
        fs.readdir.mockImplementationOnce(() => entries);
        
        // Set up the next level deeper
        if (depth > 1) {
          createMockDirStructure(depth - 1, `${dirName}/`);
        }
        
        return entries;
      };
      
      // Create a 5-level deep directory structure
      createMockDirStructure(5);
      
      // Make all file reads succeed
      fs.readFile.mockResolvedValue('console.log("file content");');
      
      const result = await getRepositoryContent();
      
      // Just verify we have results and didn't crash
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
  });
});
