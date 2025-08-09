const core = require('@actions/core');
const fs = require('fs').promises;
const path = require('path');
const ignore = require('ignore');

async function getRepositoryContent() {
  const ig = ignore().add(['.git', 'node_modules', '.github', 'action', 'dist', '__tests__', 'docs', '.DS_Store', '.env', '.env.example', "package-lock.json", "bedrock-client.js", "github-client.js", "pr-processor.js", "utils.js"]);
  const content = {};

  async function readDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(process.cwd(), fullPath);

      if (ig.ignores(relativePath)) continue;

      if (entry.isDirectory()) {
        console.log('-> entry directory', fullPath)
        await readDir(fullPath);
      } else {
        try {
          console.log('-> entry file', fullPath)
          const fileContent = await fs.readFile(fullPath, 'utf8');
          content[relativePath] = fileContent;
        } catch (error) {
          core.warning(`Error reading file ${relativePath}: ${error.message}`);
        }
      }
    }
  }

  try {
    console.log('->process.cwd()', process.cwd())
    await readDir(process.cwd());
    core.info(`Retrieved content for ${Object.keys(content).length} files`);
  } catch (error) {
    core.error(`Error reading repository content: ${error.message}`);
  }

  return content;
}

module.exports = { getRepositoryContent };

