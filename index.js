const core = require('@actions/core');

function run() {
  try {
    const greeting = core.getInput('greeting');
    const output = `Hello, ${greeting}!`;

    core.info(output);
    core.debug(`Using Node ${process.version}`);
    core.setOutput("greeting", output);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
