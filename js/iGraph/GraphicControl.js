import {Animatable} from "../base/Animatable.js";
import {Constants} from "../base/Constants.js";
import { StackLayout } from "../base/StackLayout.js";
//import { Gnode } from "../base/Gnode.js";
import {PomLayout} from "../base/PomLayout.js";
import {ColorBrewer} from "../base/ColorBrewer.js";
import { ExcelDatetoString, ExcelJs } from "../base/ExcelImport.js";
import { deepening, drawCircleDots, drawRoundedBox, drawLink, drawCompositeCircle, drawCompositeLink, fromNodetoString, visualEncoding, drawScalingDots, drawTriangle, drawBarChart } from "./PrimitiveDraw.js";
import { Lineage, Newick } from "../base/TreeImport.js";
import { UIControl } from "../base/UIControl.js";

export class GraphicControl {

    static BOTH_UNVISIBLE = 0;
    static GENOME_OVIS = 1;
    static EPI_OVIS = 2;
    static BOTH_VISIBLE = 3;


    #viewport;
    #viewtype;
    #fileparts;

    #dots;
    #links;
    #groups;
    #gnodes;
    #gedges;

    #pickedDot = -1;
    #pickedDotType = 0;// 0: NODE, 1: GNODE

    #doColor = true;
    #doSize = false; // true
    #doWidth = true;
    #doLayout = true;

    #layout;

    #usrMag = 1;
    #usrMagFont = 1;

    #tooltip;
    #infoView;
    #wasd = new Image(); // wasd icon.

    constructor(graph, viewport, viewtype) {

        this.#viewport = viewport;
        this.#viewtype = viewtype;
        this.#wasd.src = "dist/img/wasd.png";

        this.setEncodingValueNode(graph.max.node.degree, graph.min.node.degree);
        this.setEncodingValueEdge(graph.max.edge.weight, graph.min.edge.weight);

        this.#dots = graph.nodes.map(node => ({
                node: node,
                neighbors: [...node.neighbors], // Copy list of neighbor indices
                x: 0,
                y: 0,
                worldPosition: new Animatable([0, 0]),
                viewPosition: [],
                highlight: new Set(),
                radius: 0,
                scale: 0,
                isVisible: GraphicControl.BOTH_VISIBLE,
                color: 'rgb(0, 0, 0)',
                originalColor: 'rgb(0, 0, 0)',
                isProperDate: function (){
                    return  !(isNaN(node['date']) || node['date'] == 0 || node['date'] === undefined);
                }
            })
        );


        this.#links = graph.edges
            .filter(edge => edge.src !== -1 && edge.dst !== -1)
            .map(edge => ({
                edge: edge,
                source: this.#dots[edge.src],
                target: this.#dots[edge.dst],
                inLens: false,
                width: 0,
            })
        );

        this.#gnodes = Object.assign(
            {
                [Lineage.UNASSIGNED_NODE] : {
                    gnode: {},
                    center: [0, 0],
                    ocenter: [0, 0],
                    worldPosition: new Animatable([0, 0]),
                    viewPosition: [],
                    highlight: new Set(),
                    radius: 0,
                    length: 0,
                    members: {}             
                } // resorvoir for unassigned nodes to gnodes.
            },
            graph.gnodes.reduce((res, gn) => {
                res[gn.label] = {
                    gnode: gn,
                    // center: [0, 0],
                    // ocenter: [0, 0],
                    center: [parseFloat(gn.x), parseFloat(gn.y)],
                    ocenter: [parseFloat(gn.x), parseFloat(gn.y)],
                    worldPosition:  new Animatable([0, 0]), // make zooming effect at srating.
                    viewPosition: [],
                    highlight: new Set(), // Global flag for node highlighting
                    radius: 0,
                    length: gn.length,
                    members: {}        
                };
                return res;
            },{})
        );

        this.#gedges = graph.gedges
        .filter(edge => edge.src !== -1 && edge.dst !== -1);

        // assign dots to gnode.
        let tempOnj = new Array();
        let tempObj2 = new Array();
        if(Object.keys(this.#gnodes).length){
            this.#dots.forEach((dot) =>{
                const gg = (dot.node['GNODEID'] !== undefined && dot.node['GNODEID'] !== -0) ? dot.node['GNODEID'] :  Lineage.UNASSIGNED_NODE;
                if(gg == Lineage.UNASSIGNED_NODE){
                    //dot.isVisible == false;
                    tempOnj.push(dot.node.TAGID);
                }
                if(!dot.isProperDate()){
                    tempObj2.push(dot.node.TAGID);
                }
                const lg = (dot.node['association'] !== undefined && dot.node['association'] !== -0) ? dot.node['association'] : 0;
                const gnode = this.#gnodes[gg];
                (!gnode.members[lg]) ? gnode.members[lg] = [dot,] : gnode.members[lg].push(dot);
            });
            tempOnj.forEach((obj)=> {
                let element = this.#dots.find(dot => dot.node.TAGID == obj);
                // Hidden if Pomegraph.
                element.isVisible = GraphicControl.EPI_OVIS;
            });
            tempObj2.forEach((obj)=> {
                let element = this.#dots.find(dot => dot.node.TAGID == obj);
                // Hidden if BaseGraph.
                if(element.isVisible==GraphicControl.EPI_OVIS){
                    element.isVisible = GraphicControl.BOTH_UNVISIBLE;
                }else{
                    element.isVisible = GraphicControl.GENOME_OVIS;
                }
            });
        }

        // Addjust length.
        //adjustBranchLength(graph.subs);

        this.#groups = this.#dots.reduce((result, cur) => {
            result[cur.node.association] = (result && cur.node.association in result) ? result[cur.node.association] + 1 : 1;
            return result;
        },{});

        //this.visualEncoding(); // Set primitive drawing parameters.
        visualEncoding(this); // Set primitive drawing parameters.
        // Retain the original colour scheme
        this.#dots.forEach(n => n.node.originalColor = n.node.color);

        this.#layout = (viewtype === 'basegraph') ? new StackLayout(this) : new PomLayout(this);
        //this.#viewport.setzoom = this.#viewport.projectWidth(1.0); // get initial zoom lilmit.
        this.#viewport.setcanvassize = this.canvasbounds; // update canvas size.

        this.#tooltip = document.getElementById("hint");
        this.#infoView = document.getElementById("nodeInfo");
    }

/** Getters and Setters **/
    get fileparts() { return this.#fileparts; }
    get usrMag(){ return this.#usrMag; }
    get usrMagFont(){ return this.#usrMagFont; }
    get dots() { return this.#dots; }
    get links() { return this.#links; }
    get groups() { return this.#groups; }
    get gnodes() { return this.#gnodes; }
    get doColor() { return this.#doColor; }
    get doSize() { return this.#doSize; }
    get doWidth() { return this.#doWidth; }
    get doLayout() { return this.#doLayout; }
    get layout() { return this.#layout; }
    get canvasbounds() { return this.#viewport.bounds; }
    get gedges(){ return this.#gedges; }

    set fileparts(f) { this.#fileparts = f; }
    set usrMag(m){ this.#usrMag = m; }
    set usrMagFont(m){ this.#usrMagFont = m; }
    set doColor(value) { this.#doColor = value; }
    set doSize(value) { this.#doSize = value; }
    set doWidth(value) { this.#doWidth = value; }
    set doLayout(value) { this.#doLayout = value; }

    getUnprojectHeight(h){
        return this.#viewport.unprojectHeight(h);
    }

    getUnprojectWidth(w){
        return this.#viewport.unprojectWidth(w);
    }

    setEncodingValueNode(max, min){
        this.max_node_degree = max;
        this.min_node_degree = min;
    }

    setEncodingValueEdge(max, min){
        this.max_edge_weight = max;
        this.min_edge_weight = min;
    }
        
    getEncodingValueNode(n) {
        return (this.max_node_degree != this.min_node_degree) ? n.degree / (this.max_node_degree - this.min_node_degree) : 0;
    }

    getEncodingValueEdge(e) {
        return (this.max_edge_weight != this.min_edge_weight) ? e.weight / (this.max_edge_weight - this.min_edge_weight) : 0;
    }

    pick(evt) {
        const zoom = this.#viewport.projectWidth(1.0);
        if (this.#pickedDot !== -1) {
            // out focus.
            let $searchNodeElement = document.getElementById('nodeInput');
            let searchElements = this.#dots.find((n => n.node.TAGID == $searchNodeElement.value ));
            if(!!searchElements){
                searchElements.highlight.delete(this);
            }

            if (this.#pickedDotType === 0) this.#dots[this.#pickedDot].highlight.delete(this);
            if (this.#pickedDotType === 1) this.#gnodes[this.#pickedDot].highlight.delete(this);
            this.#pickedDot = -1;
        }
        if(zoom >= Constants.DRAW_SWICTH_LIMIT){
            let n = this.#dots.length;
            for (let i = 0; i < n && this.#pickedDot === -1; i++) { // Picking order should be inverse of drawing order
                let [dx, dy] = [
                    this.#dots[i].viewPosition[0] - evt.screenCoords[0]
                    ,this.#dots[i].viewPosition[1] - evt.screenCoords[1]
                ];
                this.#pickedDot = (dx * dx + dy * dy < this.#dots[i].radius * this.#dots[i].radius * this.#usrMag) ? i : -1;
                this.#pickedDotType = 0;
            }
        }
        if (this.#pickedDot === -1){
            const ret = Object.keys(this.#gnodes).find((gn)=>{
                const gg = this.#gnodes[gn];
                let [dx, dy] = [
                    gg.viewPosition[0] - evt.screenCoords[0]
                    ,gg.viewPosition[1] - evt.screenCoords[1]
                ];
                if(dx * dx + dy * dy < gg.radius * gg.radius * this.#viewport.projectWidth(1.0) * this.#viewport.projectWidth(1.0) * this.#usrMag) return true;
                return false;
            });
            if (ret !== undefined){
                this.#pickedDot = ret;
                this.#pickedDotType = 1;
            }
        }

        if (this.#pickedDot !== -1) {
            if(this.#pickedDotType === 0){
                this.#dots[this.#pickedDot].highlight.add(this);
            }
            else if(this.#pickedDotType === 1){
                this.#gnodes[this.#pickedDot].highlight.add(this);
            }            
        }
        actNodeList(this.#dots);
        return (this.#pickedDot !== -1); // Return true if node was picked, otherwise return false
    }

    getFocusedId(evt) {
        let focused = -1;
        if(this.#pickedDotType === 0){        
            let n = this.#dots.length;
            for (let i = 0; i < n; i++) { // Picking order should be inverse of drawing order
                const [dx, dy] = [
                    this.#dots[i].viewPosition[0] - evt.screenCoords[0],
                    this.#dots[i].viewPosition[1] - evt.screenCoords[1]
                ];
                focused = (dx * dx + dy * dy < this.#dots[i].radius * this.#dots[i].radius) ? i : focused;
            }
        }
        else if(this.#pickedDotType === 1){
            const ret = Object.keys(this.#gnodes).find((gn)=>{
                const gg = this.#gnodes[gn];
                const [dx, dy] = [
                    gg.viewPosition[0] - evt.screenCoords[0],
                    gg.viewPosition[1] - evt.screenCoords[1]
                ];
                if(dx * dx + dy * dy < gg.radius * gg.radius * this.#viewport.projectWidth(1.0) * this.#viewport.projectWidth(1.0)) return true;
                return false;
            });
            focused = (ret !== undefined) ? ret : focused;
        }
        return focused;
    }

    onmousedown(evt) {
        if (!this.dragging) {
            if (evt.button === 0 && this.#pickedDot !== -1) {
                this.dragging = true;
                return true; // Event consumed
            }
        }
        return false; // Event not consumed
    }

    onmouseup(evt) {
        if (this.dragging) {
            if (evt.button === 0) {
                if (!evt.shiftKey) (this.#pickedDotType === 0) ? this.layout.unfixNode(this.#pickedDot) : this.layout.unfixGnode(this.#pickedDot);
                delete this.dragging;

                return true; // Event consumed
            }
        }
        return false;
    }

    onmousemove(evt) {
        if (this.dragging) {
            if (this.#pickedDotType === 0) this.layout.fixNode(this.#pickedDot, evt.worldCoords[0], evt.worldCoords[1])
            else if (this.#pickedDotType === 1) this.layout.fixGnode(this.#pickedDot, evt.worldCoords[0], evt.worldCoords[1]);
        // }else{
        //     if(this.#pickedDotType === 0) this.#tooltip.textContent = this.#dots[this.getFocusedId(evt)].node['category'];
        //     this.#tooltip.style.top = (evt.pageY - 20) + "px";
        //     this.#tooltip.style.left = (evt.pageX + 10) + "px";
        }
        return true; // Event consumed
    }

    onclose() {
        this.#dots.forEach(dot => dot.highlight.delete(this));
        Obeject.values(this.#gnodes).forEach(gg => gg.highlight.delete(this));
    }

    update(time) {
        let needUpdate = false;

        if (this.doLayout) {
            needUpdate = this.layout.update(time);
        }
        this.#dots.forEach(d=>d.worldPosition.animate([d.x, d.y]));
        // should be added composite nodes.
        Object.values(this.#gnodes).forEach(m => m.worldPosition.animate([...m.center]));
        needUpdate = this.#dots.reduce((r,d)=>{r = d.worldPosition.update(time) || r; return r;},false);
        Object.values(this.#gnodes).forEach(m=>{
            needUpdate = m.worldPosition.update(time) || needUpdate;
        })
        this.project();
        return true;
        // return needUpdate;
    }

    onclick(evt) {
        if(this.#pickedDotType === 0) this.#infoView.innerHTML = fromNodetoString(this.#dots[this.#pickedDot].node);
  }

    project() {
        let n = this.#dots.length;
        while (n--) {
            const p = this.#viewport.project(this.#dots[n].worldPosition.value);
            [...this.#dots[n].viewPosition] = [...p];
        }
        for (let g in this.#groups.subgroup) {
            const p = this.#viewport.project(this.#groups.getWorldPosition(g));
            [...this.#groups.subgroup[g].viewPosition] = [...p];
            //this.#groups.setZoom(this.#viewport.projectWidth(1));
        }
        //this.#gnodes.zoom = (this.#viewport.projectWidth(1));
        Object.keys(this.#gnodes).forEach(g=>{
            const p = this.#viewport.project(this.#gnodes[g].worldPosition.value);
            [...this.#gnodes[g].viewPosition] = [...p];
        });
    }

    drawLinks(gc) {
        gc.strokeStyle = (this.#viewtype == 'basegraph') ? Constants.COLOR_LINE_REGULAR : Constants.COLOR_LINE_EPIINFO_EDGE;
        gc.textBaseline = "middle";
        this.#links.forEach(e=>drawLink(gc, e));
    }

    drawSelectedLinks(gc, selectedEdges) {
        selectedEdges.forEach(e=>{
            gc.strokeStyle = this.#links[e].inLens ? Constants.COLOR_LINE_HIGHLIGHT : Constants.COLOR_LINE_REGULAR;
            drawLink(gc,this.#links[e]);
        })
    }

    drawDots(gc, zoom) {
        gc.lineWidth = Constants.LINE_WIDTH_NODE;
        gc.lineWidth = 2;
        //gc.font = (this.#viewtype === 'pomegraph') ? '10px sans serif' : '20px sans serif';
        let drawSize = this.#usrMag;
        let fontSize = this.#usrMagFont;
        gc.font = `${Constants.FONT_SIZE * fontSize}px sans-serif`;
        gc.textAlign = "center";
        gc.textBaseline = "middle";

        let i = this.#dots.length;

        while (i--) {
            let n = this.#dots[i];
            let domElement = document.getElementById('nodeList_'+ n.node.TAGID);
            //TODO このブロックはリファクタリング対象。

            // basegraph
            let $elementBaseGraph = document.getElementById("basegraph");
            if(!!$elementBaseGraph){
                //2 thread problem
                if(!$elementBaseGraph.hidden){
                    if(this.#viewtype == 'basegraph'){
                        /*if((n.isVisible == GraphicControl.GENOME_OVIS || n.isVisible == GraphicControl.BOTH_UNVISIBLE)
                        && !UIControl.getIsFullscreen() && this.#fileparts === UIControl.BOTH){*/
                        if((n.isVisible == GraphicControl.GENOME_OVIS || n.isVisible == GraphicControl.BOTH_UNVISIBLE) &&
                            ((UIControl.getIsFullscreen() && localStorage.getItem('import') == 1)
                                || (!UIControl.getIsFullscreen() && this.#fileparts === UIControl.BOTH))) {
                            if(!!domElement){
                                if(domElement.hasAttribute('class')){
                                    domElement.removeAttribute('class')
                                }
                                domElement.style.color = "blue";
                            }
                            continue;
                        }
                        else{
                            if(!!domElement){
                                if(domElement.hasAttribute('class')){
                                    domElement.removeAttribute('class');
                                    domElement.setAttribute('class', 'nodeList');
                                }
                                if(domElement.hasAttribute('style')){
                                    domElement.removeAttribute('style');
                                }
                            }
                        }
                    }
                }
            }

            // pomegraph
            let $elementPomegraph = document.getElementById("pomegraph");
            if(!!$elementPomegraph){
                //2 thread problem
                if(!$elementPomegraph.hidden){
                    if(this.#viewtype == 'pomegraph'){
                        if((n.isVisible == GraphicControl.EPI_OVIS || n.isVisible == GraphicControl.BOTH_UNVISIBLE) && 
                        ((UIControl.getIsFullscreen() && localStorage.getItem('import') == 1)
                        || (!UIControl.getIsFullscreen() && this.#fileparts === UIControl.BOTH)))
                        {
                            if(!!domElement){
                                //domElement.style.color = "red";
                                if(domElement.hasAttribute('style')){
                                    domElement.removeAttribute('style');
                                }
                                domElement.setAttribute('class', 'nodeListNonNode');
                            }
                            continue;
                        }
                        else{
                            if(!!domElement){
                                if(domElement.hasAttribute('style')){
                                    domElement.removeAttribute('style');
                                }
                                if(domElement.hasAttribute('class')){
                                    domElement.removeAttribute('class')
                                    domElement.setAttribute('class', 'nodeList');
                                }

                            }
                        }
                    }
                }
            }
            gc.strokeStyle = (n.highlight.size > 0) ? Constants.COLOR_LINE_HIGHLIGHT : Constants.COLOR_LINE_REGULAR;
            gc.fillStyle = n.color;
            // Specify highlight colour
            /*if(n.highlight.size > 0){
                gc.fillStyle = Constants.COLOR_LINE_HIGHLIGHT;
            }
            else{
                gc.fillStyle = n.node.originalColor;
            }*/
            visualEncoding(this);
            if (n.node["emphasize"]=="N"){
                gc.lineWidth = Constants.LINE_WIDTH_THIN;
                //gc.setLineDash([5,5])
            }else{
                //gc.setLineDash([])
                gc.lineWidth = Constants.LINE_WIDTH_NODE;
                /*if(gc.strokeStyle !== Constants.COLRO_LINE_HIGHLIGHT_16){
                    gc.strokeStyle = Constants.COLOR_LINE_EM;
                }*/
                gc.strokeStyle = Constants.COLOR_LINE_HIGHLIGHT;
            }
            if (zoom < Constants.DRAW_SWICTH_LIMIT){
                drawScalingDots(gc, n, zoom);
            //}else if (n.node.type === undefined || n.node.type[0]=="C"){
            }else if (n.node.type[0]=="T"){
            //    drawCircleDots(gc,n,drawSize, fontSize);
                drawTriangle(gc,n,drawSize, fontSize);
            // }else drawRoundedBox(gc,n,drawSize); //rounded square.
            //}else drawTriangle(gc,n,drawSize, fontSize); //rounded square.
            } else drawCircleDots(gc,n,drawSize, fontSize);
            gc.setLineDash([])
        }
    }

    draw(gc, grid) {
        const zoom = this.#viewport.projectWidth(1.0);
        this.drawLinks(gc); // Draw all edges
        this.drawDots(gc, zoom); // Draw all nodes
        if(this.#viewtype === 'pomegraph'){
            drawCompositeCircle(gc, this.gnodes, zoom, this.#dots, this.#fileparts); // Draw composite nodes.
            drawCompositeLink(gc, this.gnodes, this.gedges, zoom); // Draw composite links.
        }
        gc.drawImage(this.#wasd,0,0,276,270,10,10,150,150);
    }

    bounds() {
        let n = this.#dots.length;

        if (n === 0) return [-Constants.LAYOUT_EXTENT / 2, -Constants.LAYOUT_EXTENT / 2, Constants.LAYOUT_EXTENT, Constants.LAYOUT_EXTENT];

        let minX = this.#dots[0].x;
        let minY = this.#dots[0].y;
        let maxX = this.#dots[0].x;
        let maxY = this.#dots[0].y;
        while (n--) {
            if (this.#dots[n].x < minX) {
                minX = this.#dots[n].x;
            } else if (this.#dots[n].x > maxX) {
                maxX = this.#dots[n].x;
            }
            if (this.#dots[n].y < minY) {
                minY = this.#dots[n].y;
            } else if (this.#dots[n].y > maxY) {
                maxY = this.#dots[n].y;
            }
        }

        if (minX === maxX) {
            minX -= Constants.LAYOUT_EXTENT / 2;
            maxX += Constants.LAYOUT_EXTENT / 2;
        }
        if (minY === maxY) {
            minY -= Constants.LAYOUT_EXTENT / 2;
            maxY += Constants.LAYOUT_EXTENT / 2;
        }

        return [minX, minY, maxX - minX, maxY - minY];
    }
}

function actNodeList(dots){
    let $searchName = document.getElementById('nodeInput');
    const nodeLists = document.querySelectorAll('.nodeList');
    let $infoView = document.getElementById('nodeInfo');
    nodeLists.forEach(node => {
        node.addEventListener("click", () => {
            $searchName.value = node.text;
            let dot = dots.find(d => d.node.TAGID === node.text);
            $infoView.innerHTML =  fromNodetoString(dot.node);
        })});
    const NoViewNodeLists = document.querySelectorAll('.nodeListNonNode');
    NoViewNodeLists.forEach(node => {
        node.addEventListener("click", () => {
            $searchName.value = node.text;
            let dot = dots.find(d => d.node.TAGID === node.text);
            $infoView.innerHTML =  fromNodetoString(dot.node);
        })});
}