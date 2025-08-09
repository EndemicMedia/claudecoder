const core = require('@actions/core');
const github = require('@actions/github');
const { AIProviderFactory } = require('./ai-provider');
const { ModelSelector } = require('./model-selector');
const { getRepositoryContent } = require('./utils');

// Default MAX_REQUESTS is now defined through the input parameter

function minifyContent(content) {
  return content.replace(/\s+/g, ' ').trim();
}

async function main() {
  try {
    const token = core.getInput('github-token', { required: true });
    const octokit = github.getOctokit(token);

    // Get provider configuration
    let aiProvider = core.getInput('ai-provider') || 'auto';
    
    // Get all credential inputs
    const credentials = {
      awsAccessKeyId: core.getInput('aws-access-key-id'),
      awsSecretAccessKey: core.getInput('aws-secret-access-key'),
      awsRegion: core.getInput('aws-region') || 'us-east-1',
      openrouterApiKey: core.getInput('openrouter-api-key')
    };
    
    // Parse models from input
    const modelsInput = core.getInput('models');
    const modelSelector = new ModelSelector(modelsInput);
    
    // For now, just use the first model (no fallback yet)
    const selectedModel = modelSelector.getAllModels()[0];
    core.info(`Selected model: ${selectedModel.displayName}`);
    
    // Set provider based on the selected model's provider if auto-detect
    if (aiProvider === 'auto') {
      aiProvider = selectedModel.provider;
      core.info(`Auto-detected provider: ${aiProvider} (based on selected model)`);
    }
    
    // Get configurable parameters from action inputs
    const maxTokens = parseInt(core.getInput('max-tokens') || '64000', 10);
    const maxRequests = parseInt(core.getInput('max-requests') || '10', 10);
    const enableThinking = core.getInput('enable-thinking') === 'true';
    const thinkingBudget = parseInt(core.getInput('thinking-budget') || '1024', 10);
    const extendedOutput = core.getInput('extended-output') === 'true';
    const requestTimeout = parseInt(core.getInput('request-timeout') || '3600000', 10);
    const requiredLabel = core.getInput('required-label') || 'claudecoder';

    // Initialize AI provider with configurable options including the selected model
    const aiClient = AIProviderFactory.createProvider(aiProvider, credentials, {
      maxTokens,
      enableThinking,
      thinkingBudget,
      extendedOutput,
      requestTimeout,
      model: selectedModel.name
    });

    const context = github.context;
    const { owner, repo } = context.repo;
    const pull_number = context.payload.pull_request ? context.payload.pull_request.number : context.payload.issue.number;

    // Check if we're running in local test mode (ACT environment)
    const isLocalTest = process.env.ACT === 'true';
    let pullRequest;

    if (isLocalTest && context.payload.pull_request) {
      // Use mock data from event payload for local testing
      core.info("Using mock PR data from event payload (local test mode)...");
      pullRequest = context.payload.pull_request;
    } else {
      // Use live GitHub API for production
      core.info("Fetching PR details from GitHub API...");
      const { data: prData } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number,
      });
      pullRequest = prData;
    }

    // Check if PR has the required label
    const hasRequiredLabel = pullRequest.labels.some(
      label => label.name.toLowerCase() === requiredLabel.toLowerCase()
    );

    if (!hasRequiredLabel) {
      core.info(`PR #${pull_number} does not have the required label '${requiredLabel}'. Skipping processing.`);
      if (!isLocalTest) {
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: pull_number,
          body: `This PR was not processed by Claude 3.7 Sonnet because it doesn't have the required '${requiredLabel}' label. Add this label if you want AI assistance.`,
        });
      } else {
        core.info("Skipping comment creation in local test mode.");
      }
      return; // Exit early
    }

    core.info(`PR #${pull_number} has the required label. Proceeding with processing...`);
    
    core.info("Fetching repository content...");
    const repoContent = await getRepositoryContent();

    const repoContentString = Object.entries(repoContent)
      .map(([file, content]) => `File: ${file}\n\n${minifyContent(content)}`)
      .join('\n\n---\n\n');

    let promptText;
    if (context.payload.comment) {
      promptText = `Latest comment on the pull request:\n${context.payload.comment.body}`;
    } else {
      promptText = `Pull Request Description:\n${pullRequest.body}`;
    }

    const initialPrompt = `
      You are an AI assistant tasked with suggesting changes to a GitHub repository based on a pull request comment or description.
      Below is the current structure and content of the repository, followed by the latest comment or pull request description.
      Please analyze the repository content and the provided text, then suggest appropriate changes.

      Repository content (minified):
      ${repoContentString}
      
      Description/Comment:
      ${promptText}
      
      <instructions>
      Based on the repository content and the provided text, suggest changes to the codebase. 
      Format your response as a series of git commands that can be executed to make the changes.
      Each command should be on a new line and start with 'git'.
      For file content changes, use 'git add' followed by the file path, then provide the new content between <<<EOF and EOF>>> markers.
      Ensure all file paths are valid and use forward slashes.
      Consider the overall architecture and coding style of the existing codebase when suggesting changes.
      If not directly related to the requested changes, don't make code changes to those parts. we want to keep consistency and stability with each iteration
      If the provided text is vague, don't make any changes.
      If no changes are necessary or if the request is unclear, state so explicitly.
      When you have finished suggesting all changes, end your response with the line END_OF_SUGGESTIONS.
      </instructions>

      Base branch: ${pullRequest.base.ref}
    `;

    core.info(`Sending initial request to Claude 3.7 Sonnet via ${aiProvider.toUpperCase()}...`);
    const claudeResponse = await aiClient.getCompleteResponse(initialPrompt, null, maxRequests);
    core.info(`Received complete response from Claude 3.7 Sonnet via ${aiProvider.toUpperCase()}. Processing...`);

    const commands = claudeResponse.split('\n').filter(cmd => cmd.trim().startsWith('git'));
    for (const command of commands) {
      if (command.startsWith('git add')) {
        const filePath = command.split(' ').pop();
        const contentStart = claudeResponse.indexOf('<<<EOF', claudeResponse.indexOf(command));
        const contentEnd = claudeResponse.indexOf('EOF>>>', contentStart);
        if (contentStart === -1 || contentEnd === -1) {
          core.error(`Invalid content markers for file: ${filePath}`);
          continue;
        }
        console.log('command', command);
        const content = claudeResponse.slice(contentStart + 6, contentEnd).trim();
        
        if (!isLocalTest) {
          try {
            // First, try to get the current file content and SHA
            const { data: fileData } = await octokit.rest.repos.getContent({
              owner,
              repo,
              path: filePath,
              ref: pullRequest.head.ref,
            });

            // Update the file
            await octokit.rest.repos.createOrUpdateFileContents({
              owner,
              repo,
              path: filePath,
              message: `Apply changes suggested by Claude 3.7 Sonnet`,
              content: Buffer.from(content).toString('base64'),
              sha: fileData.sha,
              branch: pullRequest.head.ref,
            });
          } catch (error) {
            if (error.status === 404) {
              // File doesn't exist, so create it
              await octokit.rest.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: filePath,
                message: `Create file suggested by Claude 3.7 Sonnet`,
                content: Buffer.from(content).toString('base64'),
                branch: pullRequest.head.ref,
              });
            } else {
              throw error;
            }
          }
        } else {
          // Local test mode: write files directly to filesystem
          const fs = require('fs');
          const path = require('path');
          
          try {
            // Ensure directory exists
            const dirPath = path.dirname(filePath);
            if (dirPath !== '.' && dirPath !== '') {
              fs.mkdirSync(dirPath, { recursive: true });
            }
            
            // Write file content
            fs.writeFileSync(filePath, content, 'utf8');
            core.info(`✅ Created/updated local file: ${filePath}`);
          } catch (error) {
            core.error(`❌ Failed to write local file ${filePath}: ${error.message}`);
          }
        }
        
        console.log('createOrUpdateFileContents', filePath);
        core.info(`Updated ${filePath}`);
      }
    }

    if (!isLocalTest) {
      const { data: files } = await octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number,
      });
      
      if (files.length > 0) {
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: pull_number,
          body: "Changes suggested by Claude 3.7 Sonnet have been applied to this PR based on the latest comment. Please review the changes.",
        });
      } else {
        core.info("No changes to commit.");
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: pull_number,
          body: "Claude 3.7 Sonnet analyzed the latest comment and the repository content but did not suggest any changes.",
        });
      }
    } else {
      core.info("Local test mode: Skipping file listing and comment creation.");
      core.info("ClaudeCoder processing completed successfully in local test mode!");
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

main();