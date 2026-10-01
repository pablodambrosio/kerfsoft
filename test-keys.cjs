const fs = require('fs');
const initOpenCascade = require('occt-import-js')();

async function run() {
  const occt = await initOpenCascade;
  
  const stepContent = fs.readFileSync('examples/box.step');
  
  const result = occt.ReadStepFile(stepContent);
  console.log('Result keys:', Object.keys(result));
}

run().catch(console.error);
