import * as assert from 'assert';
import * as OV from '../../source/engine/main.js';

export default function suite ()
{

describe ('Component Flattener', function () {
    it ('Flat Extruded Box Piece', function () {
        // Generate a 10 x 5 x 2 cuboid (x=10, y=5, z=2)
        const cuboid = OV.GenerateCuboid (null, 10.0, 5.0, 2.0);
        const flattener = new OV.ComponentFlattener ();
        const piece = flattener.FlattenMesh (cuboid, 'TestPuzzlePiece', 1);

        assert.ok (piece !== null);
        assert.strictEqual (piece.isParallelExtrusion, true);
        assert.strictEqual (piece.warning, null);
        // Largest face is 10 x 5 = 50 area
        assert.ok (OV.IsEqual (piece.surfaceArea, 50.0));
        // Thickness along z is 2.0
        assert.ok (OV.IsEqual (piece.thickness, 2.0));
        // 2D dimensions should be 10 x 5 or 5 x 10
        assert.ok (
            (OV.IsEqual (piece.width, 10.0) && OV.IsEqual (piece.height, 5.0)) ||
            (OV.IsEqual (piece.width, 5.0) && OV.IsEqual (piece.height, 10.0))
        );
        // Should have 1 outer closed loop of 4 vertices
        assert.strictEqual (piece.loops.length, 1);
        assert.strictEqual (piece.loops[0].length, 4);
    });

    it ('Non-parallel shape warning (Cone)', function () {
        const cone = OV.GenerateCone (null, 0.0, 1.0, 1.0, 16, false);
        const flattener = new OV.ComponentFlattener ();
        const piece = flattener.FlattenMesh (cone, 'ConePiece', 2);

        assert.ok (piece !== null);
        assert.strictEqual (piece.isParallelExtrusion, false);
        assert.ok (piece.warning !== null);
    });

    it ('Non-parallel shape warning (Tetrahedron)', function () {
        const tetrahedron = OV.GeneratePlatonicSolid (null, 'tetrahedron', 1.0);
        const flattener = new OV.ComponentFlattener ();
        const piece = flattener.FlattenMesh (tetrahedron, 'TetraPiece', 3);

        assert.ok (piece !== null);
        assert.strictEqual (piece.isParallelExtrusion, false);
        assert.ok (piece.warning !== null);
    });

    it ('Multi-piece model flattening and layout arrangement', function () {
        const model = new OV.Model ();
        const cuboid1 = OV.GenerateCuboid (null, 8.0, 4.0, 3.0);
        const cuboid2 = OV.GenerateCuboid (null, 6.0, 6.0, 3.0);

        const meshIndex1 = model.AddMesh (cuboid1);
        const meshIndex2 = model.AddMesh (cuboid2);

        const rootNode = model.GetRootNode ();
        rootNode.AddMeshIndex (meshIndex1);
        rootNode.AddMeshIndex (meshIndex2);

        OV.FinalizeModel (model, () => { return new OV.PhysicalMaterial (); });

        const flattener = new OV.ComponentFlattener ({ spacing : 5.0 });
        const result = flattener.FlattenModel (model);

        assert.strictEqual (result.pieces.length, 2);
        assert.strictEqual (result.HasWarnings (), false);
        assert.ok (result.totalWidth > 0);
        assert.ok (result.totalHeight > 0);
    });
});

}
