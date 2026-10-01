import { Coord2D, CoordDistance2D } from './coord2d.js';
import { Coord3D, CrossVector3D, DotVector3D, SubCoord3D, VectorLength3D } from './coord3d.js';
import { IsEqual } from './geometry.js';

export class FlattenedPiece
{
    constructor (name, id)
    {
        this.name = name || 'Component';
        this.id = id !== undefined ? id : null;
        this.isParallelExtrusion = true;
        this.warning = null;
        this.thickness = 0.0;
        this.surfaceArea = 0.0;
        this.faceNormal = null;
        this.faceOrigin = null;

        // Array of polygon loops (array of Coord2D). loops[0] = outer boundary, loops[1..N] = internal holes.
        this.loops = [];
        // Array of 2D line segments [Coord2D, Coord2D]
        this.segments = [];

        this.width = 0.0;
        this.height = 0.0;
        this.min2D = new Coord2D (0.0, 0.0);
        this.max2D = new Coord2D (0.0, 0.0);

        // Position on 2D layout sheet
        this.layoutPosition = new Coord2D (0.0, 0.0);
    }
}

export class FlattenResult
{
    constructor ()
    {
        this.pieces = [];
        this.warnings = [];
        this.totalWidth = 0.0;
        this.totalHeight = 0.0;
    }

    HasWarnings ()
    {
        return this.warnings.length > 0;
    }
}

export class ComponentFlattener
{
    constructor (options)
    {
        this.options = Object.assign ({
            spacing : 10.0,
            normalTolerance : 0.05, // angular tolerance ~2.8 deg
            parallelTolerance : 0.05
        }, options);
    }

    FlattenModel (model, isMeshVisibleCallback)
    {
        let result = new FlattenResult ();
        if (!model) {
            return result;
        }

        model.EnumerateMeshInstances ((meshInstance) => {
            if (isMeshVisibleCallback && !isMeshVisibleCallback (meshInstance.GetId ())) {
                return;
            }

            let pieceName = meshInstance.GetMesh ().GetName () || ('Piece ' + (result.pieces.length + 1));
            let piece = this.FlattenMeshInstance (meshInstance, pieceName);
            if (piece) {
                result.pieces.push (piece);
                if (piece.warning) {
                    result.warnings.push (piece.name + ': ' + piece.warning);
                }
            }
        });

        this.ArrangeLayout (result);
        return result;
    }

    FlattenMeshInstance (meshInstance, pieceName)
    {
        let transformedMesh = meshInstance.GetTransformedMesh ();
        if (transformedMesh.TriangleCount () === 0) {
            return null;
        }

        return this.FlattenMesh (transformedMesh, pieceName, meshInstance.GetId ());
    }

    FlattenMesh (mesh, pieceName, id)
    {
        let piece = new FlattenedPiece (pieceName, id);
        let triangleCount = mesh.TriangleCount ();
        if (triangleCount === 0) {
            return null;
        }

        // 1. Compute triangle normals, areas, and plane offsets
        let trianglesData = [];
        for (let i = 0; i < triangleCount; i++) {
            let triangle = mesh.GetTriangle (i);
            let v0 = mesh.GetVertex (triangle.v0);
            let v1 = mesh.GetVertex (triangle.v1);
            let v2 = mesh.GetVertex (triangle.v2);

            let e1 = SubCoord3D (v1, v0);
            let e2 = SubCoord3D (v2, v0);
            let normalUnnorm = CrossVector3D (e1, e2);
            let len = normalUnnorm.Length ();
            if (len < 1e-7) {
                continue;
            }

            let area = len * 0.5;
            let normal = normalUnnorm.Normalize ();
            let d = -DotVector3D (normal, v0);

            trianglesData.push ({
                index : i,
                v0Index : triangle.v0,
                v1Index : triangle.v1,
                v2Index : triangle.v2,
                v0 : v0,
                v1 : v1,
                v2 : v2,
                normal : normal,
                d : d,
                area : area
            });
        }

        if (trianglesData.length === 0) {
            piece.isParallelExtrusion = false;
            piece.warning = 'Mesh contains only degenerate triangles.';
            return piece;
        }

        // 2. Cluster coplanar triangles into planar face regions
        let clusters = [];
        for (let tri of trianglesData) {
            let matchedCluster = null;
            for (let cluster of clusters) {
                let dot = DotVector3D (tri.normal, cluster.normal);
                if (dot >= (1.0 - this.options.normalTolerance)) {
                    let dDiff = Math.abs (tri.d - cluster.d);
                    if (dDiff < 1.0) { // Distance tolerance for coplanar face
                        matchedCluster = cluster;
                        break;
                    }
                }
            }

            if (matchedCluster) {
                matchedCluster.triangles.push (tri);
                matchedCluster.totalArea += tri.area;
            } else {
                clusters.push ({
                    normal : tri.normal.Clone (),
                    d : tri.d,
                    totalArea : tri.area,
                    triangles : [tri]
                });
            }
        }

        // Sort clusters by area descending
        clusters.sort ((a, b) => b.totalArea - a.totalArea);

        // 3. Step 1: Detect parallel opposing faces & check if body is extruded
        let bestCluster = clusters[0];
        let oppositeCluster = null;
        let foundParallel = false;

        for (let i = 1; i < clusters.length; i++) {
            let candidate = clusters[i];
            let dot = DotVector3D (bestCluster.normal, candidate.normal);
            if (dot <= -(1.0 - this.options.parallelTolerance)) {
                oppositeCluster = candidate;
                foundParallel = true;
                break;
            }
        }

        if (foundParallel && oppositeCluster) {
            piece.isParallelExtrusion = true;
            piece.thickness = Math.abs (bestCluster.d + oppositeCluster.d);

            // Check if side faces are approximately perpendicular
            for (let cluster of clusters) {
                if (cluster === bestCluster || cluster === oppositeCluster) {
                    continue;
                }
                let dot1 = Math.abs (DotVector3D (cluster.normal, bestCluster.normal));
                if (dot1 > 0.15 && cluster.totalArea > (bestCluster.totalArea * 0.05)) {
                    // Significant face that is not perpendicular to top/bottom
                    piece.isParallelExtrusion = false;
                    piece.warning = 'Non-perpendicular / slanted side walls detected.';
                    break;
                }
            }
        } else {
            piece.isParallelExtrusion = false;
            piece.warning = 'Opposing parallel planar face not found (non-extruded or tapered shape).';
        }

        // 4. Step 2: Select the plane that has the highest surface area
        let selectedCluster = bestCluster;
        if (oppositeCluster && oppositeCluster.totalArea > bestCluster.totalArea) {
            selectedCluster = oppositeCluster;
        }

        piece.surfaceArea = selectedCluster.totalArea;
        piece.faceNormal = selectedCluster.normal.Clone ();
        piece.faceOrigin = selectedCluster.triangles[0].v0.Clone ();

        // 5. Establish 2D orthonormal projection basis (u, v) on the selected plane
        let wAxis = piece.faceNormal.Clone ().Normalize ();
        let tempAxis = (Math.abs (wAxis.z) < 0.9) ? new Coord3D (0.0, 0.0, 1.0) : new Coord3D (0.0, 1.0, 0.0);
        let uAxis = CrossVector3D (wAxis, tempAxis).Normalize ();
        let vAxis = CrossVector3D (wAxis, uAxis).Normalize ();

        function ProjectPointTo2D (p3d, origin)
        {
            let diff = SubCoord3D (p3d, origin);
            return new Coord2D (
                DotVector3D (diff, uAxis),
                DotVector3D (diff, vAxis)
            );
        }

        // 6. Extract boundary edges of the selected 2D face
        let edgeCountMap = new Map ();
        let edgeInfoMap = new Map ();

        for (let tri of selectedCluster.triangles) {
            let pts2D = [
                ProjectPointTo2D (tri.v0, piece.faceOrigin),
                ProjectPointTo2D (tri.v1, piece.faceOrigin),
                ProjectPointTo2D (tri.v2, piece.faceOrigin)
            ];

            let edges = [
                { start : pts2D[0], end : pts2D[1] },
                { start : pts2D[1], end : pts2D[2] },
                { start : pts2D[2], end : pts2D[0] }
            ];

            for (let edge of edges) {
                let k1 = edge.start.x.toFixed (4) + ',' + edge.start.y.toFixed (4);
                let k2 = edge.end.x.toFixed (4) + ',' + edge.end.y.toFixed (4);
                let undirectedKey = (k1 < k2) ? (k1 + '_' + k2) : (k2 + '_' + k1);

                let count = edgeCountMap.get (undirectedKey) || 0;
                edgeCountMap.set (undirectedKey, count + 1);
                edgeInfoMap.set (undirectedKey, edge);
            }
        }

        // Boundary edges occur exactly once in the cluster
        let boundaryEdges = [];
        for (let [key, count] of edgeCountMap.entries ()) {
            if (count === 1) {
                let edge = edgeInfoMap.get (key);
                boundaryEdges.push (edge);
                piece.segments.push ([edge.start.Clone (), edge.end.Clone ()]);
            }
        }

        // 7. Chain boundary edges into ordered polygon loops
        piece.loops = this.AssembleLoops (boundaryEdges);

        // 8. Compute 2D piece bounding box & normalize coordinates
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (let seg of piece.segments) {
            for (let pt of [seg[0], seg[1]]) {
                minX = Math.min (minX, pt.x);
                minY = Math.min (minY, pt.y);
                maxX = Math.max (maxX, pt.x);
                maxY = Math.max (maxY, pt.y);
            }
        }

        if (minX === Infinity) {
            minX = 0; minY = 0; maxX = 0; maxY = 0;
        }

        // Translate so min corner is (0, 0)
        for (let seg of piece.segments) {
            seg[0].x -= minX;
            seg[0].y -= minY;
            seg[1].x -= minX;
            seg[1].y -= minY;
        }

        for (let loop of piece.loops) {
            for (let pt of loop) {
                pt.x -= minX;
                pt.y -= minY;
            }
        }

        piece.width = maxX - minX;
        piece.height = maxY - minY;
        piece.min2D = new Coord2D (0.0, 0.0);
        piece.max2D = new Coord2D (piece.width, piece.height);

        return piece;
    }

    AssembleLoops (edges)
    {
        let loops = [];
        let remaining = edges.slice ();
        let tolerance = 1e-3;

        while (remaining.length > 0) {
            let loop = [];
            let firstEdge = remaining.shift ();
            loop.push (firstEdge.start.Clone ());
            let currentEnd = firstEdge.end;

            let loopClosed = false;
            while (!loopClosed && remaining.length > 0) {
                let foundNext = false;
                for (let i = 0; i < remaining.length; i++) {
                    let nextEdge = remaining[i];
                    if (CoordDistance2D (currentEnd, nextEdge.start) < tolerance) {
                        loop.push (nextEdge.start.Clone ());
                        currentEnd = nextEdge.end;
                        remaining.splice (i, 1);
                        foundNext = true;
                        break;
                    } else if (CoordDistance2D (currentEnd, nextEdge.end) < tolerance) {
                        loop.push (nextEdge.end.Clone ());
                        currentEnd = nextEdge.start;
                        remaining.splice (i, 1);
                        foundNext = true;
                        break;
                    }
                }

                if (!foundNext) {
                    break;
                }

                if (CoordDistance2D (currentEnd, loop[0]) < tolerance) {
                    loopClosed = true;
                }
            }

            if (loop.length >= 3) {
                loops.push (loop);
            }
        }

        // Sort loops by area so outer boundary is first
        loops.sort ((a, b) => Math.abs (this.ComputePolygonArea (b)) - Math.abs (this.ComputePolygonArea (a)));
        return loops;
    }

    ComputePolygonArea (polygon)
    {
        let area = 0.0;
        let n = polygon.length;
        for (let i = 0; i < n; i++) {
            let p1 = polygon[i];
            let p2 = polygon[(i + 1) % n];
            area += (p1.x * p2.y - p2.x * p1.y);
        }
        return area * 0.5;
    }

    ArrangeLayout (flattenResult)
    {
        if (flattenResult.pieces.length === 0) {
            return;
        }

        let spacing = this.options.spacing;
        let totalPieces = flattenResult.pieces.length;

        // Shelf packing algorithm
        // Sort pieces by height descending
        let sortedPieces = flattenResult.pieces.slice ().sort ((a, b) => b.height - a.height);

        let approxArea = 0;
        for (let p of sortedPieces) {
            approxArea += (p.width + spacing) * (p.height + spacing);
        }
        let maxRowWidth = Math.max (300, Math.sqrt (approxArea) * 1.3);

        let currentX = spacing;
        let currentY = spacing;
        let rowHeight = 0;
        let totalWidth = 0;
        let totalHeight = 0;

        for (let piece of sortedPieces) {
            if (currentX + piece.width + spacing > maxRowWidth && currentX > spacing) {
                // Move to next row
                currentX = spacing;
                currentY += rowHeight + spacing;
                rowHeight = 0;
            }

            piece.layoutPosition = new Coord2D (currentX, currentY);
            rowHeight = Math.max (rowHeight, piece.height);
            currentX += piece.width + spacing;

            totalWidth = Math.max (totalWidth, currentX);
            totalHeight = Math.max (totalHeight, currentY + rowHeight + spacing);
        }

        flattenResult.totalWidth = totalWidth;
        flattenResult.totalHeight = totalHeight;
    }
}
