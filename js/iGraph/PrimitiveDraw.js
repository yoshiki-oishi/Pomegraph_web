import {ColorBrewer} from "../base/ColorBrewer.js";
import {ExcelDatetoString} from "../base/ExcelImport.js";
import {Constants} from "../base/Constants.js";
import {Lineage} from "../base/TreeImport.js";
import {UIControl} from "../base/UIControl.js";
import {Chart} from "chart.js";

export function deepening(rgbstr) {
    const re = /rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)/;
    let result = re.exec(rgbstr).slice(1,4);
    //const val = result.map(x => 255 - (parseInt(x) - 255)**2 / 255);//shallower.
    const val = result.map(x => parseInt(x)**2 / 255);//deeper.
    return "rgb(" + val[0] + "," + val[1] + "," + val[2] + ")";
};

export function fromNodetoString(node) {

    const ViewList = {
        TAGID: "TAGID",
        SEQID : "SEQID",
        GNODEID : "GNODEID",
        age: "AGE",
        sex: "SEX",
        category: "CATEGORY",
        association: "ASSOC",
        major_note: "DESCRIPTION",
        minor_note: "NOTE",
        dstr: "COLLECTION_DATE"
    };
    var str = '<table class="infoTable"><tr><th>Item</th><th>Value</th></tr>';
//    const re = /x|y|index|edges|highlight|neighbors|date|dint/;
    const re = /index|edges|highlight|neighbors|date|dint/;
    let i = 0;
    let j = 0;
    for(let obj in ViewList){
        for(let key in node) {
            if(obj !== key){
                continue;
            }
            if ( ! key.match(re)){

                // Insert line breaks for more than 20 characters.
                if(!(key in ViewList)){
                    continue;
                }
                let nodeName = node[key];
                // exceptional process for dstr.
                if (nodeName === "dstr") nodeName = "Collection date";
                let outputName = "";
                if(isNaN(nodeName)){
                    let nodeName20  = nodeName.match(/.{20}/g);
                    if(nodeName20 != null){
                        for( let i = 0; i < nodeName20.length; i++ ) {
                            outputName += nodeName20[i] + "<br/>"
                        }
                    }
                    else{
                        outputName = nodeName;
                    }
                }else{
                    outputName = nodeName;
                }
                if(i % 2 === 0){
                    str += "<tr class='evenInfoColumn'><td width = \"150\">" + ViewList[key] + "</td><td>" + outputName + "</td></tr>";
                }
                else{
                    str += "<tr><td width = \"150\">" + ViewList[key] + "</td><td>" + outputName + "</td></tr>";
                }
                i++;
            }
        }
    }
    str += "</table>"
    return str
};

export function visualEncoding(nodelink) {

    const minArea = Constants.MIN_RADIUS * Constants.MIN_RADIUS * Math.PI / 4;
    const maxArea = Constants.MAX_RADIUS * Constants.MAX_RADIUS * Math.PI / 4;

    const cs = ColorBrewer["Set3"][12];
    UIControl.legendary = new Array();

    let Assoc = new Array();
    nodelink.dots.forEach(dot => {
        Assoc.push(dot.node.association);
    })
    let count = {};
    Assoc.forEach(i => {
        count[i] = (count[i] || 0) + 1;
    });

// Encoding dot elements.
    nodelink.dots.forEach(dot => {
        const t = nodelink.getEncodingValueNode(dot.node);
        //dot.color = (this.doColor) ? cs(t).hex() : 'rgb(190, 190, 190)';
        const gr = {};
        Object.keys(nodelink.groups).map((key, i) => gr[key] = i);// Map group id to index.
        if (dot.node['association']){
            dot.color = (!nodelink.doColor) ? Constants.COLOR_MONOCHROME : (dot.node["type"][1] == "P") ? deepening(cs[gr[dot.node['association']]]) : (dot.node["type"][1] == "D") ? cs[gr[dot.node['association']]] : Constants.COLOR_BLANK;
            let colorObj = {
                association:dot.node['association'],
                color : dot.color,
                sum : count[dot.node['association']]
            }
            let result = UIControl.legendary.find(obj => obj.association === dot.node['association']);
            if(result === undefined || Object.keys(result).length === 0){
                UIControl.legendary.push(colorObj);
            }
        }else{
            dot.color = Constants.COLOR_BLANK;
        }
        // Encoding date string.
        dot.node['dstr'] = ExcelDatetoString(dot.node['dint']);
        const area = minArea * (1 - t) + maxArea * t;
        dot.radius = (nodelink.doSize) ? Math.sqrt(area / Math.PI) : (nodelink.viewtype === 'pomegraph') ? Constants.FIX_RADIUS : Constants.FIX_RADIUS;
    });
// Encoding link elements.
    nodelink.links.forEach(link => {
        const t = nodelink.getEncodingValueEdge(link.edge);
        link.width = (nodelink.doWidth) ? Constants.MIN_WIDTH * (1 - t) + Constants.MAX_WIDTH * t : Constants.FIX_WIDTH;
    });
}

export function drawScalingDots(gc, n, zoom){
    gc.beginPath();
    gc.arc(...n.viewPosition, n.scale * zoom, 0, 2 * Math.PI);
    gc.fill();
    gc.stroke();
    // text rendering.
    gc.fillStyle = Constants.COLOR_DOT_TEXT;
    //gc.fillText(n.node["TAGID"], n.viewPosition[0],  n.viewPosition[1]-.9*n.radius);
}

export function drawCircleDots(gc, n, drawSize, fontsize){
    // simple circle.
    const [x, y] = [...n.viewPosition];
    gc.beginPath();
    gc.arc(...n.viewPosition, n.radius * drawSize, Math.PI * (-1 / 6), Math.PI * (7 / 6)); // Flattening the top.
    gc.fill();
    gc.stroke();
    //horizontal line.
    gc.beginPath();
    gc.strokeStyle = Constants.COLOR_DOT_HORIZONTAL;
    gc.moveTo(x-(n.radius*Math.sqrt(3)/2)*drawSize, y - .5 * n.radius * drawSize);
    gc.lineTo(x+(n.radius*Math.sqrt(3)/2)*drawSize,y - .5 * n.radius * drawSize);
    gc.stroke();
    // text rendering.
    gc.fillStyle = Constants.COLOR_DOT_TEXT;
    gc.fillText(n.node["TAGID"], x,  y - .76 * n.radius * fontsize * Constants.FONT_LINE_HEIGHT); // - 3/4 * r
    if(n.node["dstr"]){
        if(n.node.dstr != "70/01/01") gc.fillText(n.node["dstr"], x,  y - .25 * n.radius * fontsize * Constants.FONT_LINE_HEIGHT); // - 1/4 * r
    }
    if (!n.node.age) n.node.age = ""; if (!n.node.sex) n.node.sex = ""; 
    if (n.node.age || n.node.sex) gc.fillText(n.node["age"]+"・"+n.node["sex"], x,  y + .25 * n.radius * fontsize  * Constants.FONT_LINE_HEIGHT); // + 1/4 * r
    if (n.node.description) gc.fillText(n.node["description"], x,  y + .75 * n.radius * fontsize  * Constants.FONT_LINE_HEIGHT); // + 3/4 * r
};

export function drawRoundedBox(gc, n, drawSize, fontsize){
    const magnitude = 0.9 // 
    const c = n.radius * magnitude * Math.cos(Math.PI/8) * drawSize;
    const s = n.radius * magnitude * Math.sin(Math.PI/8) * drawSize;
    const [x, y] = [...n.viewPosition];
    gc.beginPath();
    gc.moveTo(x - c, y);
    gc.lineTo(x - c, y + s); gc.arc(x - s, y + s, c - s, Math.PI, Math.PI/2, true);
    gc.lineTo(x + s, y + c); gc.arc(x + s, y + s, c - s, Math.PI/2, 0, true);
    gc.lineTo(x + c, y - s); gc.arc(x + s, y - s, c - s, 0, Math.PI*3/2, true);
    gc.lineTo(x - s, y - c); gc.arc(x - s, y - s, c - s, Math.PI*3/2, Math.PI, true);
    gc.lineTo(x - c, y);
    gc.fill();
    gc.stroke();
    //horizontal line.
    gc.beginPath();
    gc.strokeStyle = "#707070";
    gc.moveTo(x - (n.radius*Math.sqrt(2.5)/2)*drawSize, y - .5*n.radius*drawSize);
    gc.lineTo(x + (n.radius*Math.sqrt(2.5)/2)*drawSize, y - .5*n.radius*drawSize);
    gc.stroke();
    // text rendering.
    gc.fillStyle = "#303030";
    gc.fillText(n.node["TAGID"], x,  y-.675 * n.radius*fontsize);  // - 27/40 * r
    if(n.node["dstr"]){
        if(n.node.dstr != "70/01/01") gc.fillText(n.node["dstr"], x,  y-.225*n.radius*fontsize); // - 9/40 * r
    }
    if (!n.node.age) n.node.age = ""; if (!n.node.sex) n.node.sex = ""; 
    if (n.node.age || n.node.sex) gc.fillText(n.node["age"]+"・"+n.node["sex"], x,  y+.225*n.radius*fontsize); // + 9/40 * r
    if (n.node.description) gc.fillText(n.node["description"], x,  y+.675*n.radius*fontsize);  // + 27/40 * r
};

export function drawTriangle(gc, n, drawSize,fontsize){
    const sqrt = Math.sqrt;
    const magnitude = n.radius * sqrt(Math.PI * sqrt(4)) / 2 * drawSize; //shape adjustment
    const standard = n.radius * drawSize;
    // const c = n.radius * magnitude * scale * Math.cos(Math.PI/6) * drawSize;
    // const s = n.radius * magnitude * scale * Math.sin(Math.PI/6) * drawSize;
    const [x, y] = [...n.viewPosition];
    gc.beginPath();
    gc.moveTo(x - (sqrt(3) * .5 * magnitude), y - 1.6 * magnitude + standard); // move to left shoulder
    gc.lineTo(x + (sqrt(3) * .5 * magnitude), y - 1.6 * magnitude + standard); // move to right shoulder
    gc.lineTo(x, y + (1.4 * magnitude) - standard); // move to foot
    gc.lineTo(x - (sqrt(3) * .5 * magnitude), y - 1.6 * magnitude + standard); // move to left shoulder to close path
    gc.fill();
    gc.stroke();
    //horizontal line.
    gc.beginPath();
    gc.strokeStyle = "#707070";
    gc.moveTo(x - (sqrt(3) * .5 * magnitude) * 0.75, y - .5*n.radius*drawSize);
    gc.lineTo(x + (sqrt(3) * .5 * magnitude) * 0.75, y - .5*n.radius*drawSize);
    gc.stroke();
    // text rendering.
    gc.fillStyle = "#303030";
    gc.fillText(n.node["TAGID"], x,  y-.675 * n.radius*fontsize);  // - 27/40 * r
    if(n.node["dstr"]){
        if(n.node.dstr != "70/01/01") gc.fillText(n.node["dstr"], x,  y-.225*n.radius*fontsize); // - 9/40 * r
    }
    if (!n.node.age) n.node.age = ""; if (!n.node.sex) n.node.sex = ""; 
    if (n.node.age || n.node.sex) gc.fillText(n.node["age"]+"・"+n.node["sex"], x,  y+.225*n.radius*fontsize); // + 9/40 * r
    if (n.node.description) gc.fillText(n.node["description"], x,  y+.675*n.radius*fontsize);  // + 27/40 * r
};

export function drawTicks(gc, x, y, subs, zoom){

    const TICK_NUMBER_LIMIT = 5;
    let [cur_x, cur_y] = [x, y];
    const h = Constants.TICK_HEIGHT * zoom;
    const w = Constants.TICK_WIDTH * zoom;
    const n = Math.ceil(subs/2);

    var drawTick = function (x, y) {
        gc.moveTo(x, y - h);
        gc.lineTo(x, y + h);
    }

    if(!subs) return;
    if(subs > TICK_NUMBER_LIMIT){
        gc.fillStyle = "#a0a0a0";
        gc.beginPath();
        gc.fillRect(x-w, y-h, w*2, h*2);
        gc.stroke();
        gc.fillStyle = "#303030";
        gc.fillText(subs, x, y); //write number.

        gc.fillStyle = Constants.COLOR_LINE_GENOME_EDGE;
        return;        
    }
    cur_x -= (subs % 2) ? w * n : w * (n + 0.5);
    gc.lineWidth = Constants.LINE_WIDTH_TICK;
    gc.beginPath();
    gc.moveTo(cur_x, cur_y);
    for(let i=0; i < subs; i++){
        drawTick(cur_x, cur_y);
        cur_x += w;
        gc.moveTo(cur_x, cur_y);
    }
    gc.stroke();
}

export function drawLink(gc, e){
    if(e.source === undefined || e.target === undefined) return;
    if(!e.source.isProperDate() || !e.target.isProperDate()){
        return false;
    }
    if(e.source.node.GNODEID == Lineage.UNASSIGNED_NODE || e.target.node.GNODEID == Lineage.UNASSIGNED_NODE){
        return false;
    }

    gc.save();
    gc.lineWidth = e.width;
    gc.beginPath();
    gc.moveTo(...e.source.viewPosition);
    gc.lineTo(...e.target.viewPosition);
    gc.stroke();

    const [x, y] = [(e.source.viewPosition[0] + e.target.viewPosition[0])/2,
                (e.source.viewPosition[1] + e.target.viewPosition[1])/2];
    const [dx, dy] = [
        e.target.viewPosition[0] - e.source.viewPosition[0],
        e.target.viewPosition[1] - e.source.viewPosition[1]
    ]
    const th = (dy)/(dx);
    const th2 = Math.atan2(dy, dx);

    gc.translate(x, y);
    if(e.source.viewPosition[1] < e.target.viewPosition[1]){
        gc.rotate(Math.PI);
    }
    if (th>0){
        (th2 < Math.PI/2) ? gc.rotate(Math.PI+Math.atan2(dy, dx)) : gc.rotate(Math.atan2(dy, dx));
    }else{
        gc.rotate(Math.atan2(dy, dx));
    }
    gc.translate(-x, -y);
    gc.fillText(e.edge['label'],x, y);
    gc.restore();
};

export function drawCompositeCircle(gc, gnodes, zoom, dots, fileparts){

    const sg = (Object.keys(gnodes).length) ? gnodes : {};

    Object.entries(sg).forEach(([label, gg]) => {
        /*if(!(label === "0" && 
            ((!UIControl.getIsFullscreen() && localStorage.getItem('readExcel') && localStorage.getItem('readTree'))
            || (UIControl.getIsFullscreen() && localStorage.getItem('import') == 1))
            )){*/
        if(!(label === "0" && 
            ((!UIControl.getIsFullscreen() && fileparts === UIControl.BOTH)
            || (UIControl.getIsFullscreen() && localStorage.getItem('import') == 1))
            )){
            gc.lineWidth = Constants.LINE_WIDTH_GENOME_NODE;
            gc.strokeStyle = (gg.highlight.size > 0) ? Constants.COLOR_LINE_HIGHLIGHT : Constants.COLOR_LINE_GENOME_EDGE;
            gc.beginPath();
            const radius = gg.radius * zoom;
            if(radius){
                gc.arc(...gg.viewPosition, radius, 0, 2 * Math.PI);
                if(gg.radius > Constants.BRANK_NODE_RADIUS){
                    gc.stroke();
                    // text rendering.
                    gc.fillStyle = "#303030";
                    gc.fillText(label, gg.viewPosition[0], gg.viewPosition[1]+1.1*radius);

                    /* DEBUG */
                    if(UIControl.getDebugMode()){
                        let dotselem = dots.find(x => x.node.GNODEID == label);
                        if(!!dotselem){
                            let dot = Object.keys(dotselem)[0];
                            gc.fillText(dotselem.node.TAGID, gg.viewPosition[0], gg.viewPosition[1]+2*radius);
                        }
                    }
                    /* DEBUG */

                }else{
                    gc.fillStyle = Constants.COLOR_LINE_GENOME_EDGE;
                    gc.fill(); // Just handle to manupilate.
                }
            }
        }
    });        
}

export function drawCompositeLink(gc, gnodes, gedges, zoom){
    gc.lineWidth = Constants.LINE_WIDTH_GENOME_LINK;
    gc.strokeStyle = Constants.COLOR_LINE_GENOME_EDGE;
    gc.textBaseline = "middle";
    const sg = (Object.keys(gnodes).length>1) ? gnodes : {};
    Object.keys(sg).forEach(gg=>{
        const src = sg[gg];
        const src_radius = src.radius * zoom;
        if(Object.keys(src.gnode).length){ // continue if blank.
            src.gnode.edges.forEach( d => {
                const dst = sg[d];
                const dst_radius = dst.radius * zoom
                const th = -Math.atan2(src.viewPosition[0]-dst.viewPosition[0],
                    src.viewPosition[1]-dst.viewPosition[1])-Math.PI/2;
                const m = (src.viewPosition[1]-dst.viewPosition[1])/
                    (src.viewPosition[0]-dst.viewPosition[0]);

                gc.lineWidth = Constants.LINE_WIDTH_EDGE;
                gc.beginPath();
                gc.moveTo(src.viewPosition[0]+Math.cos(th)*src_radius,
                        src.viewPosition[1]+Math.sin(th)*src_radius);
                gc.lineTo(dst.viewPosition[0]-Math.cos(th)*dst_radius,
                        dst.viewPosition[1]-Math.sin(th)*dst_radius);
                gc.stroke();
                gc.save();
                let [x, y] = [
                            (src.viewPosition[0]+Math.cos(th)*src_radius
                                +dst.viewPosition[0]-Math.cos(th)*dst_radius)/2,
                            (src.viewPosition[1]+Math.sin(th)*src_radius
                                +dst.viewPosition[1]-Math.sin(th)*dst_radius)/2
                        ];
                gc.translate(x, y);
                if(src.viewPosition[0]>dst.viewPosition[0]){
                    gc.rotate(Math.PI);
                }
                if (m>0){
                    gc.rotate(Math.atan(m));
                }else{
                    gc.rotate(-Math.atan(-m));
                }
                gc.translate(-x, -y);
                // const text = (dst.gnode.subs !== undefined) ? dst.gnode.subs : Math.round(dst.gnode.length*1000000) / 1000000;
                // gc.fillText(text, x, y); //temporary disabled.
                drawTicks(gc, x, y, dst.gnode.subs, zoom);
                gc.restore();
            });
        }
    });
    if(gedges?.length){
        gedges.forEach(e=>{
            const src = sg[e.src];
            const dst = sg[e.dst];
            const src_radius = src.radius * zoom;
            const dst_radius = dst.radius * zoom;
            const th = -Math.atan2(src.viewPosition[0]-dst.viewPosition[0],
                src.viewPosition[1]-dst.viewPosition[1])-Math.PI/2;
            const m = (src.viewPosition[1]-dst.viewPosition[1])/
                (src.viewPosition[0]-dst.viewPosition[0]);

            gc.beginPath();
            gc.moveTo(src.viewPosition[0]+Math.cos(th)*src_radius,
                    src.viewPosition[1]+Math.sin(th)*src_radius);
            gc.lineTo(dst.viewPosition[0]-Math.cos(th)*dst_radius,
                    dst.viewPosition[1]-Math.sin(th)*dst_radius);
            gc.stroke();
            gc.save();
            let [x, y] = [
                    (src.viewPosition[0]+Math.cos(th)*src_radius
                        +dst.viewPosition[0]-Math.cos(th)*dst_radius)/2,
                    (src.viewPosition[1]+Math.sin(th)*src_radius
                        +dst.viewPosition[1]-Math.sin(th)*dst_radius)/2
                    ];
            gc.translate(x, y);
            if(src.viewPosition[0]>dst.viewPosition[0]){
                gc.rotate(Math.PI);
            }
            if (m>0){
                gc.rotate(Math.atan(m));
            }else{
                gc.rotate(-Math.atan(-m));
            }
            gc.translate(-x, -y);
            drawTicks(gc, x, y, e.weight, zoom);
            gc.restore(); 
        });
    };
}
