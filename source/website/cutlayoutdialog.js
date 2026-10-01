import { AddDiv, CreateDiv, AddDomElement } from '../engine/viewer/domutils.js';
import { ButtonDialog } from './dialog.js';
import { Loc } from '../engine/core/localization.js';
import { ComponentFlattener } from '../engine/geometry/componentflattener.js';
import { CreateObjectUrlWithMimeType, RevokeObjectUrl } from '../engine/io/bufferutils.js';
import { DownloadUrlAsFile } from './utils.js';

export function ShowCutLayoutDialog (model, callbacks)
{
    if (!model) {
        return;
    }

    let flattener = new ComponentFlattener ({ spacing : 15.0 });
    let flattenResult = flattener.FlattenModel (model, (meshInstanceId) => {
        if (callbacks && callbacks.isMeshVisible) {
            return callbacks.isMeshVisible (meshInstanceId);
        }
        return true;
    });

    let dialog = new ButtonDialog ();
    let buttons = [
        {
            name : Loc ('Export SVG'),
            onClick () {
                ExportSvg (flattenResult);
            }
        },
        {
            name : Loc ('Close'),
            onClick () {
                dialog.Close ();
            }
        }
    ];

    let contentDiv = dialog.Init (Loc ('2D Cut Layout & Outlines'), buttons);
    contentDiv.classList.add ('ov_cut_layout_dialog');

    // Warning Banner if any non-parallel faces found
    if (flattenResult.HasWarnings ()) {
        let warningDiv = AddDiv (contentDiv, 'ov_cut_layout_warning');
        AddDiv (warningDiv, 'ov_cut_layout_warning_title', '⚠️ Non-Parallel / Tapered Components Detected:');
        for (let warning of flattenResult.warnings) {
            AddDiv (warningDiv, 'ov_cut_layout_warning_item', '• ' + warning);
        }
    }

    let mainContainer = AddDiv (contentDiv, 'ov_cut_layout_container');

    // Left sidebar: Piece List
    let sidebarDiv = AddDiv (mainContainer, 'ov_cut_layout_sidebar');
    let summaryText = `Total Pieces: ${flattenResult.pieces.length} | Sheet Size: ${flattenResult.totalWidth.toFixed (1)} × ${flattenResult.totalHeight.toFixed (1)} mm`;
    AddDiv (sidebarDiv, 'ov_cut_layout_summary', summaryText);

    let listDiv = AddDiv (sidebarDiv, 'ov_cut_layout_list ov_thin_scrollbar');
    for (let i = 0; i < flattenResult.pieces.length; i++) {
        let piece = flattenResult.pieces[i];
        let itemDiv = AddDiv (listDiv, 'ov_cut_layout_item');
        let titleDiv = AddDiv (itemDiv, 'ov_cut_layout_item_title', `${i + 1}. ${piece.name}`);

        let statusClass = piece.isParallelExtrusion ? 'status_valid' : 'status_warning';
        let statusText = piece.isParallelExtrusion ? 'Parallel Extrusion (OK)' : 'Non-Parallel (Warning)';
        let statusBadge = AddDiv (itemDiv, 'ov_cut_layout_badge ' + statusClass, statusText);

        let details = `Size: ${piece.width.toFixed (1)} × ${piece.height.toFixed (1)} mm | Thk: ${piece.thickness.toFixed (2)} mm | Area: ${piece.surfaceArea.toFixed (1)} mm²`;
        AddDiv (itemDiv, 'ov_cut_layout_item_details', details);
    }

    // Right side: Interactive 2D Canvas
    let canvasContainer = AddDiv (mainContainer, 'ov_cut_layout_canvas_container');
    let canvas = AddDomElement (canvasContainer, 'canvas', 'ov_cut_layout_canvas');

    let ctx = canvas.getContext ('2d');
    let scale = 1.0;
    let offsetX = 20.0;
    let offsetY = 20.0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    function ResizeCanvas ()
    {
        canvas.width = canvasContainer.clientWidth || 600;
        canvas.height = canvasContainer.clientHeight || 450;
        FitView ();
        Draw ();
    }

    function FitView ()
    {
        if (flattenResult.totalWidth <= 0 || flattenResult.totalHeight <= 0) {
            return;
        }
        let padding = 40;
        let scaleX = (canvas.width - padding * 2) / flattenResult.totalWidth;
        let scaleY = (canvas.height - padding * 2) / flattenResult.totalHeight;
        scale = Math.min (scaleX, scaleY, 4.0);
        scale = Math.max (scale, 0.1);

        offsetX = (canvas.width - flattenResult.totalWidth * scale) / 2;
        offsetY = (canvas.height - flattenResult.totalHeight * scale) / 2;
    }

    function Draw ()
    {
        ctx.fillStyle = '#1e1f22';
        ctx.fillRect (0, 0, canvas.width, canvas.height);

        // Draw Sheet Boundary
        if (flattenResult.totalWidth > 0 && flattenResult.totalHeight > 0) {
            ctx.strokeStyle = '#3a3c42';
            ctx.lineWidth = 1;
            ctx.setLineDash ([5, 5]);
            ctx.strokeRect (offsetX, offsetY, flattenResult.totalWidth * scale, flattenResult.totalHeight * scale);
            ctx.setLineDash ([]);
        }

        // Draw pieces
        for (let piece of flattenResult.pieces) {
            let px = offsetX + piece.layoutPosition.x * scale;
            let py = offsetY + piece.layoutPosition.y * scale;

            // Fill background of piece
            ctx.fillStyle = piece.isParallelExtrusion ? 'rgba(0, 179, 235, 0.08)' : 'rgba(235, 120, 0, 0.12)';

            // Draw loops
            for (let loop of piece.loops) {
                if (loop.length < 2) continue;
                ctx.beginPath ();
                ctx.moveTo (px + loop[0].x * scale, py + loop[0].y * scale);
                for (let k = 1; k < loop.length; k++) {
                    ctx.lineTo (px + loop[k].x * scale, py + loop[k].y * scale);
                }
                ctx.closePath ();
                ctx.fill ();
            }

            // Draw cut outline strokes
            ctx.strokeStyle = piece.isParallelExtrusion ? '#00b3eb' : '#eb7800';
            ctx.lineWidth = 1.5;

            for (let seg of piece.segments) {
                ctx.beginPath ();
                ctx.moveTo (px + seg[0].x * scale, py + seg[0].y * scale);
                ctx.lineTo (px + seg[1].x * scale, py + seg[1].y * scale);
                ctx.stroke ();
            }

            // Label
            ctx.fillStyle = '#ffffff';
            ctx.font = '11px sans-serif';
            ctx.fillText (piece.name, px + 4, py + 14);
            ctx.fillStyle = '#999999';
            ctx.font = '9px sans-serif';
            ctx.fillText (`${piece.width.toFixed (1)}×${piece.height.toFixed (1)}mm`, px + 4, py + 26);
        }
    }

    // Zoom & Pan Events
    canvas.addEventListener ('wheel', (ev) => {
        ev.preventDefault ();
        let zoomFactor = ev.deltaY < 0 ? 1.15 : 0.85;
        let rect = canvas.getBoundingClientRect ();
        let mouseX = ev.clientX - rect.left;
        let mouseY = ev.clientY - rect.top;

        offsetX = mouseX - (mouseX - offsetX) * zoomFactor;
        offsetY = mouseY - (mouseY - offsetY) * zoomFactor;
        scale *= zoomFactor;
        Draw ();
    });

    canvas.addEventListener ('mousedown', (ev) => {
        isDragging = true;
        dragStartX = ev.clientX - offsetX;
        dragStartY = ev.clientY - offsetY;
    });

    window.addEventListener ('mousemove', (ev) => {
        if (!isDragging) return;
        offsetX = ev.clientX - dragStartX;
        offsetY = ev.clientY - dragStartY;
        Draw ();
    });

    window.addEventListener ('mouseup', () => {
        isDragging = false;
    });

    dialog.Open ();
    setTimeout (ResizeCanvas, 50);

    return dialog;
}

function ExportSvg (flattenResult)
{
    let svgWidth = Math.max (100, flattenResult.totalWidth + 20);
    let svgHeight = Math.max (100, flattenResult.totalHeight + 20);

    let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}mm" height="${svgHeight}mm" viewBox="0 0 ${svgWidth} ${svgHeight}" version="1.1">\n`;
    svg += `  <style>\n`;
    svg += `    .cut-path { fill: none; stroke: #ff0000; stroke-width: 0.1mm; stroke-linecap: round; }\n`;
    svg += `    .warning-path { fill: none; stroke: #ff8800; stroke-width: 0.1mm; stroke-linecap: round; }\n`;
    svg += `    .piece-text { font-family: sans-serif; font-size: 3mm; fill: #0088cc; }\n`;
    svg += `  </style>\n`;

    for (let piece of flattenResult.pieces) {
        let px = piece.layoutPosition.x;
        let py = piece.layoutPosition.y;
        let strokeClass = piece.isParallelExtrusion ? 'cut-path' : 'warning-path';

        svg += `  <!-- ${piece.name} -->\n`;
        svg += `  <g id="${piece.name.replace (/[^a-zA-Z0-9_]/g, '_')}">\n`;
        svg += `    <text x="${(px + 2).toFixed (2)}" y="${(py + 4).toFixed (2)}" class="piece-text">${piece.name}</text>\n`;

        for (let seg of piece.segments) {
            let x1 = (px + seg[0].x).toFixed (3);
            let y1 = (py + seg[0].y).toFixed (3);
            let x2 = (px + seg[1].x).toFixed (3);
            let y2 = (py + seg[1].y).toFixed (3);
            svg += `    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${strokeClass}" />\n`;
        }
        svg += `  </g>\n`;
    }

    svg += `</svg>\n`;

    let blob = new Blob ([svg], { type : 'image/svg+xml' });
    let url = CreateObjectUrlWithMimeType (blob, 'image/svg+xml');
    DownloadUrlAsFile (url, 'kerfsoft_cut_layout.svg');
    RevokeObjectUrl (url);
}
