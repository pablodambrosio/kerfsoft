const fs = require('fs');
const initOpenCascade = require('occt-import-js')();

async function run() {
  const occt = await initOpenCascade;
  
  // Dummy STEP file representing a simple cube
  const stepContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION((''),'2;1');
FILE_NAME('cube.step','2023-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN_CC2 { 1 2 10303 214 -1 1 5 4 }'));
ENDSEC;
DATA;
#1=CARTESIAN_POINT('',(0.0,0.0,0.0));
#2=DIRECTION('',(0.0,0.0,1.0));
#3=DIRECTION('',(1.0,0.0,0.0));
#4=AXIS2_PLACEMENT_3D('',#1,#2,#3);
#5=BLOCK('',#4,10.0,20.0,30.0);
#6=CLOSED_SHELL('',(#7));
#7=ADVANCED_FACE('',(#8),#9,.T.);
#8=FACE_BOUND('',#10,.T.);
#9=PLANE('',#4);
#10=EDGE_LOOP('',(#11));
#11=ORIENTED_EDGE('',*,*,#12,.T.);
#12=EDGE_CURVE('',#13,#14,#15,.T.);
#13=VERTEX_POINT('',#1);
#14=VERTEX_POINT('',#16);
#15=LINE('',#1,#3);
#16=CARTESIAN_POINT('',(10.0,0.0,0.0));
ENDSEC;
END-ISO-10303-21;`;

  // Provide the file buffer to OCCT
  const result = occt.ReadStepFile(Buffer.from(stepContent));
  console.log(JSON.stringify(result, null, 2));
}

run().catch(console.error);
