const core = require('@actions/core');
const github = require('@actions/github');
const { ClaudeCoderProcessor } = require('./core-processor');

async function main() {
  try {
    const token = core.getInput('github-token', { required: true });
    const octokit = github.getOctokit(token);

    // Get all credential inputs
    const credentials = {
      awsAccessKeyId: core.getInput('aws-access-key-id'),
      awsSecretAccessKey: core.getInput('aws-secret-access-key'),
      awsRegion: core.getInput('aws-region') || 'us-east-1',
      openrouterApiKey: core.getInput('openrouter-api-key')
    };
    
    // Get configurable parameters from action inputs
    const options = {
      aiProvider: core.getInput('ai-provider') || 'auto',
      models: core.getInput('models'),
      maxTokens: parseInt(core.getInput('max-tokens') || '64000', 10),
      maxRequests: parseInt(core.getInput('max-requests') || '10', 10),
      enableThinking: core.getInput('enable-thinking') === 'true',
      thinkingBudget: parseInt(core.getInput('thinking-budget') || '1024', 10),
      extendedOutput: core.getInput('extended-output') === 'true',
      requestTimeout: parseInt(core.getInput('request-timeout') || '3600000', 10),
      requiredLabel: core.getInput('required-label') || 'claudecoder',
      credentials
    };

    // Initialize core processor
    const processor = new ClaudeCoderProcessor(options);
    const { selectedModel, aiProvider } = await processor.initialize();
    
    core.info(`Selected model: ${selectedModel.displayName}`);
    core.info(`Provider: ${aiProvider}`);

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
      label => label.name.toLowerCase() === options.requiredLabel.toLowerCase()
    );

    if (!hasRequiredLabel) {
      core.info(`PR #${pull_number} does not have the required label '${options.requiredLabel}'. Skipping processing.`);
      if (!isLocalTest) {
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: pull_number,
          body: `This PR was not processed by Claude 3.7 Sonnet because it doesn't have the required '${options.requiredLabel}' label. Add this label if you want AI assistance.`,
        });
      } else {
        core.info("Skipping comment creation in local test mode.");
      }
      return; // Exit early
    }

    core.info(`PR #${pull_number} has the required label. Proceeding with processing...`);
    
    // Determine prompt text
    let promptText;
    if (context.payload.comment) {
      promptText = `Latest comment on the pull request:\n${context.payload.comment.body}`;
    } else {
      promptText = `Pull Request Description:\n${pullRequest.body}`;
    }

    core.info(`Sending request to ${aiProvider.toUpperCase()}...`);
    const claudeResponse = await processor.processChanges(promptText, pullRequest.base.ref);
    core.info(`Received response from ${aiProvider.toUpperCase()}. Processing...`);

    // Parse changes using the processor
    const changes = processor.parseCommands(claudeResponse);

    // Apply changes to GitHub repository
    for (const change of changes) {
      if (!isLocalTest) {
        try {
          // First, try to get the current file content and SHA
          const { data: fileData } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: change.filePath,
            ref: pullRequest.head.ref,
          });

          // Update the file
          await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: change.filePath,
            message: `Apply changes suggested by Claude 3.7 Sonnet`,
            content: Buffer.from(change.content).toString('base64'),
            sha: fileData.sha,
            branch: pullRequest.head.ref,
          });
        } catch (error) {
          if (error.status === 404) {
            // File doesn't exist, so create it
            await octokit.rest.repos.createOrUpdateFileContents({
              owner,
              repo,
              path: change.filePath,
              message: `Create file suggested by Claude 3.7 Sonnet`,
              content: Buffer.from(change.content).toString('base64'),
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
          const dirPath = path.dirname(change.filePath);
          if (dirPath !== '.' && dirPath !== '') {
            fs.mkdirSync(dirPath, { recursive: true });
          }
          
          // Write file content
          fs.writeFileSync(change.filePath, change.content, 'utf8');
          core.info(`✅ Created/updated local file: ${change.filePath}`);
        } catch (error) {
          core.error(`❌ Failed to write local file ${change.filePath}: ${error.message}`);
        }
      }
      
      core.info(`Updated ${change.filePath}`);
    }

    if (!isLocalTest) {
      if (changes.length > 0) {
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
      core.info("Local test mode: Skipping comment creation.");
      core.info("ClaudeCoder processing completed successfully in local test mode!");
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

main();