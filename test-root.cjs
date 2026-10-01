const fs = require('fs');
const initOpenCascade = require('occt-import-js')();

async function run() {
  const occt = await initOpenCascade;
  
  const stepContent = fs.readFileSync('examples/box.step');
  
  const result = occt.ReadStepFile(stepContent);
  console.log(JSON.stringify(result.root, null, 2));
}

run().catch(console.error);
