import {GraphicControl} from "./GraphicControl.js";
import {Graph} from "../base/Graph.js";
import {UIControl} from "../base/UIControl.js";
import {Constants} from "../base/Constants.js";
import {fromNodetoString, visualEncoding} from "./PrimitiveDraw.js";
import { myFileReader} from "./FileReader.js";
import {InsertDescription} from "../base/Description.js"
import {drawBarChart} from "./Histogram";

export class FileReader extends myFileReader {};

export class iGraph extends UIControl {

    static graph;

    #frame = 0;
  
    constructor(containerId, options) {
        super(containerId, options);
    }

    get interactables() {
        return [this.nodeLink];
    }

    get fileparts() {
        return super.fileparts;
    }

    data(graph) {
        this.nodeLink = (super.containerId == 'basegraph') ?
            new GraphicControl(graph, this.viewport, 'basegraph')
            : new GraphicControl(graph, this.viewport, 'pomegraph');
        this.nodeLink.fileparts = graph.fileparts;
        this.graph = graph;
        this.reset();
        //TODO 一時的に…ここで大丈夫？。
        if(this.nodeLink.fileparts === UIControl.EXCEL || this.nodeLink.fileparts === UIControl.BOTH) {
            if(!UIControl.getIsFullscreen()){
                drawBarChart(this.nodeLink);
            }
        }
    }

    init(container, options) {
        this.data(Graph.emptyGraph());
        if(!options.fullscreen){
            ['graph','import','update', 'color', 'nexus', 'identical']
            .forEach((item) => localStorage.removeItem(item)); // Clear all localStrages.
        }
        // FileReader.loadSampleJSON('dummy');
        if(!UIControl.getIsFullscreen()){
            FileReader.makeFileList();
        }
    }

    ui(container, options, contralContainer) {

        const $btn = { // The buttons to control IGraph
            reset: document.getElementById("crosshairs"),
            zoomin: document.getElementById("searchPlus"),
            zoomout: document.getElementById("searchMinus"),
            pan: document.getElementById("expand"),
        };
        //console.log($btn);
        $btn.reset.addEventListener("click", () => {
            this.reset();
        });

        $btn.zoomin.addEventListener("click", () => {
            this.viewport.scale(Constants.ZOOM_WHEEL_FACTOR);
            this.requestUpdate();
        });

        $btn.zoomout.addEventListener("click", () => {
            this.viewport.scale(1 / Constants.ZOOM_WHEEL_FACTOR);
            this.requestUpdate();
        });

        $btn.pan.addEventListener("click", () => {
            //console.log(this.graph.json); 
            let openFlg = false
            /*let win = (super.containerId == 'basegraph') ? window.open('/BaseGraph.html', '_blank') :
                    window.open('/PomeGraph.html', '_blank');*/
            //2 thread problem
            let $elementBaseGraph = document.getElementById("basegraph"); 
            if(!$elementBaseGraph.hidden && super.containerId == 'basegraph'){
                // localStorage.setItem('graph', JSON.stringify(this.graph.json));
                (this.grid.active === true) ? localStorage.setItem('grid', JSON.stringify({"grid": "active"}))
                                            : localStorage.setItem('grid', JSON.stringify({"grid": "inactive"}));

                if(this.graph.fileparts === UIControl.BOTH){
                    localStorage.setItem('import', 1);
                }
                else{
                    localStorage.setItem('import', 0);
                }
                window.open('dist/html/BaseGraph.html', '_blank');
            }
            let $elementPomegraph = document.getElementById("pomegraph");
            //2 thread problem
            if(!$elementPomegraph.hidden && super.containerId == 'pomegraph'){
                // localStorage.setItem('graph', JSON.stringify(this.graph.json));
                (this.grid.active === true) ? localStorage.setItem('grid', JSON.stringify({"grid": "active"}))
                                            : localStorage.setItem('grid', JSON.stringify({"grid": "inactive"}));
                
                if(this.graph.fileparts === UIControl.BOTH){
                    localStorage.setItem('import', 1);
                }
                else{
                    localStorage.setItem('import', 0);
                }
                window.open('dist/html/PomeGraph.html', '_blank');
            }
        });

        if(!UIControl.getIsFullscreen()){
            InsertDescription();
        }
        
        // search Node.
        let $searchNodeClick = document.getElementById('nodeSearch');
        $searchNodeClick.addEventListener('click', ()=>{
            let $searchTypeRadio = document.getElementsByName('radio1');
            let len = $searchTypeRadio.length;
            let checkValue = '';
            for(let i = 0 ; i < len; i++){
                if($searchTypeRadio.item(i).checked){
                    checkValue = $searchTypeRadio.item(i).value;
                    break;
                }
            }
            // Perfect Matching
            if(checkValue == '1'){
                let $nodeName = document.getElementById('nodeInput');
                let $infoView = document.getElementById('nodeInfo');
                let searchElements = this.nodeLink.dots.find((n => n.node.TAGID == $nodeName.value ));
                if(!!searchElements == false){
                    return;
                }
                if(searchElements.isVisible === GraphicControl.BOTH_UNVISIBLE || (super.containerId == 'pomegraph' && searchElements.isVisible === GraphicControl.EPI_OVIS)){
                    this.reset();
                    return;
                }
                $infoView.innerHTML = fromNodetoString(searchElements.node);
                let [wx,wy] = [searchElements.x, searchElements.y]; // world coord
                searchElements.highlight.add(this.nodeLink);
                this.viewport.center(wx,wy);
                this.requestUpdate();
            }
            // Partial Matching
            else{
                let $nodeName = document.getElementById('nodeInput');
                let reg = new RegExp($nodeName.value, 'g');
                let searchElements = this.nodeLink.dots.filter((n => n.node.TAGID.match(reg)));
                if(!!searchElements == false){
                    return;
                }
                var src = "";
                let i = 0;
                searchElements.forEach(function(nodes){
                    if(i >= Constants.NODE_SEARCH_MAX){
                        return true;
                    }
                    let tagID = nodes.node["TAGID"];
                    src += '<a href="javascript:void(0)" class="searchResultNodeList" id="searchResultNodeList_' + tagID + '">';
                    //src += '<svg class="bi me-2" width="16" height="16"><use xlink:href="#grid"/></svg>'
                    src += nodes.node["TAGID"] + "</a><br/>";
                    i++;
                });
                let $SearchResult = document.getElementById('SearchResult');
                $SearchResult.innerHTML = src;

                let $searchName = document.getElementById('nodeInput');
                    const nodeLists = document.querySelectorAll('.searchResultNodeList');
                    let $infoViewSearch = document.getElementById('nodeInfo');
                    nodeLists.forEach(node => {
                        node.addEventListener("click", () => {
                            $searchName.value = node.text;
                            let dot = this.nodeLink.dots.find(d => d.node.TAGID === node.text);
                            $infoViewSearch.innerHTML =  fromNodetoString(dot.node);
                            $searchTypeRadio.item(0).checked = true;
                        })});

                /*const nodeLists = document.querySelectorAll('.searchResultNodeList');
                nodeLists.forEach(node => {
                    node.addEventListener("click", () => {
                        let searchElements = this.nodeLink.dots.find((n => n.node.TAGID == node.text));
                        let [wx,wy] = [searchElements.x, searchElements.y]; // world coord
                        searchElements.node.highlight.add(this.nodeLink);
                        this.viewport.center(wx,wy);
                        this.requestUpdate();
                })});*/

            }
        });

        // output JSON file.
        let $outputJson = document.getElementById('outputJson');
        $outputJson.addEventListener('click', ()=>{
            let $elementBaseGraph = document.getElementById("basegraph"); 
            //2 thread problem
            if(!$elementBaseGraph.hidden && super.containerId == 'basegraph'){
                outputJson(this.graph);
            }
            let $elementPomegraph = document.getElementById("pomegraph");
            //2 thread problem
            if(!$elementPomegraph.hidden && super.containerId == 'pomegraph'){
                outputJson(this.graph);
            }
        });

        //slider Control. min:0.5x max:2.0x
        let $sliderElement = document.getElementById('slider');
        $sliderElement.addEventListener('input', ()=>{
            let sliderValue = $sliderElement.value;
            let val = Math.pow(2,sliderValue/50-1); // y = 2^(x/50-1)
            this.nodeLink.usrMag = val;
            this.requestUpdate();
        });

        let $sliderElementFont = document.getElementById('sliderFont');
        $sliderElementFont.addEventListener('input', ()=>{
            let sliderValue = $sliderElementFont.value;
            let val = Math.pow(2,sliderValue/50-1); // y = 2^(x/50-1)
            this.nodeLink.usrMagFont = val;
            this.requestUpdate();
        });

        let $menu = document.createElement('div')
        $menu.classList.add("igraph-buttons")

        // Modal Closed Event
        let $modals = document.getElementsByTagName('body');
        for(var modal of $modals){
            modal.addEventListener('hidden.bs.modal', () => {
                modal.removeAttribute('style');
            });
        }

        let $switch = document.getElementById('switch')
        $switch.addEventListener('click', () =>{
            let $elementBaseGraph = document.getElementById("basegraph"); 
            if(!!$elementBaseGraph){
                //2 thread problem
                if(!$elementBaseGraph.hidden && super.containerId == 'basegraph'){
                    $switch.classList.toggle("on");
                    this.grid.activeRow = !this.grid.activeRow;
                    this.requestUpdate();
                }
            }
        });

        if(!options.fullscreen){
            let $canvasToggle = document.getElementById('canvasToggle');
            $canvasToggle.addEventListener('click', ()=>{
                if(super.containerId == 'basegraph'){
                    let histogram = document.getElementById('histogram');
                    histogram.hidden = !histogram.hidden;
/*                    let $histogram = document.getElementById('histogram');
                    let $graphCanvasLegendary = document.getElementById('graphCanvasLegendary');
                    if ($histogram.hidden) {
                        $graphCanvasLegendary.hidden = false;
                        $graphCanvasLegendary.setAttribute('style', 'height: 700px;');
                        $histogram.hidden = false;
                        $histogram.setAttribute('style', 'height: 700px;')
                    } else {
                        $histogram.hidden = true;
                        $graphCanvasLegendary.hidden = true;
                        $histogram.removeAttribute('style');
                        $graphCanvasLegendary.removeAttribute('style');
                    }*/
                }
            });
        }

        window.addEventListener("resize", function(){
            if(!options.fullscreen){
                graphResize();
            }
        });

        function graphResize(){
            let $canView = document.getElementById('canView');
            let h = $canView.offsetHeight;
            let w = $canView.offsetWidth;

            let $basegraph_cav = document.getElementById('basegraph_cav');
            $basegraph_cav.width = w;
            $basegraph_cav.height = h;

            let $pomegraph_cav = document.getElementById('pomegraph_cav');
            $pomegraph_cav.width = w;
            $pomegraph_cav.height = h;

            $basegraph_cav.style.width = w + 'px';
            $basegraph_cav.width = w * window.devicePixelRatio;
            $basegraph_cav.height = h * window.devicePixelRatio;

            $pomegraph_cav.style.width = w + 'px';
            $pomegraph_cav.width = w * window.devicePixelRatio;
            $pomegraph_cav.height = h * window.devicePixelRatio;
        }

        function outputJson(graph){
            var d = new window.Date();
            
            var Year = d.getFullYear();
            var Month = d.getMonth()+1;
            var Date = d.getDate();
            var Hour = d.getHours();
            var Min = d.getMinutes();
            var Sec = d.getSeconds();
        
            let fileName = Year + "-" + Month + "-" + Date + "-" + Hour + "-" + Min + "-" + Sec;

            const blob = new Blob([JSON.stringify(graph.json)],{type:"application/json"});
            let link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${fileName}.json`;
            link.click();
        }
    }

    reset() {
        let bounds = this.nodeLink.bounds();
        this.viewport.fitToView(bounds, true, true);
        this.requestUpdate();
    }

    update(time) {
        let needUpdate = this.nodeLink.update(time);
        /*this.#frame++;*/

        this.gc.clearRect(this.window.x, this.window.y, this.window.width, this.window.height);
        if(super.containerId === 'basegraph'){
            this.grid.draw(this.gc, this.nodeLink)
        }
        this.nodeLink.draw(this.gc, this.grid);

        /*if (this.#frame % 2 == 0) {
            return;
        }*/
        // Request next animation frame if needed
        if (needUpdate) this.requestUpdate();
        this.watchLoad();
    }

    resize(width, height) {
        if (this.platform) this.platform.resize(width, height);
    }

    onkeypress(evt) {
        if (super.onkeypress(evt)) return true;

        /*switch (evt.key) {
            case '1':
                this.nodeLink.doSize = !this.nodeLink.doSize;
                visualEncoding(this.nodeLink);
                return true;
            case '2':
                this.nodeLink.doColor = !this.nodeLink.doColor;
                visualEncoding(this.nodeLink);
                return true;
            case '3':
                this.nodeLink.doWidth = !this.nodeLink.doWidth;
                visualEncoding(this.nodeLink);
                return true;
            case '4':
                this.nodeLink.doLayout = !this.nodeLink.doLayout;
                return true;
            case ' ':
                this.nodeLink.layout.jiggle(Constants.LAYOUT_EXTENT);
                return true;
        }*/
        return false; // Event not consumed
    }
}