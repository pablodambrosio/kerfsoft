const fs = require('fs');
const initOpenCascade = require('occt-import-js')();

async function run() {
  const occt = await initOpenCascade;
  
  const stepContent = fs.readFileSync('examples/box.step');
  
  const result = occt.ReadStepFile(stepContent);
  if (!result || !result.success) {
    console.error("Failed");
    return;
  }
  
  result.meshes.forEach((mesh, index) => {
    console.log(`Mesh ${index}:`, mesh.name);
  });
}

run().catch(console.error);
