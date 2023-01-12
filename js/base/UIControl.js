import {Viewport} from "./Viewport.js";
import { TimeGrid } from "./TimeGrid.js";
import {RadialGrid} from "./RadialGrid.js";
import {JSONGraph} from "./Graph.js";
import {drawBarChart} from "../iGraph/PrimitiveDraw";
import {makeLegendaryCanvas} from "../iGraph/Histogram";
//import {ExcelJs} from "./ExcelImport.js";
//import { Newick } from "./TreeImport.js";
//import { DistMatrix } from "./DistProc.js";

export class UIControl {

    #containerId;
   //#fileparts;
    static EXCEL=1;
    static TREE=2;
    static BOTH=3;

    #isFullscreen = false;

    static sIsFullscreen = false;

    static debugMode = false;

    static legendary = new Array();

    static KEY_EVENTS = ['keypress', 'keydown'];
    static MOUSE_EVENTS = ['mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'wheel', 'click', 'dblclick'];
    static TOUCH_EVENTS = ['touchstart', 'touchend', 'touchmove', 'touchcancel'];

    static EVENTS = [...UIControl.KEY_EVENTS, ...UIControl.MOUSE_EVENTS, ...UIControl.TOUCH_EVENTS];

    constructor(containerId, options) {
        this.#containerId = containerId;
        const container = document.getElementById(containerId);
        this._init(container, options);
    }

    get interactables() {
        throw "App must implement interactables getter.";
    }

    get containerId() {
        return this.#containerId;
    }

    // get fileparts() {
    //     return this.#fileparts;
    // }

    static getIsFullscreen(){
        return this.sIsFullscreen;
    }
    static setIsFullscreen(sIsFullscreen){
        this.sIsFullscreen = sIsFullscreen;
    }

    static getDebugMode(){
        return this.debugMode;
    }
    static setDebugMode(debugMode){
        this.debugMode = debugMode;
    }

   load() {
        const $nodeList = document.getElementById("nodeList");
        const graph = new JSONGraph(localStorage.getItem('graph'));
            // makeNodeList　moved from ExcelImport.js
        function makeNodeList(json){
            var src = "";
            //let i = 1;
            json.forEach((node) => {
                let tagID = node["TAGID"];
                src += '<a href="javascript:void(0)" class="nodeList" id="nodeList_' + tagID + '">';
                //src += '<svg class="bi me-2" width="16" height="16"><use xlink:href="#grid"/></svg>'
                src += node["TAGID"] + "</a><br/>";
            //    i++;
            });
            $nodeList.innerHTML = src;
            return;
        }
        function makeLegendaryList(){
            if(!UIControl.getIsFullscreen()){
                let $legendary = document.getElementById('legendary');
                let src = "";
                UIControl.legendary.forEach(obj => {
                    let color = obj.color;
                    src += `<span style = "display: inline-block; border-radius: 50%; background: ${color}; width: 20px;height: 20px"></span>: ${obj.association} : ${obj.sum}人<br/>`
                });
                $legendary.innerHTML = src;
                localStorage.setItem('legendary', src);
            }
            else{
                let $legendary = document.getElementById('legendary');
                let src = localStorage.getItem('legendary');
                $legendary.innerHTML = src;
            }
        }
        graph.load()
            .then(graph => {
                if(graph.msg !== "" && !this.#isFullscreen){
                    //document.getElementById('modal-body').appendChild(document.createTextNode(graph.msg));
                    let modalbody = document.getElementById('modal-body');
                    modalbody.innerHTML = graph.msg;
                    let notice = new bootstrap.Modal(document.getElementById('exampleModal'));
                    notice.show();
                    setTimeout(() => {
                        notice.hide();
                    }, 30000);
                }
                this.data(graph);
                if(!UIControl.getIsFullscreen()){
                    if (this.graph.json !== undefined) makeNodeList(this.graph.json.nodes);
                }
                makeLegendaryList();
                //makeLegendaryCanvas(UIControl.legendary);
                //this.#fileparts = graph.fileparts;
                if (this.#containerId == "basegraph") this.grid.active = true; // Radar grid is incative by default. 
            })
            .catch(error => {
                console.log(error);
            });
    }

    _init(container, options) {
        this.requestID = 0;
        //container.innerHTML = "";
        this.canvas = document.getElementById(this.#containerId+"_cav"); // Create canvas element
        this.canvas.tabIndex = -1; // Necessary to be able to receive key events for the canvas
        this.window = (canvas => ({
            get x() {
                return 0;
            },
            get y() {
                return 0;
            },
            get width() {
                return canvas.width;
            },
            get height() {
                return canvas.height;
            }
        }))(this.canvas);

        this.viewport = new Viewport(this.window);
        this.grid = (this.#containerId == "basegraph") ?
            new TimeGrid(this.viewport)
            : new RadialGrid(this.viewport);
        if(options.fullscreen){
            UIControl.setIsFullscreen(true);
        } 
        this.init(container, options); // Call init function of sub-class
        this.ui(container, options); // Call ui function of sub-class
        this.gc = this.gc || this.canvas.getContext("2d");
        this.gc.scale(window.devicePixelRatio, window.devicePixelRatio);

        container.appendChild(this.canvas);

        if (options.fullscreen) {
            this.#isFullscreen = true;
            document.body.classList.add("igraph-fullscreen");
            container.classList.add("igraph-fullscreen");
            this.canvas.classList.add("igraph-fullscreen");
            //console.log(localStorage.getItem('graph'));
            this.grid.active = (JSON.parse(localStorage.getItem('grid')).grid === "active" ) ? true : false;
            window.addEventListener('resize', () => this._resize());
            this.load();

            this._resize();
        } else {
            this.grid.active = false; // Both grid is incative by default.  
            let $canView = document.getElementById('canView');
            let w = $canView.offsetWidth;
            this.canvas.width = w * window.devicePixelRatio;
            this.canvas.height = options.height * window.devicePixelRatio;
            this.canvas.style.width = w + 'px';
            this.canvas.style.height = options.height + 'px';
            this.resize(this.canvas.width, this.canvas.height);

            let $histgram = document.getElementById('graphCanvas');
            $histgram.width = w * window.devicePixelRatio;
            $histgram.height = options.height * window.devicePixelRatio;
            $histgram.style.width = w + 'px';
            $histgram.style.height = options.height + 'px';
            this.resize($histgram.width, $histgram.height);

        }

        this.canvas.oncontextmenu = () => false; // By default, the context menu is suppressed

        let locked = null;
        UIControl.EVENTS.forEach(type => {
            const handler = 'on' + type;

            if (UIControl.KEY_EVENTS.includes(type)) {
                // Attach key event handlers to the canvas
                this.canvas.addEventListener(type, evt => {
                    // console.log(evt.type, evt.target);
                    // evt.preventDefault();
                    if (evt.key === "Tab") evt.preventDefault(); // prevent focus change, so "Tab" can be used multiple times as event key

                    let interactables = [...this.interactables, this.viewport, this]; // Collect interactables from sub-classes and append viewport and this base class
                    let handledBy = null;
                    interactables.forEach(interactable => {
                        if (handledBy === null && interactable[handler] && interactable[handler](evt)) {
                            handledBy = interactable;
                        }
                    });
                    if (handledBy !== null) this.requestUpdate(); // Request an update if an interactable handled the event
                });
            } else if (UIControl.MOUSE_EVENTS.includes(type)) {
                // Attach mouse event handler to the window
                window.addEventListener(type, evt => {
                    // console.log(evt.type, evt.target);
                    if (evt.target === this.canvas) this.canvas.focus(); // Give the canvas the key focus to be able to receive key events
                    if (evt.target !== this.canvas && !locked) return; // Only treat events on the canvas, unless mouse interaction has been locked, in which case locked should be the interactable that is responsible
                    evt.preventDefault();

                    const clientRect = this.canvas.getBoundingClientRect();
                    evt.screenCoords = [window.devicePixelRatio * (evt.clientX - clientRect.left), window.devicePixelRatio * (evt.clientY - clientRect.top)];
                    evt.worldCoords = this.viewport.unproject(evt.screenCoords);

                    let interactables = locked ? [locked] : [...this.interactables, this.viewport, this]; // Either treat only the locked interactable or all interactables
                    let handledBy = null;
                    interactables.forEach(interactable => {
                        if (handledBy === null && interactable[handler] && (locked || interactable.pick(evt)) && interactable[handler](evt)) {
                            handledBy = interactable;

                            // To be able to handle drag operations, the responsible interactable needs to be locked during the drag operation
                            // Without locking, an interactable could lose the drag operation as a call to pick might return false, which would indicate
                            // that the interactable is not interested in the event.

                            if (type === 'mousedown' && !locked) locked = interactable; // Lock on interactable when a button goes down
                            if (type === 'mouseup' && locked === interactable) locked = null; // Unlock from interactable when button is released
                        }
                    });
                    this.requestUpdate(); // Request an update on every mouse event
                }, {passive: false}); // {passive: false} is required for evt.preventDefault() to work correctly for wheel events
            }
        });
    }

    _resize() {
        const wasEnlarged = (this.canvas.width < window.innerWidth || this.canvas.height < window.innerHeight);
        this.canvas.width = window.innerWidth * window.devicePixelRatio;
        this.canvas.height = window.innerHeight * window.devicePixelRatio;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.viewport.fitToView(this.viewport.bounds.slice(), false, wasEnlarged);

        this.resize(this.canvas.width, this.canvas.height); // Call resize function of sub-class

        this.requestUpdate();
    }

    data(graph) {
        throw "App must implement data(..).";
    }

    init(container, options) {
        throw "App must implement init(..).";
    }

    ui(container, options) {
        throw "App must implement ui(..).";
    }

    resize(width, height) {
        throw "App must implement resize(..).";
    }

    reset() {
        throw "App must implement reset().";
    }

    update(time) {
        throw "App must implement update(..).";
    }

    requestUpdate() {
        window.cancelAnimationFrame(this.requestID);
        this.requestID = window.requestAnimationFrame((time) => {
            let needUpdate = false;
            needUpdate = this.viewport.update(time) || needUpdate;
            needUpdate = this.update(time) || needUpdate;  // Call update function of sub-class
            // Request next animation frame if needed
            if (needUpdate) this.requestUpdate();
        });
    }

    watchLoad(){
        if(localStorage.getItem('update')){
            if(this.#containerId === 'basegraph'){
                this.load();
                localStorage.getItem('update') === 'false'? localStorage.removeItem('update') : localStorage.setItem('update', 'false');
            }
            if(this.#containerId === 'pomegraph'){
                this.load();
                localStorage.getItem('update') === 'false'? localStorage.removeItem('update') : localStorage.setItem('update', 'false');
            }
            
        }
    }

    refresh() {
        return this.requestUpdate.bind(this);
    }

    onkeypress(evt) {
        switch (evt.key) {
            /*case 'g':
                this.grid.active = !this.grid.active;
                return true;*/
            case 'r':
                this.reset();
                return true;
            case 'i':
                if(UIControl.getDebugMode()){
                    UIControl.setDebugMode(false);
                }     
                else{
                    UIControl.setDebugMode(true);
                }
                return true;
        }
        return false; // Event not consumed
    }

    // Stub Function.
    static getFilleType(){
        return this.fileparts;
    } 
}