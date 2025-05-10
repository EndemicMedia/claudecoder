---
layout: default
title: ClaudeCoder - AI-powered code changes for GitHub
description: Automatically process pull requests using AWS Bedrock and Claude 3.7 to suggest and implement code changes
---

<div class="hero-section">
  <div class="logo-container">
    <img src="assets/images/logo-placeholder.svg" alt="ClaudeCoder Logo" class="logo" width="150" height="150">
  </div>
  <h1>Turn PR feedback into code instantly</h1>
  <p>ClaudeCoder is a GitHub Action that automatically processes pull requests using AWS Bedrock and Claude 3.7 Sonnet to generate and implement intelligent code changes.</p>
  <a href="https://github.com/EndemicMedia/claudecoder" class="btn primary">View on GitHub</a>
  <a href="#quickstart" class="btn secondary">Quick Start</a>
</div>

<div class="features-section">
  <div class="feature-card">
    <div class="feature-icon">⚡</div>
    <h3>AI-Powered Code Changes</h3>
    <p>Harness Claude 3.7 Sonnet's intelligence to analyze PR descriptions and automatically implement suggested changes.</p>
  </div>
  <div class="feature-card">
    <div class="feature-icon">🔄</div>
    <h3>Seamless GitHub Integration</h3>
    <p>Works directly within your existing GitHub workflow with zero disruption to your development process.</p>
  </div>
  <div class="feature-card">
    <div class="feature-icon">🛠️</div>
    <h3>Highly Configurable</h3>
    <p>Customize token limits, thinking capabilities, response handling, and more to fit your team's specific needs.</p>
  </div>
</div>

<div class="use-cases-section">
  <h2>Use Cases</h2>
  
  <div class="use-case">
    <h3>Implementing Code Review Feedback</h3>
    <div class="use-case-content">
      <div class="use-case-text">
        <p>When reviewers provide suggestions in natural language, ClaudeCoder can automatically implement the changes, saving developers time and ensuring feedback is addressed correctly.</p>
        <p>Simply add the "claudecoder" label to your PR, and watch as the AI analyzes the review comments and makes the necessary changes.</p>
      </div>
      <div class="use-case-image">
        <img src="assets/images/code-review.svg" alt="Code review comment being implemented" width="100%">
      </div>
    </div>
  </div>
  
  <div class="use-case">
    <h3>Fixing Bugs from Issue Descriptions</h3>
    <div class="use-case-content">
      <div class="use-case-text">
        <p>When bugs are reported in your issue tracker, ClaudeCoder can analyze the repository, identify the issue, and automatically generate a fix for review.</p>
        <p>This accelerates bug resolution and ensures consistent code quality across your team.</p>
      </div>
      <div class="use-case-image">
        <img src="assets/images/bug-fix.svg" alt="Bug fix implementation" width="100%">
      </div>
    </div>
  </div>
  
  <div class="use-case">
    <h3>Refactoring Code Per Architecture Discussions</h3>
    <div class="use-case-content">
      <div class="use-case-text">
        <p>When architectural changes are discussed in PRs or issues, ClaudeCoder can help implement the necessary refactoring across multiple files.</p>
        <p>The AI understands the codebase context and can make consistent changes that maintain your coding standards.</p>
      </div>
      <div class="use-case-image">
        <img src="assets/images/refactoring.svg" alt="Before/After architecture refactoring" width="100%">
      </div>
    </div>
  </div>
</div>

<div class="cta-section">
  <h2>Ready to supercharge your development workflow?</h2>
  <p>Start using ClaudeCoder today and let AI handle the implementation details while your team focuses on what matters.</p>
  <a href="https://github.com/EndemicMedia/claudecoder" class="btn">Get Started with ClaudeCoder</a>
</div>

<div id="quickstart" class="setup-section">
  <h2>Quick Start Guide</h2>
  
  <ol>
    <li>
      <p><strong>Add your AWS credentials as secrets in your GitHub repository:</strong></p>
      <ul>
        <li><code>AWS_ACCESS_KEY_ID</code>: Your AWS Access Key ID</li>
        <li><code>AWS_SECRET_ACCESS_KEY</code>: Your AWS Secret Access Key</li>
      </ul>
    </li>
    <li>
      <p><strong>Create a workflow file</strong> at <code>.github/workflows/claudecoder.yml</code>:</p>
      
      <div class="language-yaml highlighter-rouge">
        <div class="highlight">
          <pre class="highlight"><code><span class="na">name</span><span class="pi">:</span> <span class="s">ClaudeCoder</span>

<span class="na">on</span><span class="pi">:</span>
  <span class="na">pull_request</span><span class="pi">:</span>
    <span class="na">types</span><span class="pi">:</span> <span class="pi">[</span><span class="nv">opened</span><span class="pi">,</span> <span class="nv">edited</span><span class="pi">,</span> <span class="nv">labeled</span><span class="pi">]</span>
  <span class="na">pull_request_review_comment</span><span class="pi">:</span>
    <span class="na">types</span><span class="pi">:</span> <span class="pi">[</span><span class="nv">created</span><span class="pi">,</span> <span class="nv">edited</span><span class="pi">]</span>
  <span class="na">issue_comment</span><span class="pi">:</span>
    <span class="na">types</span><span class="pi">:</span> <span class="pi">[</span><span class="nv">created</span><span class="pi">,</span> <span class="nv">edited</span><span class="pi">]</span>

<span class="na">jobs</span><span class="pi">:</span>
  <span class="na">process-pr</span><span class="pi">:</span>
    <span class="na">if</span><span class="pi">:</span> <span class="s">contains(github.event.pull_request.labels.*.name, 'claudecoder')</span>
    <span class="na">permissions</span><span class="pi">:</span> <span class="s">write-all</span>
    <span class="na">runs-on</span><span class="pi">:</span> <span class="s">ubuntu-latest</span>
    <span class="na">steps</span><span class="pi">:</span>
    <span class="pi">-</span> <span class="na">uses</span><span class="pi">:</span> <span class="s">actions/checkout@v3</span>
    <span class="pi">-</span> <span class="na">name</span><span class="pi">:</span> <span class="s">ClaudeCoderAction</span>
      <span class="na">uses</span><span class="pi">:</span> <span class="s">EndemicMedia/claudecoder@v2.0.0</span>
      <span class="na">with</span><span class="pi">:</span>
        <span class="na">aws-access-key-id</span><span class="pi">:</span> <span class="s">${{ secrets.AWS_ACCESS_KEY_ID }}</span>
        <span class="na">aws-secret-access-key</span><span class="pi">:</span> <span class="s">${{ secrets.AWS_SECRET_ACCESS_KEY }}</span>
        <span class="na">github-token</span><span class="pi">:</span> <span class="s">${{ secrets.GITHUB_TOKEN }}</span>
</code></pre>
        </div>
      </div>
    </li>
    <li>
      <p><strong>Add the "claudecoder" label to any PR</strong> where you want AI assistance.</p>
    </li>
    <li>
      <p><strong>Describe what changes you want</strong> in the PR description or comments.</p>
    </li>
    <li>
      <p><strong>Let ClaudeCoder work its magic!</strong> The action will analyze your description, make the requested changes, and commit them to your PR branch.</p>
    </li>
  </ol>
  
  <p><a href="/claudecoder/readme/" class="btn primary">View Full Documentation</a></p>
</div>

<div class="testimonials-section">
  <h2>What Developers Say</h2>
  
  <div class="testimonial">
    <p>"ClaudeCoder has completely transformed our code review process. What used to take hours of back-and-forth now happens automatically. It's like having an extra team member who's always ready to implement feedback."</p>
    <div class="testimonial-author">— Senior Developer, Open Source Project</div>
  </div>

  <div class="testimonial">
    <p>"The accuracy of Claude 3.7 Sonnet's code changes is impressive. It understands our codebase context and maintains our coding standards better than many junior developers I've worked with."</p>
    <div class="testimonial-author">— Engineering Lead, Tech Startup</div>
  </div>
</div>
