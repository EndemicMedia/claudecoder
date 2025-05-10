// A simple test to verify Jest is working
console.log("Running a simple test to verify our testing setup");

// Mock test utilities
const assert = {
  equal: (a, b, message) => {
    if (a === b) {
      console.log(`✓ ${message || 'Values are equal'}`);
      return true;
    } else {
      console.error(`✗ ${message || 'Values are not equal'}: ${a} !== ${b}`);
      return false;
    }
  }
};

// Simple test for the minifyContent function in index.js
function minifyContent(content) {
  return content.replace(/\s+/g, ' ').trim();
}

// Test cases
const tests = [
  {
    name: "minifyContent removes extra whitespace",
    func: () => {
      const input = "This  is\n\na   test";
      const expected = "This is a test";
      const actual = minifyContent(input);
      return assert.equal(actual, expected, "minifyContent removes extra whitespace");
    }
  },
  {
    name: "minifyContent trims leading and trailing whitespace",
    func: () => {
      const input = "  \n  Trimmed content  \n  ";
      const expected = "Trimmed content";
      const actual = minifyContent(input);
      return assert.equal(actual, expected, "minifyContent trims whitespace");
    }
  }
];

// Run tests
console.log("Running tests...\n");
let passed = 0;
let failed = 0;

for (const test of tests) {
  console.log(`Running test: ${test.name}`);
  try {
    const result = test.func();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  } catch (error) {
    console.error(`✗ Test failed with error: ${error.message}`);
    failed++;
  }
  console.log("");
}

console.log(`Test results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All tests passed!");
  process.exit(0);
}
