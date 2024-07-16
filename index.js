const core = require("@actions/core");

const greeting = core.getInput("greeting");
const output = `Hello, ${greeting}!`;

core.info(output);

core.debug(`Using Node ${process.version}`);
core.setOutput("greeting", output);
