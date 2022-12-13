import { ConnectivityMatrix } from "./DistProc";
import {Lineage, Tree} from "./TreeImport";

export class NexusImporter {
    #identical = [];
    #nodes = [];
    #conn = [];
    #ids = [];

    constructor(json){
        this.identical = json.ident.identical;
        this.nodes = json.nexus.nexus.node; 
        this.conn = new ConnectivityMatrix(json.nexus.nexus);
    }

    get identical(){ return this.#identical; }
    get conn(){ return this.#conn; }
    get nodes(){ return this.#nodes; }
    get ids(){ return this.#ids; }

    set identical(i){ this.#identical = i }
    set conn(c){ this.#conn = c; }
    set nodes(n){ this.#nodes = n; }

    getNodeName(idx){
        let name = this.nodes.find(v => parseInt(v.id) === idx + 1)
        return name.name ? name.name : "";
    }

    getGNName(id){
        let name = this.ids.find(v => parseInt(v.id) === id)
        return name ? name.label : ""; 
    }

    getCoords(idx){
        return [parseFloat(this.nodes[idx].x), parseFloat(this.nodes[idx].y)];
    }

    isLeaf(idx){
        return this.conn.isLeaf(idx);
    }

    getChilds(idx){
        return this.conn.getChildIDs(idx)
    }

    getLength(src, dst){
        return this.conn.getLength(src, dst);
    }

    getCenter(){
        function CompareIndexOf(array,comp_f){
            let resis = array[0];
            array.reduce((r, v, i)=>{
                if(comp_f(r,v) === v){
                    r = v;
                    resis = i;
                    return r;
                }
            })
            return resis;
        }
        let center = this.conn.conn.reduce(
            (r,v)=>{
                r.push(
                    v.reduce(
                        (rr,vv)=>{rr += vv; return rr}
                    )
                );
                return r
            },[]
        )
        // .filter(v=>v !== Infinity ? true : false);
        //console.log(center);
        return CompareIndexOf(center,Math.min)
    }

    getResidualEdges(edges){
        let undirected = ConnectivityMatrix.undirectEdges(edges);
        let remained = this.conn.directed.reduce((r,e)=>{
            r.push({
                src: this.getGNName(e.src),
                dst: this.getGNName(e.dst),
                weight: e.weight
            }); return r;
        },[]);
        let result = remained.filter(e => (
                undirected.reduce((r,ee)=>{
                    return (e.src === ee.src && e.dst === ee.dst || r)
                },false)
            ) ? false : true);
        // console.table(result);
        return result;
    }

    toJSON(){
        let result = {};
        this.node_df = [];
        this.epi_df = [];
        this.gnode_df = [];
        const labeling_f = function (that, nid, gnode_df, node_df, epi_df, stack){
            if(nid){
                let strains = [];
                strains.push(that.getNodeName(nid));
                let st = that.identical.filter(v => that.getNodeName(nid) === v.node ? true : false);
                if(st.length){
                    st[0].strains.forEach((v)=>strains.push(v));
                    strains.shift(); // remove duplicated first item.
                }
                if(strains){
                    strains.forEach(element => {
                    Tree.register_node(node_df, epi_df, element, stack);
                    });
                }
            }
            const plab = Lineage.getParent(stack);
            const parent = that.ids.find(v=>v.label === plab)?.id;
            Tree.register_gnode(gnode_df, stack, that.getLength(parent ? parent : 0, nid), ...that.getCoords(nid));
        };
        Lineage.doDepthWalk(this, this.getCenter(), this.gnode_df, this.node_df, this.epi_df, Lineage.ORIGIN_NODE, labeling_f, labeling_f);
        result['nodes'] = this.node_df;
        result['epi'] = this.epi_df;
        const gnodes = Object.values(Tree.assign_edges(this.gnode_df));
        result['gnlist'] = gnodes;
        result['gelist'] = Object.values(this.getResidualEdges(Tree.getGedgeList(gnodes)));
        return result;
    }

}

export class Nexus extends Tree {

    // static #treelReadCompleted = false;

    // static getTreelReadCompleted(){
    //     return this.#treelReadCompleted;
    // }

    // static setTreelReadCompleted(treelReadCompleted){
    //     this.#treelReadCompleted = treelReadCompleted;
    // }

    constructor(_file) {
        super(_file);
    };

    compare(from, to){
        return from.toString() == to.toString();
    }

    parseNexus(result) {
        let Dimension = {};
        let translateArray = [];
        let VerticesArray = [];
        let EdgesArray = [];
        let firstSplit = result.split("End;");
        for(let i = 0; i < firstSplit.length; i++){
            if(firstSplit[i].indexOf("Begin Network") === -1){
                continue;
            }
            let secondSplit = firstSplit[i].split(';');
            for(let j = 0; j < secondSplit.length; j++){
                if (secondSplit[j].indexOf("Dimensions") !== -1) {
                    Dimension = Nexus.readDimension(secondSplit[j]);
                }
                if (secondSplit[j].indexOf("Translate") !== -1) {
                    translateArray = Nexus.readTranslate(secondSplit[j]);
                }
                if (secondSplit[j].indexOf("Vertices") !== -1) {
                    VerticesArray = Nexus.readVertices(secondSplit[j]);
                }
                if (secondSplit[j].indexOf("Edges") !== -1) {
                    EdgesArray = Nexus.readEdges(secondSplit[j]);
                }
            }
        }
        let nodeArray = [];

        // reform dimension.
        if(Dimension?.plotDim){
            let a = Dimension.plotDim.split(',');
            Object.assign(Dimension, {
                x_begin: parseFloat(a[0]),
                y_begin: parseFloat(a[1]),
                x_end: parseFloat(a[2]),
                y_end: parseFloat(a[3])
            })
        }

        VerticesArray.forEach((item, i) => {
            let serial = item['serialNumber'];
            let labelName = translateArray
                .find(item => item['serialNumber'] === serial)
                ?.labelName;
            let coordX = parseFloat(item['coordX'])/(Dimension.x_end-Dimension.x_begin) - 0.5;
            let coordY = parseFloat(item['coordY'])/(Dimension.y_end-Dimension.y_begin) - 0.5;
            let object = {
                id: serial,
                name: labelName,
                x: coordX,
                y: coordY,
            }
            nodeArray.push(object);
        });
        // console.table(nodeArray);
        let edgeArray = [];
        EdgesArray.forEach((item) => {
            let src = item['src'];
            let dst = item['dst'];
            let subs = item['subs'];
            let object = {
                src: src,
                dst: dst,
                subs: subs,
            }
            edgeArray.push(object);
        });
        // console.log(edgeArray);

        let outputJsonObj = {
            param : Dimension,
            node : nodeArray,
            edge : edgeArray
        };
        // let outputJson = JSON.stringify(outputJsonObj);
        // console.log(outputJson);
        // return outputJson;
        return outputJsonObj;
    }

    static readDimension(data){
        if(!data) return;

        let dimension = {};
        let newData = data.replace( /\r?\n/g , "");
        let newData2 = newData.substring("Dimensions ".length);
        let newArray = newData2.split(' ');
        newArray.reduce((_,v)=>{
            let temp = v.split('=');
            Object.assign(dimension, {
                [temp[0].trim()]: temp[1].trim()
            });
        })
        // console.log(translateArray);
        return dimension;
    }

    static readTranslate(data){
        if(!data) return;

        let translateArray = [];
        let newData = data.replace( /\r?\n/g , "");
        let len = "Translate".length;
        let newData2 = newData.substring(len);
        let newArray = newData2.split(',');
        for(let i = 0; i < newArray.length - 1; i++){
            let temp = newArray[i].split(' ');
            let obj = {
                serialNumber: temp[0].trim(),
                labelName: temp[1].trim()
            };
            translateArray.push(obj);
        }
        // console.log(translateArray);
        return translateArray;
    }

    static readVertices(data){
        if(!data) return;

        let VerticesArray = [];
        let newData = data.replace( /\r?\n/g , "");
        let len = "Vertices".length;
        let newData2 = newData.substring(len);
        let newArray = newData2.split(',');
        for(let i = 0; i < newArray.length - 1; i++){
            let temp = newArray[i].split(' ');
            let obj = {
                serialNumber: temp[0].trim(),
                coordX: temp[1].trim(),
                coordY: temp[2].trim(),
            };
            VerticesArray.push(obj);
        }
        // console.log(VerticesArray);
        return VerticesArray;
    }

    static readEdges(data){
        if(!data) return;

        let EdgesArray = [];
        let newData = data.replace( /\r?\n/g , "");
        let len = "Edges".length;
        let newData2 = newData.substring(len);
        let newArray = newData2.split(',');
        for(let i = 0; i < newArray.length - 1; i++){
            let temp = newArray[i].split(' ');
            let obj = {
                serialNumber: temp[0].trim(),
                src: temp[1].trim(),
                dst: temp[2].trim(),
                subs:   temp[3].trim(),
            };
            EdgesArray.push(obj);
        }
        // console.log(EdgesArray);
        return EdgesArray;
    }

    toJSON(){
        let result = {};
        result['nexus'] = this.data;
        return result;    
    }

    Reader(onload) {
        this._Reader(onload, this.parseNexus);
    }
};

