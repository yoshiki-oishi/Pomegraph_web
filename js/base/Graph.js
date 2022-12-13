import { iGraph } from "../iGraph/iGraph.js";
import {Aggregator} from "./Aggregator.js";
import {DataTable} from "./DataTable.js";
import { DistMatrix } from "./DistProc.js";

export class Graph {

    static TAG = 0;
    static LINK = 1;
    static GNODE = 2;

    #nodes = [];
    #edges = [];
    #gnodes = [];
    #gedges = [];

    #labels = {
        [Graph.LINK]: {
            weight: 'Weight',
        },
        [Graph.TAG]: {
            degree: 'Degree',
        }
    };

    #listeners = new Set();

    constructor() {
        this.#nodes.max = {};
        this.#nodes.min = {};

        this.#edges.max = {};
        this.#edges.min = {};

        this.#gnodes.max = {};
        this.#gnodes.min = {};        
    }

    get nodes() { return this.#nodes; }
    get edges() { return this.#edges; }
    get gnodes() { return this.#gnodes; }
    get labels() { return this.#labels; }
    get gedges() { return this.#gedges; }

    static emptyGraph() {
        const g = new Graph();
        g.prepare([], [], []);
        return g;
    }

    register(l) {
        this.#listeners.add(l);
    }

    unregister(l) {
        this.#listeners.delete(l);
    }

    onchange(type, target, attr, old, value) {
        this.#listeners.forEach(l => l(type, target, attr, old, value));
    }

    prepare(_nodes, _edges, _gnodes, _gedges) {

        // Proxy handler to intercept property changes of nodes and edges
        let handler = (graph, type) => ({
            set(target, p, value, receiver) {
                // console.log(`Changed node value ${p} to ${value}.`);
                let old = target[p];
                target[p] = value;
                graph.onchange(type, target, p, old, value);
                return true;
            }
        });

        let msg = ""; // return message string.
        // Install proxy to trap value changes (don't use aggromative call such as reduce()!)        
        this.#nodes.length = 0;
        if(!!_nodes){
            for (let i = 0; i < _nodes.length; i++) {
                this.#nodes[i] = new Proxy(_nodes[i], handler(this, Graph.TAG));
            }
        }

        this.#edges.length = 0;
        if(!!_edges){
            for (let i = 0; i < _edges.length; i++) {
                this.#edges[i] = new Proxy(_edges[i], handler(this, Graph.LINK));
            }
        }

        this.#gnodes.length = 0;
        if(!!_gnodes){
            for (let i = 0; i < _gnodes.length; i++) {
                this.#gnodes[i] = new Proxy(_gnodes[i], handler(this, Graph.GNODE));
            }
        }

        this.#gedges.length = 0;
        if(!!_gedges){
            _gedges.forEach(e=>this.gedges.push(e));
        }
        
        // Initializers.
        if (this.#nodes.length <= 0){
            msg = "No any nodes were loaded."
        }else{
            this.#nodes.forEach((node, i) => {
                node.index = i;
                node.edges = [];
                node.neighbors = [];
                node.type = "CD";
                node.degree = 0;
                node.highlight = new Set(); // Global flag for node highlighting
            });
        }
        if (this.#edges.length <= 0){
            msg = "No any edges were loaded."
        }else{        
            this.#edges.forEach((edge, i) => {
                let weight = edge.val !== "undefined" ? edge.val : 1;
                if(edge.src !== -1 && edge.dst !== -1){
                    let n = this.#nodes[edge.src]; // The source node

                    n.edges.push(i);  // Store index of incident edge at source node
                    n.neighbors.push(edge.dst);  // Store index of source node as neighbor of destination node
                    n.degree++; // Increment degree of source node

                    n = this.#nodes[edge.dst]; // The destination node
                    n.edges.push(i); // Store index of incident edge at destination node
                    n.neighbors.push(edge.src); // Store index of destination node as neighbor of source node
                    n.degree++; // Increment degree of destination node

                    edge.index = i;
                    edge.source = this.#nodes[edge.src];
                    edge.target = this.#nodes[edge.dst];
                    edge.weight = weight;
                    edge.highlight = new Set(); // Global flag for edge highlighting
                }else if(edge.src === undefined || edge.dst === undefined){
                    this.#edges.splice(i,1); // remove broken edge.
                    msg = "Some link information are not proper. Check it please."
                }
            });
        }

        const attrs = (entities) => [...entities.reduce((set, entity) => { // Collect attrs in a set and return elements as array
            Object.keys(entity).forEach((attr) => set.add(attr));
            return set;
        }, new Set())];

        const nodeattrs = attrs(this.#nodes);
        this.#nodes.forEach(node => nodeattrs.forEach(attr => node[attr] = (node[attr] !== undefined) ? node[attr] : -0)); // Set NULL values, -0 can be tested with Object.is(o, -0)

        const edgeattrs = attrs(this.#edges);
        this.#edges.forEach(edge => edgeattrs.forEach(attr => edge[attr] = (edge[attr] !== undefined) ? edge[attr] : -0)); // Set NULL values, -0 can be tested with Object.is(o, -0)

        const gnodeattrs = attrs(this.#gnodes);
        this.#gnodes.forEach(gnode => gnodeattrs.forEach(attr => gnode[attr] = (gnode[attr] !== undefined) ? gnode[attr] : -0)); // Set NULL values, -0 can be tested with Object.is(o, -0)

        this.aggregator = new Aggregator(this, nodeattrs, edgeattrs, gnodeattrs);
        this.min = this.aggregator.min;
        this.max = this.aggregator.max;

        return msg;
    } // end of prepare().

/*
    subgraph(entitytype, sub) { // sub either holds nodes or edges for deriving a subgraph
        let graph = new Graph();

        let subnodes, subedges;

        if (entitytype === Graph.TAG) { // Set of sub nodes is given, find the corresponding edges
            subnodes = sub;

            let nodeIndexMap = []; // Mapping of original node indices to new indices in subgraph
            subnodes.forEach((n, i) => {
                nodeIndexMap[n.index] = i;
            });

            subedges = [];
            this.edges.forEach(e => {
                if (nodeIndexMap[e.src] !== undefined && nodeIndexMap[e.dst] !== undefined) { // Find all edges incident to subnodes
                    // Create proxies for edges with new node index mapping
                    e = new Proxy(e, {  // Clone edge
                        get(target, p, receiver) {
                            if (p === 'src') return nodeIndexMap[target.src]; // Resolve node index mapping
                            if (p === 'dst') return nodeIndexMap[target.dst];
                            return target[p];
                        }
                    });
                    subedges.push(e);
                }
            });
        } else if (entitytype === Graph.LINK) { // Set of sub edges is given, collect the corresponding nodes
            let n = new Set();
            sub.forEach(edge => {
                n.add(edge.source);
                n.add(edge.target);
            });
            subnodes = [...n];

            let nodeIndexMap = []; // Mapping of original node indices to new indices in subgraph
            subnodes.forEach((n, i) => {
                nodeIndexMap[n.index] = i;
            });

            subedges = [];
            sub.forEach(e => {
                // Create proxies for edges with new node index mapping
                e = new Proxy(e, {  // Clone edge
                    get(target, p, receiver) {
                        if (p === 'src') return nodeIndexMap[target.src]; // Resolve node index mapping
                        if (p === 'dst') return nodeIndexMap[target.dst];
                        return target[p];
                    }
                });
                subedges.push(e);
            });
        } else {
            throw "Either sub.nodes or sub.edges must be provided to subgraph!"
        }

        // Set nodes and edges of subgraph
        graph.#nodes = subnodes;
        graph.#edges = subedges;

        // Delegate all subgraph functionality to original graph (to avoid subgraphs of subgraphs)
        graph.#labels = this.#labels;
        graph.aggregator = this.aggregator;
        graph.min = this.min;
        graph.max = this.max;
        graph.subgraph = this.subgraph;

        return graph;
    }
*/

    entities(type = Graph.TAG) {
        //return (type === Graph.TAG) ? this.nodes : this.edges;
        switch (type) {
            case Graph.TAG:
                return this.nodes;
            case Graph.LINK:
                return this.edges;
            case Graph.GNODE:
                return this.gnodes;
        }
    }

    data(attr, type = Graph.TAG) {
        let labels = attr.map(a => this.labels[type][a]);
        //return (type === Graph.TAG) ? new DataTable(this.nodes, attr, labels, this.aggregator.nodes) : new DataTable(this.edges, attr, labels, this.aggregator.edges);
        switch (type) {
            case Graph.TAG:
                return new DataTable(this.nodes, attr, labels, this.aggregator.nodes);
            case Graph.LINK:
                return new DataTable(this.edges, attr, labels, this.aggregator.edges);
            case Graph.GNODE:
                return new DataTable(this.gnodes, attr, labels, this.aggregator.gnodes);
        }
    }

    normalize(o, attrs) {
        return attrs.reduce((n, attr) => {
            let min = this.min.node[attr];
            let max = this.max.node[attr];
            let range = max - min;
            n[attr] = (range !== 0) ? (o[attr] - min) / range : 0;
            return n;
        }, {});
    }
}

export class JSONGraph extends Graph {

    #json_in;
    #fileparts;

    constructor(json){
        super();
        this.#json_in = JSON.parse(json);
        this.json = {};
    }

    get fileparts(){
        return this.#fileparts;
    }
//@ readJSON
//@ return: [0=EXCEL,1=TREE,2=BOTH]
    readJson() {
        let retval = 0;
        if (!!this.#json_in.nodes) {
            this.json.nodes = this.#json_in.nodes;
        } else {
            console.log("Graph::readJSON json.nodes is empty.");
        }
        if (!!this.#json_in.edges) { this.json.edges = this.#json_in.edges; retval |= iGraph.EXCEL; }
        if (!!this.#json_in.gnlist) {
            if (!!this.#json_in.epi) {
                this.json.epi = this.#json_in.epi;
            } else { 
                console.log("Graph::readJSON json.epi is empty.");
            }
            this.json.gnlist = this.#json_in.gnlist; retval |= iGraph.TREE;
            this.json.gnlist.forEach(v=>v.subs = v.length);// append substitution counts.
            this.json.gelist = this.#json_in.gelist;
        }
        return retval;
    }

// var EpiJson;
// var GenomeJson;

    readJson_prev(){
        if(!!this.#json_in.tree){ // Excel input.
            this.json.edges = this.#json_in.edges;
            if(GenomeJson){// keep current edges. 
                // combine information.
                let comb_df = this.#json_in.nodes.map(
                    anObj1 => ({
                        ...GenomeJson.epi.find(
                            anObj2 => anObj1["SEQID"] === anObj2["SEQID"]
                        ), ...anObj1
                    })
                );
                this.json.nodes = comb_df; // leave stored gnodes.
                this.json.tree = GenomeJson.tree;
            }else{
                this.json.nodes = this.#json_in.nodes;
                this.json.tree = [];
            }
            EpiJson = this.#json_in; // store original json.
            return iGraph.EXCEL;

        }else if(!!this.#json_in.edges){// Newick input.
            this.json.tree = this.#json_in.tree;
            this.json.tree.forEach(v=>v.subs = DistMatrix.getSubstCount(this.#json_in.dist, v.length));// append substitution counts.
            if(EpiJson){
                // combine information.
                let comb_df = EpiJson.nodes.map(
                    anObj1 => ({
                        ...this.#json_in.epi.find(
                            anObj2 => anObj1["SEQID"] === anObj2["SEQID"]
                        ), ...anObj1
                    })
                );
                this.json.nodes = comb_df;
                this.json.edges = EpiJson.edges;
            }else{
                this.json.nodes = this.#json_in.nodes; // Override when only newick data.
                this.json.edges = [];
            }
            GenomeJson = this.#json_in; // store original json.
            return iGraph.TREE;

        }else{ // New window contain a staff [attr] = Array(0), thus all attrs true.
            this.json = this.#json_in;

        } 
    }


    load() {
        return new Promise((resolv, reject) => {
            if(this.#json_in === null) reject(this);
            this.#fileparts = this.readJson();
            this.msg = this.prepare(this.json.nodes, this.json.edges, this.json.gnlist, this.json.gelist);
            resolv(this);
        });
    }
}
